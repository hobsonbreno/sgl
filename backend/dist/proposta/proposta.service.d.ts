import { Model } from 'mongoose';
import { Proposta, PropostaDocument } from './proposta.schema';
import { CotacaoDocument } from '../cotacao/cotacao.schema';
import { OportunidadeDocument } from '../oportunidade/oportunidade.schema';
export declare class PropostaService {
    private propostaModel;
    private cotacaoModel;
    private oportunidadeModel;
    constructor(propostaModel: Model<PropostaDocument>, cotacaoModel: Model<CotacaoDocument>, oportunidadeModel: Model<OportunidadeDocument>);
    criarProposta(oportunidadeId: string, payload: any): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Proposta, {}, import("mongoose").DefaultSchemaOptions> & Proposta & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, Proposta, {}, import("mongoose").DefaultSchemaOptions> & Proposta & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    atualizarStatus(id: string, status: string): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Proposta, {}, import("mongoose").DefaultSchemaOptions> & Proposta & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, Proposta, {}, import("mongoose").DefaultSchemaOptions> & Proposta & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    listar(query: any): Promise<{
        data: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Proposta, {}, import("mongoose").DefaultSchemaOptions> & Proposta & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & {
            id: string;
        }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, Proposta, {}, import("mongoose").DefaultSchemaOptions> & Proposta & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & {
            id: string;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    buscarPorId(id: string): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Proposta, {}, import("mongoose").DefaultSchemaOptions> & Proposta & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, Proposta, {}, import("mongoose").DefaultSchemaOptions> & Proposta & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
}
