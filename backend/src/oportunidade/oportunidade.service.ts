import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Oportunidade, OportunidadeDocument } from './oportunidade.schema';
import { PncpClientService } from '../pncp/services/pncp-client/pncp-client.service';
import { Produto, ProdutoDocument } from '../produto/produto.schema';

@Injectable()
export class OportunidadeService {
  private readonly logger = new Logger(OportunidadeService.name);

  constructor(
    @InjectModel(Oportunidade.name) private model: Model<OportunidadeDocument>,
    private readonly pncpClientService: PncpClientService,
    @InjectModel(Produto.name) private produtoModel: Model<ProdutoDocument>,
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
      this.logger.log(
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

      this.logger.log(
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

      this.logger.log(
        `Oportunidade ${id} enviada para lixeira e produtos removidos`,
      );
      return { message: 'Oportunidade excluída com sucesso' };
    } catch (error) {
      this.logger.error(`Erro ao excluir oportunidade ${id}: ${error.message}`);
      throw new BadRequestException('Erro ao excluir oportunidade');
    }
  }
}
