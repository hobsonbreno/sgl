import { Model } from 'mongoose';
import { Fornecedor, FornecedorDocument } from './fornecedor.schema';
export declare class FornecedorService {
    private model;
    constructor(model: Model<FornecedorDocument>);
    private validarCNPJ;
    create(data: any): Promise<Fornecedor>;
    findAll(categoria?: string, busca?: string): Promise<Fornecedor[]>;
    findOne(id: string): Promise<Fornecedor>;
    update(id: string, data: any): Promise<Fornecedor>;
    registrarHistoricoPreco(fornecedorId: string, itemData: {
        descricaoItem: string;
        precoUnitario: number;
        oportunidadeId: string;
    }): Promise<void>;
}
