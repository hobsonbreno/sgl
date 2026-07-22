"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceiroModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const financeiro_controller_1 = require("./financeiro.controller");
const financeiro_service_1 = require("./financeiro.service");
const financeiro_schema_1 = require("./financeiro.schema");
const oportunidade_schema_1 = require("../oportunidade/oportunidade.schema");
const produto_schema_1 = require("../produto/produto.schema");
let FinanceiroModule = class FinanceiroModule {
};
exports.FinanceiroModule = FinanceiroModule;
exports.FinanceiroModule = FinanceiroModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: financeiro_schema_1.TransacaoFinanceira.name, schema: financeiro_schema_1.TransacaoFinanceiraSchema },
                { name: oportunidade_schema_1.Oportunidade.name, schema: oportunidade_schema_1.OportunidadeSchema },
                { name: produto_schema_1.Produto.name, schema: produto_schema_1.ProdutoSchema }
            ])
        ],
        controllers: [financeiro_controller_1.FinanceiroController],
        providers: [financeiro_service_1.FinanceiroService],
        exports: [financeiro_service_1.FinanceiroService]
    })
], FinanceiroModule);
//# sourceMappingURL=financeiro.module.js.map