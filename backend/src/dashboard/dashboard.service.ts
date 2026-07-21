import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Oportunidade, OportunidadeDocument } from '../oportunidade/oportunidade.schema';
import { BotExecucao, BotExecucaoDocument } from '../bot/bot-execucao.schema';
import { BotService } from '../bot/bot.service';
import { forwardRef, Inject } from '@nestjs/common';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Oportunidade.name) private oportunidadeModel: Model<OportunidadeDocument>,
    @InjectModel(BotExecucao.name) private botExecucaoModel: Model<BotExecucaoDocument>,
    @Inject(forwardRef(() => BotService)) private botService: BotService,
  ) {}

  async getResumo() {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);

    const novasHoje = await this.oportunidadeModel.countDocuments({ createdAt: { $gte: ontem } }).exec();
    
    const agregacao = await this.oportunidadeModel.aggregate([
      {
        $group: {
          _id: '$kanbanStatus',
          count: { $sum: 1 },
          valorTotal: { $sum: '$valorTotalEstimado' }
        }
      }
    ]).exec();

    const porStatus = { A_FAZER: 0, FAZENDO: 0, FEITO: 0, AGUARDANDO_RESPOSTA: 0 };
    const valorTotalPorStatus = { A_FAZER: 0, FAZENDO: 0, FEITO: 0, AGUARDANDO_RESPOSTA: 0 };

    agregacao.forEach(item => {
      const id = item._id as keyof typeof porStatus;
      if (porStatus[id] !== undefined) {
        porStatus[id] = item.count;
        valorTotalPorStatus[id] = item.valorTotal || 0;
      }
    });

    const hoje = new Date();
    const prazosCriticos = await this.oportunidadeModel.find({
      kanbanStatus: { $in: ['FAZENDO', 'FEITO', 'AGUARDANDO_RESPOSTA'] },
      dataEncerramentoProposta: { $gte: hoje }
    })
    .sort({ dataEncerramentoProposta: 1 })
    .limit(10)
    .exec();

    const ultimaExecucaoBot = await this.botExecucaoModel.findOne().sort({ dataExecucao: -1 }).exec();

    return {
      novasHoje,
      porStatus,
      valorTotalPorStatus,
      prazosCriticos,
      ultimaExecucaoBot,
      botEmExecucao: this.botService.isExecucao()
    };
  }
}
