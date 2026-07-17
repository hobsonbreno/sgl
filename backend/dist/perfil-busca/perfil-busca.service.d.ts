import { Model } from 'mongoose';
import { PerfilBusca, PerfilBuscaDocument } from './perfil-busca.schema';
export declare class PerfilBuscaService {
    private model;
    constructor(model: Model<PerfilBuscaDocument>);
    create(data: any): Promise<PerfilBusca>;
    findAll(): Promise<PerfilBusca[]>;
    findOne(id: string): Promise<PerfilBusca>;
    update(id: string, data: any): Promise<PerfilBusca>;
    toggleActive(id: string): Promise<PerfilBusca>;
    remove(id: string): Promise<void>;
}
