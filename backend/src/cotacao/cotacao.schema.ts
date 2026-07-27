import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type CotacaoDocument = HydratedDocument<Cotacao>;

@Schema({ timestamps: true })
export class Cotacao {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Oportunidade',
    required: true,
  })
  oportunidadeId: mongoose.Types.ObjectId;

  @Prop({
    type: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        produtoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Produto' },
        descricaoItem: String,
        quantidade: Number,
        unidadeMedida: String,
        valorUnitarioEstimado: Number,
        precosFornecedores: [
          {
            fornecedorId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'Fornecedor',
            },
            precoUnitario: Number,
            fatorEmbalagem: Number,
            precoEmbalagem: Number,
            nomeEmbalagem: String,
            freteIncluso: { type: Boolean, default: false },
            prazoPagamento: { type: Number, default: 0 },
            permiteParcelamento: { type: Boolean, default: false },
            observacao: String,
            desclassificado: { type: Boolean, default: false },
            justificativaDesclassificacao: String,
            linkProduto: String,
          },
        ],
        melhorPreco: {
          fornecedorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Fornecedor',
          },
          precoUnitario: Number,
        },
      },
    ],
  })
  itens: {
    _id: mongoose.Types.ObjectId;
    produtoId?: mongoose.Types.ObjectId;
    descricaoItem: string;
    quantidade: number;
    unidadeMedida?: string;
    valorUnitarioEstimado?: number;
    precosFornecedores: {
      fornecedorId: mongoose.Types.ObjectId;
      precoUnitario: number;
      fatorEmbalagem?: number;
      precoEmbalagem?: number;
      nomeEmbalagem?: string;
      freteIncluso?: boolean;
      prazoPagamento?: number;
      permiteParcelamento?: boolean;
      observacao?: string;
      desclassificado?: boolean;
      justificativaDesclassificacao?: string;
      linkProduto?: string;
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
