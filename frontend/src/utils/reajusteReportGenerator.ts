export interface ReajusteHistoricoItem {
  data?: string | Date;
  tipo?: string;
  motivoContrato?: string;
  fornecedorNome?: string;
  fornecedorCnpj?: string;
  orgaoNome?: string;
  uasg?: string;
  pregaoNumero?: string;
  numeroItem?: number;
  quantidadeContratada?: number;
  quantidadeEntregue?: number;
  precoCustoContrato?: number;
  precoCustoAnterior?: number;
  precoCustoAtual?: number;
  valorOfertadoOrgao?: number;
  valorFechadoOrgao?: number;
  valorVendaReajuste?: number;
  lucroContratoUnitario?: number;
  percentualLucroContrato?: number;
  resultadoAtualUnitario?: number;
  lucroPosReajusteUnitario?: number;
  valorSugeridoReajuste?: number;
  dataAssinaturaContrato?: string | Date;
  informe?: string;
  chatNegociacao?: string;
}

export interface EntregaContratoItem {
  dataEntrega?: string;
  comandoDestino?: string;
  notaEmpenho?: string;
  notaFiscal?: string;
  quantidade: number;
  regimeEntrega?: 'NORMAL_ASSINATURA' | 'CUSTO_SUPERIOR_VENDIDO_PRECO_ANTIGO' | string;
  custoCompraUnitario?: number;
  valorFaturadoUnitario?: number;
  observacao?: string;
}

export interface ProdutoRelatorioReajuste {
  descricaoItem: string;
  numeroItem?: number;
  fornecedorNome?: string;
  fornecedorCnpj?: string;
  orgaoNome?: string;
  uasg?: string;
  pregaoNumero?: string;
  dataAssinaturaContrato?: string | Date;
  dataUltimoReajuste?: string | Date;
  precoCustoContrato: number;
  valorOfertadoOrgao?: number;
  valorFechadoOrgao: number;
  valorVendaReajuste?: number;
  motivoContrato?: string;
  precoCustoAtual: number;
  quantidadeContratada?: number;
  quantidadeEntregue?: number;
  entregasContrato?: EntregaContratoItem[];
  informeUltimoReajuste?: string;
  chatNegociacao?: string;
  historicoReajustes?: ReajusteHistoricoItem[];
}

export function fmtMoney(val: number | undefined | null, decimals = 2): string {
  if (val === undefined || val === null || isNaN(Number(val))) return 'R$ 0,00';
  return `R$ ${Number(val).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: Math.max(decimals, 4),
  })}`;
}

export function fmtDate(d: string | Date | undefined | null): string {
  if (!d) return new Date().toLocaleDateString('pt-BR');
  if (typeof d === 'string') {
    const trimmed = d.trim();
    // Match YYYY-MM-DD directly to avoid UTC-3 previous-day shift
    const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (ymdMatch) {
      return `${ymdMatch[3]}/${ymdMatch[2]}/${ymdMatch[1]}`;
    }
    if (trimmed.endsWith('T00:00:00.000Z') || trimmed.endsWith('T00:00:00Z')) {
      const parsedUtc = new Date(trimmed);
      if (!isNaN(parsedUtc.getTime())) {
        return parsedUtc.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
      }
    }
  }
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return String(d);
  if (
    parsed.getUTCHours() === 0 &&
    parsed.getUTCMinutes() === 0 &&
    parsed.getUTCSeconds() === 0
  ) {
    return parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }
  return parsed.toLocaleDateString('pt-BR');
}

