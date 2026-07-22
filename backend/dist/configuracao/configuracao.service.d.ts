import { OnModuleInit } from '@nestjs/common';
import { Model } from 'mongoose';
import { Configuracao, ConfiguracaoDocument } from './configuracao.schema';
import { BotService } from '../bot/bot.service';
export declare class ConfiguracaoService implements OnModuleInit {
    private configModel;
    private botService;
    constructor(configModel: Model<ConfiguracaoDocument>, botService: BotService);
    onModuleInit(): Promise<void>;
    getConfiguracao(): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Configuracao, {}, import("mongoose").DefaultSchemaOptions> & Configuracao & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, Configuracao, {}, import("mongoose").DefaultSchemaOptions> & Configuracao & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>) | null>;
    setHorarios(horarios: string[]): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Configuracao, {}, import("mongoose").DefaultSchemaOptions> & Configuracao & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, Configuracao, {}, import("mongoose").DefaultSchemaOptions> & Configuracao & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>) | null>;
    setUltimaExecucao(data: string): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Configuracao, {}, import("mongoose").DefaultSchemaOptions> & Configuracao & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, Configuracao, {}, import("mongoose").DefaultSchemaOptions> & Configuracao & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>) | null>;
    setColunas(colunas: {
        id: string;
        nome: string;
    }[]): Promise<(import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, Configuracao, {}, import("mongoose").DefaultSchemaOptions> & Configuracao & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, Configuracao, {}, import("mongoose").DefaultSchemaOptions> & Configuracao & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>) | null>;
}
