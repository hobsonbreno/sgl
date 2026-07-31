import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Oportunidade, OportunidadeDocument } from './oportunidade.schema';
import { PncpClientService } from '../pncp/services/pncp-client/pncp-client.service';
import { Produto, ProdutoDocument } from '../produto/produto.schema';
import { SimulacaoEstrategia, SimulacaoDocument } from './schemas/simulacao.schema';
import { SimularEstrategiaDto, ModeloEntrega } from './dtos/simular-estrategia.dto';
import { FinanceiroService } from '../financeiro/financeiro.service';
import { Cotacao, CotacaoDocument } from '../cotacao/cotacao.schema';

@Injectable()
export class OportunidadeService {
  constructor(
    @InjectPinoLogger(OportunidadeService.name) private readonly logger: PinoLogger,
    @InjectModel(Oportunidade.name) private model: Model<OportunidadeDocument>,
    private readonly pncpClientService: PncpClientService,
    @InjectModel(Produto.name) private produtoModel: Model<ProdutoDocument>,
    @InjectModel(SimulacaoEstrategia.name) private simulacaoModel: Model<SimulacaoDocument>,
    private readonly financeiroService: FinanceiroService,
    @InjectModel(Cotacao.name) private cotacaoModel: Model<CotacaoDocument>,
  ) {}

  async findAll(query: any): Promise<{
    data: Oportunidade[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    const filters: any = {};
    if (query.kanbanStatus) filters.kanbanStatus = query.kanbanStatus;
    if (query.uf) filters.uf = query.uf;
    if (query.modalidadeCodigo)
      filters.modalidadeCodigo = query.modalidadeCodigo;

    if (query.prazoAteEmDias) {
      const hoje = new Date();
      hoje.setDate(hoje.getDate() + Number(query.prazoAteEmDias));
      filters.dataEncerramentoProposta = { $lte: hoje, $gte: new Date() };
    }

    // Regra de tempo de vida para EXCLUIDA: ocultar se a data de encerramento já passou
    const agora = new Date();
    filters.$or = [
      { kanbanStatus: { $ne: 'EXCLUIDA' } },
      { kanbanStatus: 'EXCLUIDA', dataEncerramentoProposta: { $gte: agora } },
      { kanbanStatus: 'EXCLUIDA', dataEncerramentoProposta: null },
      {
        kanbanStatus: 'EXCLUIDA',
        dataEncerramentoProposta: { $exists: false },
      },
    ];

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const data = await this.model
      .find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    const total = await this.model.countDocuments(filters).exec();
    const totalPages = Math.ceil(total / limit) || 1;

    return { data, total, totalPages, currentPage: page };
  }

  async findOne(id: string): Promise<Oportunidade> {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Oportunidade não encontrada');
    return doc;
  }

  async updateStatus(id: string, kanbanStatus: string): Promise<Oportunidade> {
    if (!kanbanStatus) {
      throw new BadRequestException('Status não informado');
    }

    const doc = await this.model
      .findByIdAndUpdate(
        id,
        { kanbanStatus, dataMudancaStatus: new Date() },
        { new: true },
      )
      .exec();

    if (!doc) throw new NotFoundException('Oportunidade não encontrada');

    if (kanbanStatus === 'EXCLUIDA') {
      await this.produtoModel.deleteMany({ oportunidadeId: id }).exec();
      this.logger.info(
        `Produtos da oportunidade ${id} removidos (movida para lixeira)`,
      );
    }

    return doc;
  }

  async sincronizarItens(id: string) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Oportunidade não encontrada');

    if (!doc.numeroControlePNCP) {
      throw new BadRequestException('Oportunidade sem número de controle PNCP');
    }

    // Sempre busca e faz upsert, pois o órgão pode ter adicionado mais itens ao edital depois da primeira sincronização.
    const produtosExistentes = await this.produtoModel
      .countDocuments({ oportunidadeId: id })
      .exec();

    try {
      const itensRaw = await this.pncpClientService.buscarItensDaContratacao(
        doc.numeroControlePNCP,
      );

      if (!itensRaw || itensRaw.length === 0) {
        return { message: 'Nenhum item retornado pela API da PNCP', total: 0 };
      }

      const novosProdutos = itensRaw.map((item: any) => ({
        oportunidadeId: id,
        numeroItem: item.numeroItem || 0,
        descricao: item.descricao || 'Item sem descrição',
        quantidade: item.quantidade || 1,
        unidadeMedida: item.unidadeMedida || 'UN',
        valorUnitarioEstimado: item.valorUnitarioEstimado || 0,
        valorTotalEstimado: item.valorTotal || 0,
        valorEstimado: item.valorTotal || 0,
      }));

      const ops = novosProdutos.map((prod) => ({
        updateOne: {
          filter: { oportunidadeId: id, numeroItem: prod.numeroItem },
          update: { $set: prod },
          upsert: true,
        },
      }));

      await this.produtoModel.bulkWrite(ops);

      this.logger.info(
        `Sincronizados (upsert) ${novosProdutos.length} itens para a oportunidade ${id}`,
      );
      return {
        message: 'Itens sincronizados com sucesso',
        total: novosProdutos.length,
      };
    } catch (e) {
      this.logger.error(
        `Erro ao sincronizar itens da oportunidade ${id}: ${e.message}`,
      );
      throw new BadRequestException(
        'Não foi possível carregar os itens agora, tente novamente.',
      );
    }
  }
  async remove(id: string) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Oportunidade não encontrada');

