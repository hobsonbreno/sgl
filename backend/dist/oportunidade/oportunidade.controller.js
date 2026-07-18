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
exports.OportunidadeController = exports.UpdateStatusDto = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const oportunidade_service_1 = require("./oportunidade.service");
class UpdateStatusDto {
    kanbanStatus;
}
exports.UpdateStatusDto = UpdateStatusDto;
let OportunidadeController = class OportunidadeController {
    service;
    constructor(service) {
        this.service = service;
    }
    findAll(query) {
        return this.service.findAll(query);
    }
    findOne(id) {
        return this.service.findOne(id);
    }
    updateStatus(id, body) {
        return this.service.updateStatus(id, body.kanbanStatus);
    }
};
exports.OportunidadeController = OportunidadeController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar oportunidades (com paginação e filtros)' }),
    (0, swagger_1.ApiQuery)({ name: 'kanbanStatus', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'uf', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'modalidadeCodigo', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'prazoAteEmDias', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OportunidadeController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Obter oportunidade por ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OportunidadeController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Atualizar o status do Kanban' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateStatusDto]),
    __metadata("design:returntype", void 0)
], OportunidadeController.prototype, "updateStatus", null);
exports.OportunidadeController = OportunidadeController = __decorate([
    (0, swagger_1.ApiTags)('Oportunidades'),
    (0, common_1.Controller)('oportunidades'),
    __metadata("design:paramtypes", [oportunidade_service_1.OportunidadeService])
], OportunidadeController);
//# sourceMappingURL=oportunidade.controller.js.map