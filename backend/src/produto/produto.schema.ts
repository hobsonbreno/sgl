import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProdutoDocument = HydratedDocument<Produto>;

@Schema({ timestamps: true })
export class Produto {
  @Prop()
  numeroItem: number;

  @Prop({ required: true })
  descricao: string;

  @Prop()
  quantidade: number;

  @Prop()
  unidadeMedida: string;

  @Prop()
  valorUnitarioEstimado: number;

  @Prop()
  valorTotalEstimado: number;

  @Prop()
  valorEstimado: number; // mantido por compatibilidade

  @Prop()
  valorNossoLance: number; // o valor final que a empresa deu de lance

  @Prop()
  valorConcorrente: number; // o menor lance do concorrente atual

  @Prop()
  situacaoJulgamento: string; // ex: 'Homologado', 'Aguardando julgamento', 'Finalizada'

  @Prop()
  vencedorCnpj: string;

  @Prop()
  vencedorNome: string;

  @Prop()
  valorVencedor: number;

  @Prop({ required: true })
  oportunidadeId: string; // PNCP id ou Oportunidade reference
}

export const ProdutoSchema = SchemaFactory.createForClass(Produto);
