import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('resumo')
  @ApiOperation({ summary: 'Obter resumo para o dashboard' })
  getResumo() {
    return this.dashboardService.getResumo();
  }
}
