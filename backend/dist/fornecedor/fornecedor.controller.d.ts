import { FornecedorService } from './fornecedor.service';
export declare class CreateFornecedorDto {
    razaoSocial: string;
    cnpj: string;
    contato?: {
        nome: string;
        telefone: string;
        email: string;
    }[];
    categorias?: string[];
}
export declare class FornecedorController {
    private readonly service;
    constructor(service: FornecedorService);
    create(data: CreateFornecedorDto): Promise<import("./fornecedor.schema").Fornecedor>;
    findAll(query: any): Promise<{
        data: import("./fornecedor.schema").Fornecedor[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getBaseProdutos(query: any): Promise<any>;
    updateProdutoBase(data: {
        descricaoItem: string;
        nossoLanceOficial?: number;
        valorCampeaoLicitacao?: number;
    }): Promise<import("./fornecedor.schema").ProdutoBase>;
    update(id: string, data: any): Promise<import("./fornecedor.schema").Fornecedor>;
    remove(id: string): Promise<void>;
}
