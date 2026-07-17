import mongoose, { HydratedDocument } from 'mongoose';
export type BotExecucaoDocument = HydratedDocument<BotExecucao>;
export declare class BotExecucao {
    dataExecucao: Date;
    perfilBuscaId: mongoose.Types.ObjectId;
    totalEncontrados: number;
    totalNovos: number;
    erros: string[];
}
export declare const BotExecucaoSchema: mongoose.Schema<BotExecucao, mongoose.Model<BotExecucao, any, any, any, any, any, BotExecucao>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, BotExecucao, mongoose.Document<unknown, {}, BotExecucao, {
    id: string;
}, mongoose.DefaultSchemaOptions> & Omit<BotExecucao & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & mongoose.HydratedDocumentOverrides<{
    id: string;
}>, {
    dataExecucao?: mongoose.SchemaDefinitionProperty<Date, BotExecucao, mongoose.Document<unknown, {}, BotExecucao, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<BotExecucao & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & mongoose.HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    perfilBuscaId?: mongoose.SchemaDefinitionProperty<mongoose.Types.ObjectId, BotExecucao, mongoose.Document<unknown, {}, BotExecucao, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<BotExecucao & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & mongoose.HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    totalEncontrados?: mongoose.SchemaDefinitionProperty<number, BotExecucao, mongoose.Document<unknown, {}, BotExecucao, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<BotExecucao & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & mongoose.HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    totalNovos?: mongoose.SchemaDefinitionProperty<number, BotExecucao, mongoose.Document<unknown, {}, BotExecucao, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<BotExecucao & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & mongoose.HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    erros?: mongoose.SchemaDefinitionProperty<string[], BotExecucao, mongoose.Document<unknown, {}, BotExecucao, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<BotExecucao & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & mongoose.HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, BotExecucao>;
