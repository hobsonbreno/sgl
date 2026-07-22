import { ConfiguracaoService } from './configuracao.service';
export declare class ConfiguracaoController {
    private readonly configuracaoService;
    constructor(configuracaoService: ConfiguracaoService);
    get(): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./configuracao.schema").Configuracao, {}, import("mongoose").DefaultSchemaOptions> & import("./configuracao.schema").Configuracao & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, import("./configuracao.schema").Configuracao, {}, import("mongoose").DefaultSchemaOptions> & import("./configuracao.schema").Configuracao & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>) | null>;
    update(body: any): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./configuracao.schema").Configuracao, {}, import("mongoose").DefaultSchemaOptions> & import("./configuracao.schema").Configuracao & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, import("./configuracao.schema").Configuracao, {}, import("mongoose").DefaultSchemaOptions> & import("./configuracao.schema").Configuracao & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>) | null>;
}
