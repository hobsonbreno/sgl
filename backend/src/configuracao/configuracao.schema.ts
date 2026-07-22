import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ConfiguracaoDocument = HydratedDocument<Configuracao>;

@Schema({ timestamps: true })
export class Configuracao {
  @Prop({ default: '06:00' })
  horarioBuscaBot: string; // Deprecated, kept for backward compatibility

  @Prop({ type: [String], default: ['08:00', '12:00', '18:00'] })
  horariosBuscaBot: string[];
  
  @Prop()
  ultimaExecucaoAutomaticaData: string;

  @Prop({ type: [{ id: String, nome: String }], default: [
    { id: 'A_FAZER', nome: 'A FAZER' },
    { id: 'FAZENDO', nome: 'FAZENDO' },
    { id: 'FEITO', nome: 'FEITO' },
    { id: 'AGUARDANDO_RESPOSTA', nome: 'AGUARDANDO RESPOSTA' },
    { id: 'EXCLUIDA', nome: 'EXCLUÍDA' }
  ]})
  colunasKanban: { id: string, nome: string }[];
}

export const ConfiguracaoSchema = SchemaFactory.createForClass(Configuracao);
