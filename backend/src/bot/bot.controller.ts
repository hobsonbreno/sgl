import { Controller, Post, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BotService } from './bot.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BotExecucao, BotExecucaoDocument } from './bot-execucao.schema';

@ApiTags('Bot PNCP')
@Controller('bot')
export class BotController {
  constructor(
    private readonly botService: BotService,
    @InjectModel(BotExecucao.name)
    private botExecucaoModel: Model<BotExecucaoDocument>,
  ) {}

  @Post('run-now')
  @ApiOperation({ summary: 'Dispara a execução do bot manualmente' })
  @ApiResponse({ status: 201, description: 'Resultado da execução' })
  async runNow() {
    return this.botService.executarBuscaDiaria();
  }

  @Get('execucoes')
  @ApiOperation({ summary: 'Lista o histórico de execuções do bot' })
  @ApiResponse({ status: 200, description: 'Histórico paginado de execuções' })
  async getExecucoes(@Query('limit') limit = 10, @Query('skip') skip = 0) {
    return this.botExecucaoModel
      .find()
      .sort({ dataExecucao: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .exec();
  }
}
