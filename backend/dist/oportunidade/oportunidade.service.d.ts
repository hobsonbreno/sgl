import { Model } from 'mongoose';
import { Oportunidade, OportunidadeDocument } from './oportunidade.schema';
import { PncpClientService } from '../pncp/services/pncp-client/pncp-client.service';
import { ProdutoDocument } from '../produto/produto.schema';
export declare class OportunidadeService {
    private model;
    private readonly pncpClientService;
    private produtoModel;
    private readonly logger;
    constructor(model: Model<OportunidadeDocument>, pncpClientService: PncpClientService, produtoModel: Model<ProdutoDocument>);
    findAll(query: any): Promise<{
        data: Oportunidade[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    findOne(id: string): Promise<Oportunidade>;
    updateStatus(id: string, kanbanStatus: string): Promise<Oportunidade>;
    sincronizarItens(id: string): Promise<{
        message: string;
        total: number;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
