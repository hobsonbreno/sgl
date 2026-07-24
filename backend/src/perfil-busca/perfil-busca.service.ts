import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PerfilBusca, PerfilBuscaDocument } from './perfil-busca.schema';

@Injectable()
export class PerfilBuscaService {
  constructor(
    @InjectModel(PerfilBusca.name) private model: Model<PerfilBuscaDocument>,
  ) {}

  async create(data: any): Promise<PerfilBusca> {
    if (!data.modalidades || data.modalidades.length === 0) {
      throw new BadRequestException('Pelo menos 1 modalidade é obrigatória.');
    }
    return this.model.create(data);
  }

  async findAll(): Promise<PerfilBusca[]> {
    return this.model.find().exec();
  }

  async findOne(id: string): Promise<PerfilBusca> {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Perfil não encontrado');
    return doc;
  }

  async update(id: string, data: any): Promise<PerfilBusca> {
    if (data.modalidades && data.modalidades.length === 0) {
      throw new BadRequestException('Pelo menos 1 modalidade é obrigatória.');
    }
    const doc = await this.model
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
    if (!doc) throw new NotFoundException('Perfil não encontrado');
    return doc;
  }

  async toggleActive(id: string): Promise<PerfilBusca> {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Perfil não encontrado');

    doc.ativo = !doc.ativo;
    return doc.save();
  }

  async remove(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id).exec();
  }
}
