import { PerfilBuscaService } from './perfil-busca.service';
export declare class CreatePerfilDto {
    nome: string;
    ufs?: string[];
    municipiosIbge?: string[];
    orgaosCnpj?: string[];
    unidadesUasg?: string[];
    modalidades: number[];
    palavrasChave?: string[];
    ativo?: boolean;
}
export declare class PerfilBuscaController {
    private readonly service;
    constructor(service: PerfilBuscaService);
    create(data: CreatePerfilDto): Promise<import("./perfil-busca.schema").PerfilBusca>;
    findAll(): Promise<import("./perfil-busca.schema").PerfilBusca[]>;
    findOne(id: string): Promise<import("./perfil-busca.schema").PerfilBusca>;
    update(id: string, data: CreatePerfilDto): Promise<import("./perfil-busca.schema").PerfilBusca>;
    toggle(id: string): Promise<import("./perfil-busca.schema").PerfilBusca>;
    remove(id: string): Promise<void>;
}
