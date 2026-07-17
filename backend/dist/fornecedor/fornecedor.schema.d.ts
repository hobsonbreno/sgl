import { HydratedDocument } from 'mongoose';
export type FornecedorDocument = HydratedDocument<Fornecedor>;
export declare class Fornecedor {
    razaoSocial: string;
    cnpj: string;
    contato: {
        nome: string;
        telefone: string;
        email: string;
    }[];
    categorias: string[];
    origem: string;
}
export declare const FornecedorSchema: import("mongoose").Schema<Fornecedor, import("mongoose").Model<Fornecedor, any, any, any, any, any, Fornecedor>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Fornecedor, import("mongoose").Document<unknown, {}, Fornecedor, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Fornecedor & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    razaoSocial?: import("mongoose").SchemaDefinitionProperty<string, Fornecedor, import("mongoose").Document<unknown, {}, Fornecedor, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Fornecedor & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    cnpj?: import("mongoose").SchemaDefinitionProperty<string, Fornecedor, import("mongoose").Document<unknown, {}, Fornecedor, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Fornecedor & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    contato?: import("mongoose").SchemaDefinitionProperty<{
        nome: string;
        telefone: string;
        email: string;
    }[], Fornecedor, import("mongoose").Document<unknown, {}, Fornecedor, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Fornecedor & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    categorias?: import("mongoose").SchemaDefinitionProperty<string[], Fornecedor, import("mongoose").Document<unknown, {}, Fornecedor, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Fornecedor & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    origem?: import("mongoose").SchemaDefinitionProperty<string, Fornecedor, import("mongoose").Document<unknown, {}, Fornecedor, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Fornecedor & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, Fornecedor>;
