import { OrgaoService } from './orgao.service';
export declare class OrgaoController {
    private readonly service;
    constructor(service: OrgaoService);
    findAll(query: any): Promise<{
        data: import("./orgao.schema").Orgao[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
}
