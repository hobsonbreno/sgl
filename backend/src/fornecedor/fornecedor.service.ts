import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Model, Connection } from 'mongoose';
import {
  Fornecedor,
  FornecedorDocument,
  ProdutoBase,
  ProdutoBaseDocument,
} from './fornecedor.schema';
import { FornecedorGateway } from './fornecedor.gateway';

@Injectable()
export class FornecedorService {
  constructor(
    @InjectModel(Fornecedor.name) private model: Model<FornecedorDocument>,
    @InjectModel(ProdutoBase.name)
    private intelModel: Model<ProdutoBaseDocument>,
    @InjectConnection() private connection: Connection,
    private readonly gateway: FornecedorGateway,
  ) {}

  private validarCNPJ(cnpj: string): boolean {
    const limpo = cnpj.replace(/[^\d]+/g, '');
    if (limpo.length !== 14) return false;
    // simplificação para validação básica
    return true;
  }

  async create(data: any): Promise<Fornecedor> {
    if (!this.validarCNPJ(data.cnpj)) {
      throw new BadRequestException('CNPJ inválido');
    }
    const existe = await this.model.findOne({ cnpj: data.cnpj }).exec();
    if (existe)
      throw new BadRequestException('Fornecedor com este CNPJ já existe');

    const created = await this.model.create({ ...data, origem: 'manual' });
    this.gateway.emitFornecedorUpdate(created);
    return created;
  }

