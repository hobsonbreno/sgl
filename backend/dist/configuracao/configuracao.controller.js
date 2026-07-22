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
exports.ConfiguracaoController = void 0;
const common_1 = require("@nestjs/common");
const configuracao_service_1 = require("./configuracao.service");
let ConfiguracaoController = class ConfiguracaoController {
    configuracaoService;
    constructor(configuracaoService) {
        this.configuracaoService = configuracaoService;
    }
    async get() {
        return this.configuracaoService.getConfiguracao();
    }
    async update(body) {
        if (body.horariosBuscaBot) {
            if (!Array.isArray(body.horariosBuscaBot) || body.horariosBuscaBot.some((h) => !/^\d{2}:\d{2}$/.test(h))) {
                throw new common_1.BadRequestException('Formato de horários inválido. Use um array de strings HH:mm');
            }
            return this.configuracaoService.setHorarios(body.horariosBuscaBot);
        }
        if (body.colunasKanban) {
            if (!Array.isArray(body.colunasKanban)) {
                throw new common_1.BadRequestException('Formato de colunas inválido.');
            }
            return this.configuracaoService.setColunas(body.colunasKanban);
        }
        throw new common_1.BadRequestException('Nenhum campo válido para atualização');
    }
};
exports.ConfiguracaoController = ConfiguracaoController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ConfiguracaoController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ConfiguracaoController.prototype, "update", null);
exports.ConfiguracaoController = ConfiguracaoController = __decorate([
    (0, common_1.Controller)('configuracoes'),
    __metadata("design:paramtypes", [configuracao_service_1.ConfiguracaoService])
], ConfiguracaoController);
//# sourceMappingURL=configuracao.controller.js.map