import { Controller, Get, Patch, Body, BadRequestException } from '@nestjs/common';
import { ConfiguracaoService } from './configuracao.service';

@Controller('configuracoes')
export class ConfiguracaoController {
  constructor(private readonly configuracaoService: ConfiguracaoService) {}

  @Get()
  async get() {
    return this.configuracaoService.getConfiguracao();
  }

  @Patch()
  async update(@Body('horariosBuscaBot') horarios: string[]) {
    if (!horarios || !Array.isArray(horarios) || horarios.some(h => !/^\d{2}:\d{2}$/.test(h))) {
      throw new BadRequestException('Formato de horários inválido. Use um array de strings HH:mm');
    }
    return this.configuracaoService.setHorarios(horarios);
  }
}
