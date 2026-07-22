import { Model } from 'mongoose';
import { TransacaoFinanceira, TransacaoFinanceiraDocument } from './financeiro.schema';
import { OportunidadeDocument } from '../oportunidade/oportunidade.schema';
import { ProdutoDocument } from '../produto/produto.schema';
export declare class FinanceiroService {
    private transacaoModel;
    private oportunidadeModel;
    private produtoModel;
    constructor(transacaoModel: Model<TransacaoFinanceiraDocument>, oportunidadeModel: Model<OportunidadeDocument>, produtoModel: Model<ProdutoDocument>);
    create(createDto: any): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, TransacaoFinanceira, {}, import("mongoose").DefaultSchemaOptions> & TransacaoFinanceira & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, TransacaoFinanceira, {}, import("mongoose").DefaultSchemaOptions> & TransacaoFinanceira & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    findAll(): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, TransacaoFinanceira, {}, import("mongoose").DefaultSchemaOptions> & TransacaoFinanceira & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, TransacaoFinanceira, {}, import("mongoose").DefaultSchemaOptions> & TransacaoFinanceira & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[]>;
    findResumo(): Promise<{
        receitasPendentes: number;
        receitasPagas: number;
        despesasPendentes: number;
        despesasPagas: number;
        saldoAtual: number;
        saldoProjetado: number;
        valorNovasOportunidades: number;
    }>;
    findNegociosFechados(): Promise<{
        _id: import("mongoose").Types.ObjectId;
        orgaoNome: string;
        numeroControlePNCP: string;
        objetoCompra: string;
        valorTotalLancado: number;
    }[]>;
    receberNegocioFechado(oportunidadeId: string): Promise<{
        message: string;
    }>;
    update(id: string, updateDto: any): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, TransacaoFinanceira, {}, import("mongoose").DefaultSchemaOptions> & TransacaoFinanceira & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, TransacaoFinanceira, {}, import("mongoose").DefaultSchemaOptions> & TransacaoFinanceira & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>) | null>;
    remove(id: string): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, TransacaoFinanceira, {}, import("mongoose").DefaultSchemaOptions> & TransacaoFinanceira & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, TransacaoFinanceira, {}, import("mongoose").DefaultSchemaOptions> & TransacaoFinanceira & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>) | null>;
}
