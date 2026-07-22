import { HydratedDocument } from 'mongoose';
export type ConfiguracaoDocument = HydratedDocument<Configuracao>;
export declare class Configuracao {
    horarioBuscaBot: string;
    horariosBuscaBot: string[];
    ultimaExecucaoAutomaticaData: string;
    colunasKanban: {
        id: string;
        nome: string;
    }[];
}
export declare const ConfiguracaoSchema: import("mongoose").Schema<Configuracao, import("mongoose").Model<Configuracao, any, any, any, any, any, Configuracao>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Configuracao, import("mongoose").Document<unknown, {}, Configuracao, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Configuracao & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    horarioBuscaBot?: import("mongoose").SchemaDefinitionProperty<string, Configuracao, import("mongoose").Document<unknown, {}, Configuracao, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Configuracao & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    horariosBuscaBot?: import("mongoose").SchemaDefinitionProperty<string[], Configuracao, import("mongoose").Document<unknown, {}, Configuracao, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Configuracao & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    ultimaExecucaoAutomaticaData?: import("mongoose").SchemaDefinitionProperty<string, Configuracao, import("mongoose").Document<unknown, {}, Configuracao, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Configuracao & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    colunasKanban?: import("mongoose").SchemaDefinitionProperty<{
        id: string;
        nome: string;
    }[], Configuracao, import("mongoose").Document<unknown, {}, Configuracao, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Configuracao & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, Configuracao>;
