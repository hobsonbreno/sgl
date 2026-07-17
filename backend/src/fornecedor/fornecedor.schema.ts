import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FornecedorDocument = HydratedDocument<Fornecedor>;

@Schema({ timestamps: true })
export class Fornecedor {
  @Prop({ required: true })
  razaoSocial: string;

  @Prop({ required: true, unique: true })
  cnpj: string;

  @Prop({ type: [{ nome: String, telefone: String, email: String }] })
  contato: { nome: string; telefone: string; email: string }[];

  @Prop([String])
  categorias: string[];

  @Prop({ required: true, enum: ['manual', 'bot'] })
  origem: string;

  @Prop({ type: [{ descricaoItem: String, precoUnitario: Number, data: Date, oportunidadeId: String }] })
  fornecedor_historico_precos: { descricaoItem: string; precoUnitario: number; data: Date; oportunidadeId: string }[];
}

export const FornecedorSchema = SchemaFactory.createForClass(Fornecedor);
