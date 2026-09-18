import { Controller, Post, Get, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ComprasGovMonitorService } from './compras-gov-monitor.service';
import { RadarService } from './radar.service';

@ApiTags('Monitoramento Compras.gov.br')
@Controller('compras-gov-monitor')
export class ComprasGovMonitorController {
  private readonly logger = new Logger(ComprasGovMonitorController.name);

  constructor(
    private readonly monitorService: ComprasGovMonitorService,
    private readonly radarService: RadarService,
  ) {}

  @Post('sniff')
  @ApiOperation({
    summary: 'Recebe dados interceptados para análise da API',
  })
  @ApiResponse({ status: 201, description: 'Dados processados com sucesso' })
  async receiveSniffedData(@Body() data: any) {
    this.logger.debug('🚀 [SNIFFER] Requisicao interceptada: ' + data?.url);
    if (data?.url?.includes('comprasnet')) {
      console.log(
        '\n\n====================== INICIO PAYLOAD ======================',
      );
      console.log('URL: ', data.url);
      console.log(JSON.stringify(data.body, null, 2).substring(0, 5000));
      console.log(
        '====================== FIM PAYLOAD ======================\n\n',
      );
    }
    return { success: true };
  }

  @Post('run-now')
  @ApiOperation({
    summary: 'Dispara a execução do bot de monitoramento manualmente',
  })
  @ApiResponse({ status: 201, description: 'Resultado da execução do scraper' })
  runNow() {
    this.radarService.handleCron().catch(console.error);
    return {
      message: 'Monitoramento do Compras.gov.br iniciado em background.',
    };
  }

  @Post('sync')
  @ApiOperation({
    summary: 'Recebe os dados de sincronização enviados pela Extensão Chrome',
  })
  @ApiResponse({ status: 201, description: 'Dados salvos com sucesso' })
  syncData(@Body() pregoes: any[]) {
    return this.monitorService.saveSyncData(pregoes);
  }

  @Get('latest')
  @ApiOperation({
    summary: 'Obtém os últimos resultados consolidados do monitoramento',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de pregões, itens e posições',
  })
  getLatest() {
    return this.monitorService.getLatestResults();
  }
}
