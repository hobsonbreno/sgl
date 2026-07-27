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
const cron_1 = require("cron");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bot_execucao_schema_1 = require("./bot-execucao.schema");
const perfil_busca_schema_1 = require("../perfil-busca/perfil-busca.schema");
const oportunidade_schema_1 = require("../oportunidade/oportunidade.schema");
const orgao_schema_1 = require("../orgao/orgao.schema");
const produto_schema_1 = require("../produto/produto.schema");
const pncp_client_service_1 = require("../pncp/services/pncp-client/pncp-client.service");
const pncp_dto_1 = require("../pncp/dtos/pncp.dto");
const configuracao_service_1 = require("../configuracao/configuracao.service");
const events_service_1 = require("../events/events.service");
let BotService = BotService_1 = class BotService {
    botExecucaoModel;
    perfilBuscaModel;
    oportunidadeModel;
    orgaoModel;
    produtoModel;
    pncpClientService;
    schedulerRegistry;
    configService;
    eventsService;
    logger = new common_1.Logger(BotService_1.name);
    emExecucao = false;
    constructor(botExecucaoModel, perfilBuscaModel, oportunidadeModel, orgaoModel, produtoModel, pncpClientService, schedulerRegistry, configService, eventsService) {
        this.botExecucaoModel = botExecucaoModel;
        this.perfilBuscaModel = perfilBuscaModel;
        this.oportunidadeModel = oportunidadeModel;
        this.orgaoModel = orgaoModel;
        this.produtoModel = produtoModel;
        this.pncpClientService = pncpClientService;
        this.schedulerRegistry = schedulerRegistry;
        this.configService = configService;
        this.eventsService = eventsService;
    }
    async onApplicationBootstrap() {
        const config = await this.configService.getConfiguracao();
        const horarios = config?.horariosBuscaBot && config.horariosBuscaBot.length > 0
            ? config.horariosBuscaBot
            : ['08:00', '12:00', '18:00'];
        await this.registrarCronDinamicoMultiplos(horarios);
        setTimeout(() => {
            void (async () => {
                try {
                    const hojeDate = new Date();
                    const dataHoje = `${hojeDate.getFullYear()}-${String(hojeDate.getMonth() + 1).padStart(2, '0')}-${String(hojeDate.getDate()).padStart(2, '0')}`;
                    const currentConfig = await this.configService.getConfiguracao();
                    if (currentConfig &&
                        currentConfig.ultimaExecucaoAutomaticaData !== dataHoje) {
                        this.logger.log(`Recuperação pós-boot: Bot não rodou hoje (${dataHoje}). Iniciando busca diária...`);
                        await this.executarBuscaDiaria(true);
                    }
                    else {
                        this.logger.log(`Boot verificado: Bot já rodou hoje (${dataHoje}).`);
                    }
                }
                catch (err) {
                    const errMsg = err instanceof Error ? err.message : String(err);
                    this.logger.error('Erro na recuperação de boot: ' + errMsg);
                }
            })();
        }, 15000);
    }
    registrarCronDinamicoMultiplos(horarios) {
        if (this.schedulerRegistry.doesExist('cron', 'botBuscaDiaria')) {
            this.schedulerRegistry.deleteCronJob('botBuscaDiaria');
        }
        const jobs = this.schedulerRegistry.getCronJobs();
        jobs.forEach((value, key) => {
            if (key.startsWith('botBuscaDiaria_')) {
                this.schedulerRegistry.deleteCronJob(key);
            }
        });
        horarios.forEach((horario, index) => {
            const nomeJob = `botBuscaDiaria_${index}`;
            const [hora, minuto] = horario.split(':');
            const cronExpression = `${minuto} ${hora} * * *`;
            const job = new cron_1.CronJob(cronExpression, async () => {
                this.logger.log(`Cron disparado às ${horario}...`);
                await this.executarBuscaDiaria(true);
            });
            this.schedulerRegistry.addCronJob(nomeJob, job);
            job.start();
            this.logger.log(`Cron dinâmico registrado para: ${horario} (expressão: ${cronExpression})`);
        });
    }
    async executarBuscaDiaria(isAutomatic = false) {
        if (this.emExecucao) {
            this.logger.warn('Bot já está em execução. Ignorando nova requisição.');
            return { message: 'Bot já está em execução.' };
        }
        this.emExecucao = true;
        this.eventsService.emitDashboardUpdate();
        try {
            const perfis = await this.perfilBuscaModel.find({ ativo: true });
            const resultados = [];
            for (const perfil of perfis) {
                this.logger.log(`Executando perfil: ${perfil.nome}`);
                let totalEncontrados = 0;
                let totalNovos = 0;
                const erros = [];
                const dataFinalDate = new Date();
                dataFinalDate.setDate(dataFinalDate.getDate() + 30);
                const yyyyF = dataFinalDate.getFullYear();
                const mmF = String(dataFinalDate.getMonth() + 1).padStart(2, '0');
                const ddF = String(dataFinalDate.getDate()).padStart(2, '0');
                const dataFinal = `${yyyyF}${mmF}${ddF}`;
                const dataInicialDate = new Date();
                dataInicialDate.setDate(dataInicialDate.getDate() - 30);
                const yyyyI = dataInicialDate.getFullYear();
                const mmI = String(dataInicialDate.getMonth() + 1).padStart(2, '0');
                const ddI = String(dataInicialDate.getDate()).padStart(2, '0');
                const dataInicial = `${yyyyI}${mmI}${ddI}`;
                for (const modalidade of perfil.modalidades) {
                    try {
                        const rawContratacoes = await this.pncpClientService.buscarContratacoesComPropostaAberta({
                            dataInicial,
                            dataFinal,
                            codigoModalidadeContratacao: modalidade,
                            uf: perfil.ufs && perfil.ufs.length > 0 ? perfil.ufs[0] : undefined,
                        });
                        for (const raw of rawContratacoes) {
                            if (perfil.municipiosIbge && perfil.municipiosIbge.length > 0) {
                                const ibge = raw.unidadeOrgao?.codigoIbge;
                                if (ibge && !perfil.municipiosIbge.includes(ibge)) {
                                    continue;
                                }
                            }
                            if (perfil.orgaosCnpj && perfil.orgaosCnpj.length > 0) {
                                const cnpj = raw.orgaoEntidade?.cnpj;
                                if (cnpj && !perfil.orgaosCnpj.includes(cnpj)) {
                                    continue;
                                }
                            }
                            if (perfil.unidadesUasg && perfil.unidadesUasg.length > 0) {
                                const uasg = raw.unidadeOrgao?.codigoUnidade;
                                if (uasg && !perfil.unidadesUasg.includes(uasg)) {
                                    continue;
                                }
                            }
                            const opDto = (0, pncp_dto_1.mapPncpParaOportunidade)(raw);
                            const fontesPermitidas = [
                                'Secretaria do Planejamento e Gestão do Ceará',
                                'Compras.gov.br',
                                'MUNICIPIO DE FORTALEZA',
                            ];
                            const usuarioNome = raw.usuarioNome;
                            if (usuarioNome) {
                                const fonteValida = fontesPermitidas.some((f) => usuarioNome.toLowerCase().includes(f.toLowerCase()));
                                if (!fonteValida) {
                                    continue;
                                }
                            }
                            if (perfil.palavrasChave && perfil.palavrasChave.length > 0) {
                                const normalizar = (t) => (t || '')
                                    .normalize('NFD')
                                    .replace(/[\u0300-\u036f]/g, '')
                                    .toLowerCase()
                                    .trim();
                                const objetoCompra = normalizar(opDto.objetoCompra);
                                let match = perfil.palavrasChave.some((p) => {
                                    const keyword = normalizar(p);
                                    return keyword.length > 0 && objetoCompra.includes(keyword);
                                });
                                if (!match) {
                                    try {
                                        const itensDaCompra = await this.pncpClientService.buscarItensDaContratacao(opDto.numeroControlePNCP);
                                        match = itensDaCompra.some((item) => {
                                            const descItem = normalizar(item.descricao);
                                            return perfil.palavrasChave.some((p) => {
                                                const keyword = normalizar(p);
                                                return keyword.length > 0 && descItem.includes(keyword);
                                            });
                                        });
                                        await new Promise((r) => setTimeout(r, 600));
                                    }
                                    catch (err) {
                                        const errMsg = err instanceof Error ? err.message : String(err);
                                        this.logger.warn(`Erro na Deep Search de Itens para ${opDto.numeroControlePNCP}: ${errMsg}`);
                                    }
                                }
                                if (!match)
                                    continue;
                            }
                            totalEncontrados++;
                            const existe = await this.oportunidadeModel.findOne({
                                numeroControlePNCP: opDto.numeroControlePNCP,
                            });
                            if (!existe) {
                                await this.oportunidadeModel.create(opDto);
                                totalNovos++;
                            }
                            else {
                                await this.oportunidadeModel.updateOne({ numeroControlePNCP: opDto.numeroControlePNCP }, {
                                    $set: {
                                        situacaoCompraNome: opDto.situacaoCompraNome,
                                        dataEncerramentoProposta: opDto.dataEncerramentoProposta,
                                        valorTotalEstimado: opDto.valorTotalEstimado,
                                    },
                                });
                            }
                            if (opDto.orgaoCnpj) {
                                const orgaoExiste = await this.orgaoModel.findOne({
                                    cnpj: opDto.orgaoCnpj,
                                });
                                if (!orgaoExiste) {
                                    await this.orgaoModel.create({
                                        cnpj: opDto.orgaoCnpj,
                                        nome: opDto.orgaoNome,
                                        origem: 'bot',
                                    });
                                }
                            }
                        }
                    }
                    catch (err) {
                        const errMsg = err instanceof Error ? err.message : String(err);
                        this.logger.error(`Erro ao buscar modalidade ${modalidade} do perfil ${perfil.nome}: ${errMsg}`);
                        erros.push(errMsg);
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
            if (isAutomatic) {
                const hojeDate = new Date();
                const dataHoje = `${hojeDate.getFullYear()}-${String(hojeDate.getMonth() + 1).padStart(2, '0')}-${String(hojeDate.getDate()).padStart(2, '0')}`;
                await this.configService.setUltimaExecucao(dataHoje);
                this.logger.log(`Busca automática concluída. Data registrada: ${dataHoje}`);
            }
            return resultados;
        }
        finally {
            this.emExecucao = false;
            this.eventsService.emitDashboardUpdate();
        }
    }
    isExecucao() {
        return this.emExecucao;
    }
};
exports.BotService = BotService;
exports.BotService = BotService = BotService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(bot_execucao_schema_1.BotExecucao.name)),
    __param(1, (0, mongoose_1.InjectModel)(perfil_busca_schema_1.PerfilBusca.name)),
    __param(2, (0, mongoose_1.InjectModel)(oportunidade_schema_1.Oportunidade.name)),
    __param(3, (0, mongoose_1.InjectModel)(orgao_schema_1.Orgao.name)),
    __param(4, (0, mongoose_1.InjectModel)(produto_schema_1.Produto.name)),
    __param(7, (0, common_1.Inject)((0, common_1.forwardRef)(() => configuracao_service_1.ConfiguracaoService))),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        pncp_client_service_1.PncpClientService,
        schedule_1.SchedulerRegistry,
        configuracao_service_1.ConfiguracaoService,
        events_service_1.EventsService])
], BotService);
//# sourceMappingURL=bot.service.js.map