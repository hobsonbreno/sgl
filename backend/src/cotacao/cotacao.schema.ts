import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type CotacaoDocument = HydratedDocument<Cotacao>;

@Schema({ timestamps: true })
export class Cotacao {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Oportunidade', required: true })
  oportunidadeId: mongoose.Types.ObjectId;

  @Prop({
    type: [{
      _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
      descricaoItem: String,
      quantidade: Number,
      precosFornecedores: [{
        fornecedorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fornecedor' },
        precoUnitario: Number,
        observacao: String
      }],
      melhorPreco: {
        fornecedorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fornecedor' },
        precoUnitario: Number
      }
    }]
  })
  itens: {
    _id: mongoose.Types.ObjectId;
    descricaoItem: string;
    quantidade: number;
    precosFornecedores: {
      fornecedorId: mongoose.Types.ObjectId;
      precoUnitario: number;
      observacao?: string;
    }[];
    melhorPreco?: {
      fornecedorId: mongoose.Types.ObjectId;
      precoUnitario: number;
    };
  }[];

  @Prop({ default: 0 })
  valorTotalMelhorCotacao: number;
}

export const CotacaoSchema = SchemaFactory.createForClass(Cotacao);
