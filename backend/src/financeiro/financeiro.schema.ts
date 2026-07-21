import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as mongoose from 'mongoose';

export type TransacaoFinanceiraDocument = HydratedDocument<TransacaoFinanceira>;

@Schema({ timestamps: true })
export class TransacaoFinanceira {
  @Prop({ required: true, enum: ['RECEITA', 'DESPESA'] })
  tipo: string;

  @Prop({ required: true })
  descricao: string;

  @Prop({ required: true })
  valor: number;

  @Prop({ required: true })
  dataVencimento: Date;

  @Prop()
  dataPagamento: Date;

  @Prop({ required: true, enum: ['PENDENTE', 'PAGO'], default: 'PENDENTE' })
  status: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Oportunidade' })
  oportunidadeId: mongoose.Types.ObjectId;
}

export const TransacaoFinanceiraSchema = SchemaFactory.createForClass(TransacaoFinanceira);
