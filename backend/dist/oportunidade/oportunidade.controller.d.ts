import { OportunidadeService } from './oportunidade.service';
export declare class UpdateStatusDto {
    kanbanStatus: string;
}
export declare class OportunidadeController {
    private readonly service;
    constructor(service: OportunidadeService);
    findAll(query: any): Promise<{
        data: import("./oportunidade.schema").Oportunidade[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    findOne(id: string): Promise<import("./oportunidade.schema").Oportunidade>;
    updateStatus(id: string, body: UpdateStatusDto): Promise<import("./oportunidade.schema").Oportunidade>;
    sincronizarItens(id: string): Promise<{
        message: string;
        total: number;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
