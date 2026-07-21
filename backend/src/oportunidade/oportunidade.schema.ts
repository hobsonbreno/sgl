import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OportunidadeDocument = HydratedDocument<Oportunidade>;

@Schema({ timestamps: true })
export class Oportunidade {
  @Prop({ required: true, unique: true })
  numeroControlePNCP: string;

  @Prop({ required: true, enum: ['licitacao', 'dispensa'] })
  tipo: string;

  @Prop({ required: true })
  modalidadeCodigo: number;

  @Prop({ required: true })
  modalidadeNome: string;

  @Prop({ required: true })
  orgaoCnpj: string;

  @Prop({ required: true })
  orgaoNome: string;

  @Prop()
  uf: string;

  @Prop()
  municipio: string;

  @Prop()
  objetoCompra: string;

  @Prop()
  valorTotalEstimado: number;

  @Prop()
  dataAberturaProposta: Date;

  @Prop()
  dataEncerramentoProposta: Date;

  @Prop()
  linkSistemaOrigem: string;

  @Prop()
  situacaoCompraNome: string;

  @Prop({ required: true, enum: ['A_FAZER', 'FAZENDO', 'FEITO', 'AGUARDANDO_RESPOSTA', 'EXCLUIDA'], default: 'A_FAZER' })
  kanbanStatus: string;

  @Prop()
  dataMudancaStatus: Date;

  @Prop({ type: [Object] })
  itens: any[];
}

export const OportunidadeSchema = SchemaFactory.createForClass(Oportunidade);
