import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProdutoCnaeMapDocument = ProdutoCnaeMap & Document;

@Schema({ timestamps: true })
export class ProdutoCnaeMap {
  @Prop({ required: true, unique: true, index: true })
  produto: string; // Ex: "COMPUTADOR", "ARROZ"

  @Prop({ type: [String], default: [] })
  cnaes: string[]; // Ex: ["4751-2/01", "4649-4/08"]

  @Prop({ type: [String], default: [] })
  sinonimos: string[]; // Ex: ["NOTEBOOK", "PC", "DESKTOP"]
}

export const ProdutoCnaeMapSchema =
  SchemaFactory.createForClass(ProdutoCnaeMap);
