import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Fornecedor, FornecedorDocument } from './fornecedor.schema';

@Injectable()
export class FornecedorService {
  constructor(@InjectModel(Fornecedor.name) private model: Model<FornecedorDocument>) {}

  private validarCNPJ(cnpj: string): boolean {
    const limpo = cnpj.replace(/[^\d]+/g, '');
    if (limpo.length !== 14) return false;
    // simplificação para validação básica
    return true; 
  }

  async create(data: any): Promise<Fornecedor> {
    if (!this.validarCNPJ(data.cnpj)) {
      throw new BadRequestException('CNPJ inválido');
    }
    const existe = await this.model.findOne({ cnpj: data.cnpj }).exec();
    if (existe) throw new BadRequestException('Fornecedor com este CNPJ já existe');
    
    return this.model.create({ ...data, origem: 'manual' });
  }

  async findAll(query: any): Promise<{ data: Fornecedor[]; total: number; totalPages: number; currentPage: number }> {
    const filters: any = {};
    if (query.categoria) filters.categorias = query.categoria;
    if (query.busca) {
      filters.$or = [
        { razaoSocial: { $regex: query.busca, $options: 'i' } },
        { cnpj: { $regex: query.busca, $options: 'i' } }
      ];
    }
    
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const data = await this.model.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit).exec();
    const total = await this.model.countDocuments(filters).exec();
    const totalPages = Math.ceil(total / limit) || 1;

    return { data, total, totalPages, currentPage: page };
  }

  async findOne(id: string): Promise<Fornecedor> {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Fornecedor não encontrado');
    return doc;
  }

  async update(id: string, data: any): Promise<Fornecedor> {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Fornecedor não encontrado');

    // Se origem for bot, só pode atualizar categorias e contato
    if (doc.origem === 'bot') {
      if (data.categorias) doc.categorias = data.categorias;
      if (data.contato) doc.contato = data.contato;
    } else {
      if (data.razaoSocial) doc.razaoSocial = data.razaoSocial;
      if (data.categorias) doc.categorias = data.categorias;
      if (data.contato) doc.contato = data.contato;
    }

    return doc.save();
  }

  async registrarHistoricoPreco(fornecedorId: string, itemData: { descricaoItem: string, precoUnitario: number, oportunidadeId: string }): Promise<void> {
    await this.model.findByIdAndUpdate(fornecedorId, {
      $push: {
        fornecedor_historico_precos: {
          ...itemData,
          data: new Date()
        }
      }
    });
  }
}
