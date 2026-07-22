import { PropostaService } from './proposta.service';
export declare class PropostaController {
    private readonly propostaService;
    constructor(propostaService: PropostaService);
    criarProposta(id: string, payload: any): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./proposta.schema").Proposta, {}, import("mongoose").DefaultSchemaOptions> & import("./proposta.schema").Proposta & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, import("./proposta.schema").Proposta, {}, import("mongoose").DefaultSchemaOptions> & import("./proposta.schema").Proposta & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    atualizarStatus(id: string, status: string): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./proposta.schema").Proposta, {}, import("mongoose").DefaultSchemaOptions> & import("./proposta.schema").Proposta & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, import("./proposta.schema").Proposta, {}, import("mongoose").DefaultSchemaOptions> & import("./proposta.schema").Proposta & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    listar(query: any): Promise<{
        data: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./proposta.schema").Proposta, {}, import("mongoose").DefaultSchemaOptions> & import("./proposta.schema").Proposta & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & {
            id: string;
        }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, import("./proposta.schema").Proposta, {}, import("mongoose").DefaultSchemaOptions> & import("./proposta.schema").Proposta & {
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
    buscarPorId(id: string): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./proposta.schema").Proposta, {}, import("mongoose").DefaultSchemaOptions> & import("./proposta.schema").Proposta & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, import("./proposta.schema").Proposta, {}, import("mongoose").DefaultSchemaOptions> & import("./proposta.schema").Proposta & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
}
