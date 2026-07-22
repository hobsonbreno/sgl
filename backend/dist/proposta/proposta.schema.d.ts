import mongoose, { HydratedDocument } from 'mongoose';
export type PropostaDocument = HydratedDocument<Proposta>;
export declare class Proposta {
    oportunidadeId: mongoose.Types.ObjectId;
    cotacaoId: mongoose.Types.ObjectId;
    valorTotalCotado: number;
    margemAplicada?: number;
    valorLancado: number;
    dataLancamento: Date;
    documentosAnexos?: string[];
    status: string;
    dataAtualizacaoStatus: Date;
    observacoes?: string;
}
export declare const PropostaSchema: mongoose.Schema<Proposta, mongoose.Model<Proposta, any, any, any, any, any, Proposta>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, Proposta, mongoose.Document<unknown, {}, Proposta, {
    id: string;
}, mongoose.DefaultSchemaOptions> & Omit<Proposta & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & mongoose.HydratedDocumentOverrides<{
    id: string;
}>, {
    oportunidadeId?: mongoose.SchemaDefinitionProperty<mongoose.Types.ObjectId, Proposta, mongoose.Document<unknown, {}, Proposta, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<Proposta & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & mongoose.HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    cotacaoId?: mongoose.SchemaDefinitionProperty<mongoose.Types.ObjectId, Proposta, mongoose.Document<unknown, {}, Proposta, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<Proposta & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & mongoose.HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    valorTotalCotado?: mongoose.SchemaDefinitionProperty<number, Proposta, mongoose.Document<unknown, {}, Proposta, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<Proposta & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & mongoose.HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    margemAplicada?: mongoose.SchemaDefinitionProperty<number | undefined, Proposta, mongoose.Document<unknown, {}, Proposta, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<Proposta & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & mongoose.HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    valorLancado?: mongoose.SchemaDefinitionProperty<number, Proposta, mongoose.Document<unknown, {}, Proposta, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<Proposta & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & mongoose.HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    dataLancamento?: mongoose.SchemaDefinitionProperty<Date, Proposta, mongoose.Document<unknown, {}, Proposta, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<Proposta & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & mongoose.HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    documentosAnexos?: mongoose.SchemaDefinitionProperty<string[] | undefined, Proposta, mongoose.Document<unknown, {}, Proposta, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<Proposta & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & mongoose.HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    status?: mongoose.SchemaDefinitionProperty<string, Proposta, mongoose.Document<unknown, {}, Proposta, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<Proposta & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & mongoose.HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    dataAtualizacaoStatus?: mongoose.SchemaDefinitionProperty<Date, Proposta, mongoose.Document<unknown, {}, Proposta, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<Proposta & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & mongoose.HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    observacoes?: mongoose.SchemaDefinitionProperty<string | undefined, Proposta, mongoose.Document<unknown, {}, Proposta, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<Proposta & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & mongoose.HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, Proposta>;
