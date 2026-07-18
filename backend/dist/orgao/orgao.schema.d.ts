import { HydratedDocument } from 'mongoose';
export type OrgaoDocument = HydratedDocument<Orgao>;
export declare class Orgao {
    cnpj: string;
    nome: string;
    origem: string;
}
export declare const OrgaoSchema: import("mongoose").Schema<Orgao, import("mongoose").Model<Orgao, any, any, any, any, any, Orgao>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Orgao, import("mongoose").Document<unknown, {}, Orgao, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Orgao & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    cnpj?: import("mongoose").SchemaDefinitionProperty<string, Orgao, import("mongoose").Document<unknown, {}, Orgao, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Orgao & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    nome?: import("mongoose").SchemaDefinitionProperty<string, Orgao, import("mongoose").Document<unknown, {}, Orgao, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Orgao & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    origem?: import("mongoose").SchemaDefinitionProperty<string, Orgao, import("mongoose").Document<unknown, {}, Orgao, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Orgao & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, Orgao>;
