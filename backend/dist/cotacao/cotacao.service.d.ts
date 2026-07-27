import { Model, Connection } from 'mongoose';
import { Cotacao, CotacaoDocument } from './cotacao.schema';
import { FornecedorService } from '../fornecedor/fornecedor.service';
import { SupplierDiscoveryService } from '../fornecedor/supplier-discovery.service';
export declare class CotacaoService {
    private model;
    private fornecedorService;
    private supplierDiscoveryService;
    private connection;
    constructor(model: Model<CotacaoDocument>, fornecedorService: FornecedorService, supplierDiscoveryService: SupplierDiscoveryService, connection: Connection);
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
        desclassificado?: boolean;
        linkProduto?: string;
    }): Promise<Cotacao>;
    private checkAndMoveKanban;
    removePreco(cotacaoId: string, itemId: string, fornecedorId: string): Promise<Cotacao>;
    buscarPrecosWebAuto(cotacaoId: string, itemId: string, location?: string): Promise<{
        message: string;
        encontrados: number;
    }>;
}