export function calcularMetricasReajuste(p: ProdutoRelatorioReajuste) {
  const custoContrato = Number(p.precoCustoContrato || 0);
  const valorFechado = Number(p.valorFechadoOrgao || 0);
  const custoAtual = Number(
    p.precoCustoAtual !== undefined && p.precoCustoAtual !== null && Number(p.precoCustoAtual) > 0
      ? p.precoCustoAtual
      : custoContrato || 0,
  );
  const valorOfertado = Number(p.valorOfertadoOrgao || valorFechado || 0);

  // 1. NA ASSINATURA DO CONTRATO
  const lucroContratoUnit = valorFechado - custoContrato;
  const percentualMarkupContrato =
    custoContrato > 0 ? (lucroContratoUnit / custoContrato) * 100 : 0;
  const percentualMargemVendaContrato =
    valorFechado > 0 ? (lucroContratoUnit / valorFechado) * 100 : 0;

  // 2. APÓS ASSINATURA DO CONTRATO (NOVA COTAÇÃO / REAJUSTE)
  const resultadoAtualUnit = valorFechado - custoAtual;
  const temPrejuizoDireto = resultadoAtualUnit < 0;
  const prejuizoUnitario = temPrejuizoDireto ? Math.abs(resultadoAtualUnit) : 0;
  const aumentoCustoUnit = custoAtual - custoContrato;
  const percentualAumentoCusto =
    custoContrato > 0 ? (aumentoCustoUnit / custoContrato) * 100 : 0;
  const fereAcordo = custoAtual > custoContrato || temPrejuizoDireto;

  // Valores de referência p/ recompor a margem da assinatura
  const valorReajusteLucroFixo = custoAtual + Math.max(0, lucroContratoUnit);
  const valorReajustePercentual =
    custoContrato > 0 && percentualMarkupContrato > 0
      ? custoAtual * (1 + percentualMarkupContrato / 100)
      : valorReajusteLucroFixo;

  // Nova proposta de venda ajustada informada pelo usuário (ou valor fechado se mantido para demonstrar inviabilidade)
  const valorVendaPosReajuste =
    p.valorVendaReajuste && Number(p.valorVendaReajuste) > 0
      ? Number(p.valorVendaReajuste)
      : valorFechado;
  const lucroPosReajusteUnit = valorVendaPosReajuste - custoAtual;

  // Verifica se a Nova Proposta de Venda já foi ajustada acima do preço antigo e recompôs o lucro (eliminando o prejuízo)
  const temPrejuizoPosReajuste = lucroPosReajusteUnit < 0;
  const reajusteRecomposMargem =
    valorVendaPosReajuste > valorFechado &&
    lucroPosReajusteUnit > 0 &&
    (lucroContratoUnit <= 0 || lucroPosReajusteUnit >= lucroContratoUnit * 0.4);

  // Detecta inviabilidade operacional na proposta atual (ex: Arroz onde mantendo a venda de R$ 3,75 o lucro cai de R$ 0,50 para R$ 0,08 ou dá prejuízo, mas se já ajustou para R$ 4,68 com R$ 0,83 de lucro, a nova proposta já é viável!)
  const ficaInviavelOperacional =
    !reajusteRecomposMargem &&
    (p.motivoContrato === 'INVIABILIDADE_OPERACIONAL' ||
      (lucroContratoUnit > 0 &&
        custoAtual > custoContrato &&
        lucroPosReajusteUnit >= 0 &&
        lucroPosReajusteUnit <= lucroContratoUnit * 0.4));

  // Detecta se mantendo o preço antigo da assinatura haveria inviabilidade ou prejuízo (motivo do reajuste)
  const ficaInviavelSemReajuste =
    temPrejuizoDireto ||
    (lucroContratoUnit > 0 &&
      custoAtual > custoContrato &&
      resultadoAtualUnit <= lucroContratoUnit * 0.4);

  const dataAssinaturaStr = fmtDate(p.dataAssinaturaContrato);
  const dataAtualizacaoStr = fmtDate(p.dataUltimoReajuste);
  const orgaoLabel =
    p.orgaoNome ||
    'COMANDO DA MARINHA — ESCOLA DE APRENDIZES MARINHEIROS DO CEARÁ (EAMCE)';
  const uasgLabel = p.uasg || '783601';
  const pregaoLabel =
    p.pregaoNumero || 'Pregão Eletrônico Nº 51/2027';

  const itemPrefix = p.numeroItem ? `Item ${p.numeroItem} — ` : '';

  let justificativaFinalidade = '';
  if (p.motivoContrato === 'DESCONTINUIDADE_PRODUTO') {
    justificativaFinalidade =
      `Trata-se de contrato com vigência em exercício (12 meses) em que o produto inicialmente negociado deixou de ser fabricado ou houve desistência/falência da empresa fabricante/fornecedora, tornando indispensável a atualização contratual para continuidade do fornecimento.`;
  } else if (reajusteRecomposMargem) {
    justificativaFinalidade =
      `Se mantivéssemos o preço antigo da assinatura (${fmtMoney(valorFechado)}) frente ao novo custo (${fmtMoney(custoAtual)}), teríamos ${temPrejuizoDireto ? `PREJUÍZO DIRETO de ${fmtMoney(prejuizoUnitario)}/un.` : `queda do lucro de ${fmtMoney(lucroContratoUnit)} para apenas ${fmtMoney(resultadoAtualUnit)}/un.`} Com a NOVA PROPOSTA DE VENDA AJUSTADA (${fmtMoney(valorVendaPosReajuste)}), NÃO HÁ PREJUÍZO: o prejuízo é eliminado e a operação passa a ter NOVO LUCRO POSITIVO de ${fmtMoney(lucroPosReajusteUnit)} por unidade.`;
  } else if (ficaInviavelOperacional) {
    justificativaFinalidade =
      `A projeção teve os seguintes ajustes: neste item fica inviável manter o preço antigo (${fmtMoney(valorFechado)}) frente ao novo custo (${fmtMoney(custoAtual)}), pois saímos do patamar de ${fmtMoney(lucroContratoUnit)} de lucro na assinatura para ${resultadoAtualUnit < 0 ? `prejuízo de ${fmtMoney(Math.abs(resultadoAtualUnit))}` : `apenas ${fmtMoney(resultadoAtualUnit)}`} por unidade, valor insuficiente para cobrir os custos operacionais de logística e pessoal (preço mínimo necessário para recompor o lucro da assinatura: ${fmtMoney(valorReajusteLucroFixo)}).`;
  } else if (temPrejuizoDireto) {
    justificativaFinalidade =
      `Mantendo o preço antigo do 1º contrato (${fmtMoney(valorFechado)}) frente ao novo custo (${fmtMoney(custoAtual)}), gera-se prejuízo direto de ${fmtMoney(prejuizoUnitario)} por unidade. Solicita-se o reajuste do preço de venda para no mínimo ${fmtMoney(valorReajusteLucroFixo)} (mantendo o lucro original de ${fmtMoney(lucroContratoUnit)}/un.).`;
  } else {
    justificativaFinalidade =
      `Por se tratar de produto vinculado a contrato com vigência em exercício (12 meses) que sofreu reajuste de custo após a assinatura (${fmtMoney(custoContrato)} para ${fmtMoney(custoAtual)}), mantendo o preço antigo (${fmtMoney(valorFechado)}) o resultado cairia para ${fmtMoney(resultadoAtualUnit)}/un.; com a nova proposta de venda ajustada de ${fmtMoney(valorVendaPosReajuste)}, o novo lucro unitário passa a ser ${fmtMoney(lucroPosReajusteUnit)}/un.`;
  }

  const textoExplicativo =
    `1º CONTRATO (NA ASSINATURA - ${dataAssinaturaStr}): ${itemPrefix}${p.descricaoItem} — ` +
    `custo ${fmtMoney(custoContrato)} | preço de venda: ${fmtMoney(valorFechado)} | lucro: ${fmtMoney(lucroContratoUnit)}/un. ` +
    `SE MANTIVESSE O PREÇO ANTIGO SEM REAJUSTE: custo ${fmtMoney(custoAtual)} | venda antiga: ${fmtMoney(valorFechado)} | resultado sem reajuste: ${resultadoAtualUnit < 0 ? `PREJUÍZO de ${fmtMoney(Math.abs(resultadoAtualUnit))}/un.` : `lucro reduzido de ${fmtMoney(resultadoAtualUnit)}/un.`} ` +
    `APÓS O REAJUSTE (NOVA PROPOSTA - ${dataAtualizacaoStr}): ` +
    `novo custo ${fmtMoney(custoAtual)} | novo preço de venda: ${fmtMoney(valorVendaPosReajuste)} | novo lucro: ${fmtMoney(lucroPosReajusteUnit)}/un. (${lucroPosReajusteUnit >= 0 ? 'SEM PREJUÍZO' : 'COM PREJUÍZO'}). ` +
    `${justificativaFinalidade}`;

  return {
    custoContrato,
    valorOfertado,
    valorFechado,
    custoAtual,
    valorVendaPosReajuste,
    lucroPosReajusteUnit,
    temPrejuizoPosReajuste,
    reajusteRecomposMargem,
    ficaInviavelOperacional,
    ficaInviavelSemReajuste,
    lucroContratoUnit,
    percentualMarkupContrato,
    percentualMargemVendaContrato,
    resultadoAtualUnit,
    temPrejuizoDireto,
    prejuizoUnitario,
    aumentoCustoUnit,
    percentualAumentoCusto,
    fereAcordo,
    valorReajusteLucroFixo,
    valorReajustePercentual,
    dataAssinaturaStr,
    dataAtualizacaoStr,
    orgaoLabel,
    uasgLabel,
    pregaoLabel,
    justificativaFinalidade,
    textoExplicativo,
  };
}

