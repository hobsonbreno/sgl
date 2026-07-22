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
  async update(@Body() body: any) {
    if (body.horariosBuscaBot) {
      if (!Array.isArray(body.horariosBuscaBot) || body.horariosBuscaBot.some((h: string) => !/^\d{2}:\d{2}$/.test(h))) {
        throw new BadRequestException('Formato de horários inválido. Use um array de strings HH:mm');
      }
      return this.configuracaoService.setHorarios(body.horariosBuscaBot);
    }
    
    if (body.colunasKanban) {
      if (!Array.isArray(body.colunasKanban)) {
        throw new BadRequestException('Formato de colunas inválido.');
      }
      return this.configuracaoService.setColunas(body.colunasKanban);
    }
    throw new BadRequestException('Nenhum campo válido para atualização');
  }
}
