import { HydratedDocument } from 'mongoose';
export type PerfilBuscaDocument = HydratedDocument<PerfilBusca>;
export declare class PerfilBusca {
    nome: string;
    ufs: string[];
    municipiosIbge: string[];
    orgaosCnpj: string[];
    unidadesUasg: string[];
    modalidades: number[];
    palavrasChave: string[];
    ativo: boolean;
}
export declare const PerfilBuscaSchema: import("mongoose").Schema<PerfilBusca, import("mongoose").Model<PerfilBusca, any, any, any, any, any, PerfilBusca>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PerfilBusca, import("mongoose").Document<unknown, {}, PerfilBusca, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<PerfilBusca & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    nome?: import("mongoose").SchemaDefinitionProperty<string, PerfilBusca, import("mongoose").Document<unknown, {}, PerfilBusca, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PerfilBusca & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    ufs?: import("mongoose").SchemaDefinitionProperty<string[], PerfilBusca, import("mongoose").Document<unknown, {}, PerfilBusca, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PerfilBusca & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    municipiosIbge?: import("mongoose").SchemaDefinitionProperty<string[], PerfilBusca, import("mongoose").Document<unknown, {}, PerfilBusca, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PerfilBusca & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    orgaosCnpj?: import("mongoose").SchemaDefinitionProperty<string[], PerfilBusca, import("mongoose").Document<unknown, {}, PerfilBusca, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PerfilBusca & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    unidadesUasg?: import("mongoose").SchemaDefinitionProperty<string[], PerfilBusca, import("mongoose").Document<unknown, {}, PerfilBusca, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PerfilBusca & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    modalidades?: import("mongoose").SchemaDefinitionProperty<number[], PerfilBusca, import("mongoose").Document<unknown, {}, PerfilBusca, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PerfilBusca & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    palavrasChave?: import("mongoose").SchemaDefinitionProperty<string[], PerfilBusca, import("mongoose").Document<unknown, {}, PerfilBusca, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PerfilBusca & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    ativo?: import("mongoose").SchemaDefinitionProperty<boolean, PerfilBusca, import("mongoose").Document<unknown, {}, PerfilBusca, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PerfilBusca & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, PerfilBusca>;