/**
 * Garante que a lista do relatório contenha apenas itens únicos (sem duplicidade por numeroItem ou descrição)
 * e priorize os itens selecionados/homologados com contrato assinado, ordenados por numeroItem crescente.
 */
function prepararListaUnicaContratada(
  produtos: ProdutoRelatorioReajuste[],
): ProdutoRelatorioReajuste[] {
  if (!produtos || produtos.length === 0) return [];

  // Se houver mais de 1 item e algum possuir vínculo de contrato assinado (valor fechado no órgão > 0),
  // filtramos apenas os itens em que fomos selecionados/contratados
  const itensComContrato = produtos.filter(
    (p) =>
      Number(p.valorFechadoOrgao || 0) > 0 ||
      Number(p.valorVendaReajuste || 0) > 0 ||
      (Array.isArray(p.entregasContrato) && p.entregasContrato.length > 0),
  );
  const baseLista = itensComContrato.length > 0 ? itensComContrato : produtos;

  const mapaUnico = new Map<string, ProdutoRelatorioReajuste>();

  for (const p of baseLista) {
    const num = Number(p.numeroItem || 0);
    const chave =
      num > 0
        ? `ITEM_${num}`
        : `DESC_${(p.descricaoItem || '').trim().toUpperCase()}`;

    const existente = mapaUnico.get(chave);
    if (!existente) {
      mapaUnico.set(chave, { ...p });
    } else {
      // Mescla priorizando o registro mais completo (com entregas, histórico e valores de contrato)
      const entregasExist = Array.isArray(existente.entregasContrato)
        ? existente.entregasContrato
        : [];
      const entregasNovo = Array.isArray(p.entregasContrato)
        ? p.entregasContrato
        : [];
      const histExist = Array.isArray(existente.historicoReajustes)
        ? existente.historicoReajustes
        : [];
      const histNovo = Array.isArray(p.historicoReajustes)
        ? p.historicoReajustes
        : [];

      mapaUnico.set(chave, {
        ...existente,
        ...p,
        numeroItem: existente.numeroItem || p.numeroItem,
        descricaoItem:
          (existente.descricaoItem || '').length >= (p.descricaoItem || '').length
            ? existente.descricaoItem
            : p.descricaoItem,
        precoCustoContrato:
          Number(p.precoCustoContrato || 0) > 0
            ? p.precoCustoContrato
            : existente.precoCustoContrato,
        valorFechadoOrgao:
          Number(p.valorFechadoOrgao || 0) > 0
            ? p.valorFechadoOrgao
            : existente.valorFechadoOrgao,
        valorVendaReajuste:
          Number(p.valorVendaReajuste || 0) > 0
            ? p.valorVendaReajuste
            : existente.valorVendaReajuste,
        precoCustoAtual:
          Number(p.precoCustoAtual || 0) > 0
            ? p.precoCustoAtual
            : existente.precoCustoAtual,
        entregasContrato:
          entregasNovo.length >= entregasExist.length ? entregasNovo : entregasExist,
        historicoReajustes:
          histNovo.length >= histExist.length ? histNovo : histExist,
      });
    }
  }

  return Array.from(mapaUnico.values()).sort((a, b) => {
    const na = a.numeroItem ?? 999999;
    const nb = b.numeroItem ?? 999999;
    if (na !== nb) return na - nb;
    return (a.descricaoItem || '').localeCompare(b.descricaoItem || '');
  });
}

