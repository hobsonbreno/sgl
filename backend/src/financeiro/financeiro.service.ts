import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TransacaoFinanceira,
  TransacaoFinanceiraDocument,
} from './financeiro.schema';
import {
  Oportunidade,
  OportunidadeDocument,
} from '../oportunidade/oportunidade.schema';
import { Produto, ProdutoDocument } from '../produto/produto.schema';
import { Cotacao, CotacaoDocument } from '../cotacao/cotacao.schema';

@Injectable()
export class FinanceiroService {
  constructor(
    @InjectModel(TransacaoFinanceira.name)
    private transacaoModel: Model<TransacaoFinanceiraDocument>,
    @InjectModel(Oportunidade.name)
    private oportunidadeModel: Model<OportunidadeDocument>,
    @InjectModel(Produto.name) private produtoModel: Model<ProdutoDocument>,
    @InjectModel(Cotacao.name) private cotacaoModel: Model<CotacaoDocument>,
  ) {}

  async create(createDto: any) {
    const created = new this.transacaoModel(createDto);
    return created.save();
  }

  async findAll() {
    return this.transacaoModel
      .find()
      .sort({ dataVencimento: 1 })
      .populate('oportunidadeId', 'orgaoNome objetoCompra numeroControlePNCP')
      .exec();
  }

  async findResumo() {
    const transacoes = await this.transacaoModel.find().exec();

    let receitasPendentes = 0;
    let receitasPagas = 0;
    let despesasPendentes = 0;
    let despesasPagas = 0;

    transacoes.forEach((t) => {
      if (t.tipo === 'RECEITA') {
        if (t.status === 'PAGO') receitasPagas += t.valor;
        else receitasPendentes += t.valor;
      } else {
        if (t.status === 'PAGO') despesasPagas += t.valor;
        else despesasPendentes += t.valor;
      }
    });

    // Calcular valores vindos do Kanban
    const oportunidades = await this.oportunidadeModel
      .find({ kanbanStatus: { $ne: 'EXCLUIDA' } })
      .exec();
    const produtos = await this.produtoModel.find().exec();

    let valorNovasOportunidades = 0;
    let saldoProjetadoKanban = 0;
    let faturamentoAReceberKanban = 0;

    for (const op of oportunidades) {
      if (op.kanbanStatus === 'A_FAZER') {
        valorNovasOportunidades += op.valorTotalEstimado || 0;
      } else if (op.kanbanStatus === 'FAZENDO') {
        saldoProjetadoKanban += op.valorTotalEstimado || 0;
      } else if (
        [
          'FEITO',
          'NEGOCIACAO',
          'HOMOLOGACAO',
          'NEGOCIO_FECHADO',
          'NEGOCIAÇÃO',
          'HOMOLOGAÇÃO',
          'NEGÓCIO FECHADO',
        ].includes(op.kanbanStatus)
      ) {
        // Se estiver em uma dessas fases de lance/fechamento, usar o valor do Nosso Lance
        // Se ainda não tiver Nosso Lance, pode usar o estimado ou zero. Vamos somar os lances:
        const prods = produtos.filter(
          (p) => p.oportunidadeId === op._id.toString(),
        );
        let valorOp = 0;
        prods.forEach((p) => {
          if (p.valorNossoLance !== undefined && p.valorNossoLance > 0) {
            valorOp += p.valorNossoLance * (p.quantidade || 1);
          }
        });
        faturamentoAReceberKanban += valorOp;
      }
    }

    const saldoAtual = receitasPagas - despesasPagas;

    // O Saldo Projetado (Futuro) será: Saldo Atual + Receitas Pendentes Manuais - Despesas Pendentes Manuais + Oportunidades Fazendo
    const saldoProjetado =
      saldoAtual + receitasPendentes - despesasPendentes + saldoProjetadoKanban;

    // Faturamento a Receber será: Receitas Pendentes Manuais + Faturamento a Receber Kanban (FEITO, NEGOCIACAO, etc)
    const receitasPendentesTotal =
      receitasPendentes + faturamentoAReceberKanban;

    return {
      receitasPendentes: receitasPendentesTotal,
      receitasPagas,
      despesasPendentes,
      despesasPagas,
      saldoAtual,
      saldoProjetado,
      valorNovasOportunidades,
    };
  }

  async findNegociosFechados() {
    const oportunidades = await this.oportunidadeModel
      .find({
        kanbanStatus: { $in: ['NEGOCIO_FECHADO', 'NEGÓCIO FECHADO'] },
      })
      .exec();

    const ids = oportunidades.map((o) => o._id.toString());
    const produtos = await this.produtoModel
      .find({ oportunidadeId: { $in: ids } })
      .exec();

    return oportunidades.map((op) => {
      const prods = produtos.filter(
        (p) => p.oportunidadeId === op._id.toString(),
      );
      let valorTotalLancado = 0;
      prods.forEach((p) => {
        if (p.valorNossoLance !== undefined && p.valorNossoLance > 0) {
          valorTotalLancado += p.valorNossoLance * (p.quantidade || 1);
        }
      });
      return {
        _id: op._id,
        orgaoNome: op.orgaoNome,
        numeroControlePNCP: op.numeroControlePNCP,
        objetoCompra: op.objetoCompra,
        valorTotalLancado,
      };
    });
  }

