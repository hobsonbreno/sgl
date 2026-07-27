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
exports.ConfiguracaoSchema = exports.Configuracao = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let Configuracao = class Configuracao {
    horarioBuscaBot;
    horariosBuscaBot;
    ultimaExecucaoAutomaticaData;
    colunasKanban;
};
exports.Configuracao = Configuracao;
__decorate([
    (0, mongoose_1.Prop)({ default: '06:00' }),
    __metadata("design:type", String)
], Configuracao.prototype, "horarioBuscaBot", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: ['08:00', '12:00', '18:00'] }),
    __metadata("design:type", Array)
], Configuracao.prototype, "horariosBuscaBot", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Configuracao.prototype, "ultimaExecucaoAutomaticaData", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [{ id: String, nome: String }],
        default: [
            { id: 'A_FAZER', nome: 'A FAZER' },
            { id: 'FAZENDO', nome: 'FAZENDO' },
            { id: 'FEITO', nome: 'FEITO' },
            { id: 'AGUARDANDO_RESPOSTA', nome: 'AGUARDANDO RESPOSTA' },
            { id: 'EXCLUIDA', nome: 'EXCLUÍDA' },
        ],
    }),
    __metadata("design:type", Array)
], Configuracao.prototype, "colunasKanban", void 0);
exports.Configuracao = Configuracao = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Configuracao);
exports.ConfiguracaoSchema = mongoose_1.SchemaFactory.createForClass(Configuracao);
//# sourceMappingURL=configuracao.schema.js.map