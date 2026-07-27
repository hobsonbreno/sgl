import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import {
  Oportunidade,
  OportunidadeDocument,
} from '../oportunidade/oportunidade.schema';
import { BotExecucao, BotExecucaoDocument } from '../bot/bot-execucao.schema';
import { BotService } from '../bot/bot.service';
import { forwardRef, Inject } from '@nestjs/common';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Oportunidade.name)
    private oportunidadeModel: Model<OportunidadeDocument>,
    @InjectModel(BotExecucao.name)
    private botExecucaoModel: Model<BotExecucaoDocument>,
    @Inject(forwardRef(() => BotService)) private botService: BotService,
    @InjectConnection() private connection: Connection,
  ) {}

  async getResumo() {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);

    const novasHoje = await this.oportunidadeModel
      .countDocuments({ createdAt: { $gte: ontem } })
      .exec();

    const agregacao = await this.oportunidadeModel
      .aggregate([
        {
          $group: {
            _id: '$kanbanStatus',
            count: { $sum: 1 },
            valorTotal: { $sum: '$valorTotalEstimado' },
          },
        },
      ])
      .exec();

    const porStatus: Record<string, number> = {};
    const valorTotalPorStatus: Record<string, number> = {};

    agregacao.forEach((item) => {
      const id = item._id || 'NAO_DEFINIDO';
      porStatus[id] = item.count;
      valorTotalPorStatus[id] = item.valorTotal || 0;
    });

    const hoje = new Date();
    const prazosCriticos = await this.oportunidadeModel
      .find({
        kanbanStatus: { $in: ['FAZENDO', 'FEITO', 'AGUARDANDO_RESPOSTA'] },
        dataEncerramentoProposta: { $gte: hoje },
      })
      .sort({ dataEncerramentoProposta: 1 })
      .limit(10)
      .exec();

    // Get all executions from today to sum the results
    const hojeStart = new Date();
    hojeStart.setHours(0, 0, 0, 0);
    const execucoesHoje = await this.botExecucaoModel
      .find({ dataExecucao: { $gte: hojeStart } })
      .sort({ dataExecucao: -1 })
      .exec();

    let ultimaExecucaoBot = null;
    if (execucoesHoje.length > 0) {
      ultimaExecucaoBot = {
        dataExecucao: execucoesHoje[0].dataExecucao, // data da mais recente
        totalNovos: execucoesHoje.reduce(
          (acc, curr) => acc + (curr.totalNovos || 0),
          0,
        ),
        erros: execucoesHoje.flatMap((curr) => curr.erros || []),
      };
    }

    // Calcular Economia Gerada Total nas Cotacoes
    const savingsAgregacao = await this.connection.collection('cotacaos').aggregate([
      { $unwind: "$itens" },
      { 
        $match: { 
          "itens.melhorPreco.precoUnitario": { $gt: 0 },
          "itens.valorUnitarioEstimado": { $gt: 0 }
        }
      },
      {
        $project: {
          economiaItem: {
            $multiply: [
              { $subtract: ["$itens.valorUnitarioEstimado", "$itens.melhorPreco.precoUnitario"] },
              { $ifNull: ["$itens.quantidade", 1] }
            ]
          }
        }
      },
      {
        $match: {
          economiaItem: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          totalEconomia: { $sum: "$economiaItem" }
        }
      }
    ]).toArray();

    const totalEconomiaGerada = savingsAgregacao.length > 0 ? savingsAgregacao[0].totalEconomia : 0;

    return {
      novasHoje,
      porStatus,
      valorTotalPorStatus,
      prazosCriticos,
      ultimaExecucaoBot,
      botEmExecucao: this.botService.isExecucao(),
      totalEconomiaGerada,
    };
  }
}
