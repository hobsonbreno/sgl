/* eslint-disable @typescript-eslint/no-unsafe-argument */
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
import { FinanceiroGateway } from './financeiro.gateway';

@Injectable()
export class FinanceiroService {
  constructor(
    @InjectModel(TransacaoFinanceira.name)
    private transacaoModel: Model<TransacaoFinanceiraDocument>,
    @InjectModel(Oportunidade.name)
    private oportunidadeModel: Model<OportunidadeDocument>,
    @InjectModel(Produto.name) private produtoModel: Model<ProdutoDocument>,
    @InjectModel(Cotacao.name) private cotacaoModel: Model<CotacaoDocument>,
    private readonly gateway: FinanceiroGateway,
  ) {}

  async create(createDto: any) {
    const created = new this.transacaoModel(createDto);
    const result = await created.save();
    this.gateway.emitFinanceiroUpdate();
    return result;
  }

  async findAll() {
    return this.transacaoModel
      .find()
      .sort({ dataVencimento: 1 })
      .populate('oportunidadeId', 'orgaoNome objetoCompra numeroControlePNCP')
      .exec();
  }

  private getValorNossoEfetivo(p: Produto): number {
    if (!p) return 0;

    const vencNome = (p.vencedorNome || '').toUpperCase();
    const vencCnpj = (p.vencedorCnpj || '').replace(/\D/g, '');
    const vencNomeNorm = vencNome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const isNosso =
      vencCnpj.includes('48262939') ||
      vencNomeNorm.includes('IRMAOS NASCIMENTO') ||
      (vencNomeNorm.includes('IRMAOS') && vencNomeNorm.includes('NASCIMENTO'));

    if (!isNosso) {
      return 0;
    }

    const qtd = p.quantidade || 1;
    const precoUnit =
      p.valorVencedor && p.valorVencedor > 0
        ? p.valorVencedor
        : p.valorNossoLance && p.valorNossoLance > 0
          ? p.valorNossoLance
          : p.valorUnitarioEstimado || 0;

    return precoUnit * qtd;
  }

  private buildLookupMaps(produtos: any[], cotacoes: any[]) {
    const produtosMap = new Map<string, any[]>();
    for (const p of produtos) {
      const opId = p.oportunidadeId ? p.oportunidadeId.toString() : null;
      if (!opId) continue;
      let list = produtosMap.get(opId);
      if (!list) {
        list = [];
        produtosMap.set(opId, list);
      }
      list.push(p);
    }

    const cotacoesMap = new Map<string, any>();
    for (const c of cotacoes) {
      const opId = c.oportunidadeId ? c.oportunidadeId.toString() : null;
      if (opId) {
        cotacoesMap.set(opId, c);
      }
    }

    return { produtosMap, cotacoesMap };
  }

