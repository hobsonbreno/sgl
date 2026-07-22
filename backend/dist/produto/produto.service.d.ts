import { Model } from 'mongoose';
import { Produto } from './produto.schema';
export declare class ProdutoService {
    private model;
    constructor(model: Model<Produto>);
    findAll(query: any): Promise<{
        data: Produto[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    update(id: string, data: any): Promise<Produto | null>;
}
