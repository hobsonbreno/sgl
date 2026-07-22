import { FinanceiroService } from './financeiro.service';
export declare class FinanceiroController {
    private readonly financeiroService;
    constructor(financeiroService: FinanceiroService);
    create(createDto: any): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./financeiro.schema").TransacaoFinanceira, {}, import("mongoose").DefaultSchemaOptions> & import("./financeiro.schema").TransacaoFinanceira & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, import("./financeiro.schema").TransacaoFinanceira, {}, import("mongoose").DefaultSchemaOptions> & import("./financeiro.schema").TransacaoFinanceira & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    findAll(): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./financeiro.schema").TransacaoFinanceira, {}, import("mongoose").DefaultSchemaOptions> & import("./financeiro.schema").TransacaoFinanceira & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, import("./financeiro.schema").TransacaoFinanceira, {}, import("mongoose").DefaultSchemaOptions> & import("./financeiro.schema").TransacaoFinanceira & {
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
    receberNegocioFechado(id: string): Promise<{
        message: string;
    }>;
    update(id: string, updateDto: any): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./financeiro.schema").TransacaoFinanceira, {}, import("mongoose").DefaultSchemaOptions> & import("./financeiro.schema").TransacaoFinanceira & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, import("./financeiro.schema").TransacaoFinanceira, {}, import("mongoose").DefaultSchemaOptions> & import("./financeiro.schema").TransacaoFinanceira & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>) | null>;
    remove(id: string): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./financeiro.schema").TransacaoFinanceira, {}, import("mongoose").DefaultSchemaOptions> & import("./financeiro.schema").TransacaoFinanceira & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, import("./financeiro.schema").TransacaoFinanceira, {}, import("mongoose").DefaultSchemaOptions> & import("./financeiro.schema").TransacaoFinanceira & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>) | null>;
}
