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
exports.BotController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const bot_service_1 = require("./bot.service");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bot_execucao_schema_1 = require("./bot-execucao.schema");
let BotController = class BotController {
    botService;
    botExecucaoModel;
    constructor(botService, botExecucaoModel) {
        this.botService = botService;
        this.botExecucaoModel = botExecucaoModel;
    }
    async runNow() {
        return this.botService.executarBuscaDiaria();
    }
    async getExecucoes(limit = 10, skip = 0) {
        return this.botExecucaoModel
            .find()
            .sort({ dataExecucao: -1 })
            .skip(Number(skip))
            .limit(Number(limit))
            .exec();
    }
};
exports.BotController = BotController;
__decorate([
    (0, common_1.Post)('run-now'),
    (0, swagger_1.ApiOperation)({ summary: 'Dispara a execução do bot manualmente' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Resultado da execução' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BotController.prototype, "runNow", null);
__decorate([
    (0, common_1.Get)('execucoes'),
    (0, swagger_1.ApiOperation)({ summary: 'Lista o histórico de execuções do bot' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Histórico paginado de execuções' }),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('skip')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BotController.prototype, "getExecucoes", null);
exports.BotController = BotController = __decorate([
    (0, swagger_1.ApiTags)('Bot PNCP'),
    (0, common_1.Controller)('bot'),
    __param(1, (0, mongoose_1.InjectModel)(bot_execucao_schema_1.BotExecucao.name)),
    __metadata("design:paramtypes", [bot_service_1.BotService,
        mongoose_2.Model])
], BotController);
//# sourceMappingURL=bot.controller.js.map