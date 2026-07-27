import { Model, Connection } from 'mongoose';
import { Oportunidade, OportunidadeDocument } from '../oportunidade/oportunidade.schema';
import { BotExecucaoDocument } from '../bot/bot-execucao.schema';
import { BotService } from '../bot/bot.service';
export declare class DashboardService {
    private oportunidadeModel;
    private botExecucaoModel;
    private botService;
    private connection;
    constructor(oportunidadeModel: Model<OportunidadeDocument>, botExecucaoModel: Model<BotExecucaoDocument>, botService: BotService, connection: Connection);
    getResumo(): Promise<{
        novasHoje: number;
        porStatus: Record<string, number>;
        valorTotalPorStatus: Record<string, number>;
        prazosCriticos: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Oportunidade, {}, import("mongoose").DefaultSchemaOptions> & Oportunidade & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & {
            id: string;
        }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, Oportunidade, {}, import("mongoose").DefaultSchemaOptions> & Oportunidade & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & {
            id: string;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
        ultimaExecucaoBot: {
            dataExecucao: Date;
            totalNovos: number;
            erros: string[];
        } | null;
        botEmExecucao: boolean;
        totalEconomiaGerada: any;
    }>;
}
