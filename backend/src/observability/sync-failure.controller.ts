import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { SyncFailureLoggerService } from './sync-failure-logger.service';

@Controller('observability')
export class SyncFailureController {
  constructor(private readonly syncFailureLogger: SyncFailureLoggerService) {}

  @Get('falhas')
  async listarFalhas(
    @Query('jobName') jobName?: string,
    @Query('apenasNaoRevisadas') apenasNaoRevisadas?: string,
    @Query('limit') limit?: string,
  ) {
    return this.syncFailureLogger.listarFalhas({
      jobName,
      apenasNaoRevisadas: apenasNaoRevisadas === 'true',
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('falhas/resumo')
  async resumoPorMotivo(@Query('jobName') jobName: string) {
    return this.syncFailureLogger.resumoPorMotivo(jobName);
  }

  @Patch('falhas/:id/revisar')
  async marcarComoRevisado(@Param('id') id: string) {
    await this.syncFailureLogger.marcarComoRevisado(id);
    return { ok: true };
  }
}
