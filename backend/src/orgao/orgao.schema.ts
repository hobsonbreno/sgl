import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrgaoDocument = HydratedDocument<Orgao>;

@Schema({ timestamps: true })
export class Orgao {
  @Prop({ required: true })
  cnpj: string;

  @Prop({ required: true })
  nome: string;

  @Prop({ default: 'bot' })
  origem: string;
}

export const OrgaoSchema = SchemaFactory.createForClass(Orgao);
