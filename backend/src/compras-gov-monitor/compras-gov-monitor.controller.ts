import { Controller, Post, Get, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ComprasGovMonitorService } from './compras-gov-monitor.service';

@ApiTags('Monitoramento Compras.gov.br')
@Controller('compras-gov-monitor')
export class ComprasGovMonitorController {
  constructor(private readonly monitorService: ComprasGovMonitorService) {}

  @Post('run-now')
  @ApiOperation({ summary: 'Dispara a execução do bot de monitoramento manualmente' })
  @ApiResponse({ status: 201, description: 'Resultado da execução do scraper' })
  async runNow() {
    this.monitorService.handleCron();
    return { message: 'Monitoramento do Compras.gov.br iniciado em background.' };
  }

  @Post('sync')
  @ApiOperation({ summary: 'Recebe os dados de sincronização enviados pela Extensão Chrome' })
  @ApiResponse({ status: 201, description: 'Dados salvos com sucesso' })
  async syncData(@Body() pregoes: any[]) {
    return this.monitorService.saveSyncData(pregoes);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Obtém os últimos resultados consolidados do monitoramento' })
  @ApiResponse({ status: 200, description: 'Lista de pregões, itens e posições' })
  getLatest() {
    return this.monitorService.getLatestResults();
  }
}
