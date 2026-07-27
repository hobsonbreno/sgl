import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import mongoose, { Model, Connection } from 'mongoose';
import { Cotacao, CotacaoDocument } from './cotacao.schema';
import { FornecedorService } from '../fornecedor/fornecedor.service';
import { SupplierDiscoveryService } from '../fornecedor/supplier-discovery.service';

@Injectable()
export class CotacaoService {
  constructor(
    @InjectModel(Cotacao.name) private model: Model<CotacaoDocument>,
    private fornecedorService: FornecedorService,
    private supplierDiscoveryService: SupplierDiscoveryService,
    @InjectConnection() private connection: Connection,
  ) {}

  async createOrGet(
    oportunidadeId: string,
    initialItems: any[] = [],
  ): Promise<Cotacao> {
    const existe = await this.model.findOne({ oportunidadeId }).exec();
    if (existe) {
      if (initialItems.length > 0) {
        let changed = false;
        for (const initialItem of initialItems) {
          const itemJaExiste = existe.itens.some((it) => 
            it.produtoId && it.produtoId.toString() === initialItem._id.toString()
          );
          if (!itemJaExiste) {
            existe.itens.push({
              produtoId: initialItem._id,
              descricaoItem: initialItem.descricao,
              quantidade: initialItem.quantidade || 1,
              unidadeMedida: initialItem.unidadeMedida || 'UN',
              valorUnitarioEstimado: initialItem.valorUnitarioEstimado || 0,
              precosFornecedores: [],
            } as any);
            changed = true;
          }
        }
        if (changed) {
          await existe.save();
        }
      }
      return existe;
    }

    const itens = initialItems.map((i) => ({
      produtoId: i._id,
      descricaoItem: i.descricao,
      quantidade: i.quantidade || 1,
      unidadeMedida: i.unidadeMedida || 'UN',
      valorUnitarioEstimado: i.valorUnitarioEstimado || 0,
      precosFornecedores: [],
    }));

    const nova = new this.model({
      oportunidadeId,
      itens,
    });
    return nova.save();
  }

  async findOne(id: string): Promise<Cotacao> {
    const doc = await this.model
      .findById(id)
      .populate('itens.precosFornecedores.fornecedorId')
      .populate('itens.produtoId')
      .exec();
    if (!doc) throw new NotFoundException('Cotação não encontrada');
    return doc;
  }

  async findByOportunidade(oportunidadeId: string): Promise<Cotacao> {
    const doc = await this.model
      .findOne({ oportunidadeId })
      .populate('itens.precosFornecedores.fornecedorId')
      .populate('itens.produtoId')
      .exec();
    if (!doc)
      throw new NotFoundException(
        'Cotação não encontrada para esta oportunidade',
      );
    return doc;
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
      if (precoData.linkProduto) item.precosFornecedores[fIdx].linkProduto = precoData.linkProduto;
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

    return this.findOne(cotacaoId);
  }

  private async checkAndMoveKanban(doc: any) {
    const todosItensCotados = doc.itens.length > 0 && doc.itens.every((it: any) => it.melhorPreco && it.melhorPreco.precoUnitario > 0);
    if (todosItensCotados) {
      const op = await this.connection.collection('oportunidades').findOne({ _id: doc.oportunidadeId });
      // Mover para FEITO (Concluído / Pronto para Pregão) se estiver nas fases iniciais
      if (op && (op.kanbanStatus === 'FAZENDO' || op.kanbanStatus === 'A_FAZER')) {
         await this.connection.collection('oportunidades').updateOne(
           { _id: doc.oportunidadeId },
           { $set: { kanbanStatus: 'FEITO' } }
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
    return this.findOne(cotacaoId);
  }

  async buscarPrecosWebAuto(cotacaoId: string, itemId: string, location?: string) {
    const doc = await this.model.findById(cotacaoId).exec();
    if (!doc) throw new NotFoundException('Cotação não encontrada');

    const item = doc.itens.find((i) => i._id.toString() === itemId);
    if (!item) throw new NotFoundException('Item não encontrado na cotação');

    // 1. Bot dispara a busca
    const fornecedoresWeb = await this.supplierDiscoveryService.discoverSuppliersForProduct(item.descricaoItem, location);

    // 2. Registra na cotação
    for (const f of fornecedoresWeb) {
       // Verifica se já existe um preço validado pelo comprador (> 0)
       const precoExistente = item.precosFornecedores.find(p => p.fornecedorId.toString() === f.id);
       
       if (precoExistente && precoExistente.precoUnitario > 0 && f.precoUnitario === 0) {
           // Não sobrescreve um preço real que o comprador já preencheu com um 0.00 do bot
           continue; 
       }

       await this.updatePreco(cotacaoId, itemId, {
          fornecedorId: f.id,
          precoUnitario: f.precoUnitario,
          observacao: precoExistente ? precoExistente.observacao : 'Preço prospectado automaticamente pelo Robô',
          linkProduto: f.linkProduto,
       });
    }

    return { message: 'Busca web finalizada', encontrados: fornecedoresWeb.length };
  }
}
