import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ResultadoItemDocument = HydratedDocument<ResultadoItem>;

@Schema({ timestamps: true })
export class ResultadoItem {
  @Prop({ required: true })
  numeroControlePNCP: string;

  @Prop({ required: true })
  numeroItem: number;

  @Prop({ required: true })
  descricaoItem: string;

  @Prop({ required: true, index: true })
  palavraChaveExtraida: string;

  @Prop()
  niFornecedor: string;

  @Prop()
  nomeRazaoSocialFornecedor: string;

  @Prop()
  valorUnitarioHomologado: number;

  @Prop()
  valorTotalHomologado: number;

  @Prop()
  quantidadeHomologada: number;

  @Prop()
  dataResultado: Date;

  @Prop({ index: true })
  uf: string;
}

export const ResultadoItemSchema = SchemaFactory.createForClass(ResultadoItem);
ResultadoItemSchema.index({ palavraChaveExtraida: 1, uf: 1 });
