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
    @Query('module') module?: string,
  ) {
    const data = await this.systemLogService.getRecentLogs(limit ? Number(limit) : 100, level, module);
    return { data };
  }
}
