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
    if (existe) return existe;

    const itens = initialItems.map(i => ({
      descricaoItem: i.descricao,
      quantidade: i.quantidade || 1,
      precosFornecedores: []
    }));

    return this.model.create({ oportunidadeId, itens, valorTotalMelhorCotacao: 0 });
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

  async updatePreco(cotacaoId: string, itemId: string, precoData: { fornecedorId: string, precoUnitario: number, observacao?: string }) {
    const doc = await this.model.findById(cotacaoId).exec();
    if (!doc) throw new NotFoundException('Cotação não encontrada');

    const item = doc.itens.find(i => i._id.toString() === itemId);
    if (!item) throw new NotFoundException('Item não encontrado na cotação');

    // Add or update provider price
    const fIdx = item.precosFornecedores.findIndex(p => p.fornecedorId.toString() === precoData.fornecedorId);
    if (fIdx >= 0) {
      item.precosFornecedores[fIdx].precoUnitario = precoData.precoUnitario;
      item.precosFornecedores[fIdx].observacao = precoData.observacao;
    } else {
      item.precosFornecedores.push({
        fornecedorId: new mongoose.Types.ObjectId(precoData.fornecedorId),
        precoUnitario: precoData.precoUnitario,
        observacao: precoData.observacao
      });
    }

    // Recalculate melhorPreco for this item
    let melhor: { fornecedorId: mongoose.Types.ObjectId, precoUnitario: number } | undefined;
    for (const p of item.precosFornecedores) {
      if (!melhor || p.precoUnitario < melhor.precoUnitario) {
        melhor = { fornecedorId: p.fornecedorId, precoUnitario: p.precoUnitario };
      }
    }
    item.melhorPreco = melhor;

    // Recalculate valorTotalMelhorCotacao
    doc.valorTotalMelhorCotacao = doc.itens.reduce((total, it) => {
      if (it.melhorPreco) {
        return total + (it.melhorPreco.precoUnitario * it.quantidade);
      }
      return total;
    }, 0);

    await doc.save();

    // Gravar no historico do fornecedor
    await this.fornecedorService.registrarHistoricoPreco(precoData.fornecedorId, {
      descricaoItem: item.descricaoItem,
      precoUnitario: precoData.precoUnitario,
      oportunidadeId: doc.oportunidadeId.toString()
    });

    return this.findOne(cotacaoId);
  }
}
