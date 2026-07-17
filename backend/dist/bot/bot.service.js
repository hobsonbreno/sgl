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
var BotService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bot_execucao_schema_1 = require("./bot-execucao.schema");
const perfil_busca_schema_1 = require("../perfil-busca/perfil-busca.schema");
const oportunidade_schema_1 = require("../oportunidade/oportunidade.schema");
const fornecedor_schema_1 = require("../fornecedor/fornecedor.schema");
const pncp_client_service_1 = require("../pncp/services/pncp-client/pncp-client.service");
const pncp_dto_1 = require("../pncp/dtos/pncp.dto");
let BotService = BotService_1 = class BotService {
    botExecucaoModel;
    perfilBuscaModel;
    oportunidadeModel;
    fornecedorModel;
    pncpClientService;
    logger = new common_1.Logger(BotService_1.name);
    emExecucao = false;
    constructor(botExecucaoModel, perfilBuscaModel, oportunidadeModel, fornecedorModel, pncpClientService) {
        this.botExecucaoModel = botExecucaoModel;
        this.perfilBuscaModel = perfilBuscaModel;
        this.oportunidadeModel = oportunidadeModel;
        this.fornecedorModel = fornecedorModel;
        this.pncpClientService = pncpClientService;
    }
    async handleCron() {
        this.logger.log('Iniciando execução diária via CRON...');
        await this.executarBuscaDiaria();
    }
    async executarBuscaDiaria() {
        if (this.emExecucao) {
            this.logger.warn('Bot já está em execução. Ignorando nova requisição.');
            return { message: 'Bot já está em execução.' };
        }
        this.emExecucao = true;
        const perfis = await this.perfilBuscaModel.find({ ativo: true });
        const resultados = [];
        for (const perfil of perfis) {
            this.logger.log(`Executando perfil: ${perfil.nome}`);
            let totalEncontrados = 0;
            let totalNovos = 0;
            const erros = [];
            const hoje = new Date();
            hoje.setDate(hoje.getDate() + 30);
            const yyyy = hoje.getFullYear();
            const mm = String(hoje.getMonth() + 1).padStart(2, '0');
            const dd = String(hoje.getDate()).padStart(2, '0');
            const dataFinal = `${yyyy}${mm}${dd}`;
            for (const modalidade of perfil.modalidades) {
                try {
                    const rawContratacoes = await this.pncpClientService.buscarContratacoesComPropostaAberta({
                        dataFinal,
                        codigoModalidadeContratacao: modalidade,
                        uf: perfil.ufs && perfil.ufs.length > 0 ? perfil.ufs[0] : undefined,
                    });
                    totalEncontrados += rawContratacoes.length;
                    for (const raw of rawContratacoes) {
                        const opDto = (0, pncp_dto_1.mapPncpParaOportunidade)(raw);
                        const existe = await this.oportunidadeModel.findOne({ numeroControlePNCP: opDto.numeroControlePNCP });
                        if (!existe) {
                            await this.oportunidadeModel.create(opDto);
                            totalNovos++;
                        }
                        else {
                            await this.oportunidadeModel.updateOne({ numeroControlePNCP: opDto.numeroControlePNCP }, {
                                $set: {
                                    situacaoCompraNome: opDto.situacaoCompraNome,
                                    dataEncerramentoProposta: opDto.dataEncerramentoProposta,
                                    valorTotalEstimado: opDto.valorTotalEstimado
                                }
                            });
                        }
                        if (opDto.orgaoCnpj) {
                            const fornecedorExiste = await this.fornecedorModel.findOne({ cnpj: opDto.orgaoCnpj });
                            if (!fornecedorExiste) {
                                await this.fornecedorModel.create({
                                    cnpj: opDto.orgaoCnpj,
                                    razaoSocial: opDto.orgaoNome,
                                    origem: 'bot',
                                    categorias: []
                                });
                            }
                        }
                    }
                }
                catch (err) {
                    this.logger.error(`Erro ao buscar modalidade ${modalidade} do perfil ${perfil.nome}: ${err.message}`);
                    erros.push(err.message);
                }
            }
            const execucao = await this.botExecucaoModel.create({
                perfilBuscaId: perfil._id,
                totalEncontrados,
                totalNovos,
                erros,
            });
            resultados.push(execucao);
        }
        this.emExecucao = false;
        return resultados;
    }
};
exports.BotService = BotService;
__decorate([
    (0, schedule_1.Cron)(process.env.BOT_CRON_EXPRESSION || schedule_1.CronExpression.EVERY_DAY_AT_6AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BotService.prototype, "handleCron", null);
exports.BotService = BotService = BotService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(bot_execucao_schema_1.BotExecucao.name)),
    __param(1, (0, mongoose_1.InjectModel)(perfil_busca_schema_1.PerfilBusca.name)),
    __param(2, (0, mongoose_1.InjectModel)(oportunidade_schema_1.Oportunidade.name)),
    __param(3, (0, mongoose_1.InjectModel)(fornecedor_schema_1.Fornecedor.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        pncp_client_service_1.PncpClientService])
], BotService);
//# sourceMappingURL=bot.service.js.map