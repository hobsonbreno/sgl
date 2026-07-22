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
exports.CotacaoController = exports.CreateCotacaoDto = exports.UpdatePrecoDto = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const cotacao_service_1 = require("./cotacao.service");
class UpdatePrecoDto {
    fornecedorId;
    precoUnitario;
    observacao;
}
exports.UpdatePrecoDto = UpdatePrecoDto;
class CreateCotacaoDto {
    itens;
}
exports.CreateCotacaoDto = CreateCotacaoDto;
let CotacaoController = class CotacaoController {
    cotacaoService;
    constructor(cotacaoService) {
        this.cotacaoService = cotacaoService;
    }
    createOrGet(oportunidadeId, data) {
        return this.cotacaoService.createOrGet(oportunidadeId, data.itens);
    }
    findByOportunidade(oportunidadeId) {
        return this.cotacaoService.findByOportunidade(oportunidadeId);
    }
    findOne(id) {
        return this.cotacaoService.findOne(id);
    }
    updatePreco(id, itemId, data) {
        return this.cotacaoService.updatePreco(id, itemId, data);
    }
    removePreco(id, itemId, fornecedorId) {
        return this.cotacaoService.removePreco(id, itemId, fornecedorId);
    }
};
exports.CotacaoController = CotacaoController;
__decorate([
    (0, common_1.Post)('oportunidades/:id/cotacao'),
    (0, swagger_1.ApiOperation)({ summary: 'Criar ou obter cotação para uma oportunidade' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreateCotacaoDto]),
    __metadata("design:returntype", void 0)
], CotacaoController.prototype, "createOrGet", null);
__decorate([
    (0, common_1.Get)('oportunidades/:id/cotacao'),
    (0, swagger_1.ApiOperation)({ summary: 'Obter cotação por Oportunidade ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CotacaoController.prototype, "findByOportunidade", null);
__decorate([
    (0, common_1.Get)('cotacoes/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Obter cotação por ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CotacaoController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)('cotacoes/:id/itens/:itemId/preco'),
    (0, swagger_1.ApiOperation)({ summary: 'Atualizar ou adicionar preço de fornecedor para um item' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('itemId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, UpdatePrecoDto]),
    __metadata("design:returntype", void 0)
], CotacaoController.prototype, "updatePreco", null);
__decorate([
    (0, common_1.Delete)('cotacoes/:id/itens/:itemId/preco/:fornecedorId'),
    (0, swagger_1.ApiOperation)({ summary: 'Remover preço de um fornecedor para um item' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('itemId')),
    __param(2, (0, common_1.Param)('fornecedorId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], CotacaoController.prototype, "removePreco", null);
exports.CotacaoController = CotacaoController = __decorate([
    (0, swagger_1.ApiTags)('Cotações'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [cotacao_service_1.CotacaoService])
], CotacaoController);
//# sourceMappingURL=cotacao.controller.js.map