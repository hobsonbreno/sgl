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
exports.FornecedorController = exports.CreateFornecedorDto = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const fornecedor_service_1 = require("./fornecedor.service");
class CreateFornecedorDto {
    razaoSocial;
    cnpj;
    contato;
    categorias;
}
exports.CreateFornecedorDto = CreateFornecedorDto;
let FornecedorController = class FornecedorController {
    service;
    constructor(service) {
        this.service = service;
    }
    create(data) {
        return this.service.create(data);
    }
    findAll(query) {
        return this.service.findAll(query);
    }
    getBaseProdutos(query) {
        return this.service.getBaseProdutos(query);
    }
    updateProdutoBase(data) {
        return this.service.updateProdutoBase(data.descricaoItem, data);
    }
    update(id, data) {
        return this.service.update(id, data);
    }
    remove(id) {
        return this.service.remove(id);
    }
};
exports.FornecedorController = FornecedorController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Criar fornecedor manualmente' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateFornecedorDto]),
    __metadata("design:returntype", void 0)
], FornecedorController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar fornecedores (com paginação e busca)' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FornecedorController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('produtos/base'),
    (0, swagger_1.ApiOperation)({
        summary: 'Obter base geral de produtos cotados com empresas campeãs',
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FornecedorController.prototype, "getBaseProdutos", null);
__decorate([
    (0, common_1.Put)('produtos/base'),
    (0, swagger_1.ApiOperation)({ summary: 'Atualizar inteligência de um produto na base' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FornecedorController.prototype, "updateProdutoBase", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Atualizar fornecedor' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FornecedorController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Excluir fornecedor' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FornecedorController.prototype, "remove", null);
exports.FornecedorController = FornecedorController = __decorate([
    (0, swagger_1.ApiTags)('Fornecedores'),
    (0, common_1.Controller)('fornecedores'),
    __metadata("design:paramtypes", [fornecedor_service_1.FornecedorService])
], FornecedorController);
//# sourceMappingURL=fornecedor.controller.js.map