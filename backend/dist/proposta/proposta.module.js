"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropostaModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const proposta_schema_1 = require("./proposta.schema");
const proposta_service_1 = require("./proposta.service");
const proposta_controller_1 = require("./proposta.controller");
const cotacao_schema_1 = require("../cotacao/cotacao.schema");
const oportunidade_schema_1 = require("../oportunidade/oportunidade.schema");
let PropostaModule = class PropostaModule {
};
exports.PropostaModule = PropostaModule;
exports.PropostaModule = PropostaModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: proposta_schema_1.Proposta.name, schema: proposta_schema_1.PropostaSchema },
                { name: cotacao_schema_1.Cotacao.name, schema: cotacao_schema_1.CotacaoSchema },
                { name: oportunidade_schema_1.Oportunidade.name, schema: oportunidade_schema_1.OportunidadeSchema },
            ]),
        ],
        controllers: [proposta_controller_1.PropostaController],
        providers: [proposta_service_1.PropostaService],
        exports: [proposta_service_1.PropostaService],
    })
], PropostaModule);
//# sourceMappingURL=proposta.module.js.map