import { Model } from 'mongoose';
import { Oportunidade, OportunidadeDocument } from '../oportunidade/oportunidade.schema';
import { BotExecucao, BotExecucaoDocument } from '../bot/bot-execucao.schema';
import { BotService } from '../bot/bot.service';
export declare class DashboardService {
    private oportunidadeModel;
    private botExecucaoModel;
    private botService;
    constructor(oportunidadeModel: Model<OportunidadeDocument>, botExecucaoModel: Model<BotExecucaoDocument>, botService: BotService);
    getResumo(): Promise<{
        novasHoje: number;
        porStatus: {
            A_FAZER: number;
            FAZENDO: number;
            FEITO: number;
            AGUARDANDO_RESPOSTA: number;
        };
        valorTotalPorStatus: {
            A_FAZER: number;
            FAZENDO: number;
            FEITO: number;
            AGUARDANDO_RESPOSTA: number;
        };
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
        ultimaExecucaoBot: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, BotExecucao, {}, import("mongoose").DefaultSchemaOptions> & BotExecucao & {
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
        }>) | null;
        botEmExecucao: boolean;
    }>;
}
