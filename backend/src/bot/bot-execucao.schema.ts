import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type BotExecucaoDocument = HydratedDocument<BotExecucao>;

@Schema({ timestamps: true })
export class BotExecucao {
  @Prop({ required: true, default: Date.now })
  dataExecucao: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'PerfilBusca' })
  perfilBuscaId: mongoose.Types.ObjectId;

  @Prop({ required: true })
  totalEncontrados: number;

  @Prop({ required: true })
  totalNovos: number;

  @Prop([String])
  erros: string[];
}

export const BotExecucaoSchema = SchemaFactory.createForClass(BotExecucao);
