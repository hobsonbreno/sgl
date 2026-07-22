import { ProdutoService } from './produto.service';
export declare class ProdutoController {
    private readonly service;
    constructor(service: ProdutoService);
    findAll(query: any): Promise<{
        data: import("./produto.schema").Produto[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    update(id: string, body: any): Promise<import("./produto.schema").Produto | null>;
}
