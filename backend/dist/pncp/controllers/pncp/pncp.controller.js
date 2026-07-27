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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PncpController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const pncp_client_service_1 = require("../../services/pncp-client/pncp-client.service");
const compras_dados_abertos_service_1 = require("../../services/compras-dados-abertos/compras-dados-abertos.service");
const pncp_dto_1 = require("../../dtos/pncp.dto");
let PncpController = class PncpController {
    pncpClientService;
    comprasDadosAbertosService;
    constructor(pncpClientService, comprasDadosAbertosService) {
        this.pncpClientService = pncpClientService;
        this.comprasDadosAbertosService = comprasDadosAbertosService;
    }
    async inteligenciaPrecos(keyword, uf) {
        return this.comprasDadosAbertosService.pesquisarHistoricoPrecos(keyword, uf);
    }
    async testBusca(modalidade, uf, dias = 10) {
        const hojeFinal = new Date();
        hojeFinal.setDate(hojeFinal.getDate() + Number(dias));
        const yyyyF = hojeFinal.getFullYear();
        const mmF = String(hojeFinal.getMonth() + 1).padStart(2, '0');
        const ddF = String(hojeFinal.getDate()).padStart(2, '0');
        const dataFinal = `${yyyyF}${mmF}${ddF}`;
        const hojeInicial = new Date();
        hojeInicial.setDate(hojeInicial.getDate() - 30);
        const yyyyI = hojeInicial.getFullYear();
        const mmI = String(hojeInicial.getMonth() + 1).padStart(2, '0');
        const ddI = String(hojeInicial.getDate()).padStart(2, '0');
        const dataInicial = `${yyyyI}${mmI}${ddI}`;
        const rawResult = await this.pncpClientService.buscarContratacoesComPropostaAberta({
            dataInicial,
            dataFinal,
            codigoModalidadeContratacao: Number(modalidade),
            uf,
        });
        return rawResult.map((raw) => (0, pncp_dto_1.mapPncpParaOportunidade)(raw));
    }
};
exports.PncpController = PncpController;
__decorate([
    (0, common_1.Get)('inteligencia-precos'),
    (0, swagger_1.ApiOperation)({
        summary: 'Busca histórico de preços de contratos para inteligência competitiva',
    }),
    (0, swagger_1.ApiQuery)({ name: 'keyword', required: true, description: 'Palavra-chave do produto (ex: Frango)' }),
    (0, swagger_1.ApiQuery)({ name: 'uf', required: true, description: 'Sigla do Estado (ex: CE)' }),
    __param(0, (0, common_1.Query)('keyword')),
    __param(1, (0, common_1.Query)('uf')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PncpController.prototype, "inteligenciaPrecos", null);
__decorate([
    (0, common_1.Get)('test-busca'),
    (0, swagger_1.ApiOperation)({
        summary: 'Testa a busca de oportunidades no PNCP (sem salvar no banco)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'uf',
        required: false,
        description: 'Sigla da UF (ex: CE)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'modalidade',
        required: true,
        description: 'Código da Modalidade (ex: 6 para Pregão Eletrônico)',
        type: Number,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'dias',
        required: false,
        description: 'Dias no futuro para a data final',
        type: Number,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de oportunidades mapeadas',
        type: [pncp_dto_1.OportunidadeDto],
    }),
    __param(0, (0, common_1.Query)('modalidade')),
    __param(1, (0, common_1.Query)('uf')),
    __param(2, (0, common_1.Query)('dias')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, Number]),
    __metadata("design:returntype", Promise)
], PncpController.prototype, "testBusca", null);
exports.PncpController = PncpController = __decorate([
    (0, swagger_1.ApiTags)('PNCP Testes'),
    (0, common_1.Controller)('pncp'),
    __metadata("design:paramtypes", [pncp_client_service_1.PncpClientService,
        compras_dados_abertos_service_1.ComprasDadosAbertosService])
], PncpController);
//# sourceMappingURL=pncp.controller.js.map