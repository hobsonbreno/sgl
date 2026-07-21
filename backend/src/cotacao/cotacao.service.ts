import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Cotacao, CotacaoDocument } from './cotacao.schema';
import { FornecedorService } from '../fornecedor/fornecedor.service';

@Injectable()
export class CotacaoService {
  constructor(
    @InjectModel(Cotacao.name) private model: Model<CotacaoDocument>,
    private fornecedorService: FornecedorService
  ) {}

  async createOrGet(oportunidadeId: string, initialItems: any[] = []): Promise<Cotacao> {
    const existe = await this.model.findOne({ oportunidadeId }).exec();
    if (existe) {
      if (existe.itens.length === 0 && initialItems.length > 0) {
        const itens = initialItems.map(i => ({
          produtoId: i._id,
          descricaoItem: i.descricao,
          quantidade: i.quantidade || 1,
          unidadeMedida: i.unidadeMedida || 'UN',
          valorUnitarioEstimado: i.valorUnitarioEstimado || 0,
          precosFornecedores: []
        }));
        existe.itens = itens as any;
        await existe.save();
      }
      return existe;
    }

    const itens = initialItems.map(i => ({
      produtoId: i._id,
      descricaoItem: i.descricao,
      quantidade: i.quantidade || 1,
      unidadeMedida: i.unidadeMedida || 'UN',
      valorUnitarioEstimado: i.valorUnitarioEstimado || 0,
      precosFornecedores: []
    }));

    const nova = new this.model({
      oportunidadeId,
      itens
    });
    return nova.save();
  }

  async findOne(id: string): Promise<Cotacao> {
    const doc = await this.model.findById(id).populate('itens.precosFornecedores.fornecedorId').exec();
    if (!doc) throw new NotFoundException('Cotação não encontrada');
    return doc;
  }

  async findByOportunidade(oportunidadeId: string): Promise<Cotacao> {
    const doc = await this.model.findOne({ oportunidadeId }).populate('itens.precosFornecedores.fornecedorId').exec();
    if (!doc) throw new NotFoundException('Cotação não encontrada para esta oportunidade');
    return doc;
  }

  async updatePreco(cotacaoId: string, itemId: string, precoData: { fornecedorId: string, precoUnitario: number, fatorEmbalagem?: number, precoEmbalagem?: number, nomeEmbalagem?: string, freteIncluso?: boolean, prazoPagamento?: number, permiteParcelamento?: boolean, observacao?: string }) {
    const doc = await this.model.findById(cotacaoId).exec();
    if (!doc) throw new NotFoundException('Cotação não encontrada');

    const item = doc.itens.find(i => i._id.toString() === itemId);
    if (!item) throw new NotFoundException('Item não encontrado na cotação');

    // Add or update provider price
    const fIdx = item.precosFornecedores.findIndex(p => p.fornecedorId.toString() === precoData.fornecedorId);
    if (fIdx >= 0) {
      item.precosFornecedores[fIdx].precoUnitario = precoData.precoUnitario;
      item.precosFornecedores[fIdx].fatorEmbalagem = precoData.fatorEmbalagem;
      item.precosFornecedores[fIdx].precoEmbalagem = precoData.precoEmbalagem;
      item.precosFornecedores[fIdx].nomeEmbalagem = precoData.nomeEmbalagem;
      item.precosFornecedores[fIdx].freteIncluso = precoData.freteIncluso;
      item.precosFornecedores[fIdx].prazoPagamento = precoData.prazoPagamento;
      item.precosFornecedores[fIdx].permiteParcelamento = precoData.permiteParcelamento;
      item.precosFornecedores[fIdx].observacao = precoData.observacao;
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
        observacao: precoData.observacao
      });
    }

    // Recalculate melhorPreco for this item
    let melhor: any;
    for (const p of item.precosFornecedores) {
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
    item.melhorPreco = melhor ? { fornecedorId: melhor.fornecedorId, precoUnitario: melhor.precoUnitario } : undefined;

    // Recalculate valorTotalMelhorCotacao
    doc.valorTotalMelhorCotacao = parseFloat(doc.itens.reduce((total, it) => {
      if (it.melhorPreco && !isNaN(it.melhorPreco.precoUnitario)) {
        return total + (it.melhorPreco.precoUnitario * (it.quantidade || 1));
      }
      return total;
    }, 0).toFixed(2));

    await doc.save();

    // Gravar no historico do fornecedor
    await this.fornecedorService.registrarHistoricoPreco(precoData.fornecedorId, {
      descricaoItem: item.descricaoItem,
      precoUnitario: precoData.precoUnitario,
      oportunidadeId: doc.oportunidadeId.toString()
    });

    return this.findOne(cotacaoId);
  }

  async removePreco(cotacaoId: string, itemId: string, fornecedorId: string) {
    const doc = await this.model.findById(cotacaoId).exec();
    if (!doc) throw new NotFoundException('Cotação não encontrada');

    const item = doc.itens.find(i => i._id.toString() === itemId);
    if (!item) throw new NotFoundException('Item não encontrado na cotação');

    // Remove supplier price entry
    item.precosFornecedores = item.precosFornecedores.filter(
      p => p.fornecedorId.toString() !== fornecedorId
    ) as any;

    // Recalculate melhorPreco for this item
    let melhor: any;
    for (const p of item.precosFornecedores) {
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
    item.melhorPreco = melhor ? { fornecedorId: melhor.fornecedorId, precoUnitario: melhor.precoUnitario } : undefined;

    // Recalculate valorTotalMelhorCotacao
    doc.valorTotalMelhorCotacao = doc.itens.reduce((total, it) => {
      if (it.melhorPreco && !isNaN(it.melhorPreco.precoUnitario)) {
        return total + (it.melhorPreco.precoUnitario * (it.quantidade || 1));
      }
      return total;
    }, 0);

    await doc.save();
    return this.findOne(cotacaoId);
  }
}
