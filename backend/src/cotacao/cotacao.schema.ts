import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type CotacaoDocument = HydratedDocument<Cotacao>;

@Schema({ timestamps: true })
export class Cotacao {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Oportunidade',
    required: true,
  })
  oportunidadeId: mongoose.Types.ObjectId;

  @Prop({
    type: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        produtoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Produto' },
        numeroItem: Number,
        numeroLote: Number,
        descricaoItem: String,
        quantidade: Number,
        unidadeMedida: String,
        valorUnitarioEstimado: Number,
        precosFornecedores: [
          {
            fornecedorId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'Fornecedor',
            },
            precoUnitario: Number,
            fatorEmbalagem: Number,
            precoEmbalagem: Number,
            nomeEmbalagem: String,
            freteIncluso: { type: Boolean, default: false },
            prazoPagamento: { type: Number, default: 0 },
            permiteParcelamento: { type: Boolean, default: false },
            observacao: String,
            desclassificado: { type: Boolean, default: false },
            justificativaDesclassificacao: String,
            linkProduto: String,
            precoCustoContrato: Number,
            dataAssinaturaContrato: Date,
            valorOfertadoOrgao: Number,
            valorFechadoOrgao: Number,
            valorVendaReajuste: Number,
            motivoContrato: String,
            quantidadeEntregue: Number,
            entregasContrato: [
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
            dataUltimaAtualizacaoCusto: Date,
            informeReajuste: String,
            chatNegociacao: String,
            historicoNegociacao: [
              {
                data: { type: Date, default: Date.now },
                tipo: { type: String, default: 'ATUALIZACAO_CUSTO' },
                motivoContrato: String,
                precoCustoContrato: Number,
                precoCustoAnterior: Number,
                precoCustoAtual: Number,
                valorOfertadoOrgao: Number,
                valorFechadoOrgao: Number,
                valorVendaReajuste: Number,
                lucroContratoUnitario: Number,
                percentualLucroContrato: Number,
                resultadoAtualUnitario: Number,
                lucroPosReajusteUnitario: Number,
                valorSugeridoReajuste: Number,
                quantidadeEntregue: Number,
                dataAssinaturaContrato: Date,
                informe: String,
                chatNegociacao: String,
              },
            ],
          },
        ],
        melhorPreco: {
          fornecedorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Fornecedor',
          },
          precoUnitario: Number,
        },
      },
    ],
  })
  itens: {
    _id: mongoose.Types.ObjectId;
    produtoId?: mongoose.Types.ObjectId;
    numeroItem?: number;
    numeroLote?: number;
    descricaoItem: string;
    quantidade: number;
    unidadeMedida?: string;
    valorUnitarioEstimado?: number;
    precosFornecedores: {
      fornecedorId: mongoose.Types.ObjectId;
      precoUnitario: number;
      fatorEmbalagem?: number;
      precoEmbalagem?: number;
      nomeEmbalagem?: string;
      freteIncluso?: boolean;
      prazoPagamento?: number;
      permiteParcelamento?: boolean;
      observacao?: string;
      desclassificado?: boolean;
      justificativaDesclassificacao?: string;
      linkProduto?: string;
      precoCustoContrato?: number;
      dataAssinaturaContrato?: Date;
      valorOfertadoOrgao?: number;
      valorFechadoOrgao?: number;
      valorVendaReajuste?: number;
      motivoContrato?: string;
      quantidadeEntregue?: number;
      entregasContrato?: {
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
      dataUltimaAtualizacaoCusto?: Date;
      informeReajuste?: string;
      chatNegociacao?: string;
      historicoNegociacao?: {
        data: Date;
        tipo?: string;
        motivoContrato?: string;
        precoCustoContrato?: number;
        precoCustoAnterior?: number;
        precoCustoAtual: number;
        valorOfertadoOrgao?: number;
        valorFechadoOrgao?: number;
        valorVendaReajuste?: number;
        lucroContratoUnitario?: number;
        percentualLucroContrato?: number;
        resultadoAtualUnitario?: number;
        lucroPosReajusteUnitario?: number;
        valorSugeridoReajuste?: number;
        quantidadeEntregue?: number;
        dataAssinaturaContrato?: Date;
        informe?: string;
        chatNegociacao?: string;
      }[];
    }[];
    melhorPreco?: {
      fornecedorId: mongoose.Types.ObjectId;
      precoUnitario: number;
    };
  }[];

  @Prop({ default: 0 })
  valorTotalMelhorCotacao: number;
}

export const CotacaoSchema = SchemaFactory.createForClass(Cotacao);

CotacaoSchema.index({ oportunidadeId: 1 });