  async findResumo() {
    const transacoes = await this.transacaoModel.find().lean().exec();

    let receitasPendentes = 0;
    let receitasPagas = 0;
    let despesasPendentes = 0;
    let despesasPagas = 0;

    transacoes.forEach((t: any) => {
      if (t.tipo === 'RECEITA') {
        if (t.status === 'PAGO') receitasPagas += t.valor;
        else receitasPendentes += t.valor;
      } else {
        if (t.status === 'PAGO') despesasPagas += t.valor;
        else despesasPendentes += t.valor;
      }
    });

    const oportunidades = await this.oportunidadeModel
      .find(
        { kanbanStatus: { $ne: 'EXCLUIDA' } },
        { kanbanStatus: 1, valorTotalEstimado: 1 },
      )
      .lean()
      .exec();

    const produtos = await this.produtoModel
      .find(
        {},
        {
          oportunidadeId: 1,
          quantidade: 1,
          vencedorNome: 1,
          vencedorCnpj: 1,
          valorVencedor: 1,
          valorNossoLance: 1,
          valorUnitarioEstimado: 1,
          numeroItem: 1,
        },
      )
      .lean()
      .exec();

    const cotacoes = await this.cotacaoModel
      .find(
        {},
        {
          oportunidadeId: 1,
          'itens.produtoId': 1,
          'itens.numeroItem': 1,
          'itens.melhorPreco': 1,
        },
      )
      .lean()
      .exec();

    const { produtosMap, cotacoesMap } = this.buildLookupMaps(
      produtos,
      cotacoes,
    );

    let valorNovasOportunidades = 0;
    let saldoProjetadoKanban = 0;
    let faturamentoAReceberKanban = 0;
    let lucroRealAReceberKanban = 0;

    for (const op of oportunidades) {
      const opIdStr = op._id.toString();
      const prods = produtosMap.get(opIdStr) || [];
      const cotacao = cotacoesMap.get(opIdStr);

      const cotacaoItemMap = new Map<string, any>();
      if (cotacao && cotacao.itens) {
        cotacao.itens.forEach((it: any) => {
          const pId = it.produtoId?._id
            ? it.produtoId._id.toString()
            : it.produtoId?.toString();
          if (pId) cotacaoItemMap.set(pId, it);
          if (it.numeroItem) cotacaoItemMap.set(`num_${it.numeroItem}`, it);
        });
      }

      let valorEfetivoNosso = 0;
      let custoEfetivoNosso = 0;

      prods.forEach((p: any) => {
        const val = this.getValorNossoEfetivo(p);
        valorEfetivoNosso += val;

        if (val > 0 && cotacaoItemMap.size > 0) {
          const pIdStr = p._id.toString();
          const itemCot =
            cotacaoItemMap.get(pIdStr) ||
            cotacaoItemMap.get(`num_${p.numeroItem}`);
          if (
            itemCot &&
            itemCot.melhorPreco &&
            itemCot.melhorPreco.precoUnitario
          ) {
            custoEfetivoNosso +=
              Number(itemCot.melhorPreco.precoUnitario) *
              Number(p.quantidade || 1);
          }
        }
      });

      if (valorEfetivoNosso > 0) {
        faturamentoAReceberKanban += valorEfetivoNosso;
        lucroRealAReceberKanban += valorEfetivoNosso - custoEfetivoNosso;
      } else {
        if (op.kanbanStatus === 'A_FAZER') {
          valorNovasOportunidades += op.valorTotalEstimado || 0;
        } else if (op.kanbanStatus === 'FAZENDO') {
          saldoProjetadoKanban += op.valorTotalEstimado || 0;
        }
      }
    }

    const saldoAtual = receitasPagas - despesasPagas;
    const saldoProjetado =
      saldoAtual + receitasPendentes - despesasPendentes + saldoProjetadoKanban;
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
      lucroRealEsperado: lucroRealAReceberKanban,
    };
  }

  async findNegociosFechados() {
    const oportunidades = await this.oportunidadeModel
      .find(
        { kanbanStatus: { $ne: 'EXCLUIDA' } },
        {
          orgaoNome: 1,
          numeroControlePNCP: 1,
          objetoCompra: 1,
          kanbanStatus: 1,
        },
      )
      .lean()
      .exec();

    const ids = oportunidades.map((o) => o._id.toString());
    const produtos = await this.produtoModel
      .find(
        { oportunidadeId: { $in: ids } },
        {
          oportunidadeId: 1,
          quantidade: 1,
          vencedorNome: 1,
          vencedorCnpj: 1,
          valorVencedor: 1,
          valorNossoLance: 1,
          valorUnitarioEstimado: 1,
          numeroItem: 1,
        },
      )
      .lean()
      .exec();
    const cotacoes = await this.cotacaoModel
      .find(
        { oportunidadeId: { $in: ids } },
        {
          oportunidadeId: 1,
          'itens.produtoId': 1,
          'itens.numeroItem': 1,
          'itens.melhorPreco': 1,
        },
      )
      .lean()
      .exec();

    const { produtosMap, cotacoesMap } = this.buildLookupMaps(
      produtos,
      cotacoes,
    );

    return oportunidades
      .map((op: any) => {
        const opIdStr = op._id.toString();
        const prods = produtosMap.get(opIdStr) || [];
        const cotacao = cotacoesMap.get(opIdStr);

        const cotacaoItemMap = new Map<string, any>();
        if (cotacao && cotacao.itens) {
          cotacao.itens.forEach((it: any) => {
            const pId = it.produtoId?._id
              ? it.produtoId._id.toString()
              : it.produtoId?.toString();
            if (pId) cotacaoItemMap.set(pId, it);
            if (it.numeroItem) cotacaoItemMap.set(`num_${it.numeroItem}`, it);
          });
        }

        let valorTotalLancado = 0;
        let custoTotal = 0;

        prods.forEach((p: any) => {
          const val = this.getValorNossoEfetivo(p);
          valorTotalLancado += val;

          if (val > 0 && cotacaoItemMap.size > 0) {
            const pIdStr = p._id.toString();
            const itemCot =
              cotacaoItemMap.get(pIdStr) ||
              cotacaoItemMap.get(`num_${p.numeroItem}`);
            if (
              itemCot &&
              itemCot.melhorPreco &&
              itemCot.melhorPreco.precoUnitario
            ) {
              custoTotal +=
                Number(itemCot.melhorPreco.precoUnitario) *
                Number(p.quantidade || 1);
            }
          }
        });

        const lucroEstimado = valorTotalLancado - custoTotal;

        return {
          _id: op._id,
          orgaoNome: op.orgaoNome,
          numeroControlePNCP: op.numeroControlePNCP,
          objetoCompra: op.objetoCompra,
          kanbanStatus: op.kanbanStatus,
          valorTotalLancado,
          custoTotal,
          lucroEstimado,
        };
      })
      .filter((item) => item.valorTotalLancado > 0);
  }

  async receberNegocioFechado(oportunidadeId: string) {
    const op = await this.oportunidadeModel.findById(oportunidadeId).exec();
    if (!op) throw new Error('Oportunidade não encontrada');

    const produtos = await this.produtoModel
      .find({ oportunidadeId: op._id.toString() })
      .lean()
      .exec();

    let valorTotalLancado = 0;
    produtos.forEach((p: any) => {
      valorTotalLancado += this.getValorNossoEfetivo(p);
    });

    if (valorTotalLancado <= 0) {
      throw new Error(
        'Não há lances homologados a nosso favor para esta oportunidade.',
      );
    }

    const cotacao = await this.cotacaoModel
      .findOne({ oportunidadeId: op._id })
      .lean()
      .exec();
    let custoTotal = 0;
    if (cotacao && cotacao.itens) {
      produtos.forEach((p: any) => {
        const val = this.getValorNossoEfetivo(p);
        if (val > 0) {
          const itemCot = cotacao.itens.find(
            (it: any) =>
              it.produtoId?._id?.toString() === p._id.toString() ||
              it.produtoId?.toString() === p._id.toString() ||
              it.numeroItem === p.numeroItem,
          );
          if (
            itemCot &&
            itemCot.melhorPreco &&
            itemCot.melhorPreco.precoUnitario
          ) {
            custoTotal +=
              Number(itemCot.melhorPreco.precoUnitario) *
              Number(p.quantidade || 1);
          }
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
      status: 'PENDENTE',
    });

    await this.transacaoModel.updateMany(
      { oportunidadeId: op._id, tipo: 'RECEITA' },
      {
        status: 'PAGO',
        dataPagamento: new Date(),
        descricao: `Recebimento de Negócio: ${op.numeroControlePNCP}`,
      },
    );

    if (custoTotal > 0) {
      await this.create({
        oportunidadeId: op._id,
        tipo: 'DESPESA',
        descricao: `Custo Fornecedores Negócio: ${op.numeroControlePNCP}`,
        valor: custoTotal,
        dataVencimento: new Date(),
        status: 'PENDENTE',
      });
    }

    op.kanbanStatus = 'ARQUIVADOS';
    await op.save();

    this.gateway.emitFinanceiroUpdate();
    return op;
  }

  async findArquivados() {
    const oportunidades = await this.oportunidadeModel
      .find(
        { kanbanStatus: { $in: ['ARQUIVADO', 'ARQUIVADOS'] } },
        { orgaoNome: 1, numeroControlePNCP: 1, objetoCompra: 1 },
      )
      .lean()
      .exec();

    const ids = oportunidades.map((o) => o._id.toString());
    const produtos = await this.produtoModel
      .find(
        { oportunidadeId: { $in: ids } },
        {
          oportunidadeId: 1,
          quantidade: 1,
          vencedorNome: 1,
          vencedorCnpj: 1,
          valorVencedor: 1,
          valorNossoLance: 1,
          valorUnitarioEstimado: 1,
          numeroItem: 1,
        },
      )
      .lean()
      .exec();
    const cotacoes = await this.cotacaoModel
      .find(
        { oportunidadeId: { $in: ids } },
        {
          oportunidadeId: 1,
          'itens.produtoId': 1,
          'itens.numeroItem': 1,
          'itens.melhorPreco': 1,
        },
      )
      .lean()
      .exec();

    const { produtosMap, cotacoesMap } = this.buildLookupMaps(
      produtos,
      cotacoes,
    );

    return oportunidades.map((op: any) => {
      const opIdStr = op._id.toString();
      const prods = produtosMap.get(opIdStr) || [];
      const cotacao = cotacoesMap.get(opIdStr);

      const cotacaoItemMap = new Map<string, any>();
      if (cotacao && cotacao.itens) {
        cotacao.itens.forEach((it: any) => {
          const pId = it.produtoId?._id
            ? it.produtoId._id.toString()
            : it.produtoId?.toString();
          if (pId) cotacaoItemMap.set(pId, it);
          if (it.numeroItem) cotacaoItemMap.set(`num_${it.numeroItem}`, it);
        });
      }

      let valorTotalLancado = 0;
      let custoTotal = 0;

      prods.forEach((p: any) => {
        const val = this.getValorNossoEfetivo(p);
        valorTotalLancado += val;

        if (val > 0 && cotacaoItemMap.size > 0) {
          const pIdStr = p._id.toString();
          const itemCot =
            cotacaoItemMap.get(pIdStr) ||
            cotacaoItemMap.get(`num_${p.numeroItem}`);
          if (
            itemCot &&
            itemCot.melhorPreco &&
            itemCot.melhorPreco.precoUnitario
          ) {
            custoTotal +=
              Number(itemCot.melhorPreco.precoUnitario) *
              Number(p.quantidade || 1);
          }
        }
      });

      const lucroEstimado = valorTotalLancado - custoTotal;

      return {
        _id: op._id,
        orgaoNome: op.orgaoNome,
        numeroControlePNCP: op.numeroControlePNCP,
        objetoCompra: op.objetoCompra,
        valorTotalLancado,
        custoTotal,
        lucroEstimado,
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

    this.gateway.emitFinanceiroUpdate();
    return op;
  }

  async update(id: string, updateDto: any) {
    if (updateDto.status === 'PAGO' && !updateDto.dataPagamento) {
      updateDto.dataPagamento = new Date();
    }
    const result = await this.transacaoModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();
    this.gateway.emitFinanceiroUpdate();
    return result;
  }

  async remove(id: string) {
    const result = await this.transacaoModel.findByIdAndDelete(id).exec();
    this.gateway.emitFinanceiroUpdate();
    return result;
  }

  async obterRBT12Atual(): Promise<number> {
    const dozeMesesAtras = new Date();
    dozeMesesAtras.setMonth(dozeMesesAtras.getMonth() - 12);

    const transacoes = await this.transacaoModel
      .find({
        tipo: 'RECEITA',
        status: 'PAGO',
        dataPagamento: { $gte: dozeMesesAtras },
      })
      .exec();

    let rbt12 = 0;
    for (const t of transacoes) {
      rbt12 += t.valor || 0;
    }

    // Fallback pra zero caso seja empresa nova
    return rbt12 > 0 ? rbt12 : 0;
  }

  calcularAliquotaEfetiva(rbt12: number): number {
    if (rbt12 <= 0) return 0.06; // Empresa no início de atividade (1ª faixa direto)

    // Tabela Anexo III - Simples Nacional (Serviços)
    // Faixa 1: Até 180.000,00 -> 6% (Dedução: 0)
    // Faixa 2: 180.000,01 a 360.000,00 -> 11,2% (Dedução: 9.360,00)
    // Faixa 3: 360.000,01 a 720.000,00 -> 13,5% (Dedução: 17.640,00)
    // Faixa 4: 720.000,01 a 1.800.000,00 -> 16,0% (Dedução: 35.640,00)
    // Faixa 5: 1.800.000,01 a 3.600.000,00 -> 21,0% (Dedução: 125.640,00)
    // Faixa 6: 3.600.000,01 a 4.800.000,00 -> 33,0% (Dedução: 557.640,00)

    let aliquotaNominal = 0.06;
    let parcelaDeduzir = 0;

    if (rbt12 <= 180000) {
      aliquotaNominal = 0.06;
      parcelaDeduzir = 0;
    } else if (rbt12 <= 360000) {
      aliquotaNominal = 0.112;
      parcelaDeduzir = 9360;
    } else if (rbt12 <= 720000) {
      aliquotaNominal = 0.135;
      parcelaDeduzir = 17640;
    } else if (rbt12 <= 1800000) {
      aliquotaNominal = 0.16;
      parcelaDeduzir = 35640;
    } else if (rbt12 <= 3600000) {
      aliquotaNominal = 0.21;
      parcelaDeduzir = 125640;
    } else {
      aliquotaNominal = 0.33;
      parcelaDeduzir = 557640;
    }

    const impostoDevido = rbt12 * aliquotaNominal - parcelaDeduzir;
    const aliquotaEfetiva = impostoDevido / rbt12;

    return aliquotaEfetiva;
  }
}
