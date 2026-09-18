import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Oportunidade, OportunidadeDocument } from './oportunidade.schema';
import {
  mapPncpParaOportunidade,
  PncpContratacaoRawDto,
} from '../pncp/dtos/pncp.dto';

import { PncpClientService } from '../pncp/services/pncp-client/pncp-client.service';
import { Produto, ProdutoDocument } from '../produto/produto.schema';
import {
  SimulacaoEstrategia,
  SimulacaoDocument,
} from './schemas/simulacao.schema';
import {
  SimularEstrategiaDto,
  ModeloEntrega,
} from './dtos/simular-estrategia.dto';
import { FinanceiroService } from '../financeiro/financeiro.service';
import { Cotacao, CotacaoDocument } from '../cotacao/cotacao.schema';
import { OportunidadeGateway } from './oportunidade.gateway';
import { SefazCeScraperService } from '../sefaz-ce/sefaz-ce-scraper.service';
import { CategoriaService } from '../categoria/categoria.service';
import { SystemLogService } from '../observability/system-log/system-log.service';

@Injectable()
export class OportunidadeService {
  constructor(
    @InjectPinoLogger(OportunidadeService.name)
    private readonly logger: PinoLogger,
    @InjectModel(Oportunidade.name) private model: Model<OportunidadeDocument>,
    private readonly pncpClientService: PncpClientService,
    @InjectModel(Produto.name) private produtoModel: Model<ProdutoDocument>,
    @InjectModel(SimulacaoEstrategia.name)
    private simulacaoModel: Model<SimulacaoDocument>,
    private readonly financeiroService: FinanceiroService,
    @InjectModel(Cotacao.name) private cotacaoModel: Model<CotacaoDocument>,
    private readonly gateway: OportunidadeGateway,
    private readonly sefazScraperService: SefazCeScraperService,
    private readonly categoriaService: CategoriaService,
    private readonly systemLogService: SystemLogService,
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

    // Regra de tempo de vida para EXCLUIDA: ocultar se a data de encerramento já passou,
    // a menos que estejamos consultando explicitamente a lixeira/arquivo
    if (query.includeDeleted !== 'true' && query.kanbanStatus !== 'EXCLUIDA') {
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
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const data = await this.model
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      .find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
      this.gateway.emitOportunidadeDelete(id);
    } else {
      this.gateway.emitOportunidadeUpdate(doc);
    }

    return doc;
  }

  async marcarVisualizado(id: string): Promise<Oportunidade> {
    const doc = await this.model
      .findByIdAndUpdate(id, { visualizado: true }, { new: true })
      .exec();

    if (!doc) throw new NotFoundException('Oportunidade não encontrada');

    // Dispara a atualização para o front-end refletir a mudança no card do Kanban
    this.gateway.emitOportunidadeUpdate(doc);

    return doc;
  }

  async sincronizarItens(id: string) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Oportunidade não encontrada');

    if (!doc.numeroControlePNCP) {
      throw new BadRequestException('Oportunidade sem número de controle PNCP');
    }

    // Inicia TODO o processo em background
    this.executarSincronizacaoCompletaBackground(id, doc).catch((err) => {
      this.logger.error(
        `Erro no background sync de itens/resultados: ${err.message}`,
      );
      void this.systemLogService.logError(
        'Oportunidade',
        `Erro no background sync de itens/resultados: ${err.message}`,
        err instanceof Error ? err.stack : undefined,
      );
    });

