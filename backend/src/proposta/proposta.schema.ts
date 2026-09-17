import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type PropostaDocument = HydratedDocument<Proposta>;

@Schema({ timestamps: true })
export class Proposta {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Oportunidade',
    required: true,
  })
  oportunidadeId: mongoose.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cotacao',
    required: true,
  })
  cotacaoId: mongoose.Types.ObjectId;

  @Prop({ required: true })
  valorTotalCotado: number;

  @Prop()
  margemAplicada?: number;

  @Prop({ required: true })
  valorLancado: number;

  @Prop({ default: Date.now })
  dataLancamento: Date;

  @Prop({ type: [String] })
  documentosAnexos?: string[];

  @Prop({
    required: true,
    enum: ['AGUARDANDO_RESPOSTA', 'VENCEDOR', 'PERDEU', 'CANCELADO'],
  })
  status: string;

  @Prop({ default: Date.now })
  dataAtualizacaoStatus: Date;

  @Prop()
  observacoes?: string;

  @Prop({ type: Number })
  posicaoAtual?: number;

  @Prop({ type: [String], default: [] })
  concorrentesDesclassificados?: string[];
}

export const PropostaSchema = SchemaFactory.createForClass(Proposta);
