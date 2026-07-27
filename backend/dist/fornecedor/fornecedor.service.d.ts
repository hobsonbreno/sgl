import { Model, Connection } from 'mongoose';
import { Fornecedor, FornecedorDocument, ProdutoBase, ProdutoBaseDocument } from './fornecedor.schema';
export declare class FornecedorService {
    private model;
    private intelModel;
    private connection;
    constructor(model: Model<FornecedorDocument>, intelModel: Model<ProdutoBaseDocument>, connection: Connection);
    private validarCNPJ;
    create(data: any): Promise<Fornecedor>;
    findAll(query: any): Promise<{
        data: Fornecedor[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    findOne(id: string): Promise<Fornecedor>;
    update(id: string, data: any): Promise<Fornecedor>;
    remove(id: string): Promise<void>;
    registrarHistoricoPreco(fornecedorId: string, itemData: {
        descricaoItem: string;
        precoUnitario: number;
        precoEmbalagem?: number;
        fatorEmbalagem?: number;
        nomeEmbalagem?: string;
        observacao?: string;
        desclassificado?: boolean;
        oportunidadeId: string;
    }): Promise<void>;
    removerHistoricoPreco(fornecedorId: string, descricaoItem: string, oportunidadeId: string): Promise<void>;
    getBaseProdutos(query?: any): Promise<any>;
    updateProdutoBase(descricaoItem: string, data: {
        nossoLanceOficial?: number;
        valorCampeaoLicitacao?: number;
    }): Promise<ProdutoBase>;
}
