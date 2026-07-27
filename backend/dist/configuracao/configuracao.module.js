"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfiguracaoModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const configuracao_schema_1 = require("./configuracao.schema");
const configuracao_service_1 = require("./configuracao.service");
const configuracao_controller_1 = require("./configuracao.controller");
const bot_module_1 = require("../bot/bot.module");
let ConfiguracaoModule = class ConfiguracaoModule {
};
exports.ConfiguracaoModule = ConfiguracaoModule;
exports.ConfiguracaoModule = ConfiguracaoModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: configuracao_schema_1.Configuracao.name, schema: configuracao_schema_1.ConfiguracaoSchema },
            ]),
            (0, common_1.forwardRef)(() => bot_module_1.BotModule),
        ],
        controllers: [configuracao_controller_1.ConfiguracaoController],
        providers: [configuracao_service_1.ConfiguracaoService],
        exports: [configuracao_service_1.ConfiguracaoService],
    })
], ConfiguracaoModule);
//# sourceMappingURL=configuracao.module.js.map