import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Orgao } from './orgao.schema';

@Injectable()
export class OrgaoService {
  constructor(@InjectModel(Orgao.name) private model: Model<Orgao>) {}

  async findAll(query: any): Promise<{ data: Orgao[]; total: number; totalPages: number; currentPage: number }> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const data = await this.model.find().sort({ dataInclusao: -1 }).skip(skip).limit(limit).exec();
    const total = await this.model.countDocuments().exec();
    const totalPages = Math.ceil(total / limit) || 1;

    return { data, total, totalPages, currentPage: page };
  }
}
