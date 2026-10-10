import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Produto } from './produto.schema';
import { ProdutoGateway } from './produto.gateway';

@Injectable()
export class ProdutoService {
  constructor(
    @InjectModel(Produto.name) private model: Model<Produto>,
    @InjectConnection() private connection: Connection,
    private readonly gateway: ProdutoGateway,
  ) {}

  async findAll(query: any): Promise<{
    data: Produto[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const filtro: any = {};
    if (query.oportunidadeId) {
      filtro.oportunidadeId = query.oportunidadeId;
    }

    let dbQuery = this.model
      .find(filtro)
      .populate({
        path: 'oportunidadeId',
        match: { kanbanStatus: { $ne: 'EXCLUIDA' } },
        select:
          'orgaoNome numeroControlePNCP kanbanStatus uf numeroCompraOrigem anoCompraOrigem',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    if (query.lean === 'true' || query.lean === true) {
      dbQuery = dbQuery.lean() as any;
    }

    const rawData = (await dbQuery.exec()) as any[];

    // Filtra os produtos onde a oportunidade foi excluída (populate retorna null)
    const data = rawData.filter((d) => d.oportunidadeId !== null);

    const total = await this.model.countDocuments(filtro).exec();
    const totalPages = Math.ceil(total / limit) || 1;

    return { data, total, totalPages, currentPage: page };
  }

  async update(id: string, data: any): Promise<Produto | null> {
    let updated = await this.model
      .findByIdAndUpdate(id, data, { new: true })
      .exec();

    if (!updated) {
      try {
        const CotacaoModel = this.connection.model('Cotacao');
        const cotacao = await CotacaoModel.findOne({ 'itens._id': id }).exec();
        if (cotacao) {
          const item = cotacao.itens.find((i: any) => i._id.toString() === id);
          if (item) {
            let targetProdId = item.produtoId;
            if (!targetProdId) {
              const queryOr: any[] = [];
              if (item.numeroItem)
                queryOr.push({ numeroItem: item.numeroItem });
              if (item.descricaoItem)
                queryOr.push({ descricao: item.descricaoItem });

              let prod =
                queryOr.length > 0
                  ? await this.model
                      .findOne({
                        oportunidadeId: cotacao.oportunidadeId.toString(),
                        $or: queryOr,
                      })
                      .exec()
                  : null;

              if (!prod) {
                prod = await this.model.create({
                  oportunidadeId: cotacao.oportunidadeId.toString(),
                  numeroItem: item.numeroItem || 1,
                  descricao: item.descricaoItem || 'Item',
                  quantidade: item.quantidade || 1,
                  unidadeMedida: item.unidadeMedida || 'UN',
                  valorUnitarioEstimado: item.valorUnitarioEstimado || 0,
                  ...data,
                });
              }
              targetProdId = prod._id;
              await CotacaoModel.updateOne(
                { _id: cotacao._id, 'itens._id': item._id },
                { $set: { 'itens.$.produtoId': prod._id } },
              ).exec();
            }

            if (targetProdId) {
              updated = await this.model
                .findByIdAndUpdate(targetProdId, data, { new: true })
                .exec();
            }
          }
        }
      } catch (err) {
        console.error('Erro no fallback do ProdutoService.update:', err);
      }
    }

    if (updated) {
      this.gateway.emitProdutoUpdate(updated);
    }
    return updated;
  }
}
