import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
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
    private monitorService: ComprasGovMonitorService,
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
      const oportunidades = response.data || [];
      // Filtrar todas as oportunidades ativas (diferentes de EXCLUIDA) que possuam UASG e número
      const ativas = oportunidades.filter(
        (op: any) =>
          op.kanbanStatus !== 'EXCLUIDA' &&
          [
            'FAZENDO',
            'FEITO',
            'NEGOCIACAO',
            'HOMOLOGACAO',
            'NEGOCIAÇÃO',
            'HOMOLOGAÇÃO',
            'A_FAZER',
            'PROPOSTA',
          ].includes(String(op.kanbanStatus)),
      );

      this.logger.log(
        `Encontradas ${ativas.length} oportunidades ativas para monitoramento no Compras.gov.`,
      );

      for (const op of ativas as any[]) {
        let uasg = op.unidadeCompradora ? String(op.unidadeCompradora) : '';
        let pregaoNum = op.numeroCompraOrigem
          ? String(op.numeroCompraOrigem)
          : '';
        let anoNum = op.anoCompraOrigem;

        if ((!uasg || !pregaoNum) && op.numeroControlePNCP) {
          const parts = String(op.numeroControlePNCP).split('-');
          if (parts.length >= 3) {
            if (!uasg) uasg = parts[0];
            if (!pregaoNum) pregaoNum = parts[2];
          }
        }

        if (pregaoNum && pregaoNum.includes('/')) {
          const [n, a] = pregaoNum.split('/');
          pregaoNum = n;
          anoNum = anoNum || Number(a);
        }

        if (!uasg || !pregaoNum) {
          this.logger.log(
            `Oportunidade ${op._id} sem UASG/Número identificável. Pulando...`,
          );
          continue;
        }

        const anoFinal = anoNum || new Date().getFullYear();
        const pregaoStr = `${pregaoNum}/${anoFinal}`;

        try {
          this.logger.log(
            `Varrendo: UASG ${uasg} Pregão ${pregaoStr} (${op.orgaoNome || 'Órgão'})`,
          );
          const data = await this.comprasnetPublicService.scrapeSalaDisputa(
            uasg,
            pregaoStr,
          );

          // Mapear os dados para o formato esperado pelo monitorService
          const rawChat = Array.isArray(data.chat) ? data.chat.join('\n') : '';
          const pId = `${uasg}-${pregaoStr}`;

          const payload = [
            {
              id: pId,
              uasg: uasg,
              pregao: pregaoStr,
              orgaoNome: String(op.orgaoNome || ''),
              objetoCompra: String(op.objetoCompra || ''),
              itens: [
                {
                  itemId: `Pregão ${pregaoStr}`,
                  nossaPosicao:
                    Array.isArray(data.posicoes) && data.posicoes.length > 0
                      ? 1
                      : 999,
                  rawChat: rawChat,
                  rawPosicoes: Array.isArray(data.posicoes)
                    ? data.posicoes.join('\n')
                    : '',
                  chat: rawChat,
                  status:
                    op.kanbanStatus === 'HOMOLOGACAO'
                      ? 'Homologado'
                      : 'Participando',
                },
              ],
            },
          ];

          this.monitorService.saveSyncData(payload);

          // Espera um pouco antes da próxima para economizar memória
          await new Promise((r) => setTimeout(r, 3000));
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
