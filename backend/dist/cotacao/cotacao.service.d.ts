import { Model } from 'mongoose';
import { Cotacao, CotacaoDocument } from './cotacao.schema';
import { FornecedorService } from '../fornecedor/fornecedor.service';
export declare class CotacaoService {
    private model;
    private fornecedorService;
    constructor(model: Model<CotacaoDocument>, fornecedorService: FornecedorService);
    createOrGet(oportunidadeId: string, initialItems?: any[]): Promise<Cotacao>;
    findOne(id: string): Promise<Cotacao>;
    findByOportunidade(oportunidadeId: string): Promise<Cotacao>;
    updatePreco(cotacaoId: string, itemId: string, precoData: {
        fornecedorId: string;
        precoUnitario: number;
        fatorEmbalagem?: number;
        precoEmbalagem?: number;
        nomeEmbalagem?: string;
        freteIncluso?: boolean;
        prazoPagamento?: number;
        permiteParcelamento?: boolean;
        observacao?: string;
    }): Promise<Cotacao>;
    removePreco(cotacaoId: string, itemId: string, fornecedorId: string): Promise<Cotacao>;
}
