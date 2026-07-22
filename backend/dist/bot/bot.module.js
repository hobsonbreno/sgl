"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const bot_service_1 = require("./bot.service");
const bot_controller_1 = require("./bot.controller");
const bot_execucao_schema_1 = require("./bot-execucao.schema");
const pncp_module_1 = require("../pncp/pncp.module");
const perfil_busca_module_1 = require("../perfil-busca/perfil-busca.module");
const fornecedor_module_1 = require("../fornecedor/fornecedor.module");
const oportunidade_module_1 = require("../oportunidade/oportunidade.module");
const orgao_module_1 = require("../orgao/orgao.module");
const produto_module_1 = require("../produto/produto.module");
const configuracao_module_1 = require("../configuracao/configuracao.module");
let BotModule = class BotModule {
};
exports.BotModule = BotModule;
exports.BotModule = BotModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([{ name: bot_execucao_schema_1.BotExecucao.name, schema: bot_execucao_schema_1.BotExecucaoSchema }]),
            pncp_module_1.PncpModule,
            perfil_busca_module_1.PerfilBuscaModule,
            fornecedor_module_1.FornecedorModule,
            oportunidade_module_1.OportunidadeModule,
            orgao_module_1.OrgaoModule,
            produto_module_1.ProdutoModule,
            (0, common_1.forwardRef)(() => configuracao_module_1.ConfiguracaoModule)
        ],
        providers: [bot_service_1.BotService],
        controllers: [bot_controller_1.BotController],
        exports: [bot_service_1.BotService]
    })
], BotModule);
//# sourceMappingURL=bot.module.js.map