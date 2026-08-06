import { Injectable, OnModuleInit, forwardRef, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Configuracao, ConfiguracaoDocument } from './configuracao.schema';
import { BotService } from '../bot/bot.service';

@Injectable()
export class ConfiguracaoService implements OnModuleInit {
  constructor(
    @InjectModel(Configuracao.name)
    private configModel: Model<ConfiguracaoDocument>,
    @Inject(forwardRef(() => BotService)) private botService: BotService,
  ) {}

  async onModuleInit() {
    let config = await this.configModel.findOne().exec();
    if (!config) {
      config = await this.configModel.create({
        horarioBuscaBot: '08:00',
        horariosBuscaBot: ['08:00', '12:00', '18:00'],
        ultimaExecucaoAutomaticaData: '',
      });
    } else if (
      !config.horariosBuscaBot ||
      config.horariosBuscaBot.length === 0
    ) {
      config.horariosBuscaBot = config.horarioBuscaBot
        ? [config.horarioBuscaBot]
        : ['08:00', '12:00', '18:00'];
      await config.save();
    }
  }

  async getConfiguracao() {
    return this.configModel.findOne().exec();
  }

  async setHorarios(horarios: string[]) {
    const horarioBuscaBot = horarios.length > 0 ? horarios[0] : '06:00';
    const config = await this.configModel
      .findOneAndUpdate(
        {},
        { horarioBuscaBot, horariosBuscaBot: horarios },
        { new: true },
      )
      .exec();
    if (config) {
      this.botService.registrarCronDinamicoMultiplos(horarios);
    }
    return config;
  }

  async setUltimaExecucao(data: string) {
    return this.configModel
      .findOneAndUpdate(
        {},
        { ultimaExecucaoAutomaticaData: data },
        { new: true },
      )
      .exec();
  }

  async setColunas(colunas: { id: string; nome: string }[]) {
    return this.configModel
      .findOneAndUpdate({}, { colunasKanban: colunas }, { new: true })
      .exec();
  }
}
