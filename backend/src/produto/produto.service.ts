import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Produto } from './produto.schema';

@Injectable()
export class ProdutoService {
  constructor(@InjectModel(Produto.name) private model: Model<Produto>) {}

  async findAll(query: any): Promise<{ data: Produto[]; total: number; totalPages: number; currentPage: number }> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const filtro: any = {};
    if (query.oportunidadeId) {
      filtro.oportunidadeId = query.oportunidadeId;
    }

    const rawData = await this.model.find(filtro)
      .populate({
        path: 'oportunidadeId',
        match: { kanbanStatus: { $ne: 'EXCLUIDA' } },
        select: 'orgaoNome numeroControlePNCP kanbanStatus uf numeroCompraOrigem anoCompraOrigem'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    // Filtra os produtos onde a oportunidade foi excluída (populate retorna null)
    const data = rawData.filter(d => d.oportunidadeId !== null);

    const total = await this.model.countDocuments(filtro).exec();
    const totalPages = Math.ceil(total / limit) || 1;

    return { data, total, totalPages, currentPage: page };
  }

  async update(id: string, data: any): Promise<Produto | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
  }
}
