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
exports.PerfilBuscaSchema = exports.PerfilBusca = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let PerfilBusca = class PerfilBusca {
    nome;
    ufs;
    municipiosIbge;
    modalidades;
    palavrasChave;
    ativo;
};
exports.PerfilBusca = PerfilBusca;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], PerfilBusca.prototype, "nome", void 0);
__decorate([
    (0, mongoose_1.Prop)([String]),
    __metadata("design:type", Array)
], PerfilBusca.prototype, "ufs", void 0);
__decorate([
    (0, mongoose_1.Prop)([String]),
    __metadata("design:type", Array)
], PerfilBusca.prototype, "municipiosIbge", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Number], required: true }),
    __metadata("design:type", Array)
], PerfilBusca.prototype, "modalidades", void 0);
__decorate([
    (0, mongoose_1.Prop)([String]),
    __metadata("design:type", Array)
], PerfilBusca.prototype, "palavrasChave", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], PerfilBusca.prototype, "ativo", void 0);
exports.PerfilBusca = PerfilBusca = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], PerfilBusca);
exports.PerfilBuscaSchema = mongoose_1.SchemaFactory.createForClass(PerfilBusca);
//# sourceMappingURL=perfil-busca.schema.js.map