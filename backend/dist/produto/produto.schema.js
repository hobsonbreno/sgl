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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProdutoSchema = exports.Produto = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let Produto = class Produto {
    numeroItem;
    descricao;
    quantidade;
    unidadeMedida;
    valorUnitarioEstimado;
    valorTotalEstimado;
    valorEstimado;
    valorNossoLance;
    valorConcorrente;
    oportunidadeId;
};
exports.Produto = Produto;
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Produto.prototype, "numeroItem", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Produto.prototype, "descricao", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Produto.prototype, "quantidade", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Produto.prototype, "unidadeMedida", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Produto.prototype, "valorUnitarioEstimado", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Produto.prototype, "valorTotalEstimado", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Produto.prototype, "valorEstimado", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Produto.prototype, "valorNossoLance", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Produto.prototype, "valorConcorrente", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Produto.prototype, "oportunidadeId", void 0);
exports.Produto = Produto = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Produto);
exports.ProdutoSchema = mongoose_1.SchemaFactory.createForClass(Produto);
//# sourceMappingURL=produto.schema.js.map