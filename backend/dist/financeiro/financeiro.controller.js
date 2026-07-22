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
exports.FinanceiroController = void 0;
const common_1 = require("@nestjs/common");
const financeiro_service_1 = require("./financeiro.service");
let FinanceiroController = class FinanceiroController {
    financeiroService;
    constructor(financeiroService) {
        this.financeiroService = financeiroService;
    }
    create(createDto) {
        return this.financeiroService.create(createDto);
    }
    findAll() {
        return this.financeiroService.findAll();
    }
    findResumo() {
        return this.financeiroService.findResumo();
    }
    findNegociosFechados() {
        return this.financeiroService.findNegociosFechados();
    }
    receberNegocioFechado(id) {
        return this.financeiroService.receberNegocioFechado(id);
    }
    update(id, updateDto) {
        return this.financeiroService.update(id, updateDto);
    }
    remove(id) {
        return this.financeiroService.remove(id);
    }
};
exports.FinanceiroController = FinanceiroController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FinanceiroController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FinanceiroController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('resumo'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FinanceiroController.prototype, "findResumo", null);
__decorate([
    (0, common_1.Get)('negocios-fechados'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FinanceiroController.prototype, "findNegociosFechados", null);
__decorate([
    (0, common_1.Post)('receber-negocio/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FinanceiroController.prototype, "receberNegocioFechado", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FinanceiroController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FinanceiroController.prototype, "remove", null);
exports.FinanceiroController = FinanceiroController = __decorate([
    (0, common_1.Controller)('financeiro'),
    __metadata("design:paramtypes", [financeiro_service_1.FinanceiroService])
], FinanceiroController);
//# sourceMappingURL=financeiro.controller.js.map