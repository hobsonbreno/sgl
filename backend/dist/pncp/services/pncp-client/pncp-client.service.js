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
var PncpClientService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PncpClientService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let PncpClientService = PncpClientService_1 = class PncpClientService {
    httpService;
    logger = new common_1.Logger(PncpClientService_1.name);
    baseUrl = process.env.PNCP_BASE_URL || 'https://pncp.gov.br/api/consulta';
    constructor(httpService) {
        this.httpService = httpService;
    }
    async buscarContratacoesComPropostaAberta(filtros) {
        let pagina = 1;
        let totalPaginas = 1;
        const resultados = [];
        while (pagina <= totalPaginas) {
            this.logger.log(`Buscando página ${pagina} para modalidade ${filtros.codigoModalidadeContratacao}...`);
            const response = await this.fazerRequisicaoComRetry('/v1/contratacoes/proposta', {
                ...filtros,
                pagina,
            });
            if (response && response.data) {
                const itens = response.data.data || [];
                resultados.push(...itens);
                totalPaginas = response.data.totalPaginas || 1;
            }
            else {
                break;
            }
            pagina++;
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
        this.logger.log(`Total encontrado para modalidade ${filtros.codigoModalidadeContratacao}: ${resultados.length}`);
        return resultados;
    }
    async buscarItensDaContratacao(numeroControlePNCP) {
        this.logger.log(`Buscando itens para a contratação: ${numeroControlePNCP}`);
        const parts = numeroControlePNCP.split('-');
        if (parts.length < 3) {
            this.logger.warn(`Número de controle inválido: ${numeroControlePNCP}`);
            return [];
        }
        const [cnpjESeq, ano] = numeroControlePNCP.split('/');
        if (!ano)
            return [];
        const splitDash = cnpjESeq.split('-');
        if (splitDash.length < 3)
            return [];
        const cnpj = splitDash[0];
        const sequencial = splitDash[2];
        const url = `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/itens`;
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, { timeout: 60000 }).pipe((0, rxjs_1.retry)({
                count: 2,
                delay: (error, retryCount) => {
                    this.logger.warn(`Falha na requisição para ${url}. Tentativa ${retryCount}/2. Erro: ${error.message}`);
                    return (0, rxjs_1.timer)(2000 * retryCount);
                }
            })));
            return response?.data || [];
        }
        catch (e) {
            this.logger.error(`Erro ao buscar itens de ${numeroControlePNCP}: ${e.message}`);
            throw e;
        }
    }
    async fazerRequisicaoComRetry(endpoint, params) {
        const url = `${this.baseUrl}${endpoint}`;
        return (0, rxjs_1.firstValueFrom)(this.httpService.get(url, { params, timeout: 60000 }).pipe((0, rxjs_1.retry)({
            count: 5,
            delay: (error, retryCount) => {
                this.logger.warn(`Falha na requisição para ${url}. Tentativa ${retryCount}/5. Erro: ${error.message}`);
                if (error.response?.status === 429) {
                    this.logger.warn(`Rate limit atingido (429). Aguardando ${10 * retryCount} segundos antes de tentar novamente...`);
                    return (0, rxjs_1.timer)(10000 * retryCount);
                }
                return (0, rxjs_1.timer)(5000 * retryCount);
            }
        }), (0, rxjs_1.catchError)((error) => {
            this.logger.error(`Erro fatal na requisição para ${url} após retries: ${error.message}`);
            throw error;
        })));
    }
};
exports.PncpClientService = PncpClientService;
exports.PncpClientService = PncpClientService = PncpClientService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], PncpClientService);
//# sourceMappingURL=pncp-client.service.js.map