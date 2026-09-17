import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CategoriaDocument = HydratedDocument<Categoria>;

@Schema({ _id: false })
export class Subcategoria {
  @Prop({ required: true })
  nome: string;

  @Prop([String])
  palavrasChave: string[];
}
const SubcategoriaSchema = SchemaFactory.createForClass(Subcategoria);

@Schema({ timestamps: true })
export class Categoria {
  @Prop({ required: true, unique: true })
  nome: string;

  @Prop({ type: [SubcategoriaSchema], default: [] })
  subcategorias: Subcategoria[];
}

export const CategoriaSchema = SchemaFactory.createForClass(Categoria);
