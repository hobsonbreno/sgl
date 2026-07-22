import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PerfilBuscaDocument = HydratedDocument<PerfilBusca>;

@Schema({ timestamps: true })
export class PerfilBusca {
  @Prop({ required: true })
  nome: string;

  @Prop([String])
  ufs: string[];

  @Prop([String])
  municipiosIbge: string[];

  @Prop([String])
  orgaosCnpj: string[];

  @Prop([String])
  unidadesUasg: string[];

  @Prop({ type: [Number], required: true })
  modalidades: number[];

  @Prop([String])
  palavrasChave: string[];

  @Prop({ default: true })
  ativo: boolean;
}

export const PerfilBuscaSchema = SchemaFactory.createForClass(PerfilBusca);
