import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Proposta, PropostaDocument } from '../proposta/proposta.schema';
import { ComprasGovScraperService } from './compras-gov-scraper.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class ComprasGovMonitorService {
  private readonly logger = new Logger(ComprasGovMonitorService.name);
  private emExecucao = false;
  
  // Cache em memória para os resultados da última varredura
  private ultimaVarreduraResultados: any[] = [];
  private dataUltimaVarredura: Date | null = null;

  constructor(
    @InjectModel(Proposta.name)
    private propostaModel: Model<PropostaDocument>,
    private readonly scraperService: ComprasGovScraperService,
    private readonly eventsService: EventsService,
  ) {}

  public getLatestResults() {
    return {
      data: this.dataUltimaVarredura,
      pregoes: this.ultimaVarreduraResultados
    };
  }

  @Cron('0,30 * * * *') // A cada 30 minutos (0 e 30)
  async handleCron() {
    this.logger.log('Iniciando monitoramento de propostas no Compras.gov.br...');
    
    if (this.emExecucao) {
      this.logger.warn('Bot de monitoramento já em execução. Pulando este ciclo.');
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
            itens: []
          });
        }
        
        pregoesMap.get(key).itens.push({
          itemId,
          nossaPosicao: dados.nossaPosicao,
          totalEmpresasNaFrente: dados.totalEmpresasNaFrente,
          concorrentesDesclassificados: dados.concorrentesDesclassificados,
          qtde: dados.qtde,
          valorOfertado: dados.valorOfertado
        });
      }
      
      this.ultimaVarreduraResultados = Array.from(pregoesMap.values());
      this.dataUltimaVarredura = new Date();
      
      this.logger.log(`Monitoramento finalizado. ${this.ultimaVarreduraResultados.length} pregões atualizados.`);
      
      // Emitir o evento WebSocket com o payload JSON estruturado para o Dashboard
      this.eventsService.emitirMonitoramentoConcluido(this.getLatestResults());

    } catch (error) {
      this.logger.error('Erro no monitoramento do Compras.gov.br', error);
      this.eventsService.emitirAlertaMonitoramento(`ALERTA: Erro ao acessar o portal Compras.gov.br: ${(error as Error).message}`);
    } finally {
      this.emExecucao = false;
    }
  }

  public saveSyncData(pregoes: any[]) {
    if (!this.ultimaVarreduraResultados) {
        this.ultimaVarreduraResultados = [];
    }
    
    // Mesclar com os dados existentes
    for (const pregao of pregoes) {
        const index = this.ultimaVarreduraResultados.findIndex(p => p.id === pregao.id);
        if (index >= 0) {
            this.ultimaVarreduraResultados[index] = pregao;
        } else {
            this.ultimaVarreduraResultados.push(pregao);
        }
    }
    
    this.dataUltimaVarredura = new Date();
    this.logger.log(`Monitoramento sincronizado via Extensão. ${pregoes.length} pregões recebidos. Total: ${this.ultimaVarreduraResultados.length}.`);
    this.eventsService.emitirMonitoramentoConcluido(this.getLatestResults());
    return { success: true, count: this.ultimaVarreduraResultados.length };
  }
}