    try {
      await this.model.updateOne(
        { _id: doc._id },
        { $set: { kanbanStatus: 'EXCLUIDA', dataMudancaStatus: new Date() } },
      );

      // Excluir produtos associados
      await this.produtoModel.deleteMany({ oportunidadeId: id }).exec();

      this.logger.info(
        `Oportunidade ${id} enviada para lixeira e produtos removidos`,
      );
      return { message: 'Oportunidade excluída com sucesso' };
    } catch (error) {
      this.logger.error(`Erro ao excluir oportunidade ${id}: ${error.message}`);
      throw new BadRequestException('Erro ao excluir oportunidade');
    }
  }

  async simularEstrategia(dto: SimularEstrategiaDto) {
    this.logger.info({ 
      evt: 'INICIANDO_SIMULACAO_TRIBUTARIA', 
      oportunidadeId: dto.oportunidadeId,
      modeloEntrega: dto.modeloEntrega 
    }, `Processando estratégia para o lance total de R$ ${dto.lanceTotal}`);

    const rbt12Atual = await this.financeiroService.obterRBT12Atual();
    
    // 1. Busca os Custos
    const cotacao = await this.cotacaoModel.findOne({ oportunidadeId: dto.oportunidadeId }).exec();
    
    if (!cotacao) {
      this.logger.error({ 
        evt: 'COTACAO_NAO_ENCONTRADA', 
        oportunidadeId: dto.oportunidadeId 
      }, `Falha crítica: Nenhuma cotação de fornecedor mapeada para a oportunidade.`);
      throw new Error('Cotação base não localizada.');
    }

    let custoTotal = 0;
    if (cotacao && cotacao.itens) {
      custoTotal = cotacao.itens.reduce((acc, item: any) => {
        if (item.melhorPreco && item.melhorPreco.precoUnitario) {
          return acc + (item.melhorPreco.precoUnitario * (item.quantidade || 1));
        }
        return acc;
      }, 0);
    }

    // 2. Prepara variáveis de esteira
    const meses = dto.modeloEntrega === ModeloEntrega.FRACIONADO && dto.mesesContrato ? dto.mesesContrato : 1;
    const faturamentoMensal = dto.lanceTotal / meses;
    const custoMensal = custoTotal / meses;

    const projecaoMensal = [];
    let rbt12Projetado = rbt12Atual;
    let lucroLiquidoTotal = 0;
    let impostosTotal = 0;

    // 3. O Loop de Projeção no Tempo
    for (let i = 1; i <= meses; i++) {
      const aliquotaEfetiva = this.financeiroService.calcularAliquotaEfetiva(rbt12Projetado);
      
      const impostoMensal = faturamentoMensal * aliquotaEfetiva;
      const lucroMensal = faturamentoMensal - custoMensal - impostoMensal;
      
      projecaoMensal.push({
        mesIndex: i,
        rbt12Projetado: rbt12Projetado,
        faturamentoMensal: faturamentoMensal,
        aliquotaEfetiva,
        impostoMensal,
        lucroLiquidoMensal: lucroMensal
      });

      lucroLiquidoTotal += lucroMensal;
      impostosTotal += impostoMensal;
      
      rbt12Projetado += faturamentoMensal;
    }

    // 4. Salva o Histórico de Simulação no MongoDB
    const novaSimulacao = new this.simulacaoModel({
      oportunidadeId: dto.oportunidadeId,
      lanceTotal: dto.lanceTotal,
      custoTotal: custoTotal,
      modeloEntrega: dto.modeloEntrega,
      mesesContrato: meses,
      rbt12Inicial: rbt12Atual,
      projecaoMensal,
      impostosTotal: Number(impostosTotal.toFixed(2)),
      lucroLiquidoTotal: Number(lucroLiquidoTotal.toFixed(2)),
    });

    await novaSimulacao.save();

    const statusOperacao = lucroLiquidoTotal > 0 ? 'LUCRO' : 'PREJUIZO_CRITICO';

    if (statusOperacao === 'PREJUIZO_CRITICO') {
      this.logger.warn({
        evt: 'SIMULACAO_PREJUIZO_DETECTADO',
        oportunidadeId: dto.oportunidadeId,
        lanceTotal: dto.lanceTotal,
        custoTotal: custoTotal,
        impostosTotal: impostosTotal,
        resultadoLiquido: lucroLiquidoTotal,
        rbt12Inicial: rbt12Atual
      }, `⚠️ Alerta de Margem: O lance proposto de R$ ${dto.lanceTotal} gerará um prejuízo real de R$ ${lucroLiquidoTotal}`);
    } else {
      this.logger.info({
        evt: 'SIMULACAO_SUCESSO',
        oportunidadeId: dto.oportunidadeId,
        resultadoLiquido: lucroLiquidoTotal,
        aliquotaMedia: ((impostosTotal / dto.lanceTotal) * 100).toFixed(2)
      }, `Simulação concluída com margem positiva.`);
    }

    // 5. Retorna o payload estruturado para a UI do React processar os cards
    return {
      simulacaoId: novaSimulacao._id,
      rbt12Inicial: rbt12Atual,
      custoTotal,
      lanceTotal: dto.lanceTotal,
      impostosTotal: Number(impostosTotal.toFixed(2)),
      lucroLiquidoTotal: Number(lucroLiquidoTotal.toFixed(2)),
      statusOperacao,
      projecaoMensal,
    };
  }
}
