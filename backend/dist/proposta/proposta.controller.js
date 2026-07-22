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
exports.PropostaController = void 0;
const common_1 = require("@nestjs/common");
const proposta_service_1 = require("./proposta.service");
let PropostaController = class PropostaController {
    propostaService;
    constructor(propostaService) {
        this.propostaService = propostaService;
    }
    async criarProposta(id, payload) {
        return this.propostaService.criarProposta(id, payload);
    }
    async atualizarStatus(id, status) {
        return this.propostaService.atualizarStatus(id, status);
    }
    async listar(query) {
        return this.propostaService.listar(query);
    }
    async buscarPorId(id) {
        return this.propostaService.buscarPorId(id);
    }
};
exports.PropostaController = PropostaController;
__decorate([
    (0, common_1.Post)('/oportunidades/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PropostaController.prototype, "criarProposta", null);
__decorate([
    (0, common_1.Patch)('/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PropostaController.prototype, "atualizarStatus", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PropostaController.prototype, "listar", null);
__decorate([
    (0, common_1.Get)('/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PropostaController.prototype, "buscarPorId", null);
exports.PropostaController = PropostaController = __decorate([
    (0, common_1.Controller)('propostas'),
    __metadata("design:paramtypes", [proposta_service_1.PropostaService])
], PropostaController);
//# sourceMappingURL=proposta.controller.js.map