  async receberNegocioFechado(oportunidadeId: string) {
    const op = await this.oportunidadeModel.findById(oportunidadeId).exec();
    if (!op) throw new Error('Oportunidade não encontrada');

    const produtos = await this.produtoModel
      .find({ oportunidadeId: op._id.toString() })
      .exec();
    let valorTotalLancado = 0;
    produtos.forEach((p) => {
      if (p.valorNossoLance !== undefined && p.valorNossoLance > 0) {
        valorTotalLancado += p.valorNossoLance * (p.quantidade || 1);
      }
    });

    if (valorTotalLancado <= 0) {
      throw new Error(
        'Não há lances válidos registrados para esta oportunidade.',
      );
    }

    // Calcular custo total dos fornecedores campeões a partir da cotação
    const cotacao = await this.cotacaoModel
      .findOne({ oportunidadeId: op._id })
      .exec();
    let custoTotal = 0;
    if (cotacao && cotacao.itens) {
      cotacao.itens.forEach((item) => {
        if (item.melhorPreco && item.melhorPreco.precoUnitario) {
          custoTotal +=
            Number(item.melhorPreco.precoUnitario) *
            Number(item.quantidade || 1);
        }
      });
    }

    // Criar a transação de RECEITA
    await this.create({
      oportunidadeId: op._id,
      tipo: 'RECEITA',
      descricao: `Faturamento Negócio: ${op.numeroControlePNCP}`,
      valor: valorTotalLancado,
      dataVencimento: new Date(),
      status: 'PENDENTE', // Quando dá baixa, vira faturamento pendente (A Receber), ou se já recebido fica PAGO, depende da lógica. Vou manter como PAGO pq antes estava PAGO
    });

    // Atualizar a RECEITA para PAGO para manter o fluxo anterior de dar baixa
    await this.transacaoModel.updateMany(
      { oportunidadeId: op._id, tipo: 'RECEITA' },
      {
        status: 'PAGO',
        dataPagamento: new Date(),
        descricao: `Recebimento de Negócio: ${op.numeroControlePNCP}`,
      },
    );

    // Criar a transação de DESPESA se houver custo
    if (custoTotal > 0) {
      await this.create({
        oportunidadeId: op._id,
        tipo: 'DESPESA',
        descricao: `Custo Fornecedores Negócio: ${op.numeroControlePNCP}`,
        valor: custoTotal,
        dataVencimento: new Date(),
        status: 'PENDENTE', // Despesa entra como Pendente
      });
    }

    // Atualizar o Kanban para ARQUIVADOS
    op.kanbanStatus = 'ARQUIVADOS';
    await op.save();

    return op;
  }

  async findArquivados() {
    const oportunidades = await this.oportunidadeModel
      .find({
        kanbanStatus: { $in: ['ARQUIVADO', 'ARQUIVADOS'] },
      })
      .exec();

    const ids = oportunidades.map((o) => o._id.toString());
    const produtos = await this.produtoModel
      .find({ oportunidadeId: { $in: ids } })
      .exec();

    return oportunidades.map((op) => {
      const prods = produtos.filter(
        (p) => p.oportunidadeId === op._id.toString(),
      );
      let valorTotalLancado = 0;
      prods.forEach((p) => {
        if (p.valorNossoLance !== undefined && p.valorNossoLance > 0) {
          valorTotalLancado += p.valorNossoLance * (p.quantidade || 1);
        }
      });
      return {
        _id: op._id,
        orgaoNome: op.orgaoNome,
        numeroControlePNCP: op.numeroControlePNCP,
        objetoCompra: op.objetoCompra,
        valorTotalLancado,
      };
    });
  }

  async estornarNegocio(oportunidadeId: string) {
    const op = await this.oportunidadeModel.findById(oportunidadeId).exec();
    if (!op) throw new Error('Oportunidade não encontrada');

    // Deletar a transação de receita e despesa geradas por este arquivamento
    await this.transacaoModel
      .deleteMany({ oportunidadeId: op._id, tipo: 'RECEITA' })
      .exec();
    await this.transacaoModel
      .deleteMany({ oportunidadeId: op._id, tipo: 'DESPESA' })
      .exec();

    // Voltar para NEGOCIO_FECHADO
    op.kanbanStatus = 'NEGOCIO_FECHADO';
    await op.save();

    return op;
  }

  async update(id: string, updateDto: any) {
    if (updateDto.status === 'PAGO' && !updateDto.dataPagamento) {
      updateDto.dataPagamento = new Date();
    }
    return this.transacaoModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();
  }

  async remove(id: string) {
    return this.transacaoModel.findByIdAndDelete(id).exec();
  }
}
