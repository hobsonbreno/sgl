import { HydratedDocument } from 'mongoose';
export type ProdutoDocument = HydratedDocument<Produto>;
export declare class Produto {
    descricao: string;
    quantidade: number;
    unidadeMedida: string;
    valorEstimado: number;
    oportunidadeId: string;
}
export declare const ProdutoSchema: import("mongoose").Schema<Produto, import("mongoose").Model<Produto, any, any, any, any, any, Produto>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Produto, import("mongoose").Document<unknown, {}, Produto, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Produto & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    descricao?: import("mongoose").SchemaDefinitionProperty<string, Produto, import("mongoose").Document<unknown, {}, Produto, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Produto & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    quantidade?: import("mongoose").SchemaDefinitionProperty<number, Produto, import("mongoose").Document<unknown, {}, Produto, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Produto & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    unidadeMedida?: import("mongoose").SchemaDefinitionProperty<string, Produto, import("mongoose").Document<unknown, {}, Produto, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Produto & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    valorEstimado?: import("mongoose").SchemaDefinitionProperty<number, Produto, import("mongoose").Document<unknown, {}, Produto, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Produto & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    oportunidadeId?: import("mongoose").SchemaDefinitionProperty<string, Produto, import("mongoose").Document<unknown, {}, Produto, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Produto & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, Produto>;
