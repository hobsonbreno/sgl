import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OportunidadeService } from '../oportunidade/oportunidade.service';
import { ComprasnetPublicService } from './comprasnet-public.service';
import { ComprasGovMonitorService } from './compras-gov-monitor.service';

@Injectable()
export class RadarService {
  private readonly logger = new Logger(RadarService.name);
  private isRunning = false;

  constructor(
    private oportunidadeService: OportunidadeService,
    private comprasnetPublicService: ComprasnetPublicService,
    private monitorService: ComprasGovMonitorService
  ) {}

  @Cron('*/10 * * * *')
  async handleCron() {
    this.logger.log('Iniciando ciclo de varredura Radar (10 mins)...');
    
    if (this.isRunning) {
        this.logger.log('Radar já está em execução. Ignorando...');
        return;
    }
    
    this.isRunning = true;
    try {
        const response = await this.oportunidadeService.findAll({});
        const oportunidades = response.data;
        // Filtrar oportunidades na fase 'FAZENDO' que sejam do Comprasnet
        const fazendo = oportunidades.filter((op: any) => op.kanbanStatus === 'FAZENDO' && (op.linkSistemaOrigem?.includes('comprasnet') || op.linkSistemaOrigem?.includes('cnetmobile')));
        
        this.logger.log(`Encontradas ${fazendo.length} oportunidades em FAZENDO no Comprasnet para monitorar.`);
        
        for (const op of fazendo as any[]) {
            if (!op.unidadeCompradora || !op.numeroCompraOrigem || !op.anoCompraOrigem) {
                this.logger.log(`Oportunidade ${op._id} sem uasg/numero completos. Pulando...`);
                continue;
            }
            
            try {
                this.logger.log(`Varrendo: UASG ${op.unidadeCompradora} Pregão ${op.numeroCompraOrigem}/${op.anoCompraOrigem}`);
                const data = await this.comprasnetPublicService.scrapeSalaDisputa(op.unidadeCompradora.toString(), `${op.numeroCompraOrigem}/${op.anoCompraOrigem}`);
                
                // Mapear os dados para o formato esperado pelo monitorService
                const rawChat = data.chat.join('\n');
                const pId = `${op.unidadeCompradora}-${op.numeroCompraOrigem}/${op.anoCompraOrigem}`;
                
                // Nós apenas passamos um "mock" de itensEncontrados contendo o texto do chat e ranking bruto
                // Pois a extração exata de DOM pode precisar de refinamentos, mas o monitor já busca keywords no chat.
                const payload = [{
                    id: pId,
                    uasg: op.unidadeCompradora.toString(),
                    pregao: `${op.numeroCompraOrigem}/${op.anoCompraOrigem}`,
                    itens: [{
                        numero: 1, // mock
                        nossaPosicao: data.posicoes.join(' | '),
                        rawChat: rawChat,
                        rawPosicoes: data.posicoes.join('\n')
                    }]
                }];
                
                await this.monitorService.saveSyncData(payload);
                
                // Espera um pouco antes de abrir a proxima aba para não estourar a RAM
                await new Promise(r => setTimeout(r, 5000));
            } catch (err) {
                this.logger.error(`Erro ao monitorar a oportunidade ${op._id}`, err);
            }
        }
        
    } catch (e) {
        this.logger.error('Erro geral no ciclo Radar', e);
    } finally {
        this.isRunning = false;
        this.logger.log('Ciclo de varredura Radar finalizado.');
    }
  }
}
