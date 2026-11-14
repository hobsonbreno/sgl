import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import mongoose, { Model, Connection } from 'mongoose';
import { Cotacao, CotacaoDocument } from './cotacao.schema';
import { FornecedorService } from '../fornecedor/fornecedor.service';
import { SupplierDiscoveryService } from '../fornecedor/supplier-discovery.service';
import { CotacaoGateway } from './cotacao.gateway';

@Injectable()
export class CotacaoService {
  constructor(
    @InjectModel(Cotacao.name) private model: Model<CotacaoDocument>,
    private fornecedorService: FornecedorService,
    private supplierDiscoveryService: SupplierDiscoveryService,
    @InjectConnection() private connection: Connection,
    private readonly gateway: CotacaoGateway,
  ) {}

  private getMatchKey(item: any, fallbackIndex?: number): string {
    const pId = item.produtoId?._id?.toString() || item.produtoId?.toString();
    if (pId) return `pid_${pId}`;
    if (item.numeroItem && Number(item.numeroItem) > 0)
      return `num_${item.numeroItem}`;
    const desc = (item.descricaoItem || item.descricao || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (desc) return `desc_${desc}_${fallbackIndex ?? ''}`;
    return `idx_${fallbackIndex}`;
  }

  private async deduplicateItens(doc: CotacaoDocument): Promise<boolean> {
    if (!doc || !doc.itens || doc.itens.length <= 1) return false;

    const seenKeys = new Map<string, any>();
    const cleanItens: any[] = [];
    let removed = false;

    for (let i = 0; i < doc.itens.length; i++) {
      const item = doc.itens[i];
      if (!item.numeroItem) {
        item.numeroItem = i + 1;
      }

      const key = this.getMatchKey(item, i + 1);

      if (seenKeys.has(key)) {
        removed = true;
        const existing = seenKeys.get(key);
        if (item.precosFornecedores && item.precosFornecedores.length > 0) {
          if (!existing.precosFornecedores) existing.precosFornecedores = [];
          for (const pf of item.precosFornecedores) {
            const pfExists = existing.precosFornecedores.some(
              (epf: any) =>
                epf.fornecedorId?._id?.toString() ===
                  (pf.fornecedorId as any)?._id?.toString() ||
                epf.fornecedorId?.toString() === pf.fornecedorId?.toString(),
            );
            if (!pfExists) {
              existing.precosFornecedores.push(pf);
            }
          }
        }
        if (!existing.produtoId && item.produtoId) {
          existing.produtoId = item.produtoId;
        }
      } else {
        seenKeys.set(key, item);
        cleanItens.push(item);
      }
    }

    if (removed) {
      doc.itens = cleanItens as any;
      await this.model
        .updateOne({ _id: doc._id }, { $set: { itens: cleanItens } })
        .exec();
      return true;
    }
    return false;
  }

  async createOrGet(
    oportunidadeId: string,
    initialItems: any[] = [],
  ): Promise<Cotacao> {
    let existe = await this.model.findOne({ oportunidadeId }).exec();
    if (existe) {
      const cotId = existe._id.toString();
      await this.deduplicateItens(existe);
      existe = await this.model.findOne({ oportunidadeId }).exec();

      if (existe && initialItems.length > 0) {
        for (let idx = 0; idx < initialItems.length; idx++) {
          const initialItem = initialItems[idx];
          const targetNum = initialItem.numeroItem || idx + 1;

          const itemExistente = existe.itens.find((it, itIdx) => {
            const pId = (it.produtoId as any)?._id || it.produtoId;
            if (
              pId &&
              initialItem._id &&
              pId.toString() === initialItem._id.toString()
            )
              return true;
            if (
              it.numeroItem &&
              targetNum &&
              Number(it.numeroItem) === Number(targetNum)
            )
              return true;
            if (itIdx === idx && !it.numeroItem) return true;
            return false;
          });

          if (itemExistente) {
            const pId =
              (itemExistente.produtoId as any)?._id || itemExistente.produtoId;
            if ((!pId && initialItem._id) || !itemExistente.numeroItem) {
              await this.model
                .updateOne(
                  { _id: existe._id, 'itens._id': itemExistente._id },
                  {
                    $set: {
                      ...(!pId && initialItem._id
                        ? { 'itens.$.produtoId': initialItem._id }
                        : {}),
                      ...(!itemExistente.numeroItem
                        ? { 'itens.$.numeroItem': targetNum }
                        : {}),
                    },
                  },
                )
                .exec();
            }
          } else {
            await this.model
              .updateOne(
                { _id: existe._id },
                {
                  $push: {
                    itens: {
                      produtoId: initialItem._id,
                      numeroItem: targetNum,
                      descricaoItem:
                        initialItem.descricao ||
                        initialItem.descricaoItem ||
                        'Item',
                      quantidade: initialItem.quantidade || 1,
                      unidadeMedida: initialItem.unidadeMedida || 'UN',
                      valorUnitarioEstimado:
                        initialItem.valorUnitarioEstimado || 0,
                      precosFornecedores: [],
                    },
                  },
                },
              )
              .exec();
          }
        }
      }
      return this.findOne(cotId);
    }

    const itens = initialItems.map((i, idx) => ({
      produtoId: i._id,
      numeroItem: i.numeroItem || idx + 1,
      descricaoItem: i.descricao || i.descricaoItem || 'Item',
      quantidade: i.quantidade || 1,
      unidadeMedida: i.unidadeMedida || 'UN',
      valorUnitarioEstimado: i.valorUnitarioEstimado || 0,
      precosFornecedores: [],
    }));

    const nova = new this.model({
      oportunidadeId,
      itens,
    });
    const criada = await nova.save();
    return this.findOne(criada._id.toString());
  }

  private async autoLinkProdutos(doc: CotacaoDocument): Promise<void> {
    if (!doc || !doc.itens) return;
    let ProdutoModel: any;
    try {
      ProdutoModel = this.connection.model('Produto');
    } catch {
      return;
    }

    for (const item of doc.itens) {
      const currentProdId = (item.produtoId as any)?._id || item.produtoId;
      if (!currentProdId) {
        let prod = null;
        if (item.numeroItem) {
          prod = await ProdutoModel.findOne({
            oportunidadeId: doc.oportunidadeId.toString(),
            numeroItem: item.numeroItem,
          }).exec();
        }
        if (!prod && !item.numeroItem && item.descricaoItem) {
          prod = await ProdutoModel.findOne({
            oportunidadeId: doc.oportunidadeId.toString(),
            descricao: item.descricaoItem,
          }).exec();
        }

        if (!prod) {
          prod = await ProdutoModel.create({
            oportunidadeId: doc.oportunidadeId.toString(),
            numeroItem: item.numeroItem || 1,
            descricao: item.descricaoItem || 'Item',
            quantidade: item.quantidade || 1,
            unidadeMedida: item.unidadeMedida || 'UN',
            valorUnitarioEstimado: item.valorUnitarioEstimado || 0,
          });
        }

        if (prod) {
          await this.model
            .updateOne(
              { _id: doc._id, 'itens._id': item._id },
              { $set: { 'itens.$.produtoId': prod._id } },
            )
            .exec();
        }
      }
    }
  }

  async findOne(id: string): Promise<Cotacao> {
    let doc = await this.model
      .findById(id)
      .populate('itens.precosFornecedores.fornecedorId')
      .populate('itens.produtoId')
      .exec();
    if (!doc) throw new NotFoundException('Cotação não encontrada');

    const deduped = await this.deduplicateItens(doc);
    const unlinked = doc.itens.some((it) => !it.produtoId);

    if (deduped || unlinked) {
      if (unlinked) await this.autoLinkProdutos(doc);
      doc = await this.model
        .findById(id)
        .populate('itens.precosFornecedores.fornecedorId')
        .populate('itens.produtoId')
        .exec();
    }
    if (!doc) throw new NotFoundException('Cotação não encontrada');
    return doc;
  }

  async findByOportunidade(oportunidadeId: string): Promise<Cotacao> {
    let doc = await this.model
      .findOne({ oportunidadeId })
      .populate('itens.precosFornecedores.fornecedorId')
      .populate('itens.produtoId')
      .exec();
    if (!doc)
      throw new NotFoundException(
        'Cotação não encontrada para esta oportunidade',
      );

    const deduped = await this.deduplicateItens(doc);
    const unlinked = doc.itens.some((it) => !it.produtoId);

    if (deduped || unlinked) {
      if (unlinked) await this.autoLinkProdutos(doc);
      doc = await this.model
        .findOne({ oportunidadeId })
        .populate('itens.precosFornecedores.fornecedorId')
        .populate('itens.produtoId')
        .exec();
    }
    if (!doc)
      throw new NotFoundException(
        'Cotação não encontrada para esta oportunidade',
      );
    return doc;
  }

  async findByOportunidades(
    oportunidadeIds: string[],
    resumo?: boolean | string,
  ): Promise<Record<string, Cotacao>> {
    const isResumo = resumo === true || resumo === 'true';
    let query = this.model.find({ oportunidadeId: { $in: oportunidadeIds } });

    if (isResumo) {
      query = query
        .select(
          'oportunidadeId valorTotalMelhorCotacao itens.melhorPreco itens.precosFornecedores.fornecedorId itens.quantidade itens.valorUnitarioEstimado itens.descricaoItem',
        )
        .populate('itens.precosFornecedores.fornecedorId', 'razaoSocial _id');
    } else {
      query = query
        .populate('itens.precosFornecedores.fornecedorId')
        .populate('itens.produtoId');
    }

    if (isResumo) {
      query = query.lean() as any;
    }

    const docs = (await query.exec()) as any[];
    const result: Record<string, Cotacao> = {};
    for (const doc of docs) {
      result[doc.oportunidadeId.toString()] = doc;
    }
    return result;
  }

  async updatePreco(
    cotacaoId: string,
    itemId: string,
    precoData: {
      fornecedorId: string;
      precoUnitario: number;
      fatorEmbalagem?: number;
      precoEmbalagem?: number;
      nomeEmbalagem?: string;
      freteIncluso?: boolean;
      prazoPagamento?: number;
      permiteParcelamento?: boolean;
      observacao?: string;
      desclassificado?: boolean;
      justificativaDesclassificacao?: string;
      linkProduto?: string;
      precoCustoContrato?: number;
      dataAssinaturaContrato?: string | Date;
      valorOfertadoOrgao?: number;
      valorFechadoOrgao?: number;
      valorVendaReajuste?: number;
      motivoContrato?: string;
      quantidadeEntregue?: number;
      entregasContrato?: {
        dataEntrega?: string;
        comandoDestino?: string;
        notaEmpenho?: string;
        notaFiscal?: string;
        quantidade: number;
        regimeEntrega?: string;
        custoCompraUnitario?: number;
        valorFaturadoUnitario?: number;
        observacao?: string;
      }[];
      dataUltimaAtualizacaoCusto?: string | Date;
      informeReajuste?: string;
      chatNegociacao?: string;
      registrarReajuste?: boolean;
      novaAlta?: boolean;
      limparReajuste?: boolean;
      historicoNegociacaoOverride?: any[];
    },
  ) {
    const doc = await this.model.findById(cotacaoId).exec();
    if (!doc) throw new NotFoundException('Cotação não encontrada');

    const item = doc.itens.find((i) => i._id.toString() === itemId);
    if (!item) throw new NotFoundException('Item não encontrado na cotação');

    // Fetch oportunidade and produto for context
    let op: any = null;
    let prodDoc: any = null;
    try {
      op = await this.connection
        .collection('oportunidades')
        .findOne({ _id: doc.oportunidadeId });
      const pId = (item.produtoId as any)?._id || item.produtoId;
      if (pId) {
        prodDoc = await this.connection
          .collection('produtos')
          .findOne({ _id: new mongoose.Types.ObjectId(pId.toString()) });
      }
    } catch {
      // ignore
    }

    const orgaoNome = op?.orgaoNome || '';
    const uasg = op?.unidadeCompradora || '';
    const pregaoNumero =
      op?.numeroCompraOrigem && op?.anoCompraOrigem
        ? `${op.modalidadeNome || 'Pregão Eletrônico'} Nº ${op.numeroCompraOrigem}/${op.anoCompraOrigem}`
        : op?.numeroControlePNCP || '';

    // Add or update provider price
    const fIdx = item.precosFornecedores.findIndex(
      (p) => p.fornecedorId.toString() === precoData.fornecedorId,
    );

    const existingEntry = fIdx >= 0 ? item.precosFornecedores[fIdx] : null;
    const precoCustoAnterior = existingEntry?.precoUnitario ?? precoData.precoUnitario;

    const precoCustoContrato =
      precoData.precoCustoContrato !== undefined && precoData.precoCustoContrato > 0
        ? precoData.precoCustoContrato
        : existingEntry?.precoCustoContrato && existingEntry.precoCustoContrato > 0
          ? existingEntry.precoCustoContrato
          : precoCustoAnterior > 0
            ? precoCustoAnterior
            : precoData.precoUnitario;

    const valorFechadoOrgao =
      precoData.valorFechadoOrgao !== undefined && precoData.valorFechadoOrgao > 0
        ? precoData.valorFechadoOrgao
        : existingEntry?.valorFechadoOrgao && existingEntry.valorFechadoOrgao > 0
          ? existingEntry.valorFechadoOrgao
          : prodDoc?.valorVencedor || prodDoc?.valorNossoLance || 0;

    const valorOfertadoOrgao =
      precoData.valorOfertadoOrgao !== undefined && precoData.valorOfertadoOrgao > 0
        ? precoData.valorOfertadoOrgao
        : existingEntry?.valorOfertadoOrgao && existingEntry.valorOfertadoOrgao > 0
          ? existingEntry.valorOfertadoOrgao
          : valorFechadoOrgao;

    const parseSafeDate = (
      val: string | Date | undefined,
      isUpdateTimestamp = false,
    ): Date | undefined => {
      if (!val) return isUpdateTimestamp ? new Date() : undefined;
      if (typeof val === 'string') {
        const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(val.trim());
        if (ymd) {
          const y = parseInt(ymd[1], 10);
          const m = parseInt(ymd[2], 10) - 1;
          const d = parseInt(ymd[3], 10);
          const now = new Date();
          if (
            isUpdateTimestamp &&
            now.getUTCFullYear() === y &&
            now.getUTCMonth() === m &&
            now.getUTCDate() === d
          ) {
            return now;
          }
          return new Date(
            Date.UTC(
              y,
              m,
              d,
              isUpdateTimestamp ? now.getUTCHours() || 12 : 12,
              isUpdateTimestamp ? now.getUTCMinutes() : 0,
              isUpdateTimestamp ? now.getUTCSeconds() : 0,
            ),
          );
        }
      }
      const parsed = new Date(val);
      if (isNaN(parsed.getTime())) {
        return isUpdateTimestamp ? new Date() : undefined;
      }
      if (
        parsed.getUTCHours() === 0 &&
        parsed.getUTCMinutes() === 0 &&
        parsed.getUTCSeconds() === 0
      ) {
        parsed.setUTCHours(12);
      }
      return parsed;
    };

    const dataAssinaturaContrato = precoData.dataAssinaturaContrato
      ? parseSafeDate(precoData.dataAssinaturaContrato, false)
      : existingEntry?.dataAssinaturaContrato || undefined;

    const dataAtualizacao =
      parseSafeDate(precoData.dataUltimaAtualizacaoCusto, true) || new Date();

    const lucroContratoUnitario =
      valorFechadoOrgao > 0 && precoCustoContrato > 0
        ? Number((valorFechadoOrgao - precoCustoContrato).toFixed(4))
        : 0;
    const percentualLucroContrato =
      precoCustoContrato > 0
        ? Number(((lucroContratoUnitario / precoCustoContrato) * 100).toFixed(2))
        : 0;
    const resultadoAtualUnitario =
      valorFechadoOrgao > 0 && precoData.precoUnitario > 0
        ? Number((valorFechadoOrgao - precoData.precoUnitario).toFixed(4))
        : 0;
    const valorSugeridoReajuste =
      precoData.valorVendaReajuste && precoData.valorVendaReajuste > 0
        ? precoData.valorVendaReajuste
        : precoData.precoUnitario > 0
          ? Number(
              (
                precoData.precoUnitario + Math.max(0, lucroContratoUnitario)
              ).toFixed(4),
            )
          : 0;

    const valorVendaReajuste =
      precoData.valorVendaReajuste !== undefined && precoData.valorVendaReajuste > 0
        ? precoData.valorVendaReajuste
        : existingEntry?.valorVendaReajuste && existingEntry.valorVendaReajuste > 0
          ? existingEntry.valorVendaReajuste
          : valorSugeridoReajuste;

    const lucroPosReajusteUnitario =
      valorVendaReajuste > 0 && precoData.precoUnitario > 0
        ? Number((valorVendaReajuste - precoData.precoUnitario).toFixed(4))
        : resultadoAtualUnitario;

    const motivoContrato =
      precoData.motivoContrato ||
      existingEntry?.motivoContrato ||
      'REAJUSTE_PRECO';

    const informeGerado =
      precoData.informeReajuste ||
      existingEntry?.informeReajuste ||
      (precoData.registrarReajuste
        ? `No momento da assinatura do contrato${dataAssinaturaContrato ? ` (${dataAssinaturaContrato.toLocaleDateString('pt-BR')})` : ''}, o custo do produto ${item.descricaoItem} era R$ ${precoCustoContrato.toFixed(2).replace('.', ',')} e o valor celebrado com o órgão (${orgaoNome || 'Órgão'}) foi R$ ${valorFechadoOrgao.toFixed(2).replace('.', ',')}, com lucro de R$ ${lucroContratoUnitario.toFixed(2).replace('.', ',')} unitariamente (${percentualLucroContrato.toFixed(2).replace('.', ',')}%). Em ${dataAtualizacao.toLocaleDateString('pt-BR')}, o fornecedor atualizou o custo para R$ ${precoData.precoUnitario.toFixed(2).replace('.', ',')}, gerando ${resultadoAtualUnitario < 0 ? `prejuízo de R$ ${Math.abs(resultadoAtualUnitario).toFixed(2).replace('.', ',')} por unidade` : `resultado de R$ ${resultadoAtualUnitario.toFixed(2).replace('.', ',')} por unidade`} em vista do que foi acordado em contrato, solicitando-se reajuste para R$ ${valorSugeridoReajuste.toFixed(2).replace('.', ',')}.`
        : undefined);

    const novoRegistroHist = {
      data: dataAtualizacao,
      tipo:
        precoData.registrarReajuste || precoData.precoUnitario > precoCustoContrato
          ? 'REAJUSTE_MERCADO'
          : 'COTACAO_INICIAL',
      motivoContrato,
      precoCustoContrato,
      precoCustoAnterior,
      precoCustoAtual: precoData.precoUnitario,
      valorOfertadoOrgao,
      valorFechadoOrgao,
      valorVendaReajuste,
      lucroContratoUnitario,
      percentualLucroContrato,
      resultadoAtualUnitario,
      lucroPosReajusteUnitario,
      valorSugeridoReajuste,
      quantidadeEntregue:
        precoData.quantidadeEntregue ?? existingEntry?.quantidadeEntregue,
      dataAssinaturaContrato,
      informe: informeGerado || precoData.observacao,
      chatNegociacao:
        precoData.chatNegociacao ?? existingEntry?.chatNegociacao,
    };

    if (fIdx >= 0 && precoData.limparReajuste) {
      const custoBaseOriginal =
        item.precosFornecedores[fIdx].precoCustoContrato &&
        item.precosFornecedores[fIdx].precoCustoContrato > 0
          ? item.precosFornecedores[fIdx].precoCustoContrato
          : precoData.precoUnitario;
      const fatorOriginal = item.precosFornecedores[fIdx].fatorEmbalagem || 1;
      item.precosFornecedores[fIdx].precoUnitario = custoBaseOriginal;
      item.precosFornecedores[fIdx].precoEmbalagem = parseFloat(
        (custoBaseOriginal * fatorOriginal).toFixed(6),
      );
      item.precosFornecedores[fIdx].precoCustoContrato = undefined;
      item.precosFornecedores[fIdx].valorVendaReajuste = undefined;
      item.precosFornecedores[fIdx].motivoContrato = undefined;
      item.precosFornecedores[fIdx].quantidadeEntregue = undefined;
      item.precosFornecedores[fIdx].entregasContrato = [];
      item.precosFornecedores[fIdx].informeReajuste = undefined;
      item.precosFornecedores[fIdx].historicoNegociacao = [];
    } else if (fIdx >= 0) {
      item.precosFornecedores[fIdx].precoUnitario = precoData.precoUnitario;
      if (precoData.fatorEmbalagem !== undefined)
        item.precosFornecedores[fIdx].fatorEmbalagem = precoData.fatorEmbalagem;
      if (precoData.precoEmbalagem !== undefined)
        item.precosFornecedores[fIdx].precoEmbalagem = precoData.precoEmbalagem;
      if (precoData.nomeEmbalagem !== undefined)
        item.precosFornecedores[fIdx].nomeEmbalagem = precoData.nomeEmbalagem;
      if (precoData.freteIncluso !== undefined)
        item.precosFornecedores[fIdx].freteIncluso = precoData.freteIncluso;
      if (precoData.prazoPagamento !== undefined)
        item.precosFornecedores[fIdx].prazoPagamento = precoData.prazoPagamento;
      if (precoData.permiteParcelamento !== undefined)
        item.precosFornecedores[fIdx].permiteParcelamento =
          precoData.permiteParcelamento;
      if (precoData.observacao !== undefined)
        item.precosFornecedores[fIdx].observacao = precoData.observacao;
      if (precoData.desclassificado !== undefined)
        item.precosFornecedores[fIdx].desclassificado =
          precoData.desclassificado || false;
      if (precoData.justificativaDesclassificacao !== undefined)
        item.precosFornecedores[fIdx].justificativaDesclassificacao =
          precoData.justificativaDesclassificacao;
      if (precoData.linkProduto)
        item.precosFornecedores[fIdx].linkProduto = precoData.linkProduto;

      item.precosFornecedores[fIdx].precoCustoContrato = precoCustoContrato;
      if (dataAssinaturaContrato)
        item.precosFornecedores[fIdx].dataAssinaturaContrato =
          dataAssinaturaContrato;
      if (valorOfertadoOrgao > 0)
        item.precosFornecedores[fIdx].valorOfertadoOrgao = valorOfertadoOrgao;
      if (valorFechadoOrgao > 0)
        item.precosFornecedores[fIdx].valorFechadoOrgao = valorFechadoOrgao;
      if (valorVendaReajuste > 0)
        item.precosFornecedores[fIdx].valorVendaReajuste = valorVendaReajuste;
      if (motivoContrato)
        item.precosFornecedores[fIdx].motivoContrato = motivoContrato;
      if (Array.isArray(precoData.entregasContrato)) {
        item.precosFornecedores[fIdx].entregasContrato =
          precoData.entregasContrato;
        const somaEntregas = precoData.entregasContrato.reduce(
          (acc, ent) => acc + (Number(ent.quantidade) || 0),
          0,
        );
        item.precosFornecedores[fIdx].quantidadeEntregue =
          somaEntregas > 0 ? somaEntregas : precoData.quantidadeEntregue;
      } else if (precoData.quantidadeEntregue !== undefined) {
        item.precosFornecedores[fIdx].quantidadeEntregue =
          precoData.quantidadeEntregue;
      }
      item.precosFornecedores[fIdx].dataUltimaAtualizacaoCusto = dataAtualizacao;
      if (informeGerado)
        item.precosFornecedores[fIdx].informeReajuste = informeGerado;
      if (precoData.chatNegociacao !== undefined)
        item.precosFornecedores[fIdx].chatNegociacao = precoData.chatNegociacao;

      if (Array.isArray(precoData.historicoNegociacaoOverride)) {
        item.precosFornecedores[fIdx].historicoNegociacao =
          precoData.historicoNegociacaoOverride;
      } else {
        if (!item.precosFornecedores[fIdx].historicoNegociacao) {
          item.precosFornecedores[fIdx].historicoNegociacao = [];
        }
        const histArr = item.precosFornecedores[fIdx].historicoNegociacao;
        const isPosReajuste =
          Math.abs(precoData.precoUnitario - precoCustoContrato) > 0.0001 ||
          Math.abs(valorVendaReajuste - valorFechadoOrgao) > 0.0001;

        if (precoData.novaAlta) {
          histArr.push(novoRegistroHist);
        } else if (histArr.length === 0) {
          histArr.push(novoRegistroHist);
        } else if (precoData.registrarReajuste && isPosReajuste) {
          // Procura se já existe um ajuste pós-contrato para atualizar in-place caso não seja "novaAlta"
          const lastIdx = histArr.length - 1;
          const lastEntry = histArr[lastIdx];
          const lastIsAdjustment =
            lastEntry &&
            (Math.abs(Number(lastEntry.precoCustoAtual || 0) - precoCustoContrato) > 0.0001 ||
              Math.abs(Number(lastEntry.valorVendaReajuste || lastEntry.valorFechadoOrgao || 0) - valorFechadoOrgao) > 0.0001);
          if (lastIsAdjustment) {
            histArr[lastIdx] = novoRegistroHist;
          } else {
            histArr.push(novoRegistroHist);
          }
        } else if (precoData.precoUnitario !== precoCustoAnterior) {
          histArr.push(novoRegistroHist);
        }
      }
    } else {
      const somaEntregas = Array.isArray(precoData.entregasContrato)
        ? precoData.entregasContrato.reduce(
            (acc, ent) => acc + (Number(ent.quantidade) || 0),
            0,
          )
        : 0;
      item.precosFornecedores.push({
        fornecedorId: new mongoose.Types.ObjectId(precoData.fornecedorId),
        precoUnitario: precoData.precoUnitario,
        fatorEmbalagem: precoData.fatorEmbalagem,
        precoEmbalagem: precoData.precoEmbalagem,
        nomeEmbalagem: precoData.nomeEmbalagem,
        freteIncluso: precoData.freteIncluso,
        prazoPagamento: precoData.prazoPagamento,
        permiteParcelamento: precoData.permiteParcelamento,
        observacao: precoData.observacao,
        desclassificado: precoData.desclassificado || false,
        justificativaDesclassificacao: precoData.justificativaDesclassificacao,
        linkProduto: precoData.linkProduto,
        precoCustoContrato,
        dataAssinaturaContrato,
        valorOfertadoOrgao,
        valorFechadoOrgao,
        valorVendaReajuste,
        motivoContrato,
        quantidadeEntregue:
          somaEntregas > 0 ? somaEntregas : precoData.quantidadeEntregue,
        entregasContrato: precoData.entregasContrato || [],
        dataUltimaAtualizacaoCusto: dataAtualizacao,
        informeReajuste: informeGerado,
        chatNegociacao: precoData.chatNegociacao,
        historicoNegociacao: [novoRegistroHist],
      });
    }

    // If valorFechadoOrgao was provided, also sync to Produto
    if (precoData.valorFechadoOrgao && precoData.valorFechadoOrgao > 0) {
      try {
        const pId = (item.produtoId as any)?._id || item.produtoId;
        if (pId) {
          await this.connection
            .collection('produtos')
            .updateOne(
              { _id: new mongoose.Types.ObjectId(pId.toString()) },
              {
                $set: {
                  valorNossoLance: precoData.valorFechadoOrgao,
                  valorVencedor: precoData.valorFechadoOrgao,
                },
              },
            );
        }
      } catch {
        // ignore
      }
    }

    // Recalculate melhorPreco for this item
    let melhor: any;
    for (const p of item.precosFornecedores) {
      if (p.desclassificado || p.precoUnitario <= 0) continue;
      if (!melhor) {
        melhor = p;
        continue;
      }
      if (p.precoUnitario < melhor.precoUnitario) {
        melhor = p;
      } else if (p.precoUnitario === melhor.precoUnitario) {
        // Crivo de Desempate (Tiebreaker)
        let pScore = 0;
        let melhorScore = 0;
        if (p.freteIncluso) pScore += 10;
        if (melhor.freteIncluso) melhorScore += 10;

        if (p.permiteParcelamento) pScore += 5;
        if (melhor.permiteParcelamento) melhorScore += 5;

        pScore += (p.prazoPagamento || 0) * 0.1;
        melhorScore += (melhor.prazoPagamento || 0) * 0.1;

        if (pScore > melhorScore) {
          melhor = p;
        }
      }
    }
    item.melhorPreco = melhor
      ? {
          fornecedorId: melhor.fornecedorId,
          precoUnitario: melhor.precoUnitario,
        }
      : undefined;

    // Recalculate valorTotalMelhorCotacao
    doc.valorTotalMelhorCotacao = parseFloat(
      doc.itens
        .reduce((total, it) => {
          if (it.melhorPreco && !isNaN(it.melhorPreco.precoUnitario)) {
            return total + it.melhorPreco.precoUnitario * (it.quantidade || 1);
          }
          return total;
        }, 0)
        .toFixed(2),
    );

    await doc.save();

    let fornDoc: any = null;
    try {
      fornDoc = await this.fornecedorService.findOne(precoData.fornecedorId);
    } catch {
      // ignore
    }

    // Gravar no historico do fornecedor
    await this.fornecedorService.registrarHistoricoPreco(
      precoData.fornecedorId,
      {
        descricaoItem: item.descricaoItem,
        precoUnitario: precoData.precoUnitario,
        precoEmbalagem: precoData.precoEmbalagem,
        fatorEmbalagem: precoData.fatorEmbalagem,
        nomeEmbalagem: precoData.nomeEmbalagem,
        observacao: precoData.observacao,
        desclassificado: precoData.desclassificado,
        oportunidadeId: doc.oportunidadeId.toString(),
        data: dataAtualizacao,
        tipoRegistro: novoRegistroHist.tipo,
        precoCustoContrato,
        precoCustoAnterior,
        valorOfertadoOrgao,
        valorFechadoOrgao,
        lucroContratoUnitario,
        percentualLucroContrato,
        resultadoAtualUnitario,
        valorSugeridoReajuste,
        quantidadeContratada: item.quantidade || 1,
        quantidadeEntregue: precoData.quantidadeEntregue,
        dataAssinaturaContrato,
        orgaoNome,
        uasg,
        pregaoNumero,
        numeroItem: item.numeroItem,
        informe: informeGerado,
        chatNegociacao: precoData.chatNegociacao,
      },
    );

    // Sincronizar também na Base Geral de Produtos (ProdutoBase) quando for reajuste ou tiver dados de contrato
    if (precoData.limparReajuste) {
      await this.fornecedorService.updateProdutoBase(item.descricaoItem, {
        numeroItem: item.numeroItem,
        limparReajuste: true,
      });
    } else if (
      precoData.registrarReajuste ||
      precoData.precoCustoContrato !== undefined ||
      precoData.valorFechadoOrgao !== undefined ||
      valorFechadoOrgao > 0
    ) {
      const pfCurrent = fIdx >= 0 ? item.precosFornecedores[fIdx] : null;
      await this.fornecedorService.updateProdutoBase(item.descricaoItem, {
        nossoLanceOficial: valorFechadoOrgao > 0 ? valorFechadoOrgao : undefined,
        precoCustoContrato,
        precoCustoAtual: precoData.precoUnitario,
        valorOfertadoOrgao: valorOfertadoOrgao > 0 ? valorOfertadoOrgao : undefined,
        valorFechadoOrgao: valorFechadoOrgao > 0 ? valorFechadoOrgao : undefined,
        valorVendaReajuste: valorVendaReajuste > 0 ? valorVendaReajuste : undefined,
        motivoContrato,
        dataAssinaturaContrato,
        dataUltimoReajuste: dataAtualizacao,
        orgaoNome,
        uasg,
        pregaoNumero,
        numeroItem: item.numeroItem,
        quantidadeContratada: item.quantidade || 1,
        quantidadeEntregue: pfCurrent?.quantidadeEntregue ?? precoData.quantidadeEntregue,
        entregasContrato: pfCurrent?.entregasContrato ?? precoData.entregasContrato,
        fornecedorId: precoData.fornecedorId,
        fornecedorNome: fornDoc?.razaoSocial,
        fornecedorCnpj: fornDoc?.cnpj,
        oportunidadeId: doc.oportunidadeId.toString(),
        informe: informeGerado,
        chatNegociacao: precoData.chatNegociacao,
        registrarNoHistorico: true,
      });
    }

    await this.checkAndMoveKanban(doc);

    const updatedCotacao = await this.findOne(cotacaoId);
    this.gateway.emitCotacaoUpdate(updatedCotacao);
    return updatedCotacao;
  }

  private async checkAndMoveKanban(doc: any) {
    const todosItensCotados =
      doc.itens.length > 0 &&
      doc.itens.every(
        (it: any) => it.melhorPreco && it.melhorPreco.precoUnitario > 0,
      );
    if (todosItensCotados) {
      const op = await this.connection
        .collection('oportunidades')
        .findOne({ _id: doc.oportunidadeId });
      // Mover para FEITO (Concluído / Pronto para Pregão) se estiver nas fases iniciais
      if (
        op &&
        (op.kanbanStatus === 'FAZENDO' || op.kanbanStatus === 'A_FAZER')
      ) {
        await this.connection
          .collection('oportunidades')
          .updateOne(
            { _id: doc.oportunidadeId },
            { $set: { kanbanStatus: 'FEITO' } },
          );
      }
    }
  }

  async removePreco(cotacaoId: string, itemId: string, fornecedorId: string) {
    const doc = await this.model.findById(cotacaoId).exec();
    if (!doc) throw new NotFoundException('Cotação não encontrada');

    const item = doc.itens.find((i) => i._id.toString() === itemId);
    if (!item) throw new NotFoundException('Item não encontrado na cotação');

    // Remove supplier price entry
    item.precosFornecedores = item.precosFornecedores.filter(
      (p) => p.fornecedorId.toString() !== fornecedorId,
    );

    // Remover histórico de preço no fornecedor global
    await this.fornecedorService.removerHistoricoPreco(
      fornecedorId,
      item.descricaoItem,
      doc.oportunidadeId.toString(),
    );

    // Recalculate melhorPreco for this item
    let melhor: any;
    for (const p of item.precosFornecedores) {
      if (p.desclassificado || p.precoUnitario <= 0) continue;
      if (!melhor) {
        melhor = p;
        continue;
      }
      if (p.precoUnitario < melhor.precoUnitario) {
        melhor = p;
      } else if (p.precoUnitario === melhor.precoUnitario) {
        // Crivo de Desempate (Tiebreaker)
        let pScore = 0;
        let melhorScore = 0;
        if (p.freteIncluso) pScore += 10;
        if (melhor.freteIncluso) melhorScore += 10;

        if (p.permiteParcelamento) pScore += 5;
        if (melhor.permiteParcelamento) melhorScore += 5;

        pScore += (p.prazoPagamento || 0) * 0.1;
        melhorScore += (melhor.prazoPagamento || 0) * 0.1;

        if (pScore > melhorScore) {
          melhor = p;
        }
      }
    }
    item.melhorPreco = melhor
      ? {
          fornecedorId: melhor.fornecedorId,
          precoUnitario: melhor.precoUnitario,
        }
      : undefined;

    // Recalculate valorTotalMelhorCotacao
    doc.valorTotalMelhorCotacao = doc.itens.reduce((total, it) => {
      if (it.melhorPreco && !isNaN(it.melhorPreco.precoUnitario)) {
        return total + it.melhorPreco.precoUnitario * (it.quantidade || 1);
      }
      return total;
    }, 0);

    await doc.save();

    const updatedCotacao = await this.findOne(cotacaoId);
    this.gateway.emitCotacaoUpdate(updatedCotacao);
    return updatedCotacao;
  }

  async buscarPrecosWebAuto(
    cotacaoId: string,
    itemId: string,
    location?: string,
  ) {
    const doc = await this.model.findById(cotacaoId).exec();
    if (!doc) throw new NotFoundException('Cotação não encontrada');

    const item = doc.itens.find((i) => i._id.toString() === itemId);
    if (!item) throw new NotFoundException('Item não encontrado na cotação');

    // 1. Bot dispara a busca
    const fornecedoresWeb =
      await this.supplierDiscoveryService.discoverSuppliersForProduct(
        item.descricaoItem,
        location,
      );

    // 2. Registra na cotação
    for (const f of fornecedoresWeb) {
      // Verifica se já existe um preço validado pelo comprador (> 0)
      const precoExistente = item.precosFornecedores.find(
        (p) => p.fornecedorId.toString() === f.id,
      );

      if (
        precoExistente &&
        precoExistente.precoUnitario > 0 &&
        f.precoUnitario === 0
      ) {
        // Não sobrescreve um preço real que o comprador já preencheu com um 0.00 do bot
        continue;
      }

      await this.updatePreco(cotacaoId, itemId, {
        fornecedorId: f.id,
        precoUnitario: f.precoUnitario,
        observacao: precoExistente
          ? precoExistente.observacao
          : 'Preço prospectado automaticamente pelo Robô',
        linkProduto: f.linkProduto,
      });
    }

    return {
      message: 'Busca web finalizada',
      encontrados: fornecedoresWeb.length,
    };
  }
}
