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
exports.EmpresaDataLakeSchema = exports.EmpresaDataLake = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let EmpresaDataLake = class EmpresaDataLake {
    cnpj;
    cnpj_basico;
    razao_social;
    capital_social;
    cnae_principal;
    cnae_descricao;
    situacao_cadastral;
    uf;
    municipio;
    cep;
    telefone;
    email;
    logradouro;
    numero;
    complemento;
    bairro;
};
exports.EmpresaDataLake = EmpresaDataLake;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], EmpresaDataLake.prototype, "cnpj", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], EmpresaDataLake.prototype, "cnpj_basico", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], EmpresaDataLake.prototype, "razao_social", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], EmpresaDataLake.prototype, "capital_social", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], EmpresaDataLake.prototype, "cnae_principal", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], EmpresaDataLake.prototype, "cnae_descricao", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], EmpresaDataLake.prototype, "situacao_cadastral", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], EmpresaDataLake.prototype, "uf", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], EmpresaDataLake.prototype, "municipio", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], EmpresaDataLake.prototype, "cep", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], EmpresaDataLake.prototype, "telefone", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], EmpresaDataLake.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], EmpresaDataLake.prototype, "logradouro", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], EmpresaDataLake.prototype, "numero", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], EmpresaDataLake.prototype, "complemento", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], EmpresaDataLake.prototype, "bairro", void 0);
exports.EmpresaDataLake = EmpresaDataLake = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], EmpresaDataLake);
exports.EmpresaDataLakeSchema = mongoose_1.SchemaFactory.createForClass(EmpresaDataLake);
exports.EmpresaDataLakeSchema.index({ uf: 1, cnae_principal: 1 });
exports.EmpresaDataLakeSchema.index({ uf: 1, municipio: 1, cnae_principal: 1 });
//# sourceMappingURL=receita-federal.schema.js.map