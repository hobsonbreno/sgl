import { Model } from 'mongoose';
import { Orgao } from './orgao.schema';
export declare class OrgaoService {
    private model;
    constructor(model: Model<Orgao>);
    findAll(query: any): Promise<{
        data: Orgao[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
}
