import { Controller, Get, Query } from '@nestjs/common';
import { SystemLogService } from './system-log.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Observabilidade')
@Controller('observability/system-logs')
export class SystemLogController {
  constructor(private readonly systemLogService: SystemLogService) {}

  @Get()
  @ApiOperation({ summary: 'Obter os logs do sistema mais recentes' })
  async getLogs(
    @Query('limit') limit?: number,
    @Query('level') level?: string,
    @Query('modulo') modulo?: string,
    @Query('correlationId') correlationId?: string,
  ) {
    const data = await this.systemLogService.getRecentLogs(
      limit ? Number(limit) : 100,
      level,
      modulo,
      correlationId,
    );
    return { data };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estatísticas de logs agrupadas por módulo e nível' })
  async getStats(
    @Query('dataInicio') dataInicioStr?: string,
    @Query('dataFim') dataFimStr?: string,
  ) {
    const dataInicio = dataInicioStr ? new Date(dataInicioStr) : undefined;
    const dataFim = dataFimStr ? new Date(dataFimStr) : undefined;

    const stats = await this.systemLogService.getLogStats(dataInicio, dataFim);
    return { data: stats };
  }
}
