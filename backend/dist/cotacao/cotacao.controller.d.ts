import { CotacaoService } from './cotacao.service';
export declare class UpdatePrecoDto {
    fornecedorId: string;
    precoUnitario: number;
    observacao?: string;
}
export declare class CreateCotacaoDto {
    itens?: any[];
}
export declare class CotacaoController {
    private readonly cotacaoService;
    constructor(cotacaoService: CotacaoService);
    createOrGet(oportunidadeId: string, data: CreateCotacaoDto): Promise<import("./cotacao.schema").Cotacao>;
    findByOportunidade(oportunidadeId: string): Promise<import("./cotacao.schema").Cotacao>;
    findOne(id: string): Promise<import("./cotacao.schema").Cotacao>;
    updatePreco(id: string, itemId: string, data: UpdatePrecoDto): Promise<import("./cotacao.schema").Cotacao>;
}
