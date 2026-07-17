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
exports.FornecedorSchema = exports.Fornecedor = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let Fornecedor = class Fornecedor {
    razaoSocial;
    cnpj;
    contato;
    categorias;
    origem;
};
exports.Fornecedor = Fornecedor;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Fornecedor.prototype, "razaoSocial", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], Fornecedor.prototype, "cnpj", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [{ nome: String, telefone: String, email: String }] }),
    __metadata("design:type", Array)
], Fornecedor.prototype, "contato", void 0);
__decorate([
    (0, mongoose_1.Prop)([String]),
    __metadata("design:type", Array)
], Fornecedor.prototype, "categorias", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['manual', 'bot'] }),
    __metadata("design:type", String)
], Fornecedor.prototype, "origem", void 0);
exports.Fornecedor = Fornecedor = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Fornecedor);
exports.FornecedorSchema = mongoose_1.SchemaFactory.createForClass(Fornecedor);
//# sourceMappingURL=fornecedor.schema.js.map