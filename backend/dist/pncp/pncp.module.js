"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PncpModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const pncp_client_service_1 = require("./services/pncp-client/pncp-client.service");
const pncp_controller_1 = require("./controllers/pncp/pncp.controller");
const compras_dados_abertos_service_1 = require("./services/compras-dados-abertos/compras-dados-abertos.service");
let PncpModule = class PncpModule {
};
exports.PncpModule = PncpModule;
exports.PncpModule = PncpModule = __decorate([
    (0, common_1.Module)({
        imports: [axios_1.HttpModule],
        providers: [pncp_client_service_1.PncpClientService, compras_dados_abertos_service_1.ComprasDadosAbertosService],
        controllers: [pncp_controller_1.PncpController],
        exports: [pncp_client_service_1.PncpClientService, compras_dados_abertos_service_1.ComprasDadosAbertosService],
    })
], PncpModule);
//# sourceMappingURL=pncp.module.js.map