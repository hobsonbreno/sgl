import { HydratedDocument } from 'mongoose';
export type OportunidadeDocument = HydratedDocument<Oportunidade>;
export declare class Oportunidade {
    numeroControlePNCP: string;
    tipo: string;
    modalidadeCodigo: number;
    modalidadeNome: string;
    orgaoCnpj: string;
    orgaoNome: string;
    uf: string;
    municipio: string;
    unidadeCompradora: string;
    numeroCompraOrigem: string;
    anoCompraOrigem: number;
    objetoCompra: string;
    valorTotalEstimado: number;
    dataAberturaProposta: Date;
    dataEncerramentoProposta: Date;
    linkSistemaOrigem: string;
    situacaoCompraNome: string;
    kanbanStatus: string;
    dataMudancaStatus: Date;
    usuarioNome: string;
    itens: any[];
}
export declare const OportunidadeSchema: import("mongoose").Schema<Oportunidade, import("mongoose").Model<Oportunidade, any, any, any, any, any, Oportunidade>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Oportunidade, import("mongoose").Document<unknown, {}, Oportunidade, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Oportunidade & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    numeroControlePNCP?: import("mongoose").SchemaDefinitionProperty<string, Oportunidade, import("mongoose").Document<unknown, {}, Oportunidade, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Oportunidade & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    tipo?: import("mongoose").SchemaDefinitionProperty<string, Oportunidade, import("mongoose").Document<unknown, {}, Oportunidade, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Oportunidade & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    modalidadeCodigo?: import("mongoose").SchemaDefinitionProperty<number, Oportunidade, import("mongoose").Document<unknown, {}, Oportunidade, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Oportunidade & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    modalidadeNome?: import("mongoose").SchemaDefinitionProperty<string, Oportunidade, import("mongoose").Document<unknown, {}, Oportunidade, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Oportunidade & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    orgaoCnpj?: import("mongoose").SchemaDefinitionProperty<string, Oportunidade, import("mongoose").Document<unknown, {}, Oportunidade, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Oportunidade & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    orgaoNome?: import("mongoose").SchemaDefinitionProperty<string, Oportunidade, import("mongoose").Document<unknown, {}, Oportunidade, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Oportunidade & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    uf?: import("mongoose").SchemaDefinitionProperty<string, Oportunidade, import("mongoose").Document<unknown, {}, Oportunidade, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Oportunidade & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    municipio?: import("mongoose").SchemaDefinitionProperty<string, Oportunidade, import("mongoose").Document<unknown, {}, Oportunidade, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Oportunidade & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    unidadeCompradora?: import("mongoose").SchemaDefinitionProperty<string, Oportunidade, import("mongoose").Document<unknown, {}, Oportunidade, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Oportunidade & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    numeroCompraOrigem?: import("mongoose").SchemaDefinitionProperty<string, Oportunidade, import("mongoose").Document<unknown, {}, Oportunidade, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Oportunidade & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    anoCompraOrigem?: import("mongoose").SchemaDefinitionProperty<number, Oportunidade, import("mongoose").Document<unknown, {}, Oportunidade, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Oportunidade & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    objetoCompra?: import("mongoose").SchemaDefinitionProperty<string, Oportunidade, import("mongoose").Document<unknown, {}, Oportunidade, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Oportunidade & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    valorTotalEstimado?: import("mongoose").SchemaDefinitionProperty<number, Oportunidade, import("mongoose").Document<unknown, {}, Oportunidade, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Oportunidade & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    dataAberturaProposta?: import("mongoose").SchemaDefinitionProperty<Date, Oportunidade, import("mongoose").Document<unknown, {}, Oportunidade, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Oportunidade & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    dataEncerramentoProposta?: import("mongoose").SchemaDefinitionProperty<Date, Oportunidade, import("mongoose").Document<unknown, {}, Oportunidade, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Oportunidade & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    linkSistemaOrigem?: import("mongoose").SchemaDefinitionProperty<string, Oportunidade, import("mongoose").Document<unknown, {}, Oportunidade, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Oportunidade & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    situacaoCompraNome?: import("mongoose").SchemaDefinitionProperty<string, Oportunidade, import("mongoose").Document<unknown, {}, Oportunidade, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Oportunidade & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    kanbanStatus?: import("mongoose").SchemaDefinitionProperty<string, Oportunidade, import("mongoose").Document<unknown, {}, Oportunidade, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Oportunidade & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    dataMudancaStatus?: import("mongoose").SchemaDefinitionProperty<Date, Oportunidade, import("mongoose").Document<unknown, {}, Oportunidade, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Oportunidade & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    usuarioNome?: import("mongoose").SchemaDefinitionProperty<string, Oportunidade, import("mongoose").Document<unknown, {}, Oportunidade, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Oportunidade & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    itens?: import("mongoose").SchemaDefinitionProperty<any[], Oportunidade, import("mongoose").Document<unknown, {}, Oportunidade, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Oportunidade & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, Oportunidade>;
