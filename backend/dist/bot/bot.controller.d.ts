import { BotService } from './bot.service';
import { Model } from 'mongoose';
import { BotExecucao, BotExecucaoDocument } from './bot-execucao.schema';
export declare class BotController {
    private readonly botService;
    private botExecucaoModel;
    constructor(botService: BotService, botExecucaoModel: Model<BotExecucaoDocument>);
    runNow(): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, BotExecucao, {}, import("mongoose").DefaultSchemaOptions> & BotExecucao & {
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
    getExecucoes(limit?: number, skip?: number): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, BotExecucao, {}, import("mongoose").DefaultSchemaOptions> & BotExecucao & {
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
    }>)[]>;
}
