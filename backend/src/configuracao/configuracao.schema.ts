import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ConfiguracaoDocument = HydratedDocument<Configuracao>;

@Schema({ timestamps: true })
export class Configuracao {
  @Prop({ default: '06:00' })
  horarioBuscaBot: string; // Deprecated, kept for backward compatibility

  @Prop({ type: [String], default: ['08:00', '12:00', '18:00'] })
  horariosBuscaBot: string[];
  ultimaExecucaoAutomaticaData: string;
}

export const ConfiguracaoSchema = SchemaFactory.createForClass(Configuracao);