export function exportarRelatorioReajusteXLS(
  produtos: ProdutoRelatorioReajuste[],
  nomeArquivo?: string,
) {
  if (!produtos || produtos.length === 0) return;

  // Deduplica por numeroItem e ordena crescente para exibir somente os itens contratados sem repetição
  const listaOrdenada = prepararListaUnicaContratada(produtos);
  if (listaOrdenada.length === 0) return;

  const primeiro = listaOrdenada[0];
  const m0 = calcularMetricasReajuste(primeiro);

  const rowsHtml = listaOrdenada
    .map((p, idx) => {
      const m = calcularMetricasReajuste(p);
      const isInviavelOuPrejuizo =
        m.temPrejuizoPosReajuste || m.ficaInviavelOperacional;

      const bgPosReajuste = isInviavelOuPrejuizo ? '#fef2f2' : '#eff6ff';
      const corLucroNovo = isInviavelOuPrejuizo ? '#b91c1c' : '#15803d';

      const motivoLabel =
        p.motivoContrato === 'DESCONTINUIDADE_PRODUTO'
          ? 'PRODUTO DESCONTINUADO / FALÊNCIA OU DESISTÊNCIA DO FABRICANTE'
          : m.reajusteRecomposMargem
            ? `REAJUSTE COM LUCRO RECOMPOSTO: Sem reajuste daria ${m.temPrejuizoDireto ? `prejuízo de ${fmtMoney(m.prejuizoUnitario)}/un.` : `lucro de apenas ${fmtMoney(m.resultadoAtualUnit)}/un.`} | Com a Nova Venda (${fmtMoney(m.valorVendaPosReajuste)}), NÃO HÁ PREJUÍZO (Novo Lucro: ${fmtMoney(m.lucroPosReajusteUnit)}/un.)`
            : m.ficaInviavelOperacional
              ? `INVIÁVEL OPERACIONALMENTE (Lucro caiu de ${fmtMoney(m.lucroContratoUnit)} p/ ${fmtMoney(m.lucroPosReajusteUnit)} — não cobre logística e pessoal)`
              : m.temPrejuizoDireto
                ? `PREJUÍZO DIRETO DE ${fmtMoney(m.prejuizoUnitario)}/un. SE MANTIVER PREÇO ANTIGO (${fmtMoney(m.valorFechado)}) — Reajuste necessário`
                : `REAJUSTE DE PREÇO APÓS ASSINATURA (+${fmtMoney(m.aumentoCustoUnit)}/un. no custo)`;

      const parecerDireto = m.justificativaFinalidade;

      const altasDistintas: ReajusteHistoricoItem[] = [];
      for (const h of p.historicoReajustes || []) {
        const cAt = Number(h.precoCustoAtual || 0);
        const vReaj = Number(h.valorVendaReajuste || h.valorFechadoOrgao || m.valorFechado || 0);
        if (cAt <= 0) continue;
        // Ignora o registro inicial que corresponde exatamente ao valor negociado na assinatura do contrato
        const isValorAssinatura =
          h.tipo === 'COTACAO_INICIAL' ||
          (Math.abs(cAt - m.custoContrato) < 0.0001 && Math.abs(vReaj - m.valorFechado) < 0.0001);
        if (isValorAssinatura) continue;

        const ult = altasDistintas[altasDistintas.length - 1];
        if (
          ult &&
          Math.abs(Number(ult.precoCustoAtual || 0) - cAt) < 0.0001 &&
          Math.abs(Number(ult.valorVendaReajuste || ult.valorFechadoOrgao || m.valorFechado || 0) - vReaj) < 0.0001
        ) {
          altasDistintas[altasDistintas.length - 1] = h;
        } else {
          altasDistintas.push(h);
        }
      }

      const historicoAltasHtml =
        altasDistintas.length > 0
          ? `<br/><div style="margin-top:6px; padding-top:4px; border-top:1px dashed #cbd5e1; font-size:10.5px; color:#334155;">` +
            `<strong>Reajustes Pós-Assinatura (${altasDistintas.length} ajuste${altasDistintas.length > 1 ? 's' : ''}):</strong><br/>` +
            altasDistintas
              .map((h, iAlta) => {
                const cAt = Number(h.precoCustoAtual || 0);
                const vVenda = Number(h.valorVendaReajuste || h.valorFechadoOrgao || m.valorFechado || 0);
                return `• ${iAlta + 1}º Ajuste (${fmtDate(h.data)}): Custo ${fmtMoney(cAt)} | Venda ${fmtMoney(vVenda)} | Lucro ${fmtMoney(vVenda - cAt)}`;
              })
              .join('<br/>') +
            `</div>`
          : '';

      const entregas = Array.isArray(p.entregasContrato) ? p.entregasContrato : [];
      const totalEntregueNFs = entregas.reduce((acc, e) => acc + (Number(e.quantidade) || 0), 0);
      const totalCompensarCusto = entregas.reduce((acc, e) => {
        if (e.regimeEntrega !== 'CUSTO_SUPERIOR_VENDIDO_PRECO_ANTIGO') return acc;
        const cCompra = Number(e.custoCompraUnitario || m.custoAtual || 0);
        const diffCusto = Math.max(0, cCompra - m.custoContrato);
        return acc + diffCusto * (Number(e.quantidade) || 0);
      }, 0);
      const totalCompensarReajuste = entregas.reduce((acc, e) => {
        if (e.regimeEntrega !== 'CUSTO_SUPERIOR_VENDIDO_PRECO_ANTIGO') return acc;
        const vFat = Number(e.valorFaturadoUnitario || m.valorFechado || 0);
        const diffVenda = Math.max(0, m.valorVendaPosReajuste - vFat);
        return acc + diffVenda * (Number(e.quantidade) || 0);
      }, 0);

      const entregasHtml =
        entregas.length > 0
          ? `<br/><div style="margin-top:6px; padding-top:4px; border-top:1px dashed #94a3b8; font-size:10.5px; color:#0f172a;">` +
            `<strong>🚚 Entregas Fracionadas Realizadas (${totalEntregueNFs.toLocaleString('pt-BR')} un. entregues):</strong><br/>` +
            entregas
              .map((e) => {
                const isDefasada = e.regimeEntrega === 'CUSTO_SUPERIOR_VENDIDO_PRECO_ANTIGO';
                const cCompra = Number(e.custoCompraUnitario || (isDefasada ? m.custoAtual : m.custoContrato));
                const vFat = Number(e.valorFaturadoUnitario || m.valorFechado);
                const compCusto = isDefasada ? Math.max(0, cCompra - m.custoContrato) * (Number(e.quantidade) || 0) : 0;
                return (
                  `• <strong>${e.comandoDestino || 'Comando/OM'}</strong> — NF: <strong>${e.notaFiscal || '-'}</strong>${e.notaEmpenho ? ` (NE: ${e.notaEmpenho})` : ''} — Data: ${fmtDate(e.dataEntrega)} — Qtd: <strong>${Number(e.quantidade || 0).toLocaleString('pt-BR')} un.</strong> — ` +
                  (isDefasada
                    ? `<span style="color:#b91c1c; font-weight:bold;">[A COMPENSAR: Faturado a ${fmtMoney(vFat)} c/ Custo Superior de ${fmtMoney(cCompra)} → Defasagem absorvida: ${fmtMoney(compCusto)}]</span>`
                    : `<span style="color:#15803d;">[Normal 1º Contrato: Custo ${fmtMoney(cCompra)} | Venda ${fmtMoney(vFat)}]</span>`)
                );
              })
              .join('<br/>') +
            (totalCompensarCusto > 0 || totalCompensarReajuste > 0
              ? `<br/><strong style="color:#b91c1c;">💰 Total a Compensar nas NFs entregues antes do reajuste: ${fmtMoney(totalCompensarCusto)} (diferença de custo absorvida)${totalCompensarReajuste > 0 ? ` | ${fmtMoney(totalCompensarReajuste)} (diferença p/ novo preço reajustado)` : ''}</strong>`
              : '') +
            `</div>`
          : '';

      return `
        <tr>
          <td style="border:1px solid #94a3b8; padding:10px; text-align:center; font-weight:bold; vertical-align:middle;">
            ${p.numeroItem ? `Item ${p.numeroItem}` : idx + 1}
          </td>
          <td style="border:1px solid #94a3b8; padding:10px; font-weight:bold; vertical-align:middle;">
            ${p.descricaoItem}
            ${p.fornecedorNome ? `<br/><span style="font-weight:normal; font-size:11px; color:#475569;">Fornecedor: ${p.fornecedorNome}</span>` : ''}
          </td>

          <!-- 1. NA ASSINATURA DE CONTRATO -->
          <td style="border:1px solid #94a3b8; padding:10px; text-align:center; background:#f0fdf4; vertical-align:middle;">
            ${m.dataAssinaturaStr}
          </td>
          <td style="border:1px solid #94a3b8; padding:10px; text-align:right; background:#f0fdf4; font-weight:bold; color:#166534; vertical-align:middle;">
            ${fmtMoney(m.custoContrato)}
          </td>
          <td style="border:1px solid #94a3b8; padding:10px; text-align:right; background:#f0fdf4; font-weight:bold; color:#15803d; vertical-align:middle;">
            ${fmtMoney(m.valorFechado)}
          </td>
          <td style="border:1px solid #94a3b8; padding:10px; text-align:right; background:#dcfce7; font-weight:bold; color:#166534; vertical-align:middle;">
            ${fmtMoney(m.lucroContratoUnit)}
          </td>

          <!-- 2. APÓS ASSINATURA DE CONTRATO (REAJUSTE / NOVOS VALORES) -->
          <td style="border:1px solid #94a3b8; padding:10px; text-align:center; background:${bgPosReajuste}; vertical-align:middle;">
            ${m.dataAtualizacaoStr}
          </td>
          <td style="border:1px solid #94a3b8; padding:10px; text-align:right; background:${bgPosReajuste}; font-weight:bold; color:#b91c1c; vertical-align:middle;">
            ${fmtMoney(m.custoAtual)}
          </td>
          <td style="border:1px solid #94a3b8; padding:10px; text-align:right; background:${bgPosReajuste}; font-weight:bold; color:#1e3a8a; vertical-align:middle;">
            ${fmtMoney(m.valorVendaPosReajuste)}
          </td>
          <td style="border:1px solid #94a3b8; padding:10px; text-align:right; background:${bgPosReajuste}; font-weight:bold; color:${corLucroNovo}; vertical-align:middle;">
            ${fmtMoney(m.lucroPosReajusteUnit)}
          </td>

          <!-- 3. EXPLICAÇÃO DIRETA PARA O ÓRGÃO -->
          <td style="border:1px solid #94a3b8; padding:10px; font-size:11.5px; line-height:1.45; vertical-align:middle;">
            <strong style="color:${isInviavelOuPrejuizo ? '#991b1b' : '#1e3a8a'};">${motivoLabel}</strong><br/>
            ${parecerDireto}
            ${historicoAltasHtml}
            ${entregasHtml}
          </td>
        </tr>
      `;
    })
    .join('');

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Demonstrativo de Reajuste</x:Name>
              <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
    </head>
    <body style="font-family: Arial, sans-serif; font-size: 12px; color: #0f172a;">
      <table style="border-collapse: collapse; width: 100%; margin-bottom: 16px;">
        <tr>
          <td colspan="11" style="background: #0f172a; color: #ffffff; font-size: 15px; font-weight: bold; padding: 12px; text-align: center;">
            QUADRO DEMONSTRATIVO DE REAJUSTE / REVISÃO DE PREÇOS — CONTRATO EM EXERCÍCIO (VIGÊNCIA 12 MESES)
          </td>
        </tr>
        <tr>
          <td colspan="11" style="background: #f8fafc; padding: 10px; border: 1px solid #94a3b8; font-size: 12px; line-height: 1.5;">
            <strong>Órgão Contratante:</strong> ${m0.orgaoLabel} (UASG: ${m0.uasgLabel})<br/>
            <strong>Processo / Licitação:</strong> ${m0.pregaoLabel}<br/>
            <strong>Empresa Contratada:</strong> GRUPO IRMÃOS NASCIMENTO COMÉRCIO E SERVIÇOS DE ALIMENTAÇÃO LTDA — <strong>CNPJ:</strong> 48.262.939/0001-50<br/>
            <strong>Finalidade do Demonstrativo:</strong> Demonstrar de forma direta os valores negociados na assinatura do contrato e os novos valores de cotação e proposta de venda ajustada após reajuste sofrido durante a vigência contratual (Lei nº 14.133/2021).
          </td>
        </tr>
      </table>

      <table style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr>
            <th colspan="2" style="background: #1e293b; color: #ffffff; border: 1px solid #94a3b8; padding: 8px; text-align: center; font-size: 12px;">
              IDENTIFICAÇÃO DO ITEM
            </th>
            <th colspan="4" style="background: #166534; color: #ffffff; border: 1px solid #94a3b8; padding: 8px; text-align: center; font-size: 12px;">
              1. NA ASSINATURA DE CONTRATO (VALORES ACORDADOS)
            </th>
            <th colspan="4" style="background: #991b1b; color: #ffffff; border: 1px solid #94a3b8; padding: 8px; text-align: center; font-size: 12px;">
              2. APÓS ASSINATURA DE CONTRATO — REAJUSTE (NOVOS VALORES)
            </th>
            <th rowspan="2" style="background: #1e3a8a; color: #ffffff; border: 1px solid #94a3b8; padding: 8px; text-align: center; font-size: 12px; width: 32%;">
              3. JUSTIFICATIVA / PROJEÇÃO E DIAGNÓSTICO DE VIABILIDADE
            </th>
          </tr>
          <tr style="font-weight: bold; text-align: center; font-size: 11.5px;">
            <th style="background: #e2e8f0; color: #0f172a; border:1px solid #94a3b8; padding:8px;">Item</th>
            <th style="background: #e2e8f0; color: #0f172a; border:1px solid #94a3b8; padding:8px;">Produto</th>

            <th style="background: #dcfce7; color: #14532d; border:1px solid #94a3b8; padding:8px;">Data da Assinatura</th>
            <th style="background: #dcfce7; color: #14532d; border:1px solid #94a3b8; padding:8px;">Custo na Assinatura (R$)</th>
            <th style="background: #dcfce7; color: #14532d; border:1px solid #94a3b8; padding:8px;">Preço de Venda Contrato (R$)</th>
            <th style="background: #bbf7d0; color: #14532d; border:1px solid #94a3b8; padding:8px;">Lucro na Assinatura (R$)</th>

            <th style="background: #fee2e2; color: #7f1d1d; border:1px solid #94a3b8; padding:8px;">Data da Nova Cotação</th>
            <th style="background: #fee2e2; color: #7f1d1d; border:1px solid #94a3b8; padding:8px;">Novo Custo da Cotação (R$)</th>
            <th style="background: #dbeafe; color: #1e3a8a; border:1px solid #94a3b8; padding:8px;">Nova Proposta de Venda (R$)</th>
            <th style="background: #e0f2fe; color: #0c4a6e; border:1px solid #94a3b8; padding:8px;">Novo Lucro (R$)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\uFEFF' + html], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = (
    nomeArquivo ||
    `Demonstrativo_Reajuste_${listaOrdenada.length === 1 ? listaOrdenada[0].descricaoItem.slice(0, 25) : 'Contrato'}`
  )
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
  link.setAttribute('download', `${safeName}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportarRelatorioReajusteDOC(
  produtos: ProdutoRelatorioReajuste[],
  nomeArquivo?: string,
) {
  if (!produtos || produtos.length === 0) return;

  const listaOrdenada = prepararListaUnicaContratada(produtos);
  if (listaOrdenada.length === 0) return;

  const primeiro = listaOrdenada[0];
  const m0 = calcularMetricasReajuste(primeiro);

  // Quadro resumo direto com um produto abaixo do outro (sem <thead> para o Word/Docs NÃO duplicar o cabeçalho no meio da tabela)
  const linhasResumoHtml = listaOrdenada
    .map((p, idx) => {
      const m = calcularMetricasReajuste(p);
      const isCritico = m.temPrejuizoPosReajuste || m.ficaInviavelOperacional;
      return `
        <tr style="page-break-inside: avoid; break-inside: avoid;">
          <td style="border: 1pt solid #94a3b8; padding: 6pt; text-align: center; font-weight: bold; vertical-align: middle; page-break-inside: avoid;">
            ${p.numeroItem ? `Item ${p.numeroItem}` : idx + 1}
          </td>
          <td style="border: 1pt solid #94a3b8; padding: 6pt; font-weight: bold; vertical-align: middle; page-break-inside: avoid;">
            ${p.descricaoItem}
          </td>
          <td style="border: 1pt solid #94a3b8; padding: 6pt; text-align: right; background: #f0fdf4; vertical-align: middle; page-break-inside: avoid;">
            Custo: <strong>${fmtMoney(m.custoContrato)}</strong><br/>
            Venda: <strong>${fmtMoney(m.valorFechado)}</strong><br/>
            Lucro: <strong style="color:#166534;">${fmtMoney(m.lucroContratoUnit)}</strong>
          </td>
          <td style="border: 1pt solid #94a3b8; padding: 6pt; text-align: right; background: ${isCritico ? '#fef2f2' : '#eff6ff'}; vertical-align: middle; page-break-inside: avoid;">
            Novo Custo: <strong style="color:#b91c1c;">${fmtMoney(m.custoAtual)}</strong><br/>
            Nova Venda: <strong style="color:#1e3a8a;">${fmtMoney(m.valorVendaPosReajuste)}</strong><br/>
            Novo Lucro: <strong style="color:${isCritico ? '#b91c1c' : '#15803d'};">${fmtMoney(m.lucroPosReajusteUnit)} ${!isCritico ? '(Sem Prejuízo)' : ''}</strong>
          </td>
        </tr>
      `;
    })
    .join('');

  // Detalhamento objetivo item a item, um abaixo do outro, sem repetir o nome do produto nem os blocos de valores na justificativa
  const secoesProdutosHtml = listaOrdenada
    .map((p, idx) => {
      const m = calcularMetricasReajuste(p);
      const isCritico = m.temPrejuizoPosReajuste || m.ficaInviavelOperacional;
      // Usa a justificativa analítica limpa para não duplicar o nome do item e os valores que já estão nos quadros acima
      const parecerTexto = m.justificativaFinalidade;

      return `
        <div style="margin-bottom: 12pt; border: 1pt solid #94a3b8; padding: 9pt; border-radius: 4pt; page-break-inside: avoid; break-inside: avoid;">
          <div style="font-weight: bold; font-size: 11pt; color: #0f172a; border-bottom: 1pt solid #cbd5e1; padding-bottom: 4pt; margin-bottom: 7pt;">
            ${p.numeroItem ? `ITEM ${p.numeroItem}` : `ITEM ${idx + 1}`} — ${p.descricaoItem}
          </div>

          <div style="background: #f0fdf4; border-left: 3pt solid #16a34a; padding: 5pt 8pt; margin-bottom: 5pt; font-size: 10pt;">
            <strong>NA ASSINATURA DE CONTRATO (${m.dataAssinaturaStr}):</strong>
            Custo: <strong>${fmtMoney(m.custoContrato)}</strong> | Preço de Venda: <strong>${fmtMoney(m.valorFechado)}</strong> | Lucro: <strong style="color:#15803d;">${fmtMoney(m.lucroContratoUnit)}/un.</strong>
          </div>

          <div style="background: ${isCritico ? '#fef2f2' : '#eff6ff'}; border-left: 3pt solid ${isCritico ? '#dc2626' : '#2563eb'}; padding: 5pt 8pt; margin-bottom: 6pt; font-size: 10pt;">
            <strong>APÓS ASSINATURA DE CONTRATO — REAJUSTE (${m.dataAtualizacaoStr}):</strong>
            Novo Custo: <strong style="color:#b91c1c;">${fmtMoney(m.custoAtual)}</strong> | Nova Proposta de Venda: <strong style="color:#1e3a8a;">${fmtMoney(m.valorVendaPosReajuste)}</strong> | Novo Lucro: <strong style="color:${isCritico ? '#b91c1c' : '#15803d'};">${fmtMoney(m.lucroPosReajusteUnit)}/un. ${!isCritico ? '(Sem Prejuízo)' : ''}</strong>
          </div>

          <div style="font-size: 9.5pt; color: #1e293b; text-align: justify; line-height: 1.4;">
            <strong>Justificativa / Parecer:</strong> ${parecerTexto}
          </div>
          ${
            Array.isArray(p.entregasContrato) && p.entregasContrato.length > 0
              ? `<div style="margin-top: 7pt; padding: 5pt 8pt; background: #f8fafc; border: 1pt solid #cbd5e1; font-size: 9pt; line-height: 1.35;">
                  <strong>🚚 Registro de Entregas Fracionadas por Comando / Nota Fiscal e Compensação:</strong><br/>
                  ${p.entregasContrato
                    .map((e) => {
                      const isDefasada = e.regimeEntrega === 'CUSTO_SUPERIOR_VENDIDO_PRECO_ANTIGO';
                      const cCompra = Number(e.custoCompraUnitario || (isDefasada ? m.custoAtual : m.custoContrato));
                      const vFat = Number(e.valorFaturadoUnitario || m.valorFechado);
                      const compCusto = isDefasada ? Math.max(0, cCompra - m.custoContrato) * (Number(e.quantidade) || 0) : 0;
                      return `• <strong>${e.comandoDestino || 'Comando/OM'}</strong> | NF: <strong>${e.notaFiscal || '-'}</strong>${e.notaEmpenho ? ` | NE: ${e.notaEmpenho}` : ''} | Data: ${fmtDate(e.dataEntrega)} | Qtd: <strong>${Number(e.quantidade || 0).toLocaleString('pt-BR')} un.</strong> — ${
                        isDefasada
                          ? `<span style="color:#b91c1c; font-weight:bold;">Entregue c/ preço antigo (${fmtMoney(vFat)}) mas comprado c/ custo superior (${fmtMoney(cCompra)}) → A compensar: ${fmtMoney(compCusto)}</span>`
                          : `<span style="color:#15803d;">Entregue no preço e custo da assinatura (${fmtMoney(cCompra)} / ${fmtMoney(vFat)})</span>`
                      }`;
                    })
                    .join('<br/>')}
                </div>`
              : ''
          }
        </div>
      `;
    })
    .join('');

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8" />
      <title>Solicitação de Reajuste / Revisão Contratual</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 1.5cm;
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 10pt;
          color: #0f172a;
          line-height: 1.4;
        }
        tr, td, th {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      </style>
    </head>
    <body>
      <div style="text-align: center; border-bottom: 2pt solid #0f172a; padding-bottom: 6pt; margin-bottom: 10pt;">
        <h2 style="margin: 0; font-size: 12.5pt; text-transform: uppercase;">
          DEMONSTRATIVO DE REAJUSTE E PROPOSTA DE REVISÃO DE CONTRATO EM EXERCÍCIO
        </h2>
        <p style="margin: 3pt 0 0 0; font-size: 9.5pt; color: #334155;">
          Contrato com Vigência em Exercício (12 Meses) — Art. 124, II, "d", da Lei Federal nº 14.133/2021
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 10pt; font-size: 9.5pt;">
        <tr style="page-break-inside: avoid;">
          <td style="border: 1pt solid #94a3b8; padding: 6pt 8pt; background: #f8fafc;">
            <strong>ÓRGÃO CONTRATANTE:</strong> ${m0.orgaoLabel} (UASG: ${m0.uasgLabel})<br/>
            <strong>PROCESSO / LICITAÇÃO:</strong> ${m0.pregaoLabel}<br/>
            <strong>CONTRATADA:</strong> GRUPO IRMÃOS NASCIMENTO COMÉRCIO E SERVIÇOS DE ALIMENTAÇÃO LTDA — CNPJ: 48.262.939/0001-50<br/>
            <strong>DATA DE EMISSÃO:</strong> ${new Date().toLocaleDateString('pt-BR')}
          </td>
        </tr>
      </table>

      <p style="text-align: justify; margin: 0 0 10pt 0; font-size: 9.5pt;">
        À Fiscalização de Contratos / Setor de Licitações,<br/>
        Apresentamos abaixo os valores pactuados na assinatura do contrato e os novos valores decorrentes de reajuste de custo junto aos fornecedores durante a vigência contratual (12 meses), com a respectiva proposta de venda ajustada para cada item contratado:
      </p>

      <h3 style="font-size: 10.5pt; margin: 0 0 5pt 0; color: #0f172a;">
        1. QUADRO RESUMO DOS PRODUTOS (ASSINATURA X APÓS REAJUSTE)
      </h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 14pt; font-size: 9.5pt; page-break-inside: avoid; break-inside: avoid;">
        <tbody>
          <tr style="background: #1e293b; color: #ffffff; font-weight: bold; page-break-inside: avoid; break-inside: avoid;">
            <td style="border: 1pt solid #94a3b8; padding: 6pt; width: 10%; text-align: center; background: #1e293b; color: #ffffff;">Item</td>
            <td style="border: 1pt solid #94a3b8; padding: 6pt; width: 40%; text-align: left; background: #1e293b; color: #ffffff;">Produto</td>
            <td style="border: 1pt solid #94a3b8; padding: 6pt; width: 25%; text-align: right; background: #166534; color: #ffffff;">Na Assinatura do Contrato</td>
            <td style="border: 1pt solid #94a3b8; padding: 6pt; width: 25%; text-align: right; background: #991b1b; color: #ffffff;">Após Assinatura (Reajuste)</td>
          </tr>
          ${linhasResumoHtml}
        </tbody>
      </table>

      <h3 style="font-size: 11pt; margin: 0 0 8pt 0; color: #0f172a;">
        2. DEMONSTRATIVO INDIVIDUAL POR PRODUTO
      </h3>
      ${secoesProdutosHtml}

      <p style="text-align: justify; margin-top: 14pt;">
        Diante do exposto, submete-se o presente demonstrativo à apreciação deste Órgão para o devido reequilíbrio econômico-financeiro / revisão contratual dos itens acima discriminados.
      </p>

      <div style="margin-top: 30pt; text-align: center;">
        <p>Fortaleza/CE, ${new Date().toLocaleDateString('pt-BR')}.</p>
        <br/>
        <p style="border-top: 1pt solid #0f172a; display: inline-block; padding-top: 4pt; min-width: 300pt;">
          <strong>GRUPO IRMÃOS NASCIMENTO COMÉRCIO E SERVIÇOS DE ALIMENTAÇÃO LTDA</strong><br/>
          CNPJ: 48.262.939/0001-50
        </p>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\uFEFF' + html], {
    type: 'application/msword;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = (
    nomeArquivo ||
    `Pedido_Reajuste_${listaOrdenada.length === 1 ? listaOrdenada[0].descricaoItem.slice(0, 25) : 'Contrato'}`
  )
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
  link.setAttribute('download', `${safeName}.doc`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
