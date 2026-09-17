import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Proposta, PropostaDocument } from '../proposta/proposta.schema';
import { ComprasGovScraperService } from './compras-gov-scraper.service';
import { EventsService } from '../events/events.service';
import { SystemLogService } from '../observability/system-log/system-log.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ComprasGovMonitorService {
  private readonly logger = new Logger(ComprasGovMonitorService.name);
  private emExecucao = false;

  // Cache em memória para os resultados da última varredura
  private ultimaVarreduraResultados: any[] = [];
  private dataUltimaVarredura: Date | null = null;

  private readonly cacheDir = path.join(process.cwd(), 'cache');
  private readonly cachePath = path.join(
    this.cacheDir,
    'compras-gov-cache.json',
  );

  constructor(
    @InjectModel(Proposta.name)
    private propostaModel: Model<PropostaDocument>,
    private readonly scraperService: ComprasGovScraperService,
    private readonly eventsService: EventsService,
    private readonly systemLogService: SystemLogService,
  ) {
    this.carregarCache();
  }

  private carregarCache() {
    try {
      if (fs.existsSync(this.cachePath)) {
        const data = fs.readFileSync(this.cachePath, 'utf8');
        const parsed = JSON.parse(data);
        this.ultimaVarreduraResultados = parsed.pregoes || [];
        this.dataUltimaVarredura = parsed.data
          ? new Date(parsed.data as string)
          : null;
        this.logger.log(
          `Cache de monitoramento carregado com ${this.ultimaVarreduraResultados.length} pregões.`,
        );
      }
    } catch (e) {
      this.logger.error('Erro ao carregar cache do monitoramento', e);
      void this.systemLogService.logError('ComprasGovMonitor', 'Erro ao carregar cache do monitoramento', e instanceof Error ? e.stack : undefined);
    }
  }

  private salvarCache() {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
      const data = {
        data: this.dataUltimaVarredura,
        pregoes: this.ultimaVarreduraResultados,
      };
      fs.writeFileSync(this.cachePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      this.logger.error('Erro ao salvar cache do monitoramento', e);
      void this.systemLogService.logError('ComprasGovMonitor', 'Erro ao salvar cache do monitoramento', e instanceof Error ? e.stack : undefined);
    }
  }

  public getLatestResults() {
    return {
      data: this.dataUltimaVarredura,
      pregoes: this.ultimaVarreduraResultados,
    };
  }

  @Cron('0 * * * *') // A cada 1 hora (no minuto 0)
  async handleCron() {
    this.logger.log(
      'Iniciando monitoramento de propostas no Compras.gov.br...',
    );

    if (this.emExecucao) {
      this.logger.warn(
        'Bot de monitoramento já em execução. Pulando este ciclo.',
      );
      return;
    }

    this.emExecucao = true;
    try {
      const resultados = await this.scraperService.scrapeMinhasParticipacoes();

      // Agrupar os resultados por Pregão
      const pregoesMap = new Map<string, any>();

      for (const [itemId, dados] of resultados.entries()) {
        const key = `${dados.uasg}-${dados.pregao}`;

        if (!pregoesMap.has(key)) {
          pregoesMap.set(key, {
            id: key,
            uasg: dados.uasg,
            pregao: dados.pregao,
            itens: [],
          });
        }

        pregoesMap.get(key).itens.push({
          itemId,
          nossaPosicao: dados.nossaPosicao,
          totalEmpresasNaFrente: dados.totalEmpresasNaFrente,
          concorrentesDesclassificados: dados.concorrentesDesclassificados,
          qtde: dados.qtde,
          valorOfertado: dados.valorOfertado,
        });
      }

      if (pregoesMap.size > 0) {
        for (const pregao of Array.from(pregoesMap.values())) {
          const index = this.ultimaVarreduraResultados.findIndex(
            (p) => p.id === pregao.id,
          );
          if (index >= 0) {
            if (pregao.itens && pregao.itens.length > 0) {
              this.ultimaVarreduraResultados[index] = pregao;
            }
          } else {
            if (pregao.itens && pregao.itens.length > 0) {
              this.ultimaVarreduraResultados.push(pregao);
            }
          }
        }
        this.dataUltimaVarredura = new Date();
        this.salvarCache();
      } else {
        this.logger.warn(
          'Nenhum resultado obtido pelo scraper backend (Puppeteer). Mantendo os dados sincronizados pela extensão.',
        );
      }

      this.logger.log(
        `Monitoramento finalizado. ${this.ultimaVarreduraResultados.length} pregões atualizados.`,
      );

      // Emitir o evento WebSocket com o payload JSON estruturado para o Dashboard
      this.eventsService.emitirMonitoramentoConcluido(this.getLatestResults());
    } catch (error) {
      this.logger.error('Erro no monitoramento do Compras.gov.br', error);
      void this.systemLogService.logError('ComprasGovMonitor', 'Erro no monitoramento do Compras.gov.br', error instanceof Error ? error.stack : undefined);
      this.eventsService.emitirAlertaMonitoramento(
        `ALERTA: Erro ao acessar o portal Compras.gov.br: ${(error as Error).message}`,
      );
    } finally {
      this.emExecucao = false;
    }
  }

  public saveSyncData(pregoes: any[]) {
    if (!this.ultimaVarreduraResultados) {
      this.ultimaVarreduraResultados = [];
    }

    // Processamento de Inteligência Competitiva
    const nossoCnpj = '48.262.939/0001-50';
    for (const pregao of pregoes) {
      if (pregao.itens) {
        for (const item of pregao.itens) {
          if (item.competidores && item.competidores.length > 0) {
            const ativas = item.competidores.filter(
              (c: any) => c.status === 'Ativa' && typeof c.valor === 'number',
            );
            ativas.sort((a: any, b: any) => a.valor - b.valor);

            item.inteligencia = {
              ranking: ativas,
              nossaPosicao: item.nossaPosicao || 999,
              nossaEmpresaStatus: item.nossaEmpresaStatus || 'Ativa',
              nossoValor: null,
              primeiroLugar: ativas.length > 0 ? ativas[0].valor : null,
              proximoAlvo: null,
              mensagemEstrategica: '',
            };

            const indexNaListaGeral = item.competidores.findIndex(
              (c: any) =>
                c.cnpj === nossoCnpj ||
                c.textoBruto.includes('48262939000150') ||
                c.textoBruto.includes('GRUPO IRMAOS NASCIMENTO'),
            );

            if (indexNaListaGeral !== -1) {
              const nossaEmpresa = item.competidores[indexNaListaGeral];
              item.inteligencia.nossoValor = nossaEmpresa.valor;
              item.valorOfertado = nossaEmpresa.valor;

              if (item.inteligencia.nossaEmpresaStatus !== 'Ativa') {
                item.inteligencia.mensagemEstrategica = `Sua empresa foi ${item.inteligencia.nossaEmpresaStatus} neste item.`;
              } else if (item.inteligencia.nossaPosicao === 1) {
                if (
                  item.status &&
                  item.status !== 'Ativo' &&
                  item.status !== 'Participando'
                ) {
                  item.inteligencia.mensagemEstrategica = `🏆 1º Lugar consolidado! Status do item: ${item.status}.`;
                } else {
                  item.inteligencia.mensagemEstrategica =
                    '🏆 Você está em 1º Lugar (em andamento)! Mantenha a posição.';
                }
              } else {
                const indexAtivas = ativas.findIndex(
                  (c: any) => c.cnpj === nossaEmpresa.cnpj,
                );
                if (indexAtivas > 0) {
                  const proximo = ativas[indexAtivas - 1].valor;
                  item.inteligencia.proximoAlvo = proximo;
                  const primeiro = ativas[0].valor;
                  item.inteligencia.mensagemEstrategica = `Para assumir o ${indexAtivas}º lugar, baixe de R$ ${proximo.toFixed(4)}. Para o 1º lugar, baixe de R$ ${primeiro.toFixed(4)}.`;
                } else {
                  item.inteligencia.mensagemEstrategica = `Estamos na ${item.inteligencia.nossaPosicao}ª posição.`;
                }
              }
            } else {
              item.inteligencia.mensagemEstrategica =
                'Sua proposta não foi encontrada na zona de classificação.';
            }

            // --- LÓGICA DE ALERTAS DO RADAR (Evitando spam ao comparar com o estado anterior) ---
            const pregaoAntigo = this.ultimaVarreduraResultados.find(p => p.id === pregao.id);
            const itemAntigo = pregaoAntigo?.itens?.find((i: any) => i.itemId === item.itemId);

            // 1. Alerta de Posição
            if (item.inteligencia.nossaPosicao === 1 && itemAntigo?.inteligencia?.nossaPosicao !== 1) {
              this.eventsService.emitirAlertaRadar({
                tipo: 'RANKING_1',
                pregao: pregao.id,
                itemId: item.itemId,
                mensagem: `🏆 Você assumiu o 1º LUGAR no ${item.itemId}!`,
              });
            } else if (item.inteligencia.nossaPosicao === 2 && itemAntigo?.inteligencia?.nossaPosicao !== 2) {
              this.eventsService.emitirAlertaRadar({
                tipo: 'RANKING_2',
                pregao: pregao.id,
                itemId: item.itemId,
                mensagem: `⚠️ Você subiu para o 2º LUGAR no ${item.itemId}! Prepare a documentação.`,
              });
            }

            // 2. Alerta de Chat
            if (item.chat && item.chat !== itemAntigo?.chat) {
              const chatNovo = itemAntigo?.chat 
                ? item.chat.replace(itemAntigo.chat, '') 
                : item.chat;
                
              const chatUpper = chatNovo.toUpperCase();
              if (
                chatUpper.includes('IRMAOS NASCIMENTO') ||
                chatUpper.includes('IRMÃOS NASCIMENTO') ||
                chatUpper.includes('48.262.939/0001-50') ||
                chatUpper.includes('48262939000150') ||
                chatUpper.includes('CONVOCADO')
              ) {
                this.eventsService.emitirAlertaRadar({
                  tipo: 'CHAT',
                  pregao: pregao.id,
                  itemId: item.itemId,
                  mensagem: `🚨 O Pregoeiro enviou mensagem direcionada no ${item.itemId}!`,
                });
              }
            }
            // ---------------------------------------------------------------------------------

          }
        }
      }

      const index = this.ultimaVarreduraResultados.findIndex(
        (p) => p.id === pregao.id,
      );
      if (index >= 0) {
        if (pregao.itens && pregao.itens.length > 0) {
          this.ultimaVarreduraResultados[index] = pregao;
        }
      } else {
        if (pregao.itens && pregao.itens.length > 0) {
          this.ultimaVarreduraResultados.push(pregao);
        }
      }
    }

    this.dataUltimaVarredura = new Date();
    this.salvarCache();

    this.logger.log(
      `Monitoramento sincronizado via Extensão. ${pregoes.length} pregões recebidos. Total: ${this.ultimaVarreduraResultados.length}.`,
    );
    this.eventsService.emitirMonitoramentoConcluido(this.getLatestResults());
    return { success: true, count: this.ultimaVarreduraResultados.length };
  }
}
