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
    telefone: string;
    nomeConsultor: string;
    email: string;
    cep: string;
    endereco: string;
    bairro: string;
    cidade: string;
    uf: string;
    categorias: string[];
    site: string;
    portifolio: string;
    origem: string;
    fornecedor_historico_precos: {
        descricaoItem: string;
        precoUnitario: number;
        precoEmbalagem?: number;
        fatorEmbalagem?: number;
        data: Date;
        oportunidadeId: string;
    }[];
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
    telefone?: import("mongoose").SchemaDefinitionProperty<string, Fornecedor, import("mongoose").Document<unknown, {}, Fornecedor, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Fornecedor & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    nomeConsultor?: import("mongoose").SchemaDefinitionProperty<string, Fornecedor, import("mongoose").Document<unknown, {}, Fornecedor, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Fornecedor & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    email?: import("mongoose").SchemaDefinitionProperty<string, Fornecedor, import("mongoose").Document<unknown, {}, Fornecedor, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Fornecedor & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    cep?: import("mongoose").SchemaDefinitionProperty<string, Fornecedor, import("mongoose").Document<unknown, {}, Fornecedor, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Fornecedor & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    endereco?: import("mongoose").SchemaDefinitionProperty<string, Fornecedor, import("mongoose").Document<unknown, {}, Fornecedor, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Fornecedor & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    bairro?: import("mongoose").SchemaDefinitionProperty<string, Fornecedor, import("mongoose").Document<unknown, {}, Fornecedor, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Fornecedor & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    cidade?: import("mongoose").SchemaDefinitionProperty<string, Fornecedor, import("mongoose").Document<unknown, {}, Fornecedor, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Fornecedor & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    uf?: import("mongoose").SchemaDefinitionProperty<string, Fornecedor, import("mongoose").Document<unknown, {}, Fornecedor, {
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
    site?: import("mongoose").SchemaDefinitionProperty<string, Fornecedor, import("mongoose").Document<unknown, {}, Fornecedor, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Fornecedor & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    portifolio?: import("mongoose").SchemaDefinitionProperty<string, Fornecedor, import("mongoose").Document<unknown, {}, Fornecedor, {
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
    fornecedor_historico_precos?: import("mongoose").SchemaDefinitionProperty<{
        descricaoItem: string;
        precoUnitario: number;
        precoEmbalagem?: number;
        fatorEmbalagem?: number;
        data: Date;
        oportunidadeId: string;
    }[], Fornecedor, import("mongoose").Document<unknown, {}, Fornecedor, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Fornecedor & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, Fornecedor>;
export type ProdutoBaseDocument = HydratedDocument<ProdutoBase>;
export declare class ProdutoBase {
    descricaoItem: string;
    nossoLanceOficial: number;
    valorCampeaoLicitacao: number;
}
export declare const ProdutoBaseSchema: import("mongoose").Schema<ProdutoBase, import("mongoose").Model<ProdutoBase, any, any, any, any, any, ProdutoBase>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProdutoBase, import("mongoose").Document<unknown, {}, ProdutoBase, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<ProdutoBase & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    descricaoItem?: import("mongoose").SchemaDefinitionProperty<string, ProdutoBase, import("mongoose").Document<unknown, {}, ProdutoBase, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ProdutoBase & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    nossoLanceOficial?: import("mongoose").SchemaDefinitionProperty<number, ProdutoBase, import("mongoose").Document<unknown, {}, ProdutoBase, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ProdutoBase & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    valorCampeaoLicitacao?: import("mongoose").SchemaDefinitionProperty<number, ProdutoBase, import("mongoose").Document<unknown, {}, ProdutoBase, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ProdutoBase & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, ProdutoBase>;
