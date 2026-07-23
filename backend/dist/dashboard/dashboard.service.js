"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const oportunidade_schema_1 = require("../oportunidade/oportunidade.schema");
const bot_execucao_schema_1 = require("../bot/bot-execucao.schema");
const bot_service_1 = require("../bot/bot.service");
const common_2 = require("@nestjs/common");
let DashboardService = class DashboardService {
    oportunidadeModel;
    botExecucaoModel;
    botService;
    constructor(oportunidadeModel, botExecucaoModel, botService) {
        this.oportunidadeModel = oportunidadeModel;
        this.botExecucaoModel = botExecucaoModel;
        this.botService = botService;
    }
    async getResumo() {
        const ontem = new Date();
        ontem.setDate(ontem.getDate() - 1);
        const novasHoje = await this.oportunidadeModel.countDocuments({ createdAt: { $gte: ontem } }).exec();
        const agregacao = await this.oportunidadeModel.aggregate([
            {
                $group: {
                    _id: '$kanbanStatus',
                    count: { $sum: 1 },
                    valorTotal: { $sum: '$valorTotalEstimado' }
                }
            }
        ]).exec();
        const porStatus = {};
        const valorTotalPorStatus = {};
        agregacao.forEach(item => {
            const id = item._id || 'NAO_DEFINIDO';
            porStatus[id] = item.count;
            valorTotalPorStatus[id] = item.valorTotal || 0;
        });
        const hoje = new Date();
        const prazosCriticos = await this.oportunidadeModel.find({
            kanbanStatus: { $in: ['FAZENDO', 'FEITO', 'AGUARDANDO_RESPOSTA'] },
            dataEncerramentoProposta: { $gte: hoje }
        })
            .sort({ dataEncerramentoProposta: 1 })
            .limit(10)
            .exec();
        const ultimaExecucaoBot = await this.botExecucaoModel.findOne().sort({ dataExecucao: -1 }).exec();
        return {
            novasHoje,
            porStatus,
            valorTotalPorStatus,
            prazosCriticos,
            ultimaExecucaoBot,
            botEmExecucao: this.botService.isExecucao()
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(oportunidade_schema_1.Oportunidade.name)),
    __param(1, (0, mongoose_1.InjectModel)(bot_execucao_schema_1.BotExecucao.name)),
    __param(2, (0, common_2.Inject)((0, common_2.forwardRef)(() => bot_service_1.BotService))),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        bot_service_1.BotService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map