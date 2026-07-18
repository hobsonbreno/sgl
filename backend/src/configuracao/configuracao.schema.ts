import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ConfiguracaoDocument = HydratedDocument<Configuracao>;

@Schema({ timestamps: true })
export class Configuracao {
  @Prop({ default: '06:00' })
  horarioBuscaBot: string;

  @Prop({ default: '' })
  ultimaExecucaoAutomaticaData: string;
}

export const ConfiguracaoSchema = SchemaFactory.createForClass(Configuracao);
