import { HydratedDocument } from 'mongoose';
export type ProdutoDocument = HydratedDocument<Produto>;
export declare class Produto {
    numeroItem: number;
    descricao: string;
    quantidade: number;
    unidadeMedida: string;
    valorUnitarioEstimado: number;
    valorTotalEstimado: number;
    valorEstimado: number;
    valorNossoLance: number;
    valorConcorrente: number;
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
    numeroItem?: import("mongoose").SchemaDefinitionProperty<number, Produto, import("mongoose").Document<unknown, {}, Produto, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Produto & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
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
    valorUnitarioEstimado?: import("mongoose").SchemaDefinitionProperty<number, Produto, import("mongoose").Document<unknown, {}, Produto, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Produto & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    valorTotalEstimado?: import("mongoose").SchemaDefinitionProperty<number, Produto, import("mongoose").Document<unknown, {}, Produto, {
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
    valorNossoLance?: import("mongoose").SchemaDefinitionProperty<number, Produto, import("mongoose").Document<unknown, {}, Produto, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Produto & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    valorConcorrente?: import("mongoose").SchemaDefinitionProperty<number, Produto, import("mongoose").Document<unknown, {}, Produto, {
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
