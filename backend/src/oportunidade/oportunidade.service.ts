import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Oportunidade, OportunidadeDocument } from './oportunidade.schema';

@Injectable()
export class OportunidadeService {
  constructor(@InjectModel(Oportunidade.name) private model: Model<OportunidadeDocument>) {}

  async findAll(query: any): Promise<{ data: Oportunidade[]; total: number }> {
    const filters: any = {};
    if (query.kanbanStatus) filters.kanbanStatus = query.kanbanStatus;
    if (query.uf) filters.uf = query.uf;
    if (query.modalidadeCodigo) filters.modalidadeCodigo = query.modalidadeCodigo;
    
    if (query.prazoAteEmDias) {
      const hoje = new Date();
      hoje.setDate(hoje.getDate() + Number(query.prazoAteEmDias));
      filters.dataEncerramentoProposta = { $lte: hoje, $gte: new Date() };
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const data = await this.model.find(filters).skip(skip).limit(limit).exec();
    const total = await this.model.countDocuments(filters).exec();

    return { data, total };
  }

  async findOne(id: string): Promise<Oportunidade> {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Oportunidade não encontrada');
    return doc;
  }

  async updateStatus(id: string, kanbanStatus: string): Promise<Oportunidade> {
    const statusValidos = ['A_FAZER', 'FAZENDO', 'FEITO', 'AGUARDANDO_RESPOSTA'];
    if (!statusValidos.includes(kanbanStatus)) {
      throw new BadRequestException('Status inválido');
    }

    const doc = await this.model.findByIdAndUpdate(
      id, 
      { kanbanStatus, dataMudancaStatus: new Date() }, 
      { new: true }
    ).exec();

    if (!doc) throw new NotFoundException('Oportunidade não encontrada');
    return doc;
  }
}
