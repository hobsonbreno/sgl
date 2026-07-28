import { Document } from 'mongoose';
export type EmpresaDataLakeDocument = EmpresaDataLake & Document;
export declare class EmpresaDataLake {
    cnpj: string;
    cnpj_basico: string;
    razao_social?: string;
    capital_social?: number;
    cnae_principal: string;
    cnae_descricao?: string;
    situacao_cadastral: string;
    uf: string;
    municipio: string;
    cep?: string;
    telefone?: string;
    email?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
}
export declare const EmpresaDataLakeSchema: import("mongoose").Schema<EmpresaDataLake, import("mongoose").Model<EmpresaDataLake, any, any, any, any, any, EmpresaDataLake>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, EmpresaDataLake, Document<unknown, {}, EmpresaDataLake, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<EmpresaDataLake & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    cnpj?: import("mongoose").SchemaDefinitionProperty<string, EmpresaDataLake, Document<unknown, {}, EmpresaDataLake, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EmpresaDataLake & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    cnpj_basico?: import("mongoose").SchemaDefinitionProperty<string, EmpresaDataLake, Document<unknown, {}, EmpresaDataLake, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EmpresaDataLake & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    razao_social?: import("mongoose").SchemaDefinitionProperty<string | undefined, EmpresaDataLake, Document<unknown, {}, EmpresaDataLake, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EmpresaDataLake & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    capital_social?: import("mongoose").SchemaDefinitionProperty<number | undefined, EmpresaDataLake, Document<unknown, {}, EmpresaDataLake, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EmpresaDataLake & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    cnae_principal?: import("mongoose").SchemaDefinitionProperty<string, EmpresaDataLake, Document<unknown, {}, EmpresaDataLake, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EmpresaDataLake & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    cnae_descricao?: import("mongoose").SchemaDefinitionProperty<string | undefined, EmpresaDataLake, Document<unknown, {}, EmpresaDataLake, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EmpresaDataLake & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    situacao_cadastral?: import("mongoose").SchemaDefinitionProperty<string, EmpresaDataLake, Document<unknown, {}, EmpresaDataLake, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EmpresaDataLake & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    uf?: import("mongoose").SchemaDefinitionProperty<string, EmpresaDataLake, Document<unknown, {}, EmpresaDataLake, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EmpresaDataLake & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    municipio?: import("mongoose").SchemaDefinitionProperty<string, EmpresaDataLake, Document<unknown, {}, EmpresaDataLake, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EmpresaDataLake & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    cep?: import("mongoose").SchemaDefinitionProperty<string | undefined, EmpresaDataLake, Document<unknown, {}, EmpresaDataLake, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EmpresaDataLake & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    telefone?: import("mongoose").SchemaDefinitionProperty<string | undefined, EmpresaDataLake, Document<unknown, {}, EmpresaDataLake, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EmpresaDataLake & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    email?: import("mongoose").SchemaDefinitionProperty<string | undefined, EmpresaDataLake, Document<unknown, {}, EmpresaDataLake, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EmpresaDataLake & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    logradouro?: import("mongoose").SchemaDefinitionProperty<string | undefined, EmpresaDataLake, Document<unknown, {}, EmpresaDataLake, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EmpresaDataLake & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    numero?: import("mongoose").SchemaDefinitionProperty<string | undefined, EmpresaDataLake, Document<unknown, {}, EmpresaDataLake, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EmpresaDataLake & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    complemento?: import("mongoose").SchemaDefinitionProperty<string | undefined, EmpresaDataLake, Document<unknown, {}, EmpresaDataLake, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EmpresaDataLake & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    bairro?: import("mongoose").SchemaDefinitionProperty<string | undefined, EmpresaDataLake, Document<unknown, {}, EmpresaDataLake, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EmpresaDataLake & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, EmpresaDataLake>;
