import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import mongoose, { Model, Connection } from 'mongoose';
import { Cotacao, CotacaoDocument } from './cotacao.schema';
import { FornecedorService } from '../fornecedor/fornecedor.service';
import { SupplierDiscoveryService } from '../fornecedor/supplier-discovery.service';
import { CotacaoGateway } from './cotacao.gateway';

@Injectable()
export class CotacaoService {
  constructor(
    @InjectModel(Cotacao.name) private model: Model<CotacaoDocument>,
    private fornecedorService: FornecedorService,
    private supplierDiscoveryService: SupplierDiscoveryService,
    @InjectConnection() private connection: Connection,
    private readonly gateway: CotacaoGateway,
  ) {}

  private getMatchKey(item: any, fallbackIndex?: number): string {
    const pId = (item.produtoId as any)?._id?.toString() || item.produtoId?.toString();
    if (pId) return `pid_${pId}`;
    if (item.numeroItem && Number(item.numeroItem) > 0) return `num_${item.numeroItem}`;
    const desc = (item.descricaoItem || item.descricao || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (desc) return `desc_${desc}_${fallbackIndex ?? ''}`;
    return `idx_${fallbackIndex}`;
  }

  private async deduplicateItens(doc: CotacaoDocument): Promise<boolean> {
    if (!doc || !doc.itens || doc.itens.length <= 1) return false;

    const seenKeys = new Map<string, any>();
    const cleanItens: any[] = [];
    let removed = false;

    for (let i = 0; i < doc.itens.length; i++) {
      const item = doc.itens[i];
      if (!item.numeroItem) {
        item.numeroItem = i + 1;
      }

      const key = this.getMatchKey(item, i + 1);

      if (seenKeys.has(key)) {
        removed = true;
        const existing = seenKeys.get(key);
        if (item.precosFornecedores && item.precosFornecedores.length > 0) {
          if (!existing.precosFornecedores) existing.precosFornecedores = [];
          for (const pf of item.precosFornecedores) {
            const pfExists = existing.precosFornecedores.some(
              (epf: any) =>
                (epf.fornecedorId as any)?._id?.toString() === (pf.fornecedorId as any)?._id?.toString() ||
                epf.fornecedorId?.toString() === pf.fornecedorId?.toString()
            );
            if (!pfExists) {
              existing.precosFornecedores.push(pf);
            }
          }
        }
        if (!existing.produtoId && item.produtoId) {
          existing.produtoId = item.produtoId;
        }
      } else {
        seenKeys.set(key, item);
        cleanItens.push(item);
      }
    }

    if (removed) {
      doc.itens = cleanItens as any;
      await this.model.updateOne(
        { _id: doc._id },
        { $set: { itens: cleanItens } }
      ).exec();
      return true;
    }
    return false;
  }

  async createOrGet(
    oportunidadeId: string,
    initialItems: any[] = [],
  ): Promise<Cotacao> {
    let existe = await this.model.findOne({ oportunidadeId }).exec();
    if (existe) {
      const cotId = existe._id.toString();
      await this.deduplicateItens(existe);
      existe = await this.model.findOne({ oportunidadeId }).exec();

      if (existe && initialItems.length > 0) {
        for (let idx = 0; idx < initialItems.length; idx++) {
          const initialItem = initialItems[idx];
          const targetNum = initialItem.numeroItem || (idx + 1);

          const itemExistente = existe.itens.find((it, itIdx) => {
            const pId = (it.produtoId as any)?._id || it.produtoId;
            if (pId && initialItem._id && pId.toString() === initialItem._id.toString()) return true;
            if (it.numeroItem && targetNum && Number(it.numeroItem) === Number(targetNum)) return true;
            if (itIdx === idx && !it.numeroItem) return true;
            return false;
          });

          if (itemExistente) {
            const pId = (itemExistente.produtoId as any)?._id || itemExistente.produtoId;
            if ((!pId && initialItem._id) || !itemExistente.numeroItem) {
              await this.model.updateOne(
                { _id: existe._id, 'itens._id': itemExistente._id },
                {
                  $set: {
                    ...(!pId && initialItem._id ? { 'itens.$.produtoId': initialItem._id } : {}),
                    ...(!itemExistente.numeroItem ? { 'itens.$.numeroItem': targetNum } : {}),
                  }
                }
              ).exec();
            }
          } else {
            await this.model.updateOne(
              { _id: existe._id },
              {
                $push: {
                  itens: {
                    produtoId: initialItem._id,
                    numeroItem: targetNum,
                    descricaoItem: initialItem.descricao || initialItem.descricaoItem || 'Item',
                    quantidade: initialItem.quantidade || 1,
                    unidadeMedida: initialItem.unidadeMedida || 'UN',
                    valorUnitarioEstimado: initialItem.valorUnitarioEstimado || 0,
                    precosFornecedores: [],
                  }
                }
              }
            ).exec();
          }
        }
      }
      return this.findOne(cotId);
    }

    const itens = initialItems.map((i, idx) => ({
      produtoId: i._id,
      numeroItem: i.numeroItem || (idx + 1),
      descricaoItem: i.descricao || i.descricaoItem || 'Item',
      quantidade: i.quantidade || 1,
      unidadeMedida: i.unidadeMedida || 'UN',
      valorUnitarioEstimado: i.valorUnitarioEstimado || 0,
      precosFornecedores: [],
    }));

    const nova = new this.model({
      oportunidadeId,
      itens,
    });
    const criada = await nova.save();
    return this.findOne(criada._id.toString());
  }

  private async autoLinkProdutos(doc: CotacaoDocument): Promise<void> {
    if (!doc || !doc.itens) return;
    let ProdutoModel: any;
    try {
      ProdutoModel = this.connection.model('Produto');
    } catch {
      return;
    }

    for (const item of doc.itens) {
      const currentProdId = (item.produtoId as any)?._id || item.produtoId;
      if (!currentProdId) {
        const queryOr: any[] = [];
        if (item.numeroItem) queryOr.push({ numeroItem: item.numeroItem });
        if (item.descricaoItem) queryOr.push({ descricao: item.descricaoItem });

        let prod = queryOr.length > 0
          ? await ProdutoModel.findOne({
              oportunidadeId: doc.oportunidadeId.toString(),
              $or: queryOr,
            }).exec()
          : null;

        if (!prod) {
          prod = await ProdutoModel.create({
            oportunidadeId: doc.oportunidadeId.toString(),
            numeroItem: item.numeroItem || 1,
            descricao: item.descricaoItem || 'Item',
            quantidade: item.quantidade || 1,
            unidadeMedida: item.unidadeMedida || 'UN',
            valorUnitarioEstimado: item.valorUnitarioEstimado || 0,
          });
        }

        if (prod) {
          await this.model.updateOne(
            { _id: doc._id, 'itens._id': item._id },
            { $set: { 'itens.$.produtoId': prod._id } }
          ).exec();
        }
      }
    }
  }

  async findOne(id: string): Promise<Cotacao> {
    let doc = await this.model
      .findById(id)
      .populate('itens.precosFornecedores.fornecedorId')
      .populate('itens.produtoId')
      .exec();
    if (!doc) throw new NotFoundException('Cotação não encontrada');

    const deduped = await this.deduplicateItens(doc);
    const unlinked = doc.itens.some((it) => !it.produtoId);

    if (deduped || unlinked) {
      if (unlinked) await this.autoLinkProdutos(doc);
      doc = await this.model
        .findById(id)
        .populate('itens.precosFornecedores.fornecedorId')
        .populate('itens.produtoId')
        .exec();
    }
    if (!doc) throw new NotFoundException('Cotação não encontrada');
    return doc;
  }

  async findByOportunidade(oportunidadeId: string): Promise<Cotacao> {
    let doc = await this.model
      .findOne({ oportunidadeId })
      .populate('itens.precosFornecedores.fornecedorId')
      .populate('itens.produtoId')
      .exec();
    if (!doc)
      throw new NotFoundException(
        'Cotação não encontrada para esta oportunidade',
      );

    const deduped = await this.deduplicateItens(doc);
    const unlinked = doc.itens.some((it) => !it.produtoId);

    if (deduped || unlinked) {
      if (unlinked) await this.autoLinkProdutos(doc);
      doc = await this.model
        .findOne({ oportunidadeId })
        .populate('itens.precosFornecedores.fornecedorId')
        .populate('itens.produtoId')
        .exec();
    }
    if (!doc)
      throw new NotFoundException(
        'Cotação não encontrada para esta oportunidade',
      );
    return doc;
  }

  async findByOportunidades(
    oportunidadeIds: string[],
  ): Promise<Record<string, Cotacao>> {
    const docs = await this.model
      .find({ oportunidadeId: { $in: oportunidadeIds } })
      .populate('itens.precosFornecedores.fornecedorId')
      .populate('itens.produtoId')
      .exec();
    const result: Record<string, Cotacao> = {};
    for (const doc of docs) {
      result[doc.oportunidadeId.toString()] = doc;
    }
    return result;
  }

  async updatePreco(
    cotacaoId: string,
    itemId: string,
    precoData: {
      fornecedorId: string;
      precoUnitario: number;
      fatorEmbalagem?: number;
      precoEmbalagem?: number;
      nomeEmbalagem?: string;
      freteIncluso?: boolean;
      prazoPagamento?: number;
      permiteParcelamento?: boolean;
      observacao?: string;
      desclassificado?: boolean;
      linkProduto?: string;
    },
  ) {
    const doc = await this.model.findById(cotacaoId).exec();
    if (!doc) throw new NotFoundException('Cotação não encontrada');

    const item = doc.itens.find((i) => i._id.toString() === itemId);
    if (!item) throw new NotFoundException('Item não encontrado na cotação');

    // Add or update provider price
    const fIdx = item.precosFornecedores.findIndex(
      (p) => p.fornecedorId.toString() === precoData.fornecedorId,
    );
    if (fIdx >= 0) {
      item.precosFornecedores[fIdx].precoUnitario = precoData.precoUnitario;
      item.precosFornecedores[fIdx].fatorEmbalagem = precoData.fatorEmbalagem;
      item.precosFornecedores[fIdx].precoEmbalagem = precoData.precoEmbalagem;
      item.precosFornecedores[fIdx].nomeEmbalagem = precoData.nomeEmbalagem;
      item.precosFornecedores[fIdx].freteIncluso = precoData.freteIncluso;
      item.precosFornecedores[fIdx].prazoPagamento = precoData.prazoPagamento;
      item.precosFornecedores[fIdx].permiteParcelamento =
        precoData.permiteParcelamento;
      item.precosFornecedores[fIdx].observacao = precoData.observacao;
      item.precosFornecedores[fIdx].desclassificado =
        precoData.desclassificado || false;
      if (precoData.linkProduto)
        item.precosFornecedores[fIdx].linkProduto = precoData.linkProduto;
    } else {
      item.precosFornecedores.push({
        fornecedorId: new mongoose.Types.ObjectId(precoData.fornecedorId),
        precoUnitario: precoData.precoUnitario,
        fatorEmbalagem: precoData.fatorEmbalagem,
        precoEmbalagem: precoData.precoEmbalagem,
        nomeEmbalagem: precoData.nomeEmbalagem,
        freteIncluso: precoData.freteIncluso,
        prazoPagamento: precoData.prazoPagamento,
        permiteParcelamento: precoData.permiteParcelamento,
        observacao: precoData.observacao,
        desclassificado: precoData.desclassificado || false,
        linkProduto: precoData.linkProduto,
      });
    }

    // Recalculate melhorPreco for this item
    let melhor: any;
    for (const p of item.precosFornecedores) {
      if (p.desclassificado || p.precoUnitario <= 0) continue;
      if (!melhor) {
        melhor = p;
        continue;
      }
      if (p.precoUnitario < melhor.precoUnitario) {
        melhor = p;
      } else if (p.precoUnitario === melhor.precoUnitario) {
        // Crivo de Desempate (Tiebreaker)
        let pScore = 0;
        let melhorScore = 0;
        if (p.freteIncluso) pScore += 10;
        if (melhor.freteIncluso) melhorScore += 10;

        if (p.permiteParcelamento) pScore += 5;
        if (melhor.permiteParcelamento) melhorScore += 5;

        pScore += (p.prazoPagamento || 0) * 0.1;
        melhorScore += (melhor.prazoPagamento || 0) * 0.1;

        if (pScore > melhorScore) {
          melhor = p;
        }
      }
    }
    item.melhorPreco = melhor
      ? {
          fornecedorId: melhor.fornecedorId,
          precoUnitario: melhor.precoUnitario,
        }
      : undefined;

    // Recalculate valorTotalMelhorCotacao
    doc.valorTotalMelhorCotacao = parseFloat(
      doc.itens
        .reduce((total, it) => {
          if (it.melhorPreco && !isNaN(it.melhorPreco.precoUnitario)) {
            return total + it.melhorPreco.precoUnitario * (it.quantidade || 1);
          }
          return total;
        }, 0)
        .toFixed(2),
    );

    await doc.save();

    // Gravar no historico do fornecedor
    await this.fornecedorService.registrarHistoricoPreco(
      precoData.fornecedorId,
      {
        descricaoItem: item.descricaoItem,
        precoUnitario: precoData.precoUnitario,
        precoEmbalagem: precoData.precoEmbalagem,
        fatorEmbalagem: precoData.fatorEmbalagem,
        nomeEmbalagem: precoData.nomeEmbalagem,
        observacao: precoData.observacao,
        desclassificado: precoData.desclassificado,
        oportunidadeId: doc.oportunidadeId.toString(),
      },
    );

    await this.checkAndMoveKanban(doc);

    const updatedCotacao = await this.findOne(cotacaoId);
    this.gateway.emitCotacaoUpdate(updatedCotacao);
    return updatedCotacao;
  }

  private async checkAndMoveKanban(doc: any) {
    const todosItensCotados =
      doc.itens.length > 0 &&
      doc.itens.every(
        (it: any) => it.melhorPreco && it.melhorPreco.precoUnitario > 0,
      );
    if (todosItensCotados) {
      const op = await this.connection
        .collection('oportunidades')
        .findOne({ _id: doc.oportunidadeId });
      // Mover para FEITO (Concluído / Pronto para Pregão) se estiver nas fases iniciais
      if (
        op &&
        (op.kanbanStatus === 'FAZENDO' || op.kanbanStatus === 'A_FAZER')
      ) {
        await this.connection
          .collection('oportunidades')
          .updateOne(
            { _id: doc.oportunidadeId },
            { $set: { kanbanStatus: 'FEITO' } },
          );
      }
    }
  }

  async removePreco(cotacaoId: string, itemId: string, fornecedorId: string) {
    const doc = await this.model.findById(cotacaoId).exec();
    if (!doc) throw new NotFoundException('Cotação não encontrada');

    const item = doc.itens.find((i) => i._id.toString() === itemId);
    if (!item) throw new NotFoundException('Item não encontrado na cotação');

    // Remove supplier price entry
    item.precosFornecedores = item.precosFornecedores.filter(
      (p) => p.fornecedorId.toString() !== fornecedorId,
    );

    // Remover histórico de preço no fornecedor global
    await this.fornecedorService.removerHistoricoPreco(
      fornecedorId,
      item.descricaoItem,
      doc.oportunidadeId.toString(),
    );

    // Recalculate melhorPreco for this item
    let melhor: any;
    for (const p of item.precosFornecedores) {
      if (p.desclassificado || p.precoUnitario <= 0) continue;
      if (!melhor) {
        melhor = p;
        continue;
      }
      if (p.precoUnitario < melhor.precoUnitario) {
        melhor = p;
      } else if (p.precoUnitario === melhor.precoUnitario) {
        // Crivo de Desempate (Tiebreaker)
        let pScore = 0;
        let melhorScore = 0;
        if (p.freteIncluso) pScore += 10;
        if (melhor.freteIncluso) melhorScore += 10;

        if (p.permiteParcelamento) pScore += 5;
        if (melhor.permiteParcelamento) melhorScore += 5;

        pScore += (p.prazoPagamento || 0) * 0.1;
        melhorScore += (melhor.prazoPagamento || 0) * 0.1;

        if (pScore > melhorScore) {
          melhor = p;
        }
      }
    }
    item.melhorPreco = melhor
      ? {
          fornecedorId: melhor.fornecedorId,
          precoUnitario: melhor.precoUnitario,
        }
      : undefined;

    // Recalculate valorTotalMelhorCotacao
    doc.valorTotalMelhorCotacao = doc.itens.reduce((total, it) => {
      if (it.melhorPreco && !isNaN(it.melhorPreco.precoUnitario)) {
        return total + it.melhorPreco.precoUnitario * (it.quantidade || 1);
      }
      return total;
    }, 0);

    await doc.save();

    const updatedCotacao = await this.findOne(cotacaoId);
    this.gateway.emitCotacaoUpdate(updatedCotacao);
    return updatedCotacao;
  }

  async buscarPrecosWebAuto(
    cotacaoId: string,
    itemId: string,
    location?: string,
  ) {
    const doc = await this.model.findById(cotacaoId).exec();
    if (!doc) throw new NotFoundException('Cotação não encontrada');

    const item = doc.itens.find((i) => i._id.toString() === itemId);
    if (!item) throw new NotFoundException('Item não encontrado na cotação');

    // 1. Bot dispara a busca
    const fornecedoresWeb =
      await this.supplierDiscoveryService.discoverSuppliersForProduct(
        item.descricaoItem,
        location,
      );

    // 2. Registra na cotação
    for (const f of fornecedoresWeb) {
      // Verifica se já existe um preço validado pelo comprador (> 0)
      const precoExistente = item.precosFornecedores.find(
        (p) => p.fornecedorId.toString() === f.id,
      );

      if (
        precoExistente &&
        precoExistente.precoUnitario > 0 &&
        f.precoUnitario === 0
      ) {
        // Não sobrescreve um preço real que o comprador já preencheu com um 0.00 do bot
        continue;
      }

      await this.updatePreco(cotacaoId, itemId, {
        fornecedorId: f.id,
        precoUnitario: f.precoUnitario,
        observacao: precoExistente
          ? precoExistente.observacao
          : 'Preço prospectado automaticamente pelo Robô',
        linkProduto: f.linkProduto,
      });
    }

    return {
      message: 'Busca web finalizada',
      encontrados: fornecedoresWeb.length,
    };
  }
}
