"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CotacaoModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const cotacao_service_1 = require("./cotacao.service");
const cotacao_controller_1 = require("./cotacao.controller");
const cotacao_schema_1 = require("./cotacao.schema");
const fornecedor_module_1 = require("../fornecedor/fornecedor.module");
const perfil_busca_module_1 = require("../perfil-busca/perfil-busca.module");
let CotacaoModule = class CotacaoModule {
};
exports.CotacaoModule = CotacaoModule;
exports.CotacaoModule = CotacaoModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([{ name: cotacao_schema_1.Cotacao.name, schema: cotacao_schema_1.CotacaoSchema }]),
            fornecedor_module_1.FornecedorModule,
            perfil_busca_module_1.PerfilBuscaModule,
        ],
        providers: [cotacao_service_1.CotacaoService],
        controllers: [cotacao_controller_1.CotacaoController],
    })
], CotacaoModule);
//# sourceMappingURL=cotacao.module.js.map