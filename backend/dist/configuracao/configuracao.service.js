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
exports.ConfiguracaoService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const configuracao_schema_1 = require("./configuracao.schema");
const bot_service_1 = require("../bot/bot.service");
let ConfiguracaoService = class ConfiguracaoService {
    configModel;
    botService;
    constructor(configModel, botService) {
        this.configModel = configModel;
        this.botService = botService;
    }
    async onModuleInit() {
        let config = await this.configModel.findOne().exec();
        if (!config) {
            config = await this.configModel.create({ horarioBuscaBot: '08:00', horariosBuscaBot: ['08:00', '12:00', '18:00'], ultimaExecucaoAutomaticaData: '' });
        }
        else if (!config.horariosBuscaBot || config.horariosBuscaBot.length === 0) {
            config.horariosBuscaBot = config.horarioBuscaBot ? [config.horarioBuscaBot] : ['08:00', '12:00', '18:00'];
            await config.save();
        }
    }
    async getConfiguracao() {
        return this.configModel.findOne().exec();
    }
    async setHorarios(horarios) {
        const horarioBuscaBot = horarios.length > 0 ? horarios[0] : '06:00';
        const config = await this.configModel.findOneAndUpdate({}, { horarioBuscaBot, horariosBuscaBot: horarios }, { new: true }).exec();
        if (config) {
            await this.botService.registrarCronDinamicoMultiplos(horarios);
        }
        return config;
    }
    async setUltimaExecucao(data) {
        return this.configModel.findOneAndUpdate({}, { ultimaExecucaoAutomaticaData: data }, { new: true }).exec();
    }
    async setColunas(colunas) {
        return this.configModel.findOneAndUpdate({}, { colunasKanban: colunas }, { new: true }).exec();
    }
};
exports.ConfiguracaoService = ConfiguracaoService;
exports.ConfiguracaoService = ConfiguracaoService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(configuracao_schema_1.Configuracao.name)),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => bot_service_1.BotService))),
    __metadata("design:paramtypes", [mongoose_2.Model,
        bot_service_1.BotService])
], ConfiguracaoService);
//# sourceMappingURL=configuracao.service.js.map