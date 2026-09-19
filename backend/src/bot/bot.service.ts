import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { BotExecucao, BotExecucaoDocument, BotErroExecucao, BotFiltrosEstatisticas } from './bot-execucao.schema';
import {
  PerfilBusca,
  PerfilBuscaDocument,
} from '../perfil-busca/perfil-busca.schema';
import {
  Oportunidade,
  OportunidadeDocument,
} from '../oportunidade/oportunidade.schema';
import { Orgao, OrgaoDocument } from '../orgao/orgao.schema';
import { Produto, ProdutoDocument } from '../produto/produto.schema';
import { PncpClientService } from '../pncp/services/pncp-client/pncp-client.service';
import { mapPncpParaOportunidade } from '../pncp/dtos/pncp.dto';
import { ConfiguracaoService } from '../configuracao/configuracao.service';
import { EventsService } from '../events/events.service';
import { SyncFailureLoggerService } from '../observability/sync-failure-logger.service';
import { SystemLogService } from '../observability/system-log/system-log.service';
import { OportunidadeGateway } from '../oportunidade/oportunidade.gateway';

/** Fontes/portais consideradas públicas e sem custo de acesso para o usuário */
const FONTES_PERMITIDAS = [
  'Secretaria do Planejamento e Gestão do Ceará',
  'Compras.gov.br',
  'MUNICIPIO DE FORTALEZA',
  'BLL Compras',
  'BLL',
  'Licitanet',
  'Comprasbr',
  'Licitar Digital',
  'Portal de Compras Públicas',
  'Banrisul',
  'TCE',
  'PREFEITURA',
  'MUNICIPIO',
  'SECRETARIA',
  'ESTADO',
  'GOVERNO',
  'CAMARA',
];

@Injectable()
export class BotService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BotService.name);
  private emExecucao = false;

  constructor(
    @InjectModel(BotExecucao.name)
    private botExecucaoModel: Model<BotExecucaoDocument>,
    @InjectModel(PerfilBusca.name)
    private perfilBuscaModel: Model<PerfilBuscaDocument>,
    @InjectModel(Oportunidade.name)
    private oportunidadeModel: Model<OportunidadeDocument>,
    @InjectModel(Orgao.name) private orgaoModel: Model<OrgaoDocument>,
    @InjectModel(Produto.name) private produtoModel: Model<ProdutoDocument>,
    private readonly pncpClientService: PncpClientService,
    private schedulerRegistry: SchedulerRegistry,
    @Inject(forwardRef(() => ConfiguracaoService))
    private configService: ConfiguracaoService,
    private eventsService: EventsService,
    private readonly syncFailureLogger: SyncFailureLoggerService,
    private readonly systemLogService: SystemLogService,
    private readonly oportunidadeGateway: OportunidadeGateway,
  ) {}

  async onApplicationBootstrap() {
    const config = await this.configService.getConfiguracao();
    const horarios =
      config?.horariosBuscaBot && config.horariosBuscaBot.length > 0
        ? config.horariosBuscaBot
        : ['08:00', '12:00', '18:00'];

    this.registrarCronDinamicoMultiplos(horarios);

    // Lógica de recuperação ao iniciar o sistema
    setTimeout(() => {
      void (async () => {
        try {
          const hojeDate = new Date();
          const dataHoje = `${hojeDate.getFullYear()}-${String(hojeDate.getMonth() + 1).padStart(2, '0')}-${String(hojeDate.getDate()).padStart(2, '0')}`;

          const currentConfig = await this.configService.getConfiguracao();
          if (
            currentConfig &&
            currentConfig.ultimaExecucaoAutomaticaData !== dataHoje
          ) {
            this.logger.log(
              `[BOT:BOOT] Bot não rodou hoje (${dataHoje}). Iniciando busca automática de recuperação...`,
            );
            await this.executarBuscaDiaria(true);
          } else {
            this.logger.log(
              `[BOT:BOOT] Bot já executou hoje (${dataHoje}). Nenhuma ação necessária.`,
            );
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.error(`[BOT:BOOT] Erro na recuperação de boot: ${errMsg}`);
          await this.systemLogService.logError(
            'Bot',
            `Erro na recuperação de boot: ${errMsg}`,
            err instanceof Error ? err.stack : undefined,
          );
        }
      })();
    }, 15000); // 15s de delay para aguardar inicialização completa
  }

  registrarCronDinamicoMultiplos(horarios: string[]) {
    // Remove o job antigo (single) se existir
    if (this.schedulerRegistry.doesExist('cron', 'botBuscaDiaria')) {
      this.schedulerRegistry.deleteCronJob('botBuscaDiaria');
    }

    // Remove os jobs multi antigos
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

      const job = new CronJob(cronExpression, async () => {
        this.logger.log(`[BOT:CRON] Cron disparado às ${horario}. Iniciando busca diária...`);
        await this.executarBuscaDiaria(true);
      });

      this.schedulerRegistry.addCronJob(nomeJob, job);
      job.start();
      this.logger.log(
        `[BOT:CRON] Job registrado: ${nomeJob} | Horário: ${horario} | Expressão: ${cronExpression}`,
      );
    });
  }

  async executarBuscaDiaria(isAutomatic = false) {
    if (this.emExecucao) {
      this.logger.warn('[BOT:GUARD] Bot já está em execução. Ignorando nova requisição.');
      return { message: 'Bot já está em execução.' };
    }

    // Gera um ID único para rastrear todos os logs desta execução
    const correlationId = randomUUID();
    const inicioExecucao = Date.now();

    this.emExecucao = true;
    this.eventsService.emitDashboardUpdate();

    this.logger.log(`[BOT:START] ===== NOVA EXECUÇÃO INICIADA | correlationId=${correlationId} | tipo=${isAutomatic ? 'automática' : 'manual'} =====`);

    try {
      const perfis = await this.perfilBuscaModel.find({ ativo: true });
      this.logger.log(`[BOT:PERFIS] ${perfis.length} perfil(is) ativo(s) encontrado(s).`);

      const resultados = [];

      for (const perfil of perfis) {
        const inicioPerfil = Date.now();
        this.logger.log(`[BOT:PERFIL] ── Iniciando perfil: "${perfil.nome}" (${perfil.modalidades.length} modalidade(s)) ──`);

        let totalEncontrados = 0;
        let totalNovos = 0;
        const erros: BotErroExecucao[] = [];

        // Contadores detalhados de filtragem
        const filtros: BotFiltrosEstatisticas = {
          descartadosFonte: 0,
          descartadosMunicipio: 0,
          descartadosPalavraChave: 0,
          descartadosCnpjOrgao: 0,
          descartadosUasg: 0,
          atualizados: 0,
        };

        // dataFinal: encerramento da proposta até 20 dias no futuro.
        // A API do PNCP filtra por dataEncerramentoProposta, não por publicação.
        // Editais recém-publicados encerram no futuro (mínimo 8-20 dias por lei),
        // então limitar ao dia de hoje os tornaria invisíveis para o bot.
        const dataFinalDate = new Date();
        dataFinalDate.setDate(dataFinalDate.getDate() + 20);
        const yyyyF = dataFinalDate.getFullYear();
        const mmF = String(dataFinalDate.getMonth() + 1).padStart(2, '0');
        const ddF = String(dataFinalDate.getDate()).padStart(2, '0');
        const dataFinal = `${yyyyF}${mmF}${ddF}`;

        // dataInicial: encerramento da proposta a partir de 20 dias atrás.
        // Captura editais recentes que ainda podem estar em vigor.
        const dataInicialDate = new Date();
        dataInicialDate.setDate(dataInicialDate.getDate() - 20);
        const yyyyI = dataInicialDate.getFullYear();
        const mmI = String(dataInicialDate.getMonth() + 1).padStart(2, '0');
        const ddI = String(dataInicialDate.getDate()).padStart(2, '0');
        const dataInicial = `${yyyyI}${mmI}${ddI}`;

        this.logger.log(`[BOT:DATAS] Janela de busca: ${dataInicial} → ${dataFinal} (encerramento da proposta)`);

        for (const modalidade of perfil.modalidades) {
          try {
            this.logger.log(`[BOT:PNCP] Buscando modalidade ${modalidade} para perfil "${perfil.nome}"...`);
            const rawContratacoes =
              await this.pncpClientService.buscarContratacoesComPropostaAberta({
                dataInicial,
                dataFinal,
                codigoModalidadeContratacao: modalidade,
                uf:
                  perfil.ufs && perfil.ufs.length > 0
                    ? perfil.ufs[0]
                    : undefined,
              });

            this.logger.log(`[BOT:PNCP] Modalidade ${modalidade}: ${rawContratacoes.length} contrataçõe(s) recebidas da API.`);

            for (const raw of rawContratacoes) {
              try {
                // ── FILTRO: Município/IBGE ──
                if (perfil.municipiosIbge && perfil.municipiosIbge.length > 0) {
                  const ibge = raw.unidadeOrgao?.codigoIbge;
                  if (ibge && !perfil.municipiosIbge.includes(ibge)) {
                    filtros.descartadosMunicipio++;
                    continue;
                  }
                }

                // ── FILTRO: CNPJ do Órgão ──
                if (perfil.orgaosCnpj && perfil.orgaosCnpj.length > 0) {
                  const cnpj = raw.orgaoEntidade?.cnpj;
                  if (cnpj && !perfil.orgaosCnpj.includes(cnpj)) {
                    filtros.descartadosCnpjOrgao++;
                    continue;
                  }
                }

                // ── FILTRO: UASG ──
                if (perfil.unidadesUasg && perfil.unidadesUasg.length > 0) {
                  const uasg = raw.unidadeOrgao?.codigoUnidade;
                  if (uasg && !perfil.unidadesUasg.includes(uasg)) {
                    filtros.descartadosUasg++;
                    continue;
                  }
                }

                const opDto = mapPncpParaOportunidade(raw);

                // ── FILTRO: Fonte/Portal de Origem ──
                const usuarioNome = raw.usuarioNome;
                if (usuarioNome) {
                  const fonteValida = FONTES_PERMITIDAS.some((f) =>
                    usuarioNome.toLowerCase().includes(f.toLowerCase()),
                  );
                  if (!fonteValida) {
                    this.logger.debug(
                      `[BOT:FONTE] Descartado por fonte desconhecida: "${usuarioNome}" | Edital: ${raw.numeroControlePNCP || 'N/A'}`,
                    );
                    filtros.descartadosFonte++;
                    continue;
                  }
                }
                // Se usuarioNome for vazio/undefined, o edital é permitido (não descartamos sem motivo)

                // ── FILTRO: Palavras-chave ──
                if (perfil.palavrasChave && perfil.palavrasChave.length > 0) {
                  const normalizar = (t: string) =>
                    (t || '')
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')
                      .toLowerCase()
                      .trim();
                  const objetoCompra = normalizar(opDto.objetoCompra);

                  let match = perfil.palavrasChave.some((p) => {
                    const keyword = normalizar(p);
                    return keyword.length > 0 && objetoCompra.includes(keyword);
                  });

                  // DEEP SEARCH: Se não achou no título, vasculha os itens reais do edital.
                  // ATENÇÃO: Desativado temporariamente pois causa timeout e erro 503 no PNCP
                  // ao tentar buscar detalhes de milhares de editais em sequência.
                  const deepSearchHabilitado = false; // TODO: Mover para configuração do painel
                  if (!match && deepSearchHabilitado) {
                    try {
                      this.logger.log(`[BOT:DEEP] Título não bateu. Buscando itens do edital ${opDto.numeroControlePNCP}...`);
                      const itensDaCompra =
                        await this.pncpClientService.buscarItensDaContratacao(
                          opDto.numeroControlePNCP,
                        );
                      match = itensDaCompra.some((item) => {
                        const descItem = normalizar(
                          String(item.descricao || ''),
                        );
                        return perfil.palavrasChave.some((p) => {
                          const keyword = normalizar(p);
                          return (
                            keyword.length > 0 && descItem.includes(keyword)
                          );
                        });
                      });
                    } catch (err) {
                      const errMsg =
                        err instanceof Error ? err.message : String(err);
                      this.logger.warn(
                        `[BOT:DEEP] Erro ao buscar itens de ${opDto.numeroControlePNCP}: ${errMsg}`,
                      );
                      await this.systemLogService.logWarn(
                        'Bot',
                        `Erro na Deep Search de Itens para ${opDto.numeroControlePNCP}: ${errMsg}`,
                        { correlationId },
                      );
                    }
                  }

                  if (!match) {
                    filtros.descartadosPalavraChave++;
                    continue;
                  }
                }

                totalEncontrados++;

                // ── DB: Deduplicar e inserir/atualizar ──
                const existe = await this.oportunidadeModel.findOne({
                  numeroControlePNCP: opDto.numeroControlePNCP,
                });

                if (!existe) {
                  const created = await this.oportunidadeModel.create(opDto);
                  this.oportunidadeGateway.emitOportunidadeUpdate(created);
                  totalNovos++;
                } else {
                  await this.oportunidadeModel.updateOne(
                    { numeroControlePNCP: opDto.numeroControlePNCP },
                    {
                      $set: {
                        situacaoCompraNome: opDto.situacaoCompraNome,
                        dataEncerramentoProposta:
                          opDto.dataEncerramentoProposta,
                        valorTotalEstimado: opDto.valorTotalEstimado,
                      },
                    },
                  );
                  filtros.atualizados++;
                }

                // ── DB: Inserir Orgão se não existir ──
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
              } catch (itemErr) {
                const numControle = raw?.numeroControlePNCP || 'desconhecido';
                await this.syncFailureLogger.registrarFalha({
                  jobName: 'automacao-pncp',
                  itemId: numControle,
                  stage: 'processar_oportunidade',
                  error:
                    itemErr instanceof Error
                      ? itemErr
                      : new Error(String(itemErr)),
                  inputSnapshot: raw,
                });
                continue; // Processa os próximos itens normalmente
              }
            }
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            this.logger.error(
              `[BOT:ERRO] Modalidade ${modalidade} do perfil "${perfil.nome}" falhou: ${errMsg}`,
            );
            await this.systemLogService.logError(
              'Bot',
              `Modalidade ${modalidade} do perfil "${perfil.nome}" falhou: ${errMsg}`,
              err instanceof Error ? err.stack : undefined,
              { correlationId, perfilNome: perfil.nome, modalidade },
            );
            erros.push({
              modalidade,
              perfilNome: perfil.nome,
              mensagem: errMsg,
              stack: err instanceof Error ? err.stack : undefined,
              dataHora: new Date(),
            });
          }
        }

        const duracaoMs = Date.now() - inicioPerfil;

        this.logger.log(
          `[BOT:PERFIL] ── Perfil "${perfil.nome}" concluído em ${duracaoMs}ms | ` +
          `Novos: ${totalNovos} | Atualizados: ${filtros.atualizados} | ` +
          `Descartados → Fonte: ${filtros.descartadosFonte} | Município: ${filtros.descartadosMunicipio} | ` +
          `Palavra-chave: ${filtros.descartadosPalavraChave} | CNPJ: ${filtros.descartadosCnpjOrgao} | ` +
          `UASG: ${filtros.descartadosUasg} | Erros: ${erros.length} ──`,
        );

        const execucao = await this.botExecucaoModel.create({
          correlationId,
          perfilBuscaId: perfil._id,
          perfilNome: perfil.nome,
          totalEncontrados,
          totalNovos,
          duracaoMs,
          filtros,
          erros,
        });
        resultados.push(execucao);
      }

      const duracaoTotalMs = Date.now() - inicioExecucao;

      if (isAutomatic) {
        const hojeDate = new Date();
        const dataHoje = `${hojeDate.getFullYear()}-${String(hojeDate.getMonth() + 1).padStart(2, '0')}-${String(hojeDate.getDate()).padStart(2, '0')}`;
        await this.configService.setUltimaExecucao(dataHoje);
        this.logger.log(
          `[BOT:END] ===== EXECUÇÃO AUTOMÁTICA CONCLUÍDA em ${duracaoTotalMs}ms | correlationId=${correlationId} | Data registrada: ${dataHoje} =====`,
        );
      } else {
        this.logger.log(
          `[BOT:END] ===== EXECUÇÃO MANUAL CONCLUÍDA em ${duracaoTotalMs}ms | correlationId=${correlationId} =====`,
        );
      }

      return resultados;
    } finally {
      this.emExecucao = false;
      this.eventsService.emitDashboardUpdate();
      this.oportunidadeGateway.emitBotExecutionUpdated();
    }
  }

  isExecucao(): boolean {
    return this.emExecucao;
  }
}