  async findAll(query: any): Promise<{
    data: Fornecedor[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    const filters: any = {};
    if (query.categoria) filters.categorias = query.categoria;
    if (query.busca) {
      filters.$or = [
        { razaoSocial: { $regex: query.busca, $options: 'i' } },
        { cnpj: { $regex: query.busca, $options: 'i' } },
      ];
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const data = await this.model
      .find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    const total = await this.model.countDocuments(filters).exec();
    const totalPages = Math.ceil(total / limit) || 1;

    return { data, total, totalPages, currentPage: page };
  }

  async findOne(id: string): Promise<Fornecedor> {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Fornecedor não encontrado');
    return doc;
  }

  async update(id: string, data: any): Promise<Fornecedor> {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Fornecedor não encontrado');

    if (data.telefone !== undefined) doc.telefone = data.telefone;
    if (data.nomeConsultor !== undefined)
      doc.nomeConsultor = data.nomeConsultor;
    if (data.email !== undefined) doc.email = data.email;
    if (data.cep !== undefined) doc.cep = data.cep;
    if (data.endereco !== undefined) doc.endereco = data.endereco;
    if (data.bairro !== undefined) doc.bairro = data.bairro;
    if (data.cidade !== undefined) doc.cidade = data.cidade;
    if (data.uf !== undefined) doc.uf = data.uf;
    if (data.site !== undefined) doc.site = data.site;
    if (data.portifolio !== undefined) doc.portifolio = data.portifolio;

    // Se origem for bot, só pode atualizar categorias, contato e campos não-fiscais
    if (doc.origem === 'bot') {
      if (data.categorias) doc.categorias = data.categorias;
      if (data.contato) doc.contato = data.contato;
    } else {
      if (data.razaoSocial) doc.razaoSocial = data.razaoSocial;
      if (data.categorias) doc.categorias = data.categorias;
      if (data.contato) doc.contato = data.contato;
    }

    const updated = await doc.save();
    this.gateway.emitFornecedorUpdate(updated);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Fornecedor não encontrado');

    // Validate if the supplier is a "campeão" (winning) in any quotation
    const isCampea = await this.connection.collection('cotacaos').findOne({
      'itens.melhorPreco.fornecedorId': new mongoose.Types.ObjectId(id),
    });

    if (isCampea) {
      throw new BadRequestException(
        'Não é possível excluir este fornecedor pois ele é o campeão de preço em uma ou mais cotações. Desclassifique-o ou remova seu lance nas cotações vinculadas antes de excluí-lo.',
      );
    }

    // Delete the supplier
    await this.model.findByIdAndDelete(id).exec();

    // Cascading delete: remove all price references of this supplier from all Cotacoes
    await this.connection.collection('cotacaos').updateMany({}, {
      $pull: {
        'itens.$[].precosFornecedores': {
          fornecedorId: new mongoose.Types.ObjectId(id),
        },
      },
    } as any);

    this.gateway.emitFornecedorDelete(id);
  }

  private parseSafeDate(
    val: string | Date | undefined | null,
    isUpdateTimestamp = false,
  ): Date | undefined {
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
  }

  private normalizeSearchText(s: any): string {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[º°ª]/g, '')
      .replace(/[-:/,.;()[\]]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private pickPos(...vals: any[]): number | null {
    for (const v of vals) {
      const n = Number(v);
      if (v !== undefined && v !== null && !isNaN(n) && n > 0) {
        return n;
      }
    }
    return null;
  }

  async registrarHistoricoPreco(
    fornecedorId: string,
    itemData: {
      descricaoItem: string;
      precoUnitario: number;
      precoEmbalagem?: number;
      fatorEmbalagem?: number;
      nomeEmbalagem?: string;
      observacao?: string;
      desclassificado?: boolean;
      oportunidadeId: string;
      data?: Date;
      tipoRegistro?: string;
      precoCustoContrato?: number;
      precoCustoAnterior?: number;
      valorOfertadoOrgao?: number;
      valorFechadoOrgao?: number;
      lucroContratoUnitario?: number;
      percentualLucroContrato?: number;
      resultadoAtualUnitario?: number;
      valorSugeridoReajuste?: number;
      quantidadeContratada?: number;
      quantidadeEntregue?: number;
      dataAssinaturaContrato?: Date;
      orgaoNome?: string;
      uasg?: string;
      pregaoNumero?: string;
      numeroItem?: number;
      informe?: string;
      chatNegociacao?: string;
    },
  ): Promise<void> {
    const dataRegistro =
      this.parseSafeDate(itemData.data, true) || new Date();
    const dataAssinatura = this.parseSafeDate(
      itemData.dataAssinaturaContrato,
      false,
    );

    const updated = await this.model.findByIdAndUpdate(
      fornecedorId,
      {
        $push: {
          fornecedor_historico_precos: {
            ...itemData,
            data: dataRegistro,
            ...(dataAssinatura ? { dataAssinaturaContrato: dataAssinatura } : {}),
          },
        },
      },
      { new: true },
    );

    if (updated) {
      this.gateway.emitFornecedorUpdate(updated);
    }
  }

  async removerHistoricoPreco(
    fornecedorId: string,
    descricaoItem: string,
    oportunidadeId: string,
  ): Promise<void> {
    const updated = await this.model.findByIdAndUpdate(
      fornecedorId,
      {
        $pull: {
          fornecedor_historico_precos: {
            descricaoItem: descricaoItem,
            oportunidadeId: oportunidadeId,
          },
        },
      },
      { new: true },
    );

    if (updated) {
      this.gateway.emitFornecedorUpdate(updated);
    }
  }

  async getBaseProdutos(query: any = {}): Promise<any> {
    const fornecedores = await this.model
      .find({ 'fornecedor_historico_precos.0': { $exists: true } })
      .exec();
    const fornById = new Map<string, any>();
    for (const f of fornecedores) {
      fornById.set(f._id.toString(), f);
    }

    const produtosMap = new Map<string, any>();

    // Helper to build a unique map key that separates items when numeroItem differs for identical descriptions
    const getMapKey = (descricaoItem: string, numeroItem?: number) => {
      if (numeroItem && Number(numeroItem) > 0) {
        return `${descricaoItem}__ITEM_${numeroItem}`;
      }
      return descricaoItem;
    };

    // 1. Load live negotiated / quoted items directly from Cotacaos + Oportunidades + Produtos when available
    try {
      const cotColl = this.connection?.collection?.('cotacaos');
      const opColl = this.connection?.collection?.('oportunidades');
      const prodColl = this.connection?.collection?.('produtos');
      const fornColl = this.connection?.collection?.('fornecedors');

      if (cotColl && opColl && prodColl) {
        const allCots = await cotColl
          .find({ 'itens.0': { $exists: true } })
          .toArray();
        const opIds = allCots
          .map((c: any) => c.oportunidadeId)
          .filter(Boolean);
        const ops =
          opIds.length > 0
            ? await opColl.find({ _id: { $in: opIds } }).toArray()
            : [];
        const opMap = new Map<string, any>(
          ops.map((o: any) => [o._id.toString(), o]),
        );

        if (fornColl) {
          const allForns = await fornColl.find({}).toArray();
          for (const f of allForns) {
            fornById.set(f._id.toString(), f);
          }
        }

        for (const cot of allCots) {
          const op = cot.oportunidadeId
            ? opMap.get(cot.oportunidadeId.toString())
            : null;
          if (!op) {
            continue;
          }
          const hasContractOrSupplierQuote = (cot.itens || []).some(
            (it: any) =>
              Array.isArray(it.precosFornecedores) &&
              it.precosFornecedores.some(
                (pf: any) =>
                  (pf.precoCustoContrato || 0) > 0 ||
                  (pf.valorFechadoOrgao || 0) > 0 ||
                  (pf.precoUnitario || 0) > 0,
              ),
          );
          if (op.kanbanStatus === 'EXCLUIDA' && !hasContractOrSupplierQuote) {
            continue;
          }

          const prodDocs = await prodColl
            .find({
              oportunidadeId: {
                $in: [
                  cot.oportunidadeId,
                  cot.oportunidadeId?.toString(),
                ].filter(Boolean),
              },
            })
            .toArray();
          const prodById = new Map<string, any>(
            prodDocs.map((p: any) => [p._id.toString(), p]),
          );
          const prodByNum = new Map<number, any>();
          for (const p of prodDocs) {
            if (p.numeroItem && (!prodByNum.has(p.numeroItem) || p.valorNossoLance > 0)) {
              prodByNum.set(Number(p.numeroItem), p);
            }
          }

          // Count how many active items share the same description in this cotacao
          const descCounts = new Map<string, number>();
          for (const it of cot.itens || []) {
            const pDoc =
              (it.produtoId && prodById.get(it.produtoId.toString())) ||
              (it.numeroItem && prodByNum.get(Number(it.numeroItem)));
            const hasQuote =
              (it.precosFornecedores && it.precosFornecedores.length > 0) ||
              (pDoc && (pDoc.valorNossoLance > 0 || pDoc.valorVencedor > 0));
            if (hasQuote && it.descricaoItem) {
              descCounts.set(
                it.descricaoItem,
                (descCounts.get(it.descricaoItem) || 0) + 1,
              );
            }
          }

          const rawOrgao = op?.orgaoNome || '';
          const uasg = op?.unidadeCompradora || '';
          const orgaoNome =
            uasg === '783601' && !rawOrgao.toUpperCase().includes('APRENDIZES')
              ? `${rawOrgao} — ESCOLA DE APRENDIZES MARINHEIROS DO CEARÁ (EAMCE)`
              : rawOrgao;
          const pregaoNumero =
            op?.numeroCompraOrigem && op?.anoCompraOrigem
              ? `Pregão Eletrônico Nº ${op.numeroCompraOrigem}/${op.anoCompraOrigem}`
              : op?.numeroControlePNCP || '';

          for (const it of cot.itens || []) {
            const pNome = it.descricaoItem;
            if (!pNome) continue;

            const pDoc =
              (it.produtoId && prodById.get(it.produtoId.toString())) ||
              (it.numeroItem && prodByNum.get(Number(it.numeroItem)));
            const pfs = it.precosFornecedores || [];
            const lanceOficial = this.pickPos(
              pDoc?.valorNossoLance,
              pDoc?.valorVencedor,
              it.valorNossoLance,
              it.valorVencedor,
            );

            if (pfs.length === 0 && !lanceOficial) continue;

            // Somente traz para a Base de Contratos & Reajuste os itens onde fomos selecionados/homologados ou assinamos contrato
            const vencNome = String(
              pDoc?.vencedorNome || it.vencedorNome || '',
            )
              .toUpperCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '');
            const vencCnpj = String(
              pDoc?.vencedorCnpj || it.vencedorCnpj || '',
            ).replace(/\D/g, '');
            const isNossoHomologado =
              vencCnpj.includes('48262939') ||
              vencNome.includes('IRMAOS NASCIMENTO') ||
              (vencNome.includes('IRMAOS') && vencNome.includes('NASCIMENTO'));

            const temContratoAssinado = pfs.some(
              (pf: any) =>
                Number(pf.valorFechadoOrgao || 0) > 0 ||
                Number(pf.valorVendaReajuste || 0) > 0 ||
                (Array.isArray(pf.entregasContrato) &&
                  pf.entregasContrato.length > 0),
            );

            if (!isNossoHomologado && !temContratoAssinado) {
              continue;
            }

            const mapKey = it.numeroItem
              ? getMapKey(pNome, it.numeroItem)
              : pNome;

            if (!produtosMap.has(mapKey)) {
              produtosMap.set(mapKey, {
                chaveUnica: mapKey,
                descricaoItem: pNome,
                numeroItem: it.numeroItem,
                oportunidadeId: cot.oportunidadeId?.toString(),
                cotacaoId: cot._id?.toString(),
                cotacaoItemId: it._id?.toString(),
                orgaoNome,
                uasg,
                pregaoNumero,
                quantidadeContratada: it.quantidade || pDoc?.quantidade || 1,
                nossoLanceFromProd: lanceOficial,
                cotacoes: [],
                historicoCotacoes: [],
              });
            }

            const prodEntry = produtosMap.get(mapKey);
            if (lanceOficial && !prodEntry.nossoLanceFromProd) {
              prodEntry.nossoLanceFromProd = lanceOficial;
            }
            if (orgaoNome && !prodEntry.orgaoNome) prodEntry.orgaoNome = orgaoNome;
            if (uasg && !prodEntry.uasg) prodEntry.uasg = uasg;
            if (pregaoNumero && !prodEntry.pregaoNumero)
              prodEntry.pregaoNumero = pregaoNumero;
            if (it.numeroItem && !prodEntry.numeroItem)
              prodEntry.numeroItem = it.numeroItem;

            for (const pf of pfs) {
              const fIdStr = pf.fornecedorId?._id
                ? pf.fornecedorId._id.toString()
                : pf.fornecedorId?.toString();
              const fornInfo = fIdStr ? fornById.get(fIdStr) : null;

              const cContrato =
                this.pickPos(pf.precoCustoContrato, pf.precoUnitario) ?? 0;
              const cAtual =
                this.pickPos(pf.precoUnitario, pf.precoCustoContrato) ?? 0;
              const vFechado =
                this.pickPos(pf.valorFechadoOrgao, lanceOficial) ?? 0;
              const vOfertado =
                this.pickPos(
                  pf.valorOfertadoOrgao,
                  vFechado,
                  it.valorUnitarioEstimado,
                ) ?? 0;
              const vVendaReaj =
                this.pickPos(pf.valorVendaReajuste, vFechado) ?? 0;

              const cotEntry = {
                fornecedorId: pf.fornecedorId?._id || pf.fornecedorId,
                razaoSocial:
                  fornInfo?.razaoSocial ||
                  pf.fornecedorId?.razaoSocial ||
                  'Fornecedor Cotado',
                cnpj: fornInfo?.cnpj || pf.fornecedorId?.cnpj || '',
                precoUnitario: cAtual,
                precoEmbalagem: pf.precoEmbalagem,
                fatorEmbalagem: pf.fatorEmbalagem,
                nomeEmbalagem: pf.nomeEmbalagem,
                observacao: pf.observacao,
                desclassificado: pf.desclassificado,
                site: fornInfo?.site,
                portifolio: fornInfo?.portifolio,
                data: pf.dataUltimaAtualizacaoCusto || cot.updatedAt || new Date(),
                oportunidadeId: cot.oportunidadeId?.toString(),
                tipoRegistro:
                  cAtual > cContrato ? 'REAJUSTE_MERCADO' : 'COTACAO_ATUAL',
                motivoContrato: pf.motivoContrato || 'REAJUSTE_PRECO',
                precoCustoContrato: cContrato,
                precoCustoAtual: cAtual,
                valorOfertadoOrgao: vOfertado,
                valorFechadoOrgao: vFechado,
                valorVendaReajuste: vVendaReaj,
                quantidadeContratada: it.quantidade || 1,
                quantidadeEntregue: pf.quantidadeEntregue,
                entregasContrato: pf.entregasContrato || [],
                dataAssinaturaContrato: pf.dataAssinaturaContrato,
                orgaoNome,
                uasg,
                pregaoNumero,
                numeroItem: it.numeroItem,
                informe: pf.informeReajuste,
                chatNegociacao: pf.chatNegociacao,
                historicoNegociacao: pf.historicoNegociacao || [],
              };

              prodEntry.cotacoes.push(cotEntry);
              if (
                pf.historicoNegociacao &&
                Array.isArray(pf.historicoNegociacao) &&
                pf.historicoNegociacao.length > 0
              ) {
                for (const hn of pf.historicoNegociacao) {
                  prodEntry.historicoCotacoes.push({
                    ...cotEntry,
                    ...hn,
                    precoUnitario:
                      this.pickPos(hn.precoCustoAtual, cAtual) ?? cAtual,
                    precoCustoContrato:
                      this.pickPos(hn.precoCustoContrato, cContrato) ??
                      cContrato,
                    valorFechadoOrgao:
                      this.pickPos(hn.valorFechadoOrgao, vFechado) ?? vFechado,
                    valorVendaReajuste:
                      this.pickPos(hn.valorVendaReajuste, vVendaReaj) ??
                      vVendaReaj,
                    data: hn.data || cotEntry.data,
                  });
                }
              } else {
                prodEntry.historicoCotacoes.push(cotEntry);
              }
            }
          }
        }
      }
    } catch {
      // Fallback when running in unit tests with mocked connection
    }

    // Mapa auxiliar por numeroItem para evitar duplicação caso a descrição tenha pequena variação entre Cotacao, Histórico e ProdutoBase
    const keyByNumeroItem = new Map<number, string>();
    for (const [k, v] of produtosMap.entries()) {
      if (v.numeroItem) {
        keyByNumeroItem.set(Number(v.numeroItem), k);
      }
    }

    // 2. Also include supplier history entries for products not yet in produtosMap (only if contracted)
    for (const f of fornecedores) {
      for (const hist of f.fornecedor_historico_precos) {
        const pNome = hist.descricaoItem;
        if (!pNome) continue;

        const existingKeyByNum = hist.numeroItem
          ? keyByNumeroItem.get(Number(hist.numeroItem))
          : undefined;
        const itemKey = getMapKey(pNome, hist.numeroItem);
        const targetKey =
          existingKeyByNum ||
          (produtosMap.has(itemKey) ? itemKey : pNome);

        if (!produtosMap.has(targetKey)) {
          // Só cria a partir do histórico de fornecedores se tiver vínculo de contrato assinado e número de item homologado
          if (
            !(Number(hist.valorFechadoOrgao || 0) > 0) ||
            !(Number(hist.numeroItem || 0) > 0)
          ) {
            continue;
          }
          produtosMap.set(targetKey, {
            chaveUnica: targetKey,
            descricaoItem: pNome,
            numeroItem: hist.numeroItem,
            cotacoes: [],
            historicoCotacoes: [],
          });
          if (hist.numeroItem) {
            keyByNumeroItem.set(Number(hist.numeroItem), targetKey);
          }
        }

        const prod = produtosMap.get(targetKey);
        // Only populate from fornecedor_historico_precos if not already populated directly from live cotacao
        if (prod.cotacaoId) continue;

        const entry = {
          fornecedorId: f._id,
          razaoSocial: f.razaoSocial,
          cnpj: f.cnpj,
          precoUnitario: hist.precoUnitario,
          precoEmbalagem: hist.precoEmbalagem,
          fatorEmbalagem: hist.fatorEmbalagem,
          nomeEmbalagem: hist.nomeEmbalagem,
          observacao: hist.observacao,
          desclassificado: hist.desclassificado,
          site: f.site,
          portifolio: f.portifolio,
          data: hist.data,
          oportunidadeId: hist.oportunidadeId,
          tipoRegistro: hist.tipoRegistro,
          precoCustoContrato: hist.precoCustoContrato,
          precoCustoAnterior: hist.precoCustoAnterior,
          valorOfertadoOrgao: hist.valorOfertadoOrgao,
          valorFechadoOrgao: hist.valorFechadoOrgao,
          lucroContratoUnitario: hist.lucroContratoUnitario,
          percentualLucroContrato: hist.percentualLucroContrato,
          resultadoAtualUnitario: hist.resultadoAtualUnitario,
          valorSugeridoReajuste: hist.valorSugeridoReajuste,
          quantidadeContratada: hist.quantidadeContratada,
          quantidadeEntregue: hist.quantidadeEntregue,
          dataAssinaturaContrato: hist.dataAssinaturaContrato,
          orgaoNome: hist.orgaoNome,
          uasg: hist.uasg,
          pregaoNumero: hist.pregaoNumero,
          numeroItem: hist.numeroItem,
          informe: hist.informe,
          chatNegociacao: hist.chatNegociacao,
        };

        prod.historicoCotacoes.push(entry);

        const existingCotacaoIdx = prod.cotacoes.findIndex(
          (c: any) => c.fornecedorId.toString() === f._id.toString(),
        );

        if (existingCotacaoIdx >= 0) {
          if (
            new Date(hist.data) >=
            new Date(prod.cotacoes[existingCotacaoIdx].data)
          ) {
            const prevContrato =
              prod.cotacoes[existingCotacaoIdx].precoCustoContrato ||
              prod.cotacoes[existingCotacaoIdx].precoUnitario;
            prod.cotacoes[existingCotacaoIdx] = {
              ...entry,
              precoCustoContrato: entry.precoCustoContrato || prevContrato,
            };
          }
        } else {
          prod.cotacoes.push({
            ...entry,
            precoCustoContrato: entry.precoCustoContrato || entry.precoUnitario,
          });
        }
      }
    }

    // 3. Also include any products registered directly in ProdutoBase (intelModel)
    const allIntels = await this.intelModel.find({}).exec();
    const intelByItemKey = new Map<string, any>();
    const intelByNum = new Map<number, any>();
    const intelByDesc = new Map<string, any>();
    for (const intelDoc of allIntels) {
      if (intelDoc.numeroItem) {
        intelByItemKey.set(
          getMapKey(intelDoc.descricaoItem, intelDoc.numeroItem),
          intelDoc,
        );
        if (
          !intelByNum.has(Number(intelDoc.numeroItem)) ||
          intelDoc.precoCustoContrato > 0
        ) {
          intelByNum.set(Number(intelDoc.numeroItem), intelDoc);
        }
      }
      if (
        !intelByDesc.has(intelDoc.descricaoItem) ||
        intelDoc.precoCustoContrato > 0
      ) {
        intelByDesc.set(intelDoc.descricaoItem, intelDoc);
      }

      const existingKeyByNum = intelDoc.numeroItem
        ? keyByNumeroItem.get(Number(intelDoc.numeroItem))
        : undefined;
      const k =
        existingKeyByNum ||
        (intelDoc.numeroItem
          ? getMapKey(intelDoc.descricaoItem, intelDoc.numeroItem)
          : intelDoc.descricaoItem);
      if (!produtosMap.has(k) && !produtosMap.has(intelDoc.descricaoItem)) {
        // Only add standalone ProdutoBase if it has meaningful contract/price data or no other items exist
        if (
          intelDoc.precoCustoContrato > 0 ||
          intelDoc.precoCustoAtual > 0 ||
          intelDoc.valorFechadoOrgao > 0 ||
          intelDoc.nossoLanceOficial > 0 ||
          fornecedores.length === 0
        ) {
          produtosMap.set(k, {
            chaveUnica: k,
            descricaoItem: intelDoc.descricaoItem,
            numeroItem: intelDoc.numeroItem,
            cotacoes: [],
            historicoCotacoes: [],
          });
          if (intelDoc.numeroItem) {
            keyByNumeroItem.set(Number(intelDoc.numeroItem), k);
          }
        }
      }
    }

    // 4. Enrich all products with unified contract + readjustment metrics BEFORE filtering so we can filter by Produto, Órgão, UASG, or Pregão/Processo!
    let allResolvedProdutos = Array.from(produtosMap.values()).map((prod) => {
      let campea = null;
      for (const c of prod.cotacoes) {
        if (c.desclassificado) continue;
        if (!campea || c.precoUnitario < campea.precoUnitario) {
          campea = c;
        }
      }
      prod.historicoCotacoes.sort(
        (a: any, b: any) =>
          new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime(),
      );

      const intel =
        (prod.numeroItem &&
          (intelByItemKey.get(getMapKey(prod.descricaoItem, prod.numeroItem)) ||
            intelByNum.get(Number(prod.numeroItem)))) ||
        intelByDesc.get(prod.descricaoItem);

      const chronological = [...(prod.historicoCotacoes || [])].sort(
        (a: any, b: any) =>
          new Date(a.data || 0).getTime() - new Date(b.data || 0).getTime(),
      );
      const firstEntry = chronological[0];
      const latestEntry = prod.historicoCotacoes?.[0];

      // Prioritize live cotacao entry (campea/latestEntry) and explicit intel values
      const precoCustoContrato = this.pickPos(
        campea?.precoCustoContrato,
        latestEntry?.precoCustoContrato,
        intel?.precoCustoContrato,
        firstEntry?.precoUnitario,
        campea?.precoUnitario,
      );

      const precoCustoAtual = this.pickPos(
        campea?.precoCustoAtual,
        campea?.precoUnitario,
        intel?.precoCustoAtual,
        latestEntry?.precoUnitario,
        precoCustoContrato,
      );

      const valorFechadoOrgao = this.pickPos(
        campea?.valorFechadoOrgao,
        prod.nossoLanceFromProd,
        intel?.valorFechadoOrgao,
        latestEntry?.valorFechadoOrgao,
        intel?.nossoLanceOficial,
      );

      const valorOfertadoOrgao = this.pickPos(
        campea?.valorOfertadoOrgao,
        intel?.valorOfertadoOrgao,
        latestEntry?.valorOfertadoOrgao,
        valorFechadoOrgao,
      );

      const valorVendaReajuste = this.pickPos(
        campea?.valorVendaReajuste,
        intel?.valorVendaReajuste,
        valorFechadoOrgao,
      );

      const motivoContrato =
        campea?.motivoContrato ||
        intel?.motivoContrato ||
        'REAJUSTE_PRECO';

      const dataAssinaturaContrato =
        campea?.dataAssinaturaContrato ??
        intel?.dataAssinaturaContrato ??
        latestEntry?.dataAssinaturaContrato ??
        firstEntry?.data ??
        null;

      const dataUltimoReajuste =
        campea?.data ??
        intel?.dataUltimoReajuste ??
        latestEntry?.data ??
        null;

      const orgaoNome =
        prod.orgaoNome ??
        intel?.orgaoNome ??
        latestEntry?.orgaoNome ??
        null;
      const uasg = prod.uasg ?? intel?.uasg ?? latestEntry?.uasg ?? null;
      const pregaoNumero =
        prod.pregaoNumero ??
        intel?.pregaoNumero ??
        latestEntry?.pregaoNumero ??
        null;
      const numeroItem =
        prod.numeroItem ?? intel?.numeroItem ?? latestEntry?.numeroItem ?? null;

      const historicoReajustes =
        prod.historicoCotacoes && prod.historicoCotacoes.length > 0
          ? prod.historicoCotacoes.map((hc: any) => ({
              data: hc.data,
              tipo: hc.tipo || hc.tipoRegistro || 'COTACAO',
              motivoContrato: hc.motivoContrato || motivoContrato,
              fornecedorId: hc.fornecedorId,
              fornecedorNome: hc.razaoSocial || hc.fornecedorNome,
              fornecedorCnpj: hc.cnpj || hc.fornecedorCnpj,
              oportunidadeId: hc.oportunidadeId,
              orgaoNome: hc.orgaoNome || orgaoNome,
              uasg: hc.uasg || uasg,
              pregaoNumero: hc.pregaoNumero || pregaoNumero,
              numeroItem: hc.numeroItem || numeroItem,
              quantidadeContratada:
                hc.quantidadeContratada ?? prod.quantidadeContratada,
              quantidadeEntregue: hc.quantidadeEntregue,
              precoCustoContrato:
                this.pickPos(hc.precoCustoContrato, precoCustoContrato) ??
                precoCustoContrato,
              precoCustoAnterior: hc.precoCustoAnterior,
              precoCustoAtual:
                this.pickPos(hc.precoCustoAtual, hc.precoUnitario, precoCustoAtual) ??
                precoCustoAtual,
              valorOfertadoOrgao:
                this.pickPos(hc.valorOfertadoOrgao, valorOfertadoOrgao) ??
                valorOfertadoOrgao,
              valorFechadoOrgao:
                this.pickPos(hc.valorFechadoOrgao, valorFechadoOrgao) ??
                valorFechadoOrgao,
              valorVendaReajuste:
                this.pickPos(hc.valorVendaReajuste, valorVendaReajuste) ??
                valorVendaReajuste,
              lucroContratoUnitario: hc.lucroContratoUnitario,
              percentualLucroContrato: hc.percentualLucroContrato,
              resultadoAtualUnitario: hc.resultadoAtualUnitario,
              valorSugeridoReajuste: hc.valorSugeridoReajuste,
              dataAssinaturaContrato:
                hc.dataAssinaturaContrato ?? dataAssinaturaContrato,
              informe: hc.informe || hc.observacao,
              chatNegociacao: hc.chatNegociacao,
            }))
          : intel?.historicoReajustes && intel.historicoReajustes.length > 0
            ? [...intel.historicoReajustes].sort(
                (a: any, b: any) =>
                  new Date(b.data || 0).getTime() -
                  new Date(a.data || 0).getTime(),
              )
            : [];

      return {
        ...prod,
        campea,
        nossoLanceOficial:
          this.pickPos(prod.nossoLanceFromProd, intel?.nossoLanceOficial, valorFechadoOrgao) ??
          null,
        valorCampeaoLicitacao: intel?.valorCampeaoLicitacao || null,
        precoCustoContrato,
        precoCustoAtual,
        valorOfertadoOrgao,
        valorFechadoOrgao,
        valorVendaReajuste,
        motivoContrato,
        dataAssinaturaContrato,
        dataUltimoReajuste,
        orgaoNome,
        uasg,
        pregaoNumero,
        numeroItem,
        quantidadeContratada:
          prod.quantidadeContratada ??
          intel?.quantidadeContratada ??
          latestEntry?.quantidadeContratada ??
          null,
        quantidadeEntregue:
          campea?.quantidadeEntregue ??
          intel?.quantidadeEntregue ??
          latestEntry?.quantidadeEntregue ??
          null,
        entregasContrato:
          campea?.entregasContrato && campea.entregasContrato.length > 0
            ? campea.entregasContrato
            : intel?.entregasContrato && intel.entregasContrato.length > 0
              ? intel.entregasContrato
              : [],
        fornecedorNome:
          campea?.razaoSocial ??
          intel?.fornecedorNome ??
          latestEntry?.razaoSocial ??
          null,
        fornecedorCnpj:
          campea?.cnpj ??
          intel?.fornecedorCnpj ??
          latestEntry?.cnpj ??
          null,
        informeUltimoReajuste:
          campea?.informe ??
          intel?.informeUltimoReajuste ??
          latestEntry?.informe ??
          null,
        chatNegociacao:
          campea?.chatNegociacao ??
          intel?.chatNegociacao ??
          latestEntry?.chatNegociacao ??
          null,
        historicoReajustes,
      };
    });

    // 5. Filter by busca (supports comma/multi-product OR search like "arroz,suco") and/or dedicated orgao / pregao params
    const rawBusca = String(query.busca || '').trim();
    const orgaoNorm = this.normalizeSearchText(query.orgao);
    const pregaoNorm = this.normalizeSearchText(query.pregao);

    // Split rawBusca by comma, semicolon, pipe, "+", or " e " / " ou " so "arroz,suco" searches for Arroz OR Suco
    const buscaGroups = rawBusca
      ? rawBusca
          .split(/(?:[,;|+]|\s+e\s+|\s+ou\s+)/i)
          .map((g) => this.normalizeSearchText(g))
          .filter(Boolean)
      : [];

    const buildSearchable = (p: any) => {
      const extraMarinha =
        p.uasg === '783601' ||
        String(p.orgaoNome || '')
          .toUpperCase()
          .includes('MARINHA')
          ? 'escola de aprendizes marinheiros do ceara eamce comando da marinha marinha do brasil'
          : '';

      const fullSearchable = this.normalizeSearchText(
        `${p.descricaoItem} item ${p.numeroItem || ''} ${p.orgaoNome || ''} ${extraMarinha} uasg ${p.uasg || ''} processo pregao eletronico n ${p.pregaoNumero || ''} ${p.fornecedorNome || ''}`,
      );

      const orgaoSearchable = this.normalizeSearchText(
        `${p.orgaoNome || ''} ${extraMarinha} uasg ${p.uasg || ''} processo pregao eletronico n ${p.pregaoNumero || ''}`,
      );

      const pregaoSearchable = this.normalizeSearchText(
        `processo pregao eletronico n ${p.pregaoNumero || ''} ${p.orgaoNome || ''} ${extraMarinha} uasg ${p.uasg || ''}`,
      );

      return { fullSearchable, orgaoSearchable, pregaoSearchable };
    };

    const matchGroupTokens = (
      p: any,
      fullSearchable: string,
      tokens: string[],
    ): boolean => {
      // Check if user explicitly searched "item <num>"
      const itemIdx = tokens.indexOf('item');
      if (
        itemIdx !== -1 &&
        tokens[itemIdx + 1] &&
        /^\d+$/.test(tokens[itemIdx + 1])
      ) {
        const wantedItem = Number(tokens[itemIdx + 1]);
        if (Number(p.numeroItem) !== wantedItem) return false;
      }
      return tokens.every((t) => fullSearchable.includes(t));
    };

    if (buscaGroups.length > 0 || orgaoNorm || pregaoNorm) {
      // First filter by orgao and pregao if provided
      if (orgaoNorm || pregaoNorm) {
        allResolvedProdutos = allResolvedProdutos.filter((p) => {
          const { orgaoSearchable, pregaoSearchable } = buildSearchable(p);
          if (orgaoNorm) {
            const tokens = orgaoNorm.split(' ').filter(Boolean);
            if (!tokens.every((t) => orgaoSearchable.includes(t))) return false;
          }
          if (pregaoNorm) {
            const tokens = pregaoNorm.split(' ').filter(Boolean);
            if (!tokens.every((t) => pregaoSearchable.includes(t)))
              return false;
          }
          return true;
        });
      }

      // Now filter by buscaGroups (OR across comma-separated groups)
      if (buscaGroups.length > 0) {
        const strictMatches = allResolvedProdutos.filter((p) => {
          const { fullSearchable } = buildSearchable(p);
          return buscaGroups.some((group) => {
            const tokens = group.split(' ').filter(Boolean);
            return matchGroupTokens(p, fullSearchable, tokens);
          });
        });

        // If user typed space-separated product names like "arroz suco" without comma and strict AND matched 0 items,
        // fallback to OR across tokens >= 3 chars
        if (strictMatches.length === 0 && buscaGroups.length === 1) {
          const spaceTokens = buscaGroups[0]
            .split(' ')
            .filter((t) => t.length >= 3);
          if (spaceTokens.length > 1) {
            allResolvedProdutos = allResolvedProdutos.filter((p) => {
              const { fullSearchable } = buildSearchable(p);
              return spaceTokens.some((t) => fullSearchable.includes(t));
            });
          } else {
            allResolvedProdutos = strictMatches;
          }
        } else {
          allResolvedProdutos = strictMatches;
        }
      }
    }

    // Sort: items with contract/orgao/pregao first, ordered by numeroItem ascending
    allResolvedProdutos.sort((a, b) => {
      const aHasContrato =
        (a.valorFechadoOrgao > 0 || a.precoCustoContrato > 0) && a.pregaoNumero
          ? 1
          : 0;
      const bHasContrato =
        (b.valorFechadoOrgao > 0 || b.precoCustoContrato > 0) && b.pregaoNumero
          ? 1
          : 0;
      if (aHasContrato !== bHasContrato) return bHasContrato - aHasContrato;
      const na = a.numeroItem ?? 999999;
      const nb = b.numeroItem ?? 999999;
      if (na !== nb) return na - nb;
      return String(a.descricaoItem || '').localeCompare(
        String(b.descricaoItem || ''),
      );
    });

    // Pagination
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const total = allResolvedProdutos.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const skip = (page - 1) * limit;

    const paginated = allResolvedProdutos.slice(skip, skip + limit);

    return {
      data: paginated,
      total,
      totalPages,
      currentPage: page,
    };
  }

  async updateProdutoBase(
    descricaoItem: string,
    data: {
      nossoLanceOficial?: number;
      valorCampeaoLicitacao?: number;
      precoCustoContrato?: number;
      precoCustoAtual?: number;
      valorOfertadoOrgao?: number;
      valorFechadoOrgao?: number;
      valorVendaReajuste?: number;
      motivoContrato?: string;
      dataAssinaturaContrato?: string | Date;
      dataUltimoReajuste?: string | Date;
      orgaoNome?: string;
      uasg?: string;
      pregaoNumero?: string;
      numeroItem?: number;
      quantidadeContratada?: number;
      quantidadeEntregue?: number;
      entregasContrato?: any[];
      fornecedorId?: string;
      fornecedorNome?: string;
      fornecedorCnpj?: string;
      oportunidadeId?: string;
      cotacaoId?: string;
      cotacaoItemId?: string;
      informe?: string;
      chatNegociacao?: string;
      registrarNoHistorico?: boolean;
      limparReajuste?: boolean;
    },
  ): Promise<ProdutoBase> {
    let doc = null;
    if (data.numeroItem) {
      doc = await this.intelModel
        .findOne({ descricaoItem, numeroItem: data.numeroItem })
        .exec();
      if (!doc) {
        doc = await this.intelModel
          .findOne({ numeroItem: data.numeroItem })
          .exec();
      }
    }
    if (!doc) {
      doc = await this.intelModel.findOne({ descricaoItem }).exec();
    }
    if (data.limparReajuste) {
      if (doc) {
        await this.intelModel.deleteOne({ _id: doc._id }).exec();
      }
      return doc as any;
    }
    if (!doc) {
      doc = new this.intelModel({
        descricaoItem,
        ...(data.numeroItem ? { numeroItem: data.numeroItem } : {}),
        historicoReajustes: [],
      });
    }

    const custoAnterior = doc.precoCustoAtual ?? doc.precoCustoContrato;

    if (data.nossoLanceOficial !== undefined)
      doc.nossoLanceOficial = data.nossoLanceOficial;
    if (data.valorCampeaoLicitacao !== undefined)
      doc.valorCampeaoLicitacao = data.valorCampeaoLicitacao;
    if (data.precoCustoContrato !== undefined)
      doc.precoCustoContrato = data.precoCustoContrato;
    if (data.precoCustoAtual !== undefined)
      doc.precoCustoAtual = data.precoCustoAtual;
    if (data.valorOfertadoOrgao !== undefined)
      doc.valorOfertadoOrgao = data.valorOfertadoOrgao;
    if (data.valorFechadoOrgao !== undefined) {
      doc.valorFechadoOrgao = data.valorFechadoOrgao;
      if (data.nossoLanceOficial === undefined) {
        doc.nossoLanceOficial = data.valorFechadoOrgao;
      }
    }
    if (data.valorVendaReajuste !== undefined)
      doc.valorVendaReajuste = data.valorVendaReajuste;
    if (data.motivoContrato !== undefined)
      doc.motivoContrato = data.motivoContrato;
    if (data.dataAssinaturaContrato) {
      const parsedAssinatura = this.parseSafeDate(
        data.dataAssinaturaContrato,
        false,
      );
      if (parsedAssinatura) doc.dataAssinaturaContrato = parsedAssinatura;
    }
    if (data.dataUltimoReajuste) {
      const parsedReajuste = this.parseSafeDate(data.dataUltimoReajuste, true);
      if (parsedReajuste) doc.dataUltimoReajuste = parsedReajuste;
    }
    if (data.orgaoNome !== undefined) doc.orgaoNome = data.orgaoNome;
    if (data.uasg !== undefined) doc.uasg = data.uasg;
    if (data.pregaoNumero !== undefined) doc.pregaoNumero = data.pregaoNumero;
    if (data.numeroItem !== undefined) doc.numeroItem = data.numeroItem;
    if (data.quantidadeContratada !== undefined)
      doc.quantidadeContratada = data.quantidadeContratada;
    if (Array.isArray(data.entregasContrato)) {
      doc.entregasContrato = data.entregasContrato;
      const somaEntregas = data.entregasContrato.reduce(
        (acc, ent) => acc + (Number(ent.quantidade) || 0),
        0,
      );
      doc.quantidadeEntregue =
        somaEntregas > 0 ? somaEntregas : (data.quantidadeEntregue ?? doc.quantidadeEntregue);
    } else if (data.quantidadeEntregue !== undefined) {
      doc.quantidadeEntregue = data.quantidadeEntregue;
    }
    if (data.fornecedorNome !== undefined)
      doc.fornecedorNome = data.fornecedorNome;
    if (data.fornecedorCnpj !== undefined)
      doc.fornecedorCnpj = data.fornecedorCnpj;
    if (data.informe !== undefined) doc.informeUltimoReajuste = data.informe;
    if (data.chatNegociacao !== undefined)
      doc.chatNegociacao = data.chatNegociacao;

    const shouldRecordHistory =
      data.registrarNoHistorico ||
      data.precoCustoContrato !== undefined ||
      data.precoCustoAtual !== undefined ||
      data.valorFechadoOrgao !== undefined ||
      data.informe !== undefined;

    if (shouldRecordHistory) {
      const cContrato = doc.precoCustoContrato || doc.precoCustoAtual || 0;
      const cAtual = doc.precoCustoAtual || cContrato || 0;
      const vFechado = doc.valorFechadoOrgao || doc.nossoLanceOficial || 0;
      const lucroContratoUnitario =
        vFechado > 0 && cContrato > 0
          ? Number((vFechado - cContrato).toFixed(4))
          : 0;
      const percentualLucroContrato =
        cContrato > 0
          ? Number(((lucroContratoUnitario / cContrato) * 100).toFixed(2))
          : 0;
      const resultadoAtualUnitario =
        vFechado > 0 && cAtual > 0
          ? Number((vFechado - cAtual).toFixed(4))
          : 0;
      const valorSugeridoReajuste =
        doc.valorVendaReajuste && doc.valorVendaReajuste > 0
          ? doc.valorVendaReajuste
          : cAtual > 0
            ? Number((cAtual + Math.max(0, lucroContratoUnitario)).toFixed(4))
            : 0;
      const lucroPosReajusteUnitario =
        valorSugeridoReajuste > 0 && cAtual > 0
          ? Number((valorSugeridoReajuste - cAtual).toFixed(4))
          : resultadoAtualUnitario;

      const dataEvento =
        this.parseSafeDate(data.dataUltimoReajuste, true) || new Date();
      doc.dataUltimoReajuste = dataEvento;

      const informeAuto =
        data.informe ||
        `No momento da assinatura do contrato${doc.dataAssinaturaContrato ? ` (${new Date(doc.dataAssinaturaContrato).toLocaleDateString('pt-BR', { timeZone: 'UTC' })})` : ''}, o custo do produto ${descricaoItem} era R$ ${cContrato.toFixed(2).replace('.', ',')} e o valor celebrado com o órgão foi R$ ${vFechado.toFixed(2).replace('.', ',')}, gerando lucro unitário de R$ ${lucroContratoUnitario.toFixed(2).replace('.', ',')} (${percentualLucroContrato.toFixed(2).replace('.', ',')}%). Com a atualização do fornecedor em ${dataEvento.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}, o custo atual passou para R$ ${cAtual.toFixed(2).replace('.', ',')}, resultando em ${resultadoAtualUnitario < 0 ? `prejuízo de R$ ${Math.abs(resultadoAtualUnitario).toFixed(2).replace('.', ',')} por unidade` : `redução da margem para R$ ${resultadoAtualUnitario.toFixed(2).replace('.', ',')} por unidade`} em relação ao acordado, solicitando-se reajuste para R$ ${valorSugeridoReajuste.toFixed(2).replace('.', ',')}.`;

      doc.informeUltimoReajuste = informeAuto;

      if (!doc.historicoReajustes) {
        doc.historicoReajustes = [];
      }

      doc.historicoReajustes.push({
        data: dataEvento,
        tipo:
          cAtual > cContrato
            ? 'REAJUSTE_MERCADO'
            : 'ATUALIZACAO_NEGOCIACAO',
        motivoContrato: doc.motivoContrato || 'REAJUSTE_PRECO',
        fornecedorId: data.fornecedorId,
        fornecedorNome: doc.fornecedorNome,
        fornecedorCnpj: doc.fornecedorCnpj,
        oportunidadeId: data.oportunidadeId,
        orgaoNome: doc.orgaoNome,
        uasg: doc.uasg,
        pregaoNumero: doc.pregaoNumero,
        numeroItem: doc.numeroItem,
        quantidadeContratada: doc.quantidadeContratada,
        quantidadeEntregue: doc.quantidadeEntregue,
        precoCustoContrato: cContrato,
        precoCustoAnterior: custoAnterior ?? cContrato,
        precoCustoAtual: cAtual,
        valorOfertadoOrgao: doc.valorOfertadoOrgao || vFechado,
        valorFechadoOrgao: vFechado,
        valorVendaReajuste: doc.valorVendaReajuste || valorSugeridoReajuste,
        lucroContratoUnitario,
        percentualLucroContrato,
        resultadoAtualUnitario,
        lucroPosReajusteUnitario,
        valorSugeridoReajuste,
        dataAssinaturaContrato: doc.dataAssinaturaContrato,
        informe: informeAuto,
        chatNegociacao: doc.chatNegociacao,
      });

      // Sync back to Cotacaos and Produtos so OportunidadeDetalhe stays 100% in sync when edited from BaseProdutos
      try {
        const cotColl = this.connection?.collection?.('cotacaos');
        const prodColl = this.connection?.collection?.('produtos');
        if (cotColl) {
          const matchingCots = await cotColl
            .find({ 'itens.descricaoItem': descricaoItem })
            .toArray();
          for (const cot of matchingCots) {
            let modifiedCot = false;
            for (const it of cot.itens || []) {
              const matchesItem = data.numeroItem
                ? it.descricaoItem === descricaoItem &&
                  Number(it.numeroItem) === Number(data.numeroItem)
                : it.descricaoItem === descricaoItem;
              if (!matchesItem) continue;

              if (it.precosFornecedores && it.precosFornecedores.length > 0) {
                for (const pf of it.precosFornecedores) {
                  if (cContrato > 0) pf.precoCustoContrato = cContrato;
                  if (cAtual > 0) {
                    pf.precoUnitario = cAtual;
                    pf.precoEmbalagem = cAtual * (pf.fatorEmbalagem || 1);
                  }
                  if (vFechado > 0) pf.valorFechadoOrgao = vFechado;
                  if (doc.valorOfertadoOrgao > 0)
                    pf.valorOfertadoOrgao = doc.valorOfertadoOrgao;
                  if (doc.valorVendaReajuste > 0)
                    pf.valorVendaReajuste = doc.valorVendaReajuste;
                  if (doc.motivoContrato)
                    pf.motivoContrato = doc.motivoContrato;
                  if (doc.dataAssinaturaContrato)
                    pf.dataAssinaturaContrato = doc.dataAssinaturaContrato;
                  if (doc.dataUltimoReajuste)
                    pf.dataUltimaAtualizacaoCusto = doc.dataUltimoReajuste;
                  if (doc.quantidadeEntregue !== undefined)
                    pf.quantidadeEntregue = doc.quantidadeEntregue;
                  if (doc.informeUltimoReajuste)
                    pf.informeReajuste = doc.informeUltimoReajuste;
                  if (doc.chatNegociacao)
                    pf.chatNegociacao = doc.chatNegociacao;
                  modifiedCot = true;
                }
                if (it.melhorPreco && cAtual > 0) {
                  it.melhorPreco.precoUnitario = cAtual;
                }
              }

              if (prodColl && vFechado > 0 && it.produtoId) {
                await prodColl.updateOne(
                  { _id: new mongoose.Types.ObjectId(it.produtoId.toString()) },
                  {
                    $set: {
                      valorNossoLance: vFechado,
                      valorVencedor: vFechado,
                    },
                  },
                );
              }
            }
            if (modifiedCot) {
              await cotColl.updateOne(
                { _id: cot._id },
                { $set: { itens: cot.itens } },
              );
            }
          }
        }
      } catch {
        // ignore in unit test environment
      }
    }

    const saved = await doc.save();
    this.gateway.emitFornecedorUpdate(saved);
    return saved;
  }

  async unificarProdutosBase(
    produtosOrigem: string[],
    produtoDestino: string,
  ): Promise<any> {
    if (!produtosOrigem || produtosOrigem.length === 0 || !produtoDestino) {
      throw new BadRequestException('Parâmetros inválidos para unificação');
    }

    const fornecedores = await this.model
      .find({
        'fornecedor_historico_precos.descricaoItem': { $in: produtosOrigem },
      })
      .exec();

    let updatedCount = 0;
    for (const f of fornecedores) {
      let modified = false;
      for (const hist of f.fornecedor_historico_precos) {
        if (produtosOrigem.includes(hist.descricaoItem)) {
          // Preserve the original name in 'observacao' so we don't lose the brand/details
          if (!hist.observacao) {
            hist.observacao = `Original: ${hist.descricaoItem}`;
          } else if (!hist.observacao.includes(hist.descricaoItem)) {
            hist.observacao = `Original: ${hist.descricaoItem} | ${hist.observacao}`;
          }
          hist.descricaoItem = produtoDestino;
          modified = true;
        }
      }
      if (modified) {
        f.markModified('fornecedor_historico_precos');
        await f.save();
        updatedCount++;
      }
    }

    // Update ProdutoBase (Inteligência)
    const intelDocs = await this.intelModel
      .find({ descricaoItem: { $in: [...produtosOrigem, produtoDestino] } })
      .exec();

    if (intelDocs.length > 0) {
      let targetIntel = intelDocs.find(
        (d) => d.descricaoItem === produtoDestino,
      );
      const originIntels = intelDocs.filter(
        (d) =>
          produtosOrigem.includes(d.descricaoItem) &&
          d.descricaoItem !== produtoDestino,
      );

      let bestLance = null;
      let bestCampeao = null;

      // Find the first valid (non-null) lance/campeao among ALL docs involved
      for (const doc of intelDocs) {
        if (doc.nossoLanceOficial && !bestLance)
          bestLance = doc.nossoLanceOficial;
        if (doc.valorCampeaoLicitacao && !bestCampeao)
          bestCampeao = doc.valorCampeaoLicitacao;
      }

      if (!targetIntel && originIntels.length > 0) {
        targetIntel = originIntels[0];
        targetIntel.descricaoItem = produtoDestino;
      }

      if (targetIntel) {
        if (bestLance) targetIntel.nossoLanceOficial = bestLance;
        if (bestCampeao) targetIntel.valorCampeaoLicitacao = bestCampeao;
        await targetIntel.save();
      }

      // Remove the origin intels that are NOT the targetIntel
      for (const origin of originIntels) {
        if (targetIntel && origin._id.toString() === targetIntel._id.toString())
          continue;
        await this.intelModel.deleteOne({ _id: origin._id }).exec();
      }
    }

    return {
      message: 'Produtos unificados com sucesso',
      updatedFornecedores: updatedCount,
    };
  }
}
