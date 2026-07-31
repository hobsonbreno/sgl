import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type SimulacaoDocument = HydratedDocument<SimulacaoEstrategia>;

@Schema({ _id: false })
export class MesProjecao {
  @Prop({ required: true }) mesIndex: number;
  @Prop({ required: true }) rbt12Projetado: number;
  @Prop({ required: true }) faturamentoMensal: number;
  @Prop({ required: true }) aliquotaEfetiva: number;
  @Prop({ required: true }) impostoMensal: number;
  @Prop({ required: true }) lucroLiquidoMensal: number;
}

@Schema({ timestamps: true })
export class SimulacaoEstrategia {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Oportunidade',
    required: true,
  })
  oportunidadeId: mongoose.Types.ObjectId;

  @Prop({ required: true })
  lanceTotal: number;

  @Prop({ required: true })
  custoTotal: number;

  @Prop({ required: true, enum: ['INTEGRAL', 'FRACIONADO'] })
  modeloEntrega: string;

  @Prop({ required: true, default: 1 })
  mesesContrato: number;

  @Prop({ required: true })
  rbt12Inicial: number;

  @Prop({ type: [MesProjecao], default: [] })
  projecaoMensal: MesProjecao[];

  @Prop({ required: true })
  impostosTotal: number;

  @Prop({ required: true })
  lucroLiquidoTotal: number;
}

export const SimulacaoSchema =
  SchemaFactory.createForClass(SimulacaoEstrategia);
