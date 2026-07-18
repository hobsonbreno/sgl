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
  async update(@Body('horarioBuscaBot') horario: string) {
    if (!horario || !/^\d{2}:\d{2}$/.test(horario)) {
      throw new BadRequestException('Formato de horário inválido. Use HH:mm');
    }
    return this.configuracaoService.setHorario(horario);
  }
}
