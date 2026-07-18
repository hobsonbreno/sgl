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
    }>;
    findOne(id: string): Promise<import("./oportunidade.schema").Oportunidade>;
    updateStatus(id: string, body: UpdateStatusDto): Promise<import("./oportunidade.schema").Oportunidade>;
}
