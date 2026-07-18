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
    findAll(categoria?: string, busca?: string): Promise<import("./fornecedor.schema").Fornecedor[]>;
    update(id: string, data: any): Promise<import("./fornecedor.schema").Fornecedor>;
}
