import { Model } from 'mongoose';
import { BotExecucao, BotExecucaoDocument } from './bot-execucao.schema';
import { PerfilBuscaDocument } from '../perfil-busca/perfil-busca.schema';
import { OportunidadeDocument } from '../oportunidade/oportunidade.schema';
import { FornecedorDocument } from '../fornecedor/fornecedor.schema';
import { PncpClientService } from '../pncp/services/pncp-client/pncp-client.service';
export declare class BotService {
    private botExecucaoModel;
    private perfilBuscaModel;
    private oportunidadeModel;
    private fornecedorModel;
    private readonly pncpClientService;
    private readonly logger;
    private emExecucao;
    constructor(botExecucaoModel: Model<BotExecucaoDocument>, perfilBuscaModel: Model<PerfilBuscaDocument>, oportunidadeModel: Model<OportunidadeDocument>, fornecedorModel: Model<FornecedorDocument>, pncpClientService: PncpClientService);
    handleCron(): Promise<void>;
    executarBuscaDiaria(): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, BotExecucao, {}, import("mongoose").DefaultSchemaOptions> & BotExecucao & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, BotExecucao, {}, import("mongoose").DefaultSchemaOptions> & BotExecucao & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[] | {
        message: string;
    }>;
}
