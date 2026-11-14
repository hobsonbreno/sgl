import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FornecedorDocument = HydratedDocument<Fornecedor>;

@Schema({ timestamps: true })
export class Fornecedor {
  @Prop({ required: true })
  razaoSocial: string;

  @Prop({ required: true, unique: true })
  cnpj: string;

  @Prop({ type: [{ nome: String, telefone: String, email: String }] })
  contato: { nome: string; telefone: string; email: string }[];

  @Prop()
  telefone: string;

  @Prop()
  nomeConsultor: string;

  @Prop()
  email: string;

  @Prop()
  cep: string;

  @Prop()
  endereco: string;

  @Prop()
  bairro: string;

  @Prop()
  cidade: string;

  @Prop()
  uf: string;

  @Prop([String])
  categorias: string[];

  @Prop()
  site: string;

  @Prop()
  portifolio: string;

  @Prop({ required: true, enum: ['manual', 'bot'] })
  origem: string;

  @Prop({
    type: [
      {
        descricaoItem: String,
        precoUnitario: Number,
        precoEmbalagem: Number,
        fatorEmbalagem: Number,
        nomeEmbalagem: String,
        observacao: String,
        desclassificado: Boolean,
        data: Date,
        oportunidadeId: String,
        tipoRegistro: String,
        precoCustoContrato: Number,
        precoCustoAnterior: Number,
        valorOfertadoOrgao: Number,
        valorFechadoOrgao: Number,
        lucroContratoUnitario: Number,
        percentualLucroContrato: Number,
        resultadoAtualUnitario: Number,
        valorSugeridoReajuste: Number,
        quantidadeContratada: Number,
        quantidadeEntregue: Number,
        dataAssinaturaContrato: Date,
        orgaoNome: String,
        uasg: String,
        pregaoNumero: String,
        numeroItem: Number,
        informe: String,
        chatNegociacao: String,
      },
    ],
  })
  fornecedor_historico_precos: {
    descricaoItem: string;
    precoUnitario: number;
    precoEmbalagem?: number;
    fatorEmbalagem?: number;
    nomeEmbalagem?: string;
    observacao?: string;
    desclassificado?: boolean;
    data: Date;
    oportunidadeId: string;
    tipoRegistro?: string;
    precoCustoContrato?: number;
    precoCustoAnterior?: number;
    valorOfertadoOrgao?: number;
    valorFechadoOrgao?: number;
    lucroContratoUnitario?: number;
    percentualLucroContrato?: number;
    resultadoAtualUnitario?: number;
    valorSugeridoReajuste?: number;
    quantidadeContratada?: number;
    quantidadeEntregue?: number;
    dataAssinaturaContrato?: Date;
    orgaoNome?: string;
    uasg?: string;
    pregaoNumero?: string;
    numeroItem?: number;
    informe?: string;
    chatNegociacao?: string;
  }[];
}

export const FornecedorSchema = SchemaFactory.createForClass(Fornecedor);

export type ProdutoBaseDocument = HydratedDocument<ProdutoBase>;

@Schema({ timestamps: true })
export class ProdutoBase {
  @Prop({ required: true })
  descricaoItem: string;

  @Prop()
  nossoLanceOficial: number;

  @Prop()
  valorCampeaoLicitacao: number;

  @Prop()
  precoCustoContrato: number;

  @Prop()
  precoCustoAtual: number;

  @Prop()
  valorOfertadoOrgao: number;

  @Prop()
  valorFechadoOrgao: number;

  @Prop()
  valorVendaReajuste: number;

  @Prop()
  motivoContrato: string;

  @Prop()
  dataAssinaturaContrato: Date;

  @Prop()
  dataUltimoReajuste: Date;

  @Prop()
  orgaoNome: string;

  @Prop()
  uasg: string;

  @Prop()
  pregaoNumero: string;

  @Prop()
  numeroItem: number;

  @Prop()
  quantidadeContratada: number;

  @Prop()
  quantidadeEntregue: number;

  @Prop({
    type: [
      {
        dataEntrega: String,
        comandoDestino: String,
        notaEmpenho: String,
        notaFiscal: String,
        quantidade: Number,
        regimeEntrega: String,
        custoCompraUnitario: Number,
        valorFaturadoUnitario: Number,
        observacao: String,
      },
    ],
  })
  entregasContrato: {
    dataEntrega?: string;
    comandoDestino?: string;
    notaEmpenho?: string;
    notaFiscal?: string;
    quantidade: number;
    regimeEntrega?: string;
    custoCompraUnitario?: number;
    valorFaturadoUnitario?: number;
    observacao?: string;
  }[];

  @Prop()
  fornecedorNome: string;

  @Prop()
  fornecedorCnpj: string;

  @Prop()
  informeUltimoReajuste: string;

  @Prop()
  chatNegociacao: string;

  @Prop({
    type: [
      {
        data: { type: Date, default: Date.now },
        tipo: String,
        fornecedorId: String,
        fornecedorNome: String,
        fornecedorCnpj: String,
        oportunidadeId: String,
        orgaoNome: String,
        uasg: String,
        pregaoNumero: String,
        numeroItem: Number,
        quantidadeContratada: Number,
        quantidadeEntregue: Number,
        precoCustoContrato: Number,
        precoCustoAnterior: Number,
        precoCustoAtual: Number,
        valorOfertadoOrgao: Number,
        valorFechadoOrgao: Number,
        valorVendaReajuste: Number,
        motivoContrato: String,
        lucroContratoUnitario: Number,
        percentualLucroContrato: Number,
        resultadoAtualUnitario: Number,
        lucroPosReajusteUnitario: Number,
        valorSugeridoReajuste: Number,
        dataAssinaturaContrato: Date,
        informe: String,
        chatNegociacao: String,
      },
    ],
  })
  historicoReajustes: {
    data: Date;
    tipo?: string;
    motivoContrato?: string;
    fornecedorId?: string;
    fornecedorNome?: string;
    fornecedorCnpj?: string;
    oportunidadeId?: string;
    orgaoNome?: string;
    uasg?: string;
    pregaoNumero?: string;
    numeroItem?: number;
    quantidadeContratada?: number;
    quantidadeEntregue?: number;
    precoCustoContrato?: number;
    precoCustoAnterior?: number;
    precoCustoAtual?: number;
    valorOfertadoOrgao?: number;
    valorFechadoOrgao?: number;
    valorVendaReajuste?: number;
    lucroContratoUnitario?: number;
    percentualLucroContrato?: number;
    resultadoAtualUnitario?: number;
    lucroPosReajusteUnitario?: number;
    valorSugeridoReajuste?: number;
    dataAssinaturaContrato?: Date;
    informe?: string;
    chatNegociacao?: string;
  }[];
}

export const ProdutoBaseSchema = SchemaFactory.createForClass(ProdutoBase);