    return {
      message:
        'Sincronização de itens iniciada em background. Você será notificado quando concluída.',
      total: null,
    };
  }

  private async executarSincronizacaoCompletaBackground(id: string, doc: any) {
    try {
      this.logger.info(
        `Background: Iniciando sincronização completa da oportunidade ${id}`,
      );

      const itensRaw = await this.pncpClientService.buscarItensDaContratacao(
        String(doc.numeroControlePNCP),
      );

      if (!itensRaw || itensRaw.length === 0) {
        this.logger.warn(
          `Background: Nenhum item retornado pela API da PNCP para ${id}`,
        );
        await this.systemLogService.logWarn(
          'Oportunidade',
          `Background: Nenhum item retornado pela API da PNCP para ${id}`,
        );
        return;
      }

      // INTEGRAÇÃO SEFAZ CE - SCRAPER EM TEMPO REAL
      let statusSefazOverride = null;
      if (doc.orgaoNome && doc.orgaoNome.toLowerCase().includes('ceara')) {
        const stringRaw = `${doc.numeroCompraOrigem || ''}/${doc.anoCompraOrigem || ''} ${doc.objetoCompra || ''}`;
        const coepFormatada =
          this.sefazScraperService.formatarCoepParaPesquisa(stringRaw);

        if (coepFormatada) {
          this.logger.info(
            `Oportunidade do Ceará. Buscando scraper para CoEP: ${coepFormatada}`,
          );
          statusSefazOverride =
            await this.sefazScraperService.buscarStatusCotacaoSefaz(
              coepFormatada,
            );
        }
      }

      const itensAntigos = await this.produtoModel.find({ oportunidadeId: id });
      const mapaAntigos = new Map();
      for (const antigo of itensAntigos) {
        const chave = `${antigo.numeroLote || 0}-${antigo.numeroItem}`;
        mapaAntigos.set(chave, antigo);
      }

      const novosProdutos = itensRaw.map((item) => {
        const vencedorCnpj = '';
        const vencedorNome = '';
        const valorVencedor = 0;

        const situacaoFinal =
          statusSefazOverride || item.situacaoCompraItemNome || 'Desconhecido';

        const lote = item.numeroLote || item.lote || 0;
        const chave = `${lote}-${item.numeroItem}`;
        const itemAntigo = mapaAntigos.get(chave);

        return {
          oportunidadeId: id,
          numeroItem: item.numeroItem || 0,
          numeroLote: lote,
          descricao: item.descricao || 'Item sem descrição',
          categoria: this.categoriaService.categorizeProduto(
            String(item.descricao || ''),
          ),
          quantidade: item.quantidade || 1,
          unidadeMedida: item.unidadeMedida || 'UN',
          valorUnitarioEstimado: item.valorUnitarioEstimado || 0,
          valorTotalEstimado: item.valorTotal || 0,
          valorEstimado: item.valorTotal || 0,
          situacaoJulgamento: situacaoFinal,
          vencedorCnpj,
          vencedorNome,
          valorVencedor,
          valorNossoLance: itemAntigo?.valorNossoLance || 0,
          valorConcorrente: itemAntigo?.valorConcorrente || 0,
        };
      });

      // Limpa e reinsere
      await this.produtoModel.deleteMany({ oportunidadeId: id });
      if (novosProdutos.length > 0) {
        await this.produtoModel.insertMany(novosProdutos);
      }

      this.logger.info(
        `Background: Salvos ${novosProdutos.length} itens base para ${id}. Agora buscando vencedores...`,
      );

      const promises = novosProdutos.map(async (prod) => {
        const st = (prod.situacaoJulgamento || '').toLowerCase();
        if (
          st.includes('homologado') ||
          st.includes('adjudicado') ||
          st.includes('finalizada') ||
          st.includes('encerrado')
        ) {
          try {
            const resultados =
              await this.pncpClientService.buscarResultadosDoItem(
                String(doc.numeroControlePNCP),
                Number(prod.numeroItem),
              );
            if (resultados && resultados.length > 0) {
              const vencedor = resultados[0];
              const vencedorCnpj = vencedor.niFornecedor || '';
              const vencedorNome = vencedor.nomeRazaoSocialFornecedor || '';
              const valorVencedor =
                vencedor.valorTotalHomologado ||
                vencedor.valorTotalAdjudicado ||
                vencedor.valorProposta ||
                0;

              await this.produtoModel.updateOne(
                {
                  oportunidadeId: prod.oportunidadeId,
                  numeroItem: prod.numeroItem,
                  numeroLote: prod.numeroLote,
                },
                { $set: { vencedorCnpj, vencedorNome, valorVencedor } },
              );
            }
          } catch {
            this.logger.warn(
              `Background: Não foi possível buscar o resultado do item ${prod.numeroItem}`,
            );
          }
        }
      });

      await Promise.all(promises);

      this.logger.info(
        `Background: Sincronização COMPLETA finalizada para ${id}`,
      );
      if (this.gateway.server) {
        this.gateway.server.emit('alerta_monitoramento', {
          mensagem: `✅ Sincronização concluída (PNCP: ${doc.numeroControlePNCP}). Todos os ${novosProdutos.length} itens e vencedores foram baixados!`,
        });
      }
    } catch (e: any) {
      this.logger.error(
        `Erro fatal no background sync completo para ${id}: ${e.message}`,
      );
      if (this.gateway.server) {
        this.gateway.server.emit('alerta_monitoramento', {
          mensagem: `❌ Falha ao sincronizar PNCP ${doc.numeroControlePNCP}: A API do governo está instável. Tente novamente mais tarde.`,
        });
      }
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
      this.gateway.emitOportunidadeDelete(id);
      return { message: 'Oportunidade excluída com sucesso' };
    } catch (error) {
      this.logger.error(`Erro ao excluir oportunidade ${id}: ${error.message}`);
      throw new BadRequestException('Erro ao excluir oportunidade');
    }
  }

  async simularEstrategia(dto: SimularEstrategiaDto) {
    this.logger.info(
      {
        evt: 'INICIANDO_SIMULACAO_TRIBUTARIA',
        oportunidadeId: dto.oportunidadeId,
        modeloEntrega: dto.modeloEntrega,
      },
      `Processando estratégia para o lance total de R$ ${dto.lanceTotal}`,
    );

    const rbt12Atual = await this.financeiroService.obterRBT12Atual();

    // 1. Busca os Custos
    const cotacao = await this.cotacaoModel
      .findOne({ oportunidadeId: dto.oportunidadeId })
      .exec();

    if (!cotacao) {
      this.logger.error(
        {
          evt: 'COTACAO_NAO_ENCONTRADA',
          oportunidadeId: dto.oportunidadeId,
        },
        `Falha crítica: Nenhuma cotação de fornecedor mapeada para a oportunidade.`,
      );
      throw new Error('Cotação base não localizada.');
    }

    let custoTotal = 0;
    if (cotacao && cotacao.itens) {
      custoTotal = cotacao.itens.reduce((acc, item: any) => {
        if (item.melhorPreco && item.melhorPreco.precoUnitario) {
          return acc + item.melhorPreco.precoUnitario * (item.quantidade || 1);
        }
        return acc;
      }, 0);
    }

    // 2. Prepara variáveis de esteira
    const meses =
      dto.modeloEntrega === ModeloEntrega.FRACIONADO && dto.mesesContrato
        ? dto.mesesContrato
        : 1;
    const faturamentoMensal = dto.lanceTotal / meses;
    const custoMensal = custoTotal / meses;

    const projecaoMensal = [];
    let rbt12Projetado = rbt12Atual;
    let lucroLiquidoTotal = 0;
    let impostosTotal = 0;

    // 3. O Loop de Projeção no Tempo
    for (let i = 1; i <= meses; i++) {
      const aliquotaEfetiva =
        this.financeiroService.calcularAliquotaEfetiva(rbt12Projetado);

      const impostoMensal = faturamentoMensal * aliquotaEfetiva;
      const lucroMensal = faturamentoMensal - custoMensal - impostoMensal;

      projecaoMensal.push({
        mesIndex: i,
        rbt12Projetado: rbt12Projetado,
        faturamentoMensal: faturamentoMensal,
        aliquotaEfetiva,
        impostoMensal,
        lucroLiquidoMensal: lucroMensal,
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
      this.logger.warn(
        {
          evt: 'SIMULACAO_PREJUIZO_DETECTADO',
          oportunidadeId: dto.oportunidadeId,
          lanceTotal: dto.lanceTotal,
          custoTotal: custoTotal,
          impostosTotal: impostosTotal,
          resultadoLiquido: lucroLiquidoTotal,
          rbt12Inicial: rbt12Atual,
        },
        `⚠️ Alerta de Margem: O lance proposto de R$ ${dto.lanceTotal} gerará um prejuízo real de R$ ${lucroLiquidoTotal}`,
      );
    } else {
      this.logger.info(
        {
          evt: 'SIMULACAO_SUCESSO',
          oportunidadeId: dto.oportunidadeId,
          resultadoLiquido: lucroLiquidoTotal,
          aliquotaMedia: ((impostosTotal / dto.lanceTotal) * 100).toFixed(2),
        },
        `Simulação concluída com margem positiva.`,
      );
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

  @Cron(CronExpression.EVERY_4_HOURS)
  async syncAllActiveOpportunities() {
    this.logger.info(
      'Iniciando sincronização periódica de itens das oportunidades ativas...',
    );
    try {
      const activeOps = await this.model
        .find({ kanbanStatus: { $nin: ['EXCLUIDA', 'ARQUIVADA'] } })
        .exec();
      this.logger.info(
        `Encontradas ${activeOps.length} oportunidades ativas para sincronizar itens.`,
      );

      for (const op of activeOps) {
        if (!op.numeroControlePNCP) continue;
        try {
          await this.sincronizarItens(op._id.toString());
          // Delay removido pois a fila global do PncpClientService agora trata isso
        } catch (err: any) {
          this.logger.warn(
            `Erro na sincronização em background da oportunidade ${op._id.toString()}: ${err.message}`,
          );
        }
      }
      this.logger.info('Sincronização periódica concluída.');
    } catch (err) {
      this.logger.error(
        `Erro ao executar rotina de sincronização de itens: ${err.message}`,
      );
    }
  }

  async importarManual(input: string): Promise<Oportunidade> {
    try {
      this.logger.info(`Iniciando importação manual para: ${input}`);
      const raw =
        await this.pncpClientService.buscarContratacaoPorUrlOuControle(input);

      if (!raw) {
        throw new BadRequestException(
          'Não foi possível carregar os dados dessa oportunidade no PNCP.',
        );
      }

      const opDto = mapPncpParaOportunidade(raw as PncpContratacaoRawDto);

      // Importações manuais devem cair direto na coluna FAZENDO (em vez de A_FAZER)
      opDto.kanbanStatus = 'FAZENDO';

      // Deduplicar
      const existe = await this.model.findOne({
        numeroControlePNCP: opDto.numeroControlePNCP,
      });

      if (existe) {
        this.logger.info(
          `Oportunidade ${opDto.numeroControlePNCP} já existe. Atualizando status.`,
        );
        const updated = await this.model
          .findOneAndUpdate(
            { numeroControlePNCP: opDto.numeroControlePNCP },
            {
              $set: {
                situacaoCompraNome: opDto.situacaoCompraNome,
                dataEncerramentoProposta: opDto.dataEncerramentoProposta,
                valorTotalEstimado: opDto.valorTotalEstimado,
                kanbanStatus: 'FAZENDO', // Ressuscita o card caso estivesse excluído
              },
            },
            { new: true },
          )
          .exec();
        return updated as Oportunidade;
      }

      const created = await this.model.create(opDto);
      this.logger.info(
        `Oportunidade importada com sucesso: ${String(created._id)}`,
      );

      // Emitir evento WebSocket para atualizar a UI em tempo real
      this.gateway.emitOportunidadeUpdate(created);

      return created;
    } catch (e) {
      this.logger.error(`Erro na importação manual: ${e.message}`);
      throw new BadRequestException(
        `Erro ao importar oportunidade: ${e.message}`,
      );
    }
  }
}
