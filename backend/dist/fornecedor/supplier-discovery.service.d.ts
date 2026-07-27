import { Model } from 'mongoose';
import { FornecedorDocument, ProdutoBaseDocument } from './fornecedor.schema';
import { PerfilBuscaDocument } from '../perfil-busca/perfil-busca.schema';
export declare class SupplierDiscoveryService {
    private fornecedorModel;
    private produtoBaseModel;
    private perfilBuscaModel;
    private readonly logger;
    constructor(fornecedorModel: Model<FornecedorDocument>, produtoBaseModel: Model<ProdutoBaseDocument>, perfilBuscaModel: Model<PerfilBuscaDocument>);
    private normalizeStr;
    private sanitizeQuery;
    private getSerpApiKeys;
    discoverSuppliersForProduct(descricao: string, location?: string): Promise<{
        razaoSocial: string;
        precoUnitario: number;
        linkProduto: string;
        id: string;
    }[]>;
}
