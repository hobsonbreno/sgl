import { Injectable, OnModuleInit, forwardRef, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Configuracao, ConfiguracaoDocument } from './configuracao.schema';
import { BotService } from '../bot/bot.service';

@Injectable()
export class ConfiguracaoService implements OnModuleInit {
  constructor(
    @InjectModel(Configuracao.name) private configModel: Model<ConfiguracaoDocument>,
    @Inject(forwardRef(() => BotService)) private botService: BotService
  ) {}

  async onModuleInit() {
    let config = await this.configModel.findOne().exec();
    if (!config) {
      config = await this.configModel.create({ horarioBuscaBot: '06:00', ultimaExecucaoAutomaticaData: '' });
    }
  }

  async getConfiguracao() {
    return this.configModel.findOne().exec();
  }

  async setHorario(horario: string) {
    const config = await this.configModel.findOneAndUpdate({}, { horarioBuscaBot: horario }, { new: true }).exec();
    if (config) {
      await this.botService.registrarCronDinamico(horario);
    }
    return config;
  }

  async setUltimaExecucao(data: string) {
    return this.configModel.findOneAndUpdate({}, { ultimaExecucaoAutomaticaData: data }, { new: true }).exec();
  }
}
