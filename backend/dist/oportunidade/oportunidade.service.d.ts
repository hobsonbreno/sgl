import { Model } from 'mongoose';
import { Oportunidade, OportunidadeDocument } from './oportunidade.schema';
export declare class OportunidadeService {
    private model;
    constructor(model: Model<OportunidadeDocument>);
    findAll(query: any): Promise<{
        data: Oportunidade[];
        total: number;
    }>;
    findOne(id: string): Promise<Oportunidade>;
    updateStatus(id: string, kanbanStatus: string): Promise<Oportunidade>;
}
