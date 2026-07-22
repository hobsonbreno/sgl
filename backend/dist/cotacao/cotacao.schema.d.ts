import mongoose, { HydratedDocument } from 'mongoose';
export type CotacaoDocument = HydratedDocument<Cotacao>;
export declare class Cotacao {
    oportunidadeId: mongoose.Types.ObjectId;
    itens: {
        _id: mongoose.Types.ObjectId;
        produtoId?: mongoose.Types.ObjectId;
        descricaoItem: string;
        quantidade: number;
        unidadeMedida?: string;
        valorUnitarioEstimado?: number;
        precosFornecedores: {
            fornecedorId: mongoose.Types.ObjectId;
            precoUnitario: number;
            fatorEmbalagem?: number;
            precoEmbalagem?: number;
            nomeEmbalagem?: string;
            freteIncluso?: boolean;
            prazoPagamento?: number;
            permiteParcelamento?: boolean;
            observacao?: string;
        }[];
        melhorPreco?: {
            fornecedorId: mongoose.Types.ObjectId;
            precoUnitario: number;
        };
    }[];
    valorTotalMelhorCotacao: number;
}
export declare const CotacaoSchema: mongoose.Schema<Cotacao, mongoose.Model<Cotacao, any, any, any, any, any, Cotacao>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, Cotacao, mongoose.Document<unknown, {}, Cotacao, {
    id: string;
}, mongoose.DefaultSchemaOptions> & Omit<Cotacao & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & mongoose.HydratedDocumentOverrides<{
    id: string;
}>, {
    oportunidadeId?: mongoose.SchemaDefinitionProperty<mongoose.Types.ObjectId, Cotacao, mongoose.Document<unknown, {}, Cotacao, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<Cotacao & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & mongoose.HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    itens?: mongoose.SchemaDefinitionProperty<{
        _id: mongoose.Types.ObjectId;
        produtoId?: mongoose.Types.ObjectId;
        descricaoItem: string;
        quantidade: number;
        unidadeMedida?: string;
        valorUnitarioEstimado?: number;
        precosFornecedores: {
            fornecedorId: mongoose.Types.ObjectId;
            precoUnitario: number;
            fatorEmbalagem?: number;
            precoEmbalagem?: number;
            nomeEmbalagem?: string;
            freteIncluso?: boolean;
            prazoPagamento?: number;
            permiteParcelamento?: boolean;
            observacao?: string;
        }[];
        melhorPreco?: {
            fornecedorId: mongoose.Types.ObjectId;
            precoUnitario: number;
        };
    }[], Cotacao, mongoose.Document<unknown, {}, Cotacao, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<Cotacao & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & mongoose.HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    valorTotalMelhorCotacao?: mongoose.SchemaDefinitionProperty<number, Cotacao, mongoose.Document<unknown, {}, Cotacao, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<Cotacao & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & mongoose.HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, Cotacao>;
