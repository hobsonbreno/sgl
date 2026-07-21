import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TransacaoFinanceira, TransacaoFinanceiraDocument } from './financeiro.schema';

@Injectable()
export class FinanceiroService {
  constructor(
    @InjectModel(TransacaoFinanceira.name) private transacaoModel: Model<TransacaoFinanceiraDocument>
  ) {}

  async create(createDto: any) {
    const created = new this.transacaoModel(createDto);
    return created.save();
  }

  async findAll() {
    return this.transacaoModel.find().sort({ dataVencimento: 1 }).populate('oportunidadeId', 'orgaoNome objetoCompra numeroControlePNCP').exec();
  }

  async findResumo() {
    const transacoes = await this.transacaoModel.find().exec();
    
    let receitasPendentes = 0;
    let receitasPagas = 0;
    let despesasPendentes = 0;
    let despesasPagas = 0;

    transacoes.forEach(t => {
      if (t.tipo === 'RECEITA') {
        if (t.status === 'PAGO') receitasPagas += t.valor;
        else receitasPendentes += t.valor;
      } else {
        if (t.status === 'PAGO') despesasPagas += t.valor;
        else despesasPendentes += t.valor;
      }
    });

    const saldoAtual = receitasPagas - despesasPagas;
    const saldoProjetado = (receitasPagas + receitasPendentes) - (despesasPagas + despesasPendentes);

    return {
      receitasPendentes,
      receitasPagas,
      despesasPendentes,
      despesasPagas,
      saldoAtual,
      saldoProjetado
    };
  }

  async update(id: string, updateDto: any) {
    if (updateDto.status === 'PAGO' && !updateDto.dataPagamento) {
      updateDto.dataPagamento = new Date();
    }
    return this.transacaoModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
  }

  async remove(id: string) {
    return this.transacaoModel.findByIdAndDelete(id).exec();
  }
}
