import { HydratedDocument } from 'mongoose';
import * as mongoose from 'mongoose';
export type TransacaoFinanceiraDocument = HydratedDocument<TransacaoFinanceira>;
export declare class TransacaoFinanceira {
    tipo: string;
    descricao: string;
    valor: number;
    dataVencimento: Date;
    dataPagamento: Date;
    status: string;
    oportunidadeId: mongoose.Types.ObjectId;
}
export declare const TransacaoFinanceiraSchema: mongoose.Schema<TransacaoFinanceira, mongoose.Model<TransacaoFinanceira, any, any, any, any, any, TransacaoFinanceira>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, TransacaoFinanceira, mongoose.Document<unknown, {}, TransacaoFinanceira, {
    id: string;
}, mongoose.DefaultSchemaOptions> & Omit<TransacaoFinanceira & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & mongoose.HydratedDocumentOverrides<{
    id: string;
}>, {
    tipo?: mongoose.SchemaDefinitionProperty<string, TransacaoFinanceira, mongoose.Document<unknown, {}, TransacaoFinanceira, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<TransacaoFinanceira & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & mongoose.HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    descricao?: mongoose.SchemaDefinitionProperty<string, TransacaoFinanceira, mongoose.Document<unknown, {}, TransacaoFinanceira, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<TransacaoFinanceira & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & mongoose.HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    valor?: mongoose.SchemaDefinitionProperty<number, TransacaoFinanceira, mongoose.Document<unknown, {}, TransacaoFinanceira, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<TransacaoFinanceira & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & mongoose.HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    dataVencimento?: mongoose.SchemaDefinitionProperty<Date, TransacaoFinanceira, mongoose.Document<unknown, {}, TransacaoFinanceira, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<TransacaoFinanceira & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & mongoose.HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    dataPagamento?: mongoose.SchemaDefinitionProperty<Date, TransacaoFinanceira, mongoose.Document<unknown, {}, TransacaoFinanceira, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<TransacaoFinanceira & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & mongoose.HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    status?: mongoose.SchemaDefinitionProperty<string, TransacaoFinanceira, mongoose.Document<unknown, {}, TransacaoFinanceira, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<TransacaoFinanceira & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & mongoose.HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    oportunidadeId?: mongoose.SchemaDefinitionProperty<mongoose.Types.ObjectId, TransacaoFinanceira, mongoose.Document<unknown, {}, TransacaoFinanceira, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<TransacaoFinanceira & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & mongoose.HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, TransacaoFinanceira>;
