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
exports.OportunidadeSchema = exports.Oportunidade = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let Oportunidade = class Oportunidade {
    numeroControlePNCP;
    tipo;
    modalidadeCodigo;
    modalidadeNome;
    orgaoCnpj;
    orgaoNome;
    uf;
    municipio;
    unidadeCompradora;
    numeroCompraOrigem;
    anoCompraOrigem;
    objetoCompra;
    valorTotalEstimado;
    dataAberturaProposta;
    dataEncerramentoProposta;
    linkSistemaOrigem;
    situacaoCompraNome;
    kanbanStatus;
    dataMudancaStatus;
    usuarioNome;
    itens;
};
exports.Oportunidade = Oportunidade;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], Oportunidade.prototype, "numeroControlePNCP", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['licitacao', 'dispensa'] }),
    __metadata("design:type", String)
], Oportunidade.prototype, "tipo", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Oportunidade.prototype, "modalidadeCodigo", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Oportunidade.prototype, "modalidadeNome", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Oportunidade.prototype, "orgaoCnpj", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Oportunidade.prototype, "orgaoNome", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Oportunidade.prototype, "uf", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Oportunidade.prototype, "municipio", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Oportunidade.prototype, "unidadeCompradora", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Oportunidade.prototype, "numeroCompraOrigem", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Oportunidade.prototype, "anoCompraOrigem", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Oportunidade.prototype, "objetoCompra", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Oportunidade.prototype, "valorTotalEstimado", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Oportunidade.prototype, "dataAberturaProposta", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Oportunidade.prototype, "dataEncerramentoProposta", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Oportunidade.prototype, "linkSistemaOrigem", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Oportunidade.prototype, "situacaoCompraNome", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 'A_FAZER' }),
    __metadata("design:type", String)
], Oportunidade.prototype, "kanbanStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Oportunidade.prototype, "dataMudancaStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Oportunidade.prototype, "usuarioNome", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object] }),
    __metadata("design:type", Array)
], Oportunidade.prototype, "itens", void 0);
exports.Oportunidade = Oportunidade = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Oportunidade);
exports.OportunidadeSchema = mongoose_1.SchemaFactory.createForClass(Oportunidade);
//# sourceMappingURL=oportunidade.schema.js.map