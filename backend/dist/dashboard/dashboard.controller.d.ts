import { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { EventsService } from '../events/events.service';
import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    private readonly eventsService;
    constructor(dashboardService: DashboardService, eventsService: EventsService);
    getResumo(): Promise<{
        novasHoje: number;
        porStatus: Record<string, number>;
        valorTotalPorStatus: Record<string, number>;
        prazosCriticos: (import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("../oportunidade/oportunidade.schema").Oportunidade, {}, import("mongoose").DefaultSchemaOptions> & import("../oportunidade/oportunidade.schema").Oportunidade & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & {
            id: string;
        }, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").Document<unknown, {}, import("../oportunidade/oportunidade.schema").Oportunidade, {}, import("mongoose").DefaultSchemaOptions> & import("../oportunidade/oportunidade.schema").Oportunidade & {
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
    stream(): Observable<MessageEvent>;
}
