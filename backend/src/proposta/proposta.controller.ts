import { Controller, Post, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { PropostaService } from './proposta.service';

@Controller('propostas')
export class PropostaController {
  constructor(private readonly propostaService: PropostaService) {}

  @Post('/oportunidades/:id')
  async criarProposta(@Param('id') id: string, @Body() payload: any) {
    return this.propostaService.criarProposta(id, payload);
  }

  @Patch('/:id/status')
  async atualizarStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.propostaService.atualizarStatus(id, status);
  }

  @Get()
  async listar(@Query() query: any) {
    return this.propostaService.listar(query);
  }

  @Get('/:id')
  async buscarPorId(@Param('id') id: string) {
    return this.propostaService.buscarPorId(id);
  }
}
