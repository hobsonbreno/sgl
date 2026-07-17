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
exports.PerfilBuscaController = exports.CreatePerfilDto = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const perfil_busca_service_1 = require("./perfil-busca.service");
class CreatePerfilDto {
    nome;
    ufs;
    municipiosIbge;
    modalidades;
    ativo;
}
exports.CreatePerfilDto = CreatePerfilDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], CreatePerfilDto.prototype, "nome", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, type: [String] }),
    __metadata("design:type", Array)
], CreatePerfilDto.prototype, "ufs", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, type: [String] }),
    __metadata("design:type", Array)
], CreatePerfilDto.prototype, "municipiosIbge", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [Number] }),
    __metadata("design:type", Array)
], CreatePerfilDto.prototype, "modalidades", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, default: true }),
    __metadata("design:type", Boolean)
], CreatePerfilDto.prototype, "ativo", void 0);
let PerfilBuscaController = class PerfilBuscaController {
    service;
    constructor(service) {
        this.service = service;
    }
    create(data) {
        return this.service.create(data);
    }
    findAll() {
        return this.service.findAll();
    }
    findOne(id) {
        return this.service.findOne(id);
    }
    update(id, data) {
        return this.service.update(id, data);
    }
    toggle(id) {
        return this.service.toggleActive(id);
    }
    remove(id) {
        return this.service.remove(id);
    }
};
exports.PerfilBuscaController = PerfilBuscaController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Criar um perfil de busca' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreatePerfilDto]),
    __metadata("design:returntype", void 0)
], PerfilBuscaController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar todos os perfis' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PerfilBuscaController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Obter um perfil' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PerfilBuscaController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Atualizar um perfil' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreatePerfilDto]),
    __metadata("design:returntype", void 0)
], PerfilBuscaController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/toggle'),
    (0, swagger_1.ApiOperation)({ summary: 'Ativar/Desativar um perfil rapidamente' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PerfilBuscaController.prototype, "toggle", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Deletar um perfil' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PerfilBuscaController.prototype, "remove", null);
exports.PerfilBuscaController = PerfilBuscaController = __decorate([
    (0, swagger_1.ApiTags)('Perfis de Busca'),
    (0, common_1.Controller)('perfis-busca'),
    __metadata("design:paramtypes", [perfil_busca_service_1.PerfilBuscaService])
], PerfilBuscaController);
//# sourceMappingURL=perfil-busca.controller.js.map