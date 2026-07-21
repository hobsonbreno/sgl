import { Controller, Get, Sse, MessageEvent } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { EventsService } from '../events/events.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly eventsService: EventsService,
  ) {}

  @Get('resumo')
  @ApiOperation({ summary: 'Obter resumo para o dashboard' })
  getResumo() {
    return this.dashboardService.getResumo();
  }

  @Sse('stream')
  @ApiOperation({ summary: 'Stream SSE de atualizações do dashboard' })
  stream(): Observable<MessageEvent> {
    return this.eventsService.getDashboardUpdates().pipe(
      map(() => ({ data: { type: 'update' } } as MessageEvent))
    );
  }
}
