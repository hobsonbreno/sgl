import { CotacaoService } from './cotacao.service';
export declare class UpdatePrecoDto {
    fornecedorId: string;
    precoUnitario: number;
    fatorEmbalagem?: number;
    precoEmbalagem?: number;
    nomeEmbalagem?: string;
    freteIncluso?: boolean;
    prazoPagamento?: number;
    permiteParcelamento?: boolean;
    observacao?: string;
    desclassificado?: boolean;
}
export declare class CreateCotacaoDto {
    itens?: any[];
}
export declare class CotacaoController {
    private readonly cotacaoService;
    constructor(cotacaoService: CotacaoService);
    createOrGet(oportunidadeId: string, data: CreateCotacaoDto): Promise<import("./cotacao.schema").Cotacao>;
    findByOportunidade(oportunidadeId: string): Promise<import("./cotacao.schema").Cotacao | null>;
    findOne(id: string): Promise<import("./cotacao.schema").Cotacao>;
    updatePreco(id: string, itemId: string, data: UpdatePrecoDto): Promise<import("./cotacao.schema").Cotacao>;
    removePreco(id: string, itemId: string, fornecedorId: string): Promise<import("./cotacao.schema").Cotacao>;
    buscarPrecosWeb(id: string, itemId: string, body?: {
        location?: string;
    }): Promise<{
        message: string;
        encontrados: number;
    }>;
}
