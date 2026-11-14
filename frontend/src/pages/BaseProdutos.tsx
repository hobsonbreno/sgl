import { useState, useEffect } from 'react';
import {
  Package,
  Award,
  Building2,
  Search,
  Edit2,
  Save,
  Globe,
  FileText,
  FileSpreadsheet,
  History,
  AlertTriangle,
  PlusCircle,
  X,
} from 'lucide-react';
import { io } from 'socket.io-client';
import {
  exportarRelatorioReajusteXLS,
  exportarRelatorioReajusteDOC,
  calcularMetricasReajuste,
  type ProdutoRelatorioReajuste,
} from '../utils/reajusteReportGenerator';

function parsePtBr(val: string | number | undefined | null): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const s = String(val).trim();
  if (s.includes(',')) {
    const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function toInputDate(d: any, fallback: string): string {
  if (!d) return fallback;
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return fallback;
    return dt.toISOString().split('T')[0];
  } catch {
    return fallback;
  }
}

function formatDateSafe(d: any, fallback = '-'): string {
  if (!d) return fallback;
  const s = String(d).trim();
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.000)?Z)?$/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return fallback;
  if (dt.getUTCHours() === 0 && dt.getUTCMinutes() === 0) {
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = dt.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  return dt.toLocaleDateString('pt-BR');
}

export default function BaseProdutos() {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [orgaoFiltro, setOrgaoFiltro] = useState('');
  const [pregaoFiltro, setPregaoFiltro] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [showNovoModal, setShowNovoModal] = useState(false);

  const pickPositive = (...vals: any[]): number => {
    for (const v of vals) {
      const n = Number(v);
      if (v !== undefined && v !== null && !isNaN(n) && n > 0) return n;
    }
    return 0;
  };

  const getRowKey = (p: any): string =>
    p.chaveUnica || `${p.descricaoItem}__ITEM_${p.numeroItem ?? 'SN'}`;

  const [editValues, setEditValues] = useState<{
    precoCustoContrato: string;
    dataAssinaturaContrato: string;
    valorOfertadoOrgao: string;
    valorFechadoOrgao: string;
    valorVendaReajuste: string;
    motivoContrato: string;
    precoCustoAtual: string;
    dataUltimoReajuste: string;
    quantidadeContratada: string;
    quantidadeEntregue: string;
    orgaoNome: string;
    uasg: string;
    pregaoNumero: string;
    fornecedorNome: string;
    fornecedorCnpj: string;
    informe: string;
    chatNegociacao: string;
    valorCampeaoLicitacao: string;
  }>({
    precoCustoContrato: '',
    dataAssinaturaContrato: '2026-09-14',
    valorOfertadoOrgao: '',
    valorFechadoOrgao: '',
    valorVendaReajuste: '',
    motivoContrato: 'REAJUSTE_PRECO',
    precoCustoAtual: '',
    dataUltimoReajuste: new Date().toISOString().split('T')[0],
    quantidadeContratada: '',
    quantidadeEntregue: '',
    orgaoNome: 'COMANDO DA MARINHA — ESCOLA DE APRENDIZES MARINHEIROS DO CEARÁ (EAMCE)',
    uasg: '783601',
    pregaoNumero: 'Pregão Eletrônico Nº 51/2027 (SRP) (Lei 14.133/2021)',
    fornecedorNome: '',
    fornecedorCnpj: '',
    informe: '',
    chatNegociacao: '',
    valorCampeaoLicitacao: '',
  });

  const [novoProdutoForm, setNovoProdutoForm] = useState({
    descricaoItem: '',
    precoCustoContrato: '0,99',
    dataAssinaturaContrato: '2026-09-14',
    valorOfertadoOrgao: '1,14',
    valorFechadoOrgao: '1,14',
    valorVendaReajuste: '1,28',
    precoCustoAtual: '1,07',
    dataUltimoReajuste: new Date().toISOString().split('T')[0],
    quantidadeContratada: '2500',
    quantidadeEntregue: '2500',
    orgaoNome: 'COMANDO DA MARINHA — ESCOLA DE APRENDIZES MARINHEIROS DO CEARÁ (EAMCE)',
    uasg: '783601',
    pregaoNumero: 'Pregão Eletrônico Nº 51/2027 (SRP) (Lei 14.133/2021)',
    fornecedorNome: 'Fornecedor Homologado',
    fornecedorCnpj: '',
    informe: '',
    chatNegociacao:
      'O item 24 teve a negociação de valor encerrada pelo fornecedor GRUPO IRMAOS NASCIMENTO COMERCIO E SERVICOS DE ALIMENTACAO LTDA, CNPJ 48.262.939/0001-50. A negociação do item 24 foi aceita pelo fornecedor GRUPO IRMAOS NASCIMENTO COMERCIO E SERVICOS DE ALIMENTACAO LTDA, CNPJ 48.262.939/0001-50, tendo informado R$ 3,7500. (14/09/2026 11:15)',
  });

  useEffect(() => {
    carregarBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, orgaoFiltro, pregaoFiltro, page, refresh]);

  useEffect(() => {
    const socket = io(window.API_URL, {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 3000,
    });
    socket.on('fornecedor_updated', () => setRefresh((r) => r + 1));
    socket.on('fornecedor_deleted', () => setRefresh((r) => r + 1));
    return () => {
      socket.disconnect();
    };
  }, []);

  const carregarBase = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '25',
        busca,
        orgao: orgaoFiltro,
        pregao: pregaoFiltro,
      });
      const res = await fetch(
        `${window.API_URL}/fornecedores/produtos/base?${params.toString()}`,
      );
      const payload = await res.json();
      setProdutos(payload.data || []);
      setTotalPages(payload.totalPages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const buildRelatorioItem = (p: any): ProdutoRelatorioReajuste => {
    const custoContrato = pickPositive(
      p.precoCustoContrato,
      p.campea?.precoCustoContrato,
      p.campea?.precoUnitario,
      p.precoCustoAtual,
    );
    const custoAtual = pickPositive(
      p.precoCustoAtual,
      p.campea?.precoUnitario,
      custoContrato,
    );
    const valorFechado = pickPositive(
      p.valorFechadoOrgao,
      p.nossoLanceOficial,
      p.valorCampeaoLicitacao,
    );
    const valorOfertado = pickPositive(
      p.valorOfertadoOrgao,
      valorFechado,
    );
    const valorVendaReaj = pickPositive(
      p.valorVendaReajuste,
      valorFechado,
    );

    return {
      descricaoItem: p.descricaoItem,
      numeroItem: p.numeroItem,
      fornecedorNome:
        p.fornecedorNome || p.campea?.razaoSocial || 'Fornecedor Cotado',
      fornecedorCnpj: p.fornecedorCnpj || p.campea?.cnpj || '',
      orgaoNome:
        p.orgaoNome || 'COMANDO DA MARINHA — ESCOLA DE APRENDIZES MARINHEIROS DO CEARÁ (EAMCE)',
      uasg: p.uasg || '783601',
      pregaoNumero:
        p.pregaoNumero ||
        'Pregão Eletrônico Nº 51/2027 (SRP) (Lei 14.133/2021)',
      dataAssinaturaContrato: p.dataAssinaturaContrato || '2026-09-14',
      dataUltimoReajuste:
        p.dataUltimoReajuste || p.campea?.data || new Date(),
      precoCustoContrato: Number(custoContrato),
      valorOfertadoOrgao: Number(valorOfertado),
      valorFechadoOrgao: Number(valorFechado),
      valorVendaReajuste: Number(valorVendaReaj),
      motivoContrato: p.motivoContrato || 'REAJUSTE_PRECO',
      precoCustoAtual: Number(custoAtual),
      quantidadeContratada: p.quantidadeContratada,
      quantidadeEntregue: p.quantidadeEntregue,
      entregasContrato: Array.isArray(p.entregasContrato) ? p.entregasContrato : [],
      informeUltimoReajuste: p.informeUltimoReajuste,
      chatNegociacao: p.chatNegociacao,
      historicoReajustes: p.historicoReajustes || [],
    };
  };

  /**
   * Busca todos os itens contratados/convocados do Pregão/Órgão (ignorando filtro parcial de palavra-chave no campo "busca",
   * como quando o usuário digita apenas "arr" ou "arroz"), garantindo que todos os itens do contrato (ex: 23, 24 e 140)
   * saiam juntos no relatório .XLS e .DOC.
   */
  const handleExportarContratoCompleto = async (
    formato: 'XLS' | 'DOC',
    pregaoAlvo?: string,
    uasgAlvo?: string,
  ) => {
    try {
      const orgaoParam = uasgAlvo || orgaoFiltro || '';
      const pregaoParam = pregaoAlvo || pregaoFiltro || '';
      const params = new URLSearchParams({
        page: '1',
        limit: '200',
        busca: '',
        orgao: orgaoParam,
        pregao: pregaoParam,
      });
      const res = await fetch(
        `${window.API_URL}/fornecedores/produtos/base?${params.toString()}`,
      );
      const payload = await res.json();
      const listaCompleta = Array.isArray(payload.data) && payload.data.length > 0
        ? payload.data
        : produtos;
      const itensRelatorio = listaCompleta.map(buildRelatorioItem);
      if (formato === 'XLS') {
        exportarRelatorioReajusteXLS(
          itensRelatorio,
          'Relatorio_Reajuste_Contrato_Marinha',
        );
      } else {
        exportarRelatorioReajusteDOC(
          itensRelatorio,
          'Pedido_Reajuste_Contrato_Marinha',
        );
      }
    } catch (err) {
      console.error('Erro ao exportar contrato completo:', err);
      const fallbackItens = produtos.map(buildRelatorioItem);
      if (formato === 'XLS') {
        exportarRelatorioReajusteXLS(
          fallbackItens,
          'Relatorio_Reajuste_Contrato_Marinha',
        );
      } else {
        exportarRelatorioReajusteDOC(
          fallbackItens,
          'Pedido_Reajuste_Contrato_Marinha',
        );
      }
    }
  };

  const handleEditClick = (p: any) => {
    const r = buildRelatorioItem(p);
    setEditandoId(getRowKey(p));
    setEditValues({
      precoCustoContrato:
        r.precoCustoContrato > 0
          ? r.precoCustoContrato.toFixed(2).replace('.', ',')
          : '',
      dataAssinaturaContrato: toInputDate(
        p.dataAssinaturaContrato,
        '2026-09-14',
      ),
      valorOfertadoOrgao:
        (r.valorOfertadoOrgao || 0) > 0
          ? Number(r.valorOfertadoOrgao).toFixed(2).replace('.', ',')
          : '',
      valorFechadoOrgao:
        r.valorFechadoOrgao > 0
          ? r.valorFechadoOrgao.toFixed(2).replace('.', ',')
          : '',
      valorVendaReajuste:
        (r.valorVendaReajuste || r.valorFechadoOrgao) > 0
          ? Number(r.valorVendaReajuste || r.valorFechadoOrgao)
              .toFixed(2)
              .replace('.', ',')
          : '',
      motivoContrato: r.motivoContrato || 'REAJUSTE_PRECO',
      precoCustoAtual:
        r.precoCustoAtual > 0
          ? r.precoCustoAtual.toFixed(2).replace('.', ',')
          : '',
      dataUltimoReajuste: toInputDate(
        p.dataUltimoReajuste,
        new Date().toISOString().split('T')[0],
      ),
      quantidadeContratada: p.quantidadeContratada
        ? String(p.quantidadeContratada)
        : '',
      quantidadeEntregue: p.quantidadeEntregue
        ? String(p.quantidadeEntregue)
        : '',
      orgaoNome:
        p.orgaoNome || 'COMANDO DA MARINHA — ESCOLA DE APRENDIZES MARINHEIROS DO CEARÁ (EAMCE)',
      uasg: p.uasg || '783601',
      pregaoNumero:
        p.pregaoNumero ||
        'Pregão Eletrônico Nº 51/2027 (SRP) (Lei 14.133/2021)',
      fornecedorNome:
        p.fornecedorNome || p.campea?.razaoSocial || '',
      fornecedorCnpj: p.fornecedorCnpj || p.campea?.cnpj || '',
      informe: p.informeUltimoReajuste || '',
      chatNegociacao: p.chatNegociacao || '',
      valorCampeaoLicitacao: p.valorCampeaoLicitacao
        ? String(p.valorCampeaoLicitacao).replace('.', ',')
        : '',
    });
  };

  const handleSaveIntel = async (p: any) => {
    try {
      const cContrato = parsePtBr(editValues.precoCustoContrato);
      const cAtual = parsePtBr(editValues.precoCustoAtual);
      const vOfertado = parsePtBr(editValues.valorOfertadoOrgao);
      const vFechado = parsePtBr(editValues.valorFechadoOrgao);
      const vVendaReaj = parsePtBr(editValues.valorVendaReajuste) || vFechado;
      const vCampeao = parsePtBr(editValues.valorCampeaoLicitacao);

      const payload = {
        descricaoItem: p.descricaoItem,
        numeroItem: p.numeroItem,
        oportunidadeId: p.oportunidadeId,
        nossoLanceOficial: vFechado > 0 ? vFechado : undefined,
        valorCampeaoLicitacao: vCampeao > 0 ? vCampeao : undefined,
        precoCustoContrato: cContrato > 0 ? cContrato : undefined,
        precoCustoAtual: cAtual > 0 ? cAtual : undefined,
        valorOfertadoOrgao: vOfertado > 0 ? vOfertado : undefined,
        valorFechadoOrgao: vFechado > 0 ? vFechado : undefined,
        valorVendaReajuste: vVendaReaj > 0 ? vVendaReaj : undefined,
        motivoContrato: editValues.motivoContrato || 'REAJUSTE_PRECO',
        dataAssinaturaContrato: editValues.dataAssinaturaContrato || undefined,
        dataUltimoReajuste: editValues.dataUltimoReajuste || undefined,
        quantidadeContratada: editValues.quantidadeContratada
          ? parseInt(editValues.quantidadeContratada, 10)
          : undefined,
        quantidadeEntregue: editValues.quantidadeEntregue
          ? parseInt(editValues.quantidadeEntregue, 10)
          : undefined,
        orgaoNome: editValues.orgaoNome || undefined,
        uasg: editValues.uasg || undefined,
        pregaoNumero: editValues.pregaoNumero || undefined,
        fornecedorNome: editValues.fornecedorNome || undefined,
        fornecedorCnpj: editValues.fornecedorCnpj || undefined,
        informe: editValues.informe || undefined,
        chatNegociacao: editValues.chatNegociacao || undefined,
        registrarNoHistorico: true,
      };

      await fetch(`${window.API_URL}/fornecedores/produtos/base`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setEditandoId(null);
      carregarBase();
    } catch (e) {
      console.error('Erro ao salvar', e);
      alert('Erro ao salvar valores e histórico do produto.');
    }
  };

  const handleSalvarNovoProduto = async () => {
    if (!novoProdutoForm.descricaoItem.trim()) {
      alert('Informe o nome/descrição do produto.');
      return;
    }
    try {
      const cContrato = parsePtBr(novoProdutoForm.precoCustoContrato);
      const cAtual = parsePtBr(novoProdutoForm.precoCustoAtual);
      const vOfertado = parsePtBr(novoProdutoForm.valorOfertadoOrgao);
      const vFechado = parsePtBr(novoProdutoForm.valorFechadoOrgao);

      await fetch(`${window.API_URL}/fornecedores/produtos/base`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricaoItem: novoProdutoForm.descricaoItem.trim(),
          nossoLanceOficial: vFechado,
          precoCustoContrato: cContrato,
          precoCustoAtual: cAtual,
          valorOfertadoOrgao: vOfertado || vFechado,
          valorFechadoOrgao: vFechado,
          dataAssinaturaContrato: novoProdutoForm.dataAssinaturaContrato,
          dataUltimoReajuste: novoProdutoForm.dataUltimoReajuste,
          quantidadeContratada:
            parseInt(novoProdutoForm.quantidadeContratada, 10) || undefined,
          quantidadeEntregue:
            parseInt(novoProdutoForm.quantidadeEntregue, 10) || undefined,
          orgaoNome: novoProdutoForm.orgaoNome,
          uasg: novoProdutoForm.uasg,
          pregaoNumero: novoProdutoForm.pregaoNumero,
          fornecedorNome: novoProdutoForm.fornecedorNome,
          fornecedorCnpj: novoProdutoForm.fornecedorCnpj,
          informe: novoProdutoForm.informe || undefined,
          chatNegociacao: novoProdutoForm.chatNegociacao || undefined,
          registrarNoHistorico: true,
        }),
      });
      setShowNovoModal(false);
      carregarBase();
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar produto.');
    }
  };

  const handleCarregarCasoMarinha = async () => {
    try {
      const chatPadrao =
        'Pregão Eletrônico Nº 51/2027 (SRP) (Lei 14.133/2021) - UASG 783601 - COMANDO DA MARINHA / ESCOLA DE APRENDIZES MARINHEIROS DO CEARÁ | Adjudicada: GRUPO IRMAOS NASCIMENTO COMERCIO E SERVICOS DE ALIMENTACAO LTDA (48.262.939/0001-50 - ME/EPP - CE). O item 24 teve a negociação de valor encerrada pelo fornecedor GRUPO IRMAOS NASCIMENTO COMERCIO E SERVICOS DE ALIMENTACAO LTDA, CNPJ 48.262.939/0001-50. A negociação do item 24 foi aceita pelo fornecedor GRUPO IRMAOS NASCIMENTO COMERCIO E SERVICOS DE ALIMENTACAO LTDA, CNPJ 48.262.939/0001-50, tendo informado R$ 3,7500. (14/09/2026 11:15)';

      // 1. Suco Caixinha (Item 140 do Edital)
      await fetch(`${window.API_URL}/fornecedores/produtos/base`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricaoItem: 'Suco apresentação: líquido, sabor: maracujá, tipo: natural, características adicionais: pasteurizado e sem glúten',
          numeroItem: 140,
          nossoLanceOficial: 1.14,
          precoCustoContrato: 0.99,
          precoCustoAtual: 1.07,
          valorOfertadoOrgao: 1.14,
          valorFechadoOrgao: 1.14,
          valorVendaReajuste: 1.28,
          motivoContrato: 'REAJUSTE_PRECO',
          dataAssinaturaContrato: '2026-09-14',
          dataUltimoReajuste: new Date().toISOString().split('T')[0],
          quantidadeContratada: 2500,
          quantidadeEntregue: 2500,
          orgaoNome: 'COMANDO DA MARINHA — ESCOLA DE APRENDIZES MARINHEIROS DO CEARÁ (EAMCE)',
          uasg: '783601',
          pregaoNumero: 'Pregão Eletrônico Nº 51/2027 (SRP) (Lei 14.133/2021)',
          fornecedorNome: 'ATACADAO S.A.',
          informe:
            'NA ASSINATURA DE CONTRATO: Suco — custo R$ 0,99 | preço de venda: R$ 1,14 | lucro: R$ 0,15. APÓS ASSINATURA DE CONTRATO REAJUSTE NOVOS VALORES SÃO: custo R$ 1,07 | preço de venda: R$ 1,28 | lucro: R$ 0,21.',
          chatNegociacao: chatPadrao,
          registrarNoHistorico: true,
        }),
      });

      // 2. Arroz (Item 23 do Edital)
      await fetch(`${window.API_URL}/fornecedores/produtos/base`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricaoItem: 'Arroz Beneficiado tipo: agulhinha/branco, subgrupo: polido, classe: longo fino, qualidade: tipo 1',
          numeroItem: 23,
          nossoLanceOficial: 3.75,
          precoCustoContrato: 3.25,
          precoCustoAtual: 3.85,
          valorOfertadoOrgao: 3.75,
          valorFechadoOrgao: 3.75,
          valorVendaReajuste: 4.68,
          motivoContrato: 'INVIABILIDADE_OPERACIONAL',
          dataAssinaturaContrato: '2026-09-14',
          dataUltimoReajuste: new Date().toISOString().split('T')[0],
          orgaoNome: 'COMANDO DA MARINHA — ESCOLA DE APRENDIZES MARINHEIROS DO CEARÁ (EAMCE)',
          uasg: '783601',
          pregaoNumero: 'Pregão Eletrônico Nº 51/2027 (SRP) (Lei 14.133/2021)',
          fornecedorNome: 'ATACADAO S.A.',
          informe:
            'NA ASSINATURA DE CONTRATO (Arroz - Item 23 do edital): custo R$ 3,25 | preço de venda: R$ 3,75 | lucro: R$ 0,50. APÓS ASSINATURA DE CONTRATO REAJUSTE NOVOS VALORES SÃO: custo R$ 3,85 | preço de venda: R$ 4,68 | lucro: R$ 0,83.',
          chatNegociacao: chatPadrao,
          registrarNoHistorico: true,
        }),
      });

      // 3. Arroz (Item 24 do Edital)
      await fetch(`${window.API_URL}/fornecedores/produtos/base`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricaoItem: 'Arroz Beneficiado tipo: agulhinha/branco, subgrupo: polido, classe: longo fino, qualidade: tipo 1',
          numeroItem: 24,
          nossoLanceOficial: 3.75,
          precoCustoContrato: 3.25,
          precoCustoAtual: 3.67,
          valorOfertadoOrgao: 3.75,
          valorFechadoOrgao: 3.75,
          valorVendaReajuste: 3.75,
          motivoContrato: 'INVIABILIDADE_OPERACIONAL',
          dataAssinaturaContrato: '2026-09-14',
          dataUltimoReajuste: new Date().toISOString().split('T')[0],
          orgaoNome: 'COMANDO DA MARINHA — ESCOLA DE APRENDIZES MARINHEIROS DO CEARÁ (EAMCE)',
          uasg: '783601',
          pregaoNumero: 'Pregão Eletrônico Nº 51/2027 (SRP) (Lei 14.133/2021)',
          fornecedorNome: 'ATACADAO S.A.',
          informe:
            'NA ASSINATURA DE CONTRATO (Arroz - Item 24 do edital): custo R$ 3,25 | preço de venda: R$ 3,75 | lucro: R$ 0,50. APÓS ASSINATURA DE CONTRATO REAJUSTE NOVOS VALORES SÃO: custo R$ 3,67 | preço de venda: R$ 3,75 | lucro: R$ 0,08. A projeção teve os seguintes ajustes: no arroz fica inviável pois saímos do patamar de R$ 0,50 de lucro para R$ 0,08 e isso não cobre os custos operacionais da logística e pessoal.',
          chatNegociacao: chatPadrao,
          registrarNoHistorico: true,
        }),
      });

      carregarBase();
      alert(
        '✅ Dados do Pregão Eletrônico Nº 51/2027 (Suco Item 140 e Arroz Itens 23 e 24) sincronizados com os valores da proposta! Você já pode visualizar ou imprimir em .XLS e .DOC.',
      );
    } catch (e) {
      console.error(e);
      alert('Erro ao carregar dados do contrato.');
    }
  };

  const formatCurrency = (val: any) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(val);
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>
            Base Geral de Produtos & Histórico de Custos / Reajuste de Contratos
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Consulte o histórico de valor de custo negociado com o fornecedor na
            assinatura do contrato, o valor fechado com o órgão (ex: Marinha), o
            custo atual após reajuste de mercado e imprima o relatório demonstrativo
            em <strong>.XLS</strong> ou <strong>.DOC</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleCarregarCasoMarinha}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.6rem 0.9rem',
              background: '#fffbeb',
              color: '#92400e',
              border: '1px solid #f59e0b',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
            title="Registra rapidamente o Suco Caixinha (Custo R$ 0,90 -> R$ 1,10 | Marinha R$ 1,07) e o Arroz (Custo R$ 3,25 | Marinha R$ 3,75) do Pregão 51/2027 - UASG 783601"
          >
            ⚓ Carregar Contrato Marinha (Pregão 51/2027 - Suco & Arroz)
          </button>

          <button
            type="button"
            onClick={() => setShowNovoModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.6rem 0.9rem',
              background: '#0f172a',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            <PlusCircle size={16} /> Registrar Atualização / Produto
          </button>

          {produtos.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => handleExportarContratoCompleto('XLS')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 0.9rem',
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
                title="Exporta todos os itens contratados/convocados do Pregão (ex: Itens 23, 24 e 140), mesmo que você esteja filtrando um produto específico na busca"
              >
                <FileSpreadsheet size={16} /> Imprimir Relatório (.XLS)
              </button>

              <button
                type="button"
                onClick={() => handleExportarContratoCompleto('DOC')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 0.9rem',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
                title="Exporta todos os itens contratados/convocados do Pregão (ex: Itens 23, 24 e 140), mesmo que você esteja filtrando um produto específico na busca"
              >
                <FileText size={16} /> Imprimir Relatório (.DOC)
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modal para registrar novo produto ou reajuste diretamente */}
      {showNovoModal && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '1.25rem',
            background: '#fffbeb',
            border: '2px solid #f59e0b',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <h3 style={{ margin: 0, color: '#92400e', fontSize: '1.05rem' }}>
              📋 Registrar / Atualizar Histórico de Custo Negociado e Reajuste de
              Contrato
            </h3>
            <button
              type="button"
              onClick={() => setShowNovoModal(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#78350f',
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '0.85rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                Nome / Descrição do Produto *
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: SUCO CAIXINHA (UNIDADE)"
                value={novoProdutoForm.descricaoItem}
                onChange={(e) =>
                  setNovoProdutoForm({
                    ...novoProdutoForm,
                    descricaoItem: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534' }}>
                Custo na Assinatura do Contrato (R$)
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: 0,90"
                value={novoProdutoForm.precoCustoContrato}
                onChange={(e) =>
                  setNovoProdutoForm({
                    ...novoProdutoForm,
                    precoCustoContrato: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534' }}>
                Data da Assinatura do Contrato
              </label>
              <input
                type="date"
                className="form-control"
                value={novoProdutoForm.dataAssinaturaContrato}
                onChange={(e) =>
                  setNovoProdutoForm({
                    ...novoProdutoForm,
                    dataAssinaturaContrato: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e40af' }}>
                Valor Fechado c/ Marinha / Órgão (R$)
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: 1,07"
                value={novoProdutoForm.valorFechadoOrgao}
                onChange={(e) =>
                  setNovoProdutoForm({
                    ...novoProdutoForm,
                    valorFechadoOrgao: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#b91c1c' }}>
                Valor de Custo Atual (Último Aumento R$)
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: 1,10"
                value={novoProdutoForm.precoCustoAtual}
                onChange={(e) =>
                  setNovoProdutoForm({
                    ...novoProdutoForm,
                    precoCustoAtual: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#b91c1c' }}>
                Data da Atualização (Último Aumento)
              </label>
              <input
                type="date"
                className="form-control"
                value={novoProdutoForm.dataUltimoReajuste}
                onChange={(e) =>
                  setNovoProdutoForm({
                    ...novoProdutoForm,
                    dataUltimoReajuste: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>
                Qtd. Entregue na Distribuição
              </label>
              <input
                type="number"
                className="form-control"
                placeholder="Ex: 2500"
                value={novoProdutoForm.quantidadeEntregue}
                onChange={(e) =>
                  setNovoProdutoForm({
                    ...novoProdutoForm,
                    quantidadeEntregue: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>
                Órgão Contratante
              </label>
              <input
                type="text"
                className="form-control"
                value={novoProdutoForm.orgaoNome}
                onChange={(e) =>
                  setNovoProdutoForm({
                    ...novoProdutoForm,
                    orgaoNome: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>
                UASG
              </label>
              <input
                type="text"
                className="form-control"
                value={novoProdutoForm.uasg}
                onChange={(e) =>
                  setNovoProdutoForm({
                    ...novoProdutoForm,
                    uasg: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>
                Pregão / Licitação
              </label>
              <input
                type="text"
                className="form-control"
                value={novoProdutoForm.pregaoNumero}
                onChange={(e) =>
                  setNovoProdutoForm({
                    ...novoProdutoForm,
                    pregaoNumero: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div style={{ marginBottom: '0.85rem' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#78350f' }}>
              Informe Importante (Deixe em branco para gerar automaticamente os dizeres completos)
            </label>
            <textarea
              className="form-control"
              rows={2}
              value={novoProdutoForm.informe}
              onChange={(e) =>
                setNovoProdutoForm({ ...novoProdutoForm, informe: e.target.value })
              }
              placeholder="Se deixar em branco, o sistema gera automaticamente o parecer com todos os cálculos de lucro na assinatura, prejuízo atual e pedido de reajuste."
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setShowNovoModal(false)}
              className="btn-primary"
              style={{ background: '#e2e8f0', color: '#334155' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSalvarNovoProduto}
              className="btn-primary"
              style={{ background: '#d97706', color: '#fff' }}
            >
              💾 Salvar Produto e Registrar Histórico
            </button>
          </div>
        </div>
      )}

      {/* Painel de Busca por Produto, Órgão ou Processo / Pregão */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: '10px',
          padding: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '0.85rem',
            alignItems: 'end',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: '0.3rem',
              }}
            >
              🔍 Buscar Produto ou Item (ou busca geral)
            </label>
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.8rem',
                  top: '0.7rem',
                  color: '#64748b',
                }}
              />
              <input
                type="text"
                className="form-control"
                placeholder="Ex: suco, arroz, item 23, ou Pregão 51/2027..."
                style={{ paddingLeft: '2.3rem' }}
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#1e3a8a',
                marginBottom: '0.3rem',
              }}
            >
              🏛️ Filtrar por Órgão Contratante / UASG
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="Ex: Marinha, Escola de Aprendizes, UASG 783601..."
              value={orgaoFiltro}
              onChange={(e) => {
                setOrgaoFiltro(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#047857',
                marginBottom: '0.3rem',
              }}
            >
              📄 Filtrar por Processo / Pregão
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="Ex: Processo: Pregão Eletrônico Nº 51/2027"
              value={pregaoFiltro}
              onChange={(e) => {
                setPregaoFiltro(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginTop: '0.75rem',
            paddingTop: '0.6rem',
            borderTop: '1px dashed #cbd5e1',
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.76rem', color: '#475569', fontWeight: 600 }}>
              Atalhos Rápidos:
            </span>
            <button
              type="button"
              onClick={() => {
                setOrgaoFiltro('Marinha');
                setPregaoFiltro('Pregão Eletrônico Nº 51/2027');
                setBusca('');
                setPage(1);
              }}
              style={{
                padding: '0.3rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: '#dbeafe',
                color: '#1e40af',
                border: '1px solid #93c5fd',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              ⚓ Marinha — Processo: Pregão Eletrônico Nº 51/2027 (Todos Negociados)
            </button>
            <button
              type="button"
              onClick={() => {
                setBusca('arroz, suco');
                setPage(1);
              }}
              style={{
                padding: '0.3rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: '#ede9fe',
                color: '#5b21b6',
                border: '1px solid #c4b5fd',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              🌾🧃 Buscar "arroz, suco"
            </button>
            <button
              type="button"
              onClick={() => {
                setBusca('suco');
                setPage(1);
              }}
              style={{
                padding: '0.3rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: '#f0fdf4',
                color: '#166534',
                border: '1px solid #86efac',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              🧃 Buscar "suco"
            </button>
            <button
              type="button"
              onClick={() => {
                setBusca('arroz');
                setPage(1);
              }}
              style={{
                padding: '0.3rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: '#fef3c7',
                color: '#92400e',
                border: '1px solid #fcd34d',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              🌾 Buscar "arroz"
            </button>
            {(busca || orgaoFiltro || pregaoFiltro) && (
              <button
                type="button"
                onClick={() => {
                  setBusca('');
                  setOrgaoFiltro('');
                  setPregaoFiltro('');
                  setPage(1);
                }}
                style={{
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: '#fee2e2',
                  color: '#991b1b',
                  border: '1px solid #fca5a5',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                ✖ Limpar Filtros
              </button>
            )}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600 }}>
            Exibindo <strong>{produtos.length}</strong> produto(s) negociado(s)
          </div>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: '26%' }}>Produto / Órgão / Fornecedor</th>
              <th style={{ width: '38%' }}>
                Histórico de Custo Negociado, Datas e Informes Importantes
              </th>
              <th style={{ width: '36%' }}>
                Análise do Contrato (Marinha / Órgão), Prejuízo Atual e Relatório (.XLS / .DOC)
              </th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((p, i) => {
              const relItem = buildRelatorioItem(p);
              const m = calcularMetricasReajuste(relItem);
              const historico =
                p.historicoReajustes && p.historicoReajustes.length > 0
                  ? p.historicoReajustes
                  : [];

              return (
                <tr key={i}>
                  {/* COLUNA 1: Produto, Fornecedor Campeão e Dados da Licitação */}
                  <td style={{ verticalAlign: 'top' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                      }}
                    >
                      <Package
                        size={18}
                        color="#64748b"
                        style={{ marginTop: '0.2rem', flexShrink: 0 }}
                      />
                      <div>
                        <strong
                          style={{
                            color: '#0f172a',
                            lineHeight: '1.4',
                            fontSize: '0.95rem',
                          }}
                        >
                          {p.descricaoItem}
                        </strong>
                        {p.numeroItem && (
                          <span
                            style={{
                              display: 'inline-block',
                              marginLeft: '0.4rem',
                              fontSize: '0.72rem',
                              background: '#e0e7ff',
                              color: '#3730a3',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              fontWeight: 700,
                            }}
                          >
                            Item {p.numeroItem}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Contexto do Órgão / Contrato */}
                    <div
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.65rem',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        color: '#334155',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#1e3a8a', marginBottom: '0.2rem' }}>
                        🏛️ {relItem.orgaoNome}
                      </div>
                      <div>
                        <strong>UASG:</strong> {relItem.uasg} |{' '}
                        <strong>Processo:</strong> {relItem.pregaoNumero}
                      </div>
                      <div style={{ marginTop: '0.2rem', fontSize: '0.72rem', color: '#475569' }}>
                        <strong>Contratada:</strong> GRUPO IRMÃOS NASCIMENTO
                        COMÉRCIO E SERVIÇOS DE ALIMENTAÇÃO LTDA (48.262.939/0001-50)
                      </div>
                      {relItem.quantidadeEntregue && (
                        <div
                          style={{
                            marginTop: '0.3rem',
                            color: '#92400e',
                            fontWeight: 600,
                          }}
                        >
                          📦 Total Entregue no Contrato:{' '}
                          {relItem.quantidadeEntregue.toLocaleString('pt-BR')} un.
                          {relItem.quantidadeContratada
                            ? ` (Saldo: ${Math.max(0, Number(relItem.quantidadeContratada) - Number(relItem.quantidadeEntregue)).toLocaleString('pt-BR')} un.)`
                            : ''}
                        </div>
                      )}
                      {relItem.entregasContrato && relItem.entregasContrato.length > 0 && (
                        <div
                          style={{
                            marginTop: '0.35rem',
                            paddingTop: '0.35rem',
                            borderTop: '1px dashed #cbd5e1',
                            fontSize: '0.72rem',
                          }}
                        >
                          <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.2rem' }}>
                            🚚 Entregas Fracionadas por Comando / NF ({relItem.entregasContrato.length}):
                          </div>
                          {relItem.entregasContrato.map((ent, idxE) => {
                            const isComp =
                              ent.regimeEntrega === 'CUSTO_SUPERIOR_VENDIDO_PRECO_ANTIGO';
                            const cCompra = Number(
                              ent.custoCompraUnitario ||
                                (isComp ? m.custoAtual : m.custoContrato) ||
                                0,
                            );
                            const compVal = isComp
                              ? Math.max(0, cCompra - m.custoContrato) * (Number(ent.quantidade) || 0)
                              : 0;
                            return (
                              <div
                                key={idxE}
                                style={{
                                  padding: '0.2rem 0.35rem',
                                  marginBottom: '0.18rem',
                                  borderRadius: '4px',
                                  background: isComp ? '#fffbeb' : '#f0fdf4',
                                  border: `1px solid ${isComp ? '#fcd34d' : '#bbf7d0'}`,
                                  color: isComp ? '#92400e' : '#166534',
                                }}
                              >
                                <strong>{ent.comandoDestino || 'Comando / OM'}</strong>:{' '}
                                {Number(ent.quantidade || 0).toLocaleString('pt-BR')} un.
                                {ent.notaFiscal ? ` | NF ${ent.notaFiscal}` : ''}
                                {ent.notaEmpenho ? ` | NE ${ent.notaEmpenho}` : ''}
                                {isComp && (
                                  <span style={{ color: '#b91c1c', fontWeight: 700 }}>
                                    {' '}
                                    → Compensar {formatCurrency(compVal)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {p.campea && (
                      <div
                        style={{
                          marginTop: '0.75rem',
                          background: 'rgba(34, 197, 94, 0.1)',
                          border: '1px solid rgba(34, 197, 94, 0.25)',
                          padding: '0.75rem',
                          borderRadius: '6px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: '#166534',
                            fontWeight: 600,
                            fontSize: '0.82rem',
                          }}
                        >
                          <Award size={16} /> Fornecedor Cotado:
                        </div>
                        <div
                          style={{
                            color: '#15803d',
                            fontSize: '0.82rem',
                            marginTop: '0.25rem',
                          }}
                        >
                          <strong>{p.campea.razaoSocial}</strong> <br />
                          {p.campea.observacao && (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                color: '#166534',
                                display: 'block',
                                marginBottom: '0.2rem',
                                fontStyle: 'italic',
                              }}
                            >
                              Marca/Ref: {p.campea.observacao}
                            </span>
                          )}
                          {p.campea.fatorEmbalagem > 1 && (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                color: '#166534',
                                display: 'block',
                                marginBottom: '0.2rem',
                              }}
                            >
                              {p.campea.nomeEmbalagem || 'Pacote'} com{' '}
                              {p.campea.fatorEmbalagem} un. | Preço:{' '}
                              {formatCurrency(p.campea.precoEmbalagem)}
                            </span>
                          )}
                          Custo Atual: <strong>{formatCurrency(relItem.precoCustoAtual)}</strong>
                        </div>
                        {(p.campea.site || p.campea.portifolio) && (
                          <div
                            style={{
                              display: 'flex',
                              gap: '0.5rem',
                              marginTop: '0.5rem',
                            }}
                          >
                            {p.campea.site && (
                              <a
                                href={p.campea.site}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  fontSize: '0.75rem',
                                  color: '#166534',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.2rem',
                                  textDecoration: 'none',
                                }}
                              >
                                <Globe size={12} /> Site
                              </a>
                            )}
                            {p.campea.portifolio && (
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  color: '#166534',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.2rem',
                                }}
                                title={p.campea.portifolio}
                              >
                                <FileText size={12} /> Portfólio
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* COLUNA 2: Histórico Cronológico de Atualizações, Datas e Informes */}
                  <td style={{ verticalAlign: 'top' }}>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.85rem',
                      }}
                    >
                      {/* Informes Importantes e Parecer Consolidado */}
                      <div
                        style={{
                          padding: '0.75rem',
                          background: m.temPrejuizoDireto ? '#fef2f2' : '#fffbeb',
                          border: `1px solid ${m.temPrejuizoDireto ? '#fca5a5' : '#fde68a'}`,
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          lineHeight: 1.5,
                          color: '#1e293b',
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            color: m.temPrejuizoDireto ? '#991b1b' : '#92400e',
                            marginBottom: '0.35rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <AlertTriangle size={15} /> Informe Importante (Resumo
                          p/ Solicitação de Reajuste):
                        </div>
                        <div style={{ textAlign: 'justify' }}>
                          {p.informeUltimoReajuste || m.textoExplicativo}
                        </div>
                        {p.chatNegociacao && (
                          <div
                            style={{
                              marginTop: '0.5rem',
                              padding: '0.5rem',
                              background: '#fff',
                              border: '1px dashed #cbd5e1',
                              borderRadius: '4px',
                              fontSize: '0.73rem',
                              color: '#475569',
                            }}
                          >
                            <strong>💬 Histórico do Chat da Licitação:</strong>
                            <br />
                            {p.chatNegociacao}
                          </div>
                        )}
                      </div>

                      {/* Linha do Tempo Unificada: Atualizações de Custo + Entregas Fracionadas (NF, Data, Qtd e Acumulado ACM) */}
                      {(() => {
                        const parseTs = (d: any): number => {
                          if (!d) return 0;
                          const str = String(d).trim();
                          if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
                            return new Date(`${str}T12:00:00Z`).getTime();
                          }
                          const parsed = new Date(str).getTime();
                          return isNaN(parsed) ? 0 : parsed;
                        };

                        const listaEntregasRaw = Array.isArray(relItem.entregasContrato)
                          ? relItem.entregasContrato
                          : [];

                        // Ordena as entregas da mais antiga para a mais recente para calcular o Somatório Acumulado (ACM) em cada ponto da linha do tempo
                        const entregasCronologicas = [...listaEntregasRaw]
                          .map((ent, idxOriginal) => ({
                            ...ent,
                            _ts: parseTs(ent.dataEntrega),
                            _idxOriginal: idxOriginal,
                          }))
                          .sort((a, b) =>
                            a._ts !== b._ts ? a._ts - b._ts : a._idxOriginal - b._idxOriginal,
                          );

                        let somaProgressiva = 0;
                        const entregasComAcumulado = entregasCronologicas.map((ent, idxOrdem) => {
                          const qtdNota = Number(ent.quantidade || 0);
                          somaProgressiva += qtdNota;
                          const saldoRestante = relItem.quantidadeContratada
                            ? Math.max(0, Number(relItem.quantidadeContratada) - somaProgressiva)
                            : null;
                          return {
                            ...ent,
                            ordemEntrega: idxOrdem + 1,
                            qtdNota,
                            acumuladoAteMomento: somaProgressiva,
                            saldoRestanteMomento: saldoRestante,
                          };
                        });

                        const totalAcumuladoGeral =
                          somaProgressiva > 0
                            ? somaProgressiva
                            : Number(relItem.quantidadeEntregue || 0);

                        const listaHistoricoCusto =
                          historico.length > 0
                            ? historico
                            : [
                                {
                                  data: relItem.dataUltimoReajuste,
                                  dataAssinaturaContrato: relItem.dataAssinaturaContrato,
                                  precoCustoContrato: m.custoContrato,
                                  precoCustoAtual: m.custoAtual,
                                  valorFechadoOrgao: m.valorFechado,
                                  valorVendaReajuste: m.valorVendaPosReajuste,
                                  fornecedorNome: relItem.fornecedorNome,
                                  quantidadeEntregue: relItem.quantidadeEntregue,
                                  informe: p.informeUltimoReajuste || m.textoExplicativo,
                                },
                              ];

                        // Monta eventos unificados na Linha do Tempo (mais recentes no topo, preservando o Acumulado ACM exato de cada momento)
                        type EventoTimeline =
                          | {
                              tipoEvento: 'ENTREGA_NF';
                              ts: number;
                              ordemDesempate: number;
                              entrega: (typeof entregasComAcumulado)[number];
                            }
                          | {
                              tipoEvento: 'ATUALIZACAO_CUSTO';
                              ts: number;
                              ordemDesempate: number;
                              hist: any;
                              acumuladoAteDataCusto: number;
                              notasAteDataCusto: (typeof entregasComAcumulado)[number][];
                            };

                        const eventosTimeline: EventoTimeline[] = [];

                        entregasComAcumulado.forEach((ent) => {
                          eventosTimeline.push({
                            tipoEvento: 'ENTREGA_NF',
                            ts: ent._ts,
                            ordemDesempate: 1,
                            entrega: ent,
                          });
                        });

                        listaHistoricoCusto.forEach((h: any, idxH: number) => {
                          const tsH = parseTs(h.data || relItem.dataUltimoReajuste);
                          const notasAteAqui = entregasComAcumulado.filter(
                            (e) => e._ts <= tsH || tsH === 0,
                          );
                          const acmAteAqui =
                            notasAteAqui.length > 0
                              ? notasAteAqui[notasAteAqui.length - 1].acumuladoAteMomento
                              : Number(h.quantidadeEntregue || relItem.quantidadeEntregue || 0);

                          eventosTimeline.push({
                            tipoEvento: 'ATUALIZACAO_CUSTO',
                            ts: tsH,
                            ordemDesempate: 2 + idxH,
                            hist: h,
                            acumuladoAteDataCusto: acmAteAqui,
                            notasAteDataCusto: notasAteAqui,
                          });
                        });

                        eventosTimeline.sort((a, b) =>
                          b.ts !== a.ts ? b.ts - a.ts : a.ordemDesempate - b.ordemDesempate,
                        );

                        return (
                          <div>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '0.35rem',
                                marginBottom: '0.5rem',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  color: '#334155',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                }}
                              >
                                <History size={15} color="#3b82f6" /> Linha do Tempo de
                                Atualizações de Custo & Entregas ({eventosTimeline.length}{' '}
                                evento(s)):
                              </div>
                              {totalAcumuladoGeral > 0 && (
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    background: '#dbeafe',
                                    color: '#1e40af',
                                    border: '1px solid #93c5fd',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '999px',
                                    fontWeight: 800,
                                  }}
                                >
                                  ∑ Acumulado Entregue (ACM):{' '}
                                  {totalAcumuladoGeral.toLocaleString('pt-BR')} un.
                                  {entregasComAcumulado.length > 0
                                    ? ` (${entregasComAcumulado.length} NF${entregasComAcumulado.length > 1 ? 's' : ''})`
                                    : ''}
                                </span>
                              )}
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.6rem',
                                maxHeight: '360px',
                                overflowY: 'auto',
                                paddingRight: '0.25rem',
                              }}
                            >
                              {eventosTimeline.map((ev, idxEv) => {
                                if (ev.tipoEvento === 'ENTREGA_NF') {
                                  const ent = ev.entrega;
                                  const isComp =
                                    ent.regimeEntrega === 'CUSTO_SUPERIOR_VENDIDO_PRECO_ANTIGO';
                                  const cCompra = Number(
                                    ent.custoCompraUnitario ||
                                      (isComp ? m.custoAtual : m.custoContrato) ||
                                      0,
                                  );
                                  const vNf = Number(
                                    ent.valorFaturadoUnitario || m.valorFechado || 0,
                                  );
                                  const compVal = isComp
                                    ? Math.max(0, cCompra - m.custoContrato) * ent.qtdNota
                                    : 0;

                                  return (
                                    <div
                                      key={`ent-${idxEv}`}
                                      style={{
                                        borderLeft: `4px solid ${isComp ? '#f59e0b' : '#2563eb'}`,
                                        padding: '0.55rem 0.75rem',
                                        background: isComp ? '#fffbeb' : '#eff6ff',
                                        borderRadius: '0 6px 6px 0',
                                        borderTop: `1px solid ${isComp ? '#fde68a' : '#bfdbfe'}`,
                                        borderRight: `1px solid ${isComp ? '#fde68a' : '#bfdbfe'}`,
                                        borderBottom: `1px solid ${isComp ? '#fde68a' : '#bfdbfe'}`,
                                        fontSize: '0.75rem',
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          fontWeight: 800,
                                          color: '#0f172a',
                                          marginBottom: '0.3rem',
                                          flexWrap: 'wrap',
                                          gap: '0.25rem',
                                        }}
                                      >
                                        <span style={{ color: '#1e3a8a' }}>
                                          🚚 {ent.ordemEntrega}ª ENTREGA REALIZADA — NF:{' '}
                                          <strong
                                            style={{
                                              background: '#ffffff',
                                              padding: '0.05rem 0.35rem',
                                              borderRadius: '4px',
                                              border: '1px solid #93c5fd',
                                              color: '#1d4ed8',
                                            }}
                                          >
                                            {ent.notaFiscal || 'S/N'}
                                          </strong>
                                          {ent.notaEmpenho ? ` | NE: ${ent.notaEmpenho}` : ''}
                                        </span>
                                        <span style={{ color: '#334155', fontSize: '0.73rem' }}>
                                          📅 Data da Entrega:{' '}
                                          <strong>
                                            {ent.dataEntrega
                                              ? formatDateSafe(ent.dataEntrega)
                                              : '-'}
                                          </strong>
                                        </span>
                                      </div>

                                      <div
                                        style={{
                                          display: 'grid',
                                          gridTemplateColumns: '1fr 1fr',
                                          gap: '0.3rem',
                                          background: '#ffffff',
                                          padding: '0.35rem 0.5rem',
                                          borderRadius: '4px',
                                          border: '1px solid #e2e8f0',
                                          marginBottom: '0.3rem',
                                        }}
                                      >
                                        <div>
                                          📦 Qtd. Entregue na Nota:{' '}
                                          <strong style={{ color: '#1d4ed8', fontSize: '0.82rem' }}>
                                            {ent.qtdNota.toLocaleString('pt-BR')} un.
                                          </strong>
                                        </div>
                                        <div>
                                          📊 Somatório Acumulado (ACM):{' '}
                                          <strong style={{ color: '#047857', fontSize: '0.82rem' }}>
                                            {ent.acumuladoAteMomento.toLocaleString('pt-BR')} un.
                                          </strong>
                                          {ent.saldoRestanteMomento !== null && (
                                            <span style={{ color: '#64748b', fontSize: '0.68rem' }}>
                                              {' '}
                                              (Saldo: {ent.saldoRestanteMomento.toLocaleString('pt-BR')} un.)
                                            </span>
                                          )}
                                        </div>
                                        <div style={{ gridColumn: '1 / -1', color: '#334155' }}>
                                          🏛️ Órgão Pai: <strong>{relItem.orgaoNome}</strong> → 📍
                                          Unidade Filha / Local Entregue:{' '}
                                          <strong style={{ color: '#1e40af' }}>
                                            {ent.comandoDestino || relItem.orgaoNome}
                                          </strong>
                                        </div>
                                      </div>

                                      <div
                                        style={{
                                          fontWeight: 700,
                                          fontSize: '0.72rem',
                                          color: isComp ? '#92400e' : '#15803d',
                                        }}
                                      >
                                        {isComp ? (
                                          <>
                                            ⚠️ Entregue antes do reajuste: Comprado c/ custo superior
                                            ({formatCurrency(cCompra)}) e faturado na NF c/ preço antigo
                                            ({formatCurrency(vNf)}) →{' '}
                                            <strong style={{ color: '#b91c1c' }}>
                                              Compensar {formatCurrency(compVal)}
                                            </strong>
                                          </>
                                        ) : (
                                          <>
                                            ✅ Entregue c/ preços iguais aos da assinatura do 1º
                                            contrato (Custo {formatCurrency(cCompra)} | Venda NF{' '}
                                            {formatCurrency(vNf)})
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  );
                                }

                                const h = ev.hist;
                                const cContr = h.precoCustoContrato ?? m.custoContrato;
                                const cAtu = h.precoCustoAtual ?? m.custoAtual;
                                const vFech = h.valorFechadoOrgao ?? m.valorFechado;
                                const vVendaReaj =
                                  h.valorVendaReajuste && Number(h.valorVendaReajuste) > 0
                                    ? Number(h.valorVendaReajuste)
                                    : m.valorVendaPosReajuste || vFech;
                                const lucroC = vFech - cContr;
                                const percC = cContr > 0 ? (lucroC / cContr) * 100 : 0;
                                const diffSemReajuste = vFech - cAtu;
                                const lucroComNovaVenda = vVendaReaj - cAtu;
                                const jaTemNovaVenda = vVendaReaj > vFech;

                                return (
                                  <div
                                    key={`hist-${idxEv}`}
                                    style={{
                                      borderLeft: `3px solid ${lucroComNovaVenda < 0 ? '#ef4444' : '#10b981'}`,
                                      padding: '0.5rem 0.75rem',
                                      background: '#f8fafc',
                                      borderRadius: '0 6px 6px 0',
                                      fontSize: '0.76rem',
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontWeight: 700,
                                        color: '#0f172a',
                                        marginBottom: '0.25rem',
                                        flexWrap: 'wrap',
                                        gap: '0.25rem',
                                      }}
                                    >
                                      <span>
                                        📅 Data da Atualização:{' '}
                                        {h.data ? formatDateSafe(h.data) : m.dataAtualizacaoStr}
                                      </span>
                                      <span style={{ color: '#475569' }}>
                                        Assinatura Contrato:{' '}
                                        {h.dataAssinaturaContrato
                                          ? formatDateSafe(
                                              h.dataAssinaturaContrato,
                                              m.dataAssinaturaStr,
                                            )
                                          : m.dataAssinaturaStr}
                                      </span>
                                    </div>

                                    {ev.acumuladoAteDataCusto > 0 && (
                                      <div
                                        style={{
                                          background: '#eff6ff',
                                          border: '1px solid #bfdbfe',
                                          borderRadius: '4px',
                                          padding: '0.25rem 0.45rem',
                                          marginBottom: '0.3rem',
                                          fontSize: '0.72rem',
                                          color: '#1e3a8a',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          flexWrap: 'wrap',
                                          gap: '0.25rem',
                                        }}
                                      >
                                        <span>
                                          📦 <strong>Somatório Acumulado (ACM) até esta data:</strong>{' '}
                                          <strong style={{ color: '#047857' }}>
                                            {ev.acumuladoAteDataCusto.toLocaleString('pt-BR')} un.
                                          </strong>
                                        </span>
                                        {ev.notasAteDataCusto.length > 0 && (
                                          <span>
                                            🧾 NFs:{' '}
                                            <strong>
                                              {ev.notasAteDataCusto
                                                .map(
                                                  (n) =>
                                                    `${n.notaFiscal || 'S/N'} (${n.qtdNota} un.)`,
                                                )
                                                .join(', ')}
                                            </strong>
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    <div
                                      style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '0.25rem',
                                        color: '#334155',
                                        marginBottom: '0.3rem',
                                      }}
                                    >
                                      <div>
                                        Custo na Assinatura:{' '}
                                        <strong style={{ color: '#166534' }}>
                                          {formatCurrency(cContr)}
                                        </strong>
                                      </div>
                                      <div>
                                        Venda na Assinatura:{' '}
                                        <strong style={{ color: '#1e40af' }}>
                                          {formatCurrency(vFech)}
                                        </strong>
                                      </div>
                                      <div>
                                        Lucro na Assinatura:{' '}
                                        <strong style={{ color: '#15803d' }}>
                                          {formatCurrency(lucroC)} ({percC.toFixed(2)}%)
                                        </strong>
                                      </div>
                                      <div>
                                        Novo Custo Cotação:{' '}
                                        <strong style={{ color: '#b91c1c' }}>
                                          {formatCurrency(cAtu)}
                                        </strong>
                                      </div>
                                      {jaTemNovaVenda && (
                                        <>
                                          <div>
                                            Nova Proposta Venda:{' '}
                                            <strong style={{ color: '#6d28d9' }}>
                                              {formatCurrency(vVendaReaj)}
                                            </strong>
                                          </div>
                                          <div>
                                            Novo Lucro Unit.:{' '}
                                            <strong
                                              style={{
                                                color:
                                                  lucroComNovaVenda < 0 ? '#b91c1c' : '#15803d',
                                              }}
                                            >
                                              {formatCurrency(lucroComNovaVenda)}
                                            </strong>
                                          </div>
                                        </>
                                      )}
                                    </div>

                                    <div
                                      style={{
                                        fontWeight: 700,
                                        color: lucroComNovaVenda < 0 ? '#b91c1c' : '#047857',
                                        marginBottom: '0.25rem',
                                      }}
                                    >
                                      {jaTemNovaVenda && lucroComNovaVenda >= 0
                                        ? `✅ Com a Nova Venda (${formatCurrency(vVendaReaj)}), NÃO há prejuízo: Lucro de ${formatCurrency(lucroComNovaVenda)}/un. (Obs: sem reajuste, vendendo a ${formatCurrency(vFech)}, daria ${diffSemReajuste < 0 ? `prejuízo de ${formatCurrency(Math.abs(diffSemReajuste))}/un.` : `lucro de apenas ${formatCurrency(diffSemReajuste)}/un.`})`
                                        : diffSemReajuste < 0
                                          ? `🔻 Mantendo o preço antigo (${formatCurrency(vFech)}) c/ novo custo (${formatCurrency(cAtu)}), há prejuízo de ${formatCurrency(Math.abs(diffSemReajuste))}/un. (Reajuste mínimo sugerido: ${formatCurrency(cAtu + Math.max(0, lucroC))})`
                                          : `✅ Margem atual: ${formatCurrency(lucroComNovaVenda)}/un.`}
                                    </div>

                                    {h.informe && (
                                      <div
                                        style={{
                                          color: '#64748b',
                                          fontSize: '0.72rem',
                                          fontStyle: 'italic',
                                        }}
                                      >
                                        {h.informe}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Lista de Fornecedores Cotados */}
                      {p.cotacoes && p.cotacoes.length > 0 && (
                        <div
                          style={{
                            borderTop: '1px dashed #cbd5e1',
                            paddingTop: '0.5rem',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: '#64748b',
                              marginBottom: '0.4rem',
                            }}
                          >
                            Fornecedores Registrados neste Item:
                          </div>
                          {p.cotacoes.map((c: any) => (
                            <div
                              key={c.fornecedorId}
                              style={{
                                fontSize: '0.78rem',
                                borderLeft: '3px solid #cbd5e1',
                                paddingLeft: '0.6rem',
                                marginBottom: '0.4rem',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontWeight: 600,
                                  color: '#475569',
                                }}
                              >
                                <Building2 size={13} color="#64748b" />
                                <span>{c.razaoSocial}</span>
                              </div>
                              <div style={{ color: '#64748b' }}>
                                Custo Contrato:{' '}
                                <strong>
                                  {formatCurrency(
                                    c.precoCustoContrato ?? c.precoUnitario,
                                  )}
                                </strong>{' '}
                                | Custo Atual:{' '}
                                <strong style={{ color: '#b91c1c' }}>
                                  {formatCurrency(c.precoUnitario)}
                                </strong>{' '}
                                <span style={{ fontSize: '0.7rem' }}>
                                  (
                                  {new Date(c.data).toLocaleDateString('pt-BR')}
                                  )
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* COLUNA 3: Quadro Resumo de Contrato x Custo Atual e Botões de Impressão (.XLS e .DOC) */}
                  <td style={{ verticalAlign: 'top' }}>
                    <div
                      style={{
                        background: '#f8fafc',
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      {editandoId === getRowKey(p) ? (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.6rem',
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 700,
                              color: '#0f172a',
                              fontSize: '0.85rem',
                              marginBottom: '0.2rem',
                            }}
                          >
                            ✏️ Atualizar Custos, Contrato e Histórico
                          </div>

                          <div>
                            <label
                              style={{
                                fontSize: '0.73rem',
                                color: '#334155',
                                fontWeight: 700,
                                display: 'block',
                              }}
                            >
                              Situação / Motivo da Atualização Contratual
                            </label>
                            <select
                              className="form-control"
                              value={editValues.motivoContrato}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues,
                                  motivoContrato: e.target.value,
                                })
                              }
                            >
                              <option value="REAJUSTE_PRECO">
                                📈 Reajuste de Preço do Produto (Reequilíbrio Econômico-Financeiro)
                              </option>
                              <option value="INVIABILIDADE_OPERACIONAL">
                                ⚠️ Inviabilidade Operacional (Margem não cobre logística e pessoal)
                              </option>
                              <option value="DESCONTINUADO_FABRICANTE">
                                🏭 Produto não mais fabricado (Desistência / Falência da Empresa)
                              </option>
                            </select>
                          </div>

                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '0.5rem',
                            }}
                          >
                            <div>
                              <label
                                style={{
                                  fontSize: '0.73rem',
                                  color: '#166534',
                                  fontWeight: 700,
                                  display: 'block',
                                }}
                              >
                                Custo na Assinatura (R$)
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                value={editValues.precoCustoContrato}
                                onChange={(e) =>
                                  setEditValues({
                                    ...editValues,
                                    precoCustoContrato: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <label
                                style={{
                                  fontSize: '0.73rem',
                                  color: '#166534',
                                  fontWeight: 700,
                                  display: 'block',
                                }}
                              >
                                Data Assinatura
                              </label>
                              <input
                                type="date"
                                className="form-control"
                                value={editValues.dataAssinaturaContrato}
                                onChange={(e) =>
                                  setEditValues({
                                    ...editValues,
                                    dataAssinaturaContrato: e.target.value,
                                  })
                                }
                              />
                            </div>

                            <div>
                              <label
                                style={{
                                  fontSize: '0.73rem',
                                  color: '#1e40af',
                                  fontWeight: 700,
                                  display: 'block',
                                }}
                              >
                                Preço de Venda Contrato (R$)
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                value={editValues.valorFechadoOrgao}
                                onChange={(e) =>
                                  setEditValues({
                                    ...editValues,
                                    valorFechadoOrgao: e.target.value,
                                  })
                                }
                              />
                            </div>

                            <div>
                              <label
                                style={{
                                  fontSize: '0.73rem',
                                  color: '#1e40af',
                                  fontWeight: 700,
                                  display: 'block',
                                }}
                              >
                                Valor Ofertado Inicial (R$)
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                value={editValues.valorOfertadoOrgao}
                                onChange={(e) =>
                                  setEditValues({
                                    ...editValues,
                                    valorOfertadoOrgao: e.target.value,
                                  })
                                }
                              />
                            </div>

                            <div>
                              <label
                                style={{
                                  fontSize: '0.73rem',
                                  color: '#b91c1c',
                                  fontWeight: 700,
                                  display: 'block',
                                }}
                              >
                                Novo Custo Pós-Reajuste (R$)
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                value={editValues.precoCustoAtual}
                                onChange={(e) =>
                                  setEditValues({
                                    ...editValues,
                                    precoCustoAtual: e.target.value,
                                  })
                                }
                              />
                            </div>

                            <div>
                              <label
                                style={{
                                  fontSize: '0.73rem',
                                  color: '#7e22ce',
                                  fontWeight: 700,
                                  display: 'block',
                                }}
                              >
                                Novo Preço de Venda (R$)
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                value={editValues.valorVendaReajuste}
                                onChange={(e) =>
                                  setEditValues({
                                    ...editValues,
                                    valorVendaReajuste: e.target.value,
                                  })
                                }
                              />
                            </div>

                            <div>
                              <label
                                style={{
                                  fontSize: '0.73rem',
                                  color: '#b91c1c',
                                  fontWeight: 700,
                                  display: 'block',
                                }}
                              >
                                Data do Reajuste
                              </label>
                              <input
                                type="date"
                                className="form-control"
                                value={editValues.dataUltimoReajuste}
                                onChange={(e) =>
                                  setEditValues({
                                    ...editValues,
                                    dataUltimoReajuste: e.target.value,
                                  })
                                }
                              />
                            </div>

                            <div>
                              <label
                                style={{
                                  fontSize: '0.73rem',
                                  color: '#475569',
                                  fontWeight: 600,
                                  display: 'block',
                                }}
                              >
                                Qtd. Entregue (un.)
                              </label>
                              <input
                                type="number"
                                className="form-control"
                                value={editValues.quantidadeEntregue}
                                onChange={(e) =>
                                  setEditValues({
                                    ...editValues,
                                    quantidadeEntregue: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>

                          <div>
                            <label
                              style={{
                                fontSize: '0.73rem',
                                color: '#475569',
                                fontWeight: 600,
                                display: 'block',
                              }}
                            >
                              Órgão Contratante
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              value={editValues.orgaoNome}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues,
                                  orgaoNome: e.target.value,
                                })
                              }
                            />
                          </div>

                          <div>
                            <label
                              style={{
                                fontSize: '0.73rem',
                                color: '#475569',
                                fontWeight: 600,
                                display: 'block',
                              }}
                            >
                              Informe Importante / Justificativa de Reajuste
                            </label>
                            <textarea
                              className="form-control"
                              rows={3}
                              value={editValues.informe}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues,
                                  informe: e.target.value,
                                })
                              }
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => setEditandoId(null)}
                              className="btn-primary"
                              style={{
                                flex: 1,
                                background: '#e2e8f0',
                                color: '#334155',
                              }}
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              className="btn-primary"
                              style={{
                                flex: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem',
                              }}
                              onClick={() => handleSaveIntel(p)}
                            >
                              <Save size={16} /> Salvar e Sincronizar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.65rem',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderBottom: '1px solid #e2e8f0',
                              paddingBottom: '0.4rem',
                            }}
                          >
                            <strong
                              style={{ fontSize: '0.85rem', color: '#0f172a' }}
                            >
                              📊 Quadro Demonstrativo do Contrato
                            </strong>
                            <button
                              onClick={() => handleEditClick(p)}
                              style={{
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                borderRadius: '4px',
                                color: '#2563eb',
                                cursor: 'pointer',
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                              title="Editar ou atualizar custo e dados do contrato"
                            >
                              <Edit2 size={13} /> Atualizar Valores
                            </button>
                          </div>

                          {/* Bloco 1: Na Assinatura de Contrato */}
                          <div
                            style={{
                              background: '#f0fdf4',
                              border: '1px solid #86efac',
                              borderRadius: '6px',
                              padding: '0.55rem',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                color: '#166534',
                                textTransform: 'uppercase',
                                marginBottom: '0.35rem',
                              }}
                            >
                              1. Na Assinatura de Contrato ({m.dataAssinaturaStr})
                            </div>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 1fr',
                                gap: '0.4rem',
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '0.68rem', color: '#166534' }}>
                                  Custo Assinatura
                                </div>
                                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#15803d' }}>
                                  {formatCurrency(m.custoContrato)}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.68rem', color: '#1e40af' }}>
                                  Preço Venda (Órgão)
                                </div>
                                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1d4ed8' }}>
                                  {formatCurrency(m.valorFechado)}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.68rem', color: '#047857' }}>
                                  Lucro Assinatura
                                </div>
                                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#065f46' }}>
                                  {formatCurrency(m.lucroContratoUnit)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Bloco 2: Após Assinatura de Contrato (Reajuste — Novos Valores) */}
                          <div
                            style={{
                              background: '#eff6ff',
                              border: '1px solid #93c5fd',
                              borderRadius: '6px',
                              padding: '0.55rem',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                color: '#1e3a8a',
                                textTransform: 'uppercase',
                                marginBottom: '0.35rem',
                              }}
                            >
                              2. Após Assinatura — Reajuste ({m.dataAtualizacaoStr})
                            </div>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 1fr',
                                gap: '0.4rem',
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '0.68rem', color: '#991b1b' }}>
                                  Novo Custo Cotação
                                </div>
                                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#b91c1c' }}>
                                  {formatCurrency(m.custoAtual)}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.68rem', color: '#5b21b6' }}>
                                  Nova Proposta Venda
                                </div>
                                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#6d28d9' }}>
                                  {formatCurrency(m.valorVendaPosReajuste)}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.68rem', color: '#334155' }}>
                                  Novo Lucro Unit.
                                </div>
                                <div
                                  style={{
                                    fontSize: '0.92rem',
                                    fontWeight: 800,
                                    color:
                                      m.lucroPosReajusteUnit < 0
                                        ? '#b91c1c'
                                        : m.ficaInviavelOperacional
                                          ? '#b45309'
                                          : '#15803d',
                                  }}
                                >
                                  {formatCurrency(m.lucroPosReajusteUnit)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Diagnóstico Explicativo Claro: Com Reajuste vs Sem Reajuste */}
                          <div
                            style={{
                              padding: '0.65rem',
                              borderRadius: '6px',
                              background:
                                m.temPrejuizoPosReajuste || m.ficaInviavelOperacional
                                  ? '#fef2f2'
                                  : m.reajusteRecomposMargem
                                    ? '#f0fdf4'
                                    : m.fereAcordo
                                      ? '#fffbeb'
                                      : '#f0fdf4',
                              border: `1px solid ${
                                m.temPrejuizoPosReajuste || m.ficaInviavelOperacional
                                  ? '#f87171'
                                  : m.reajusteRecomposMargem
                                    ? '#4ade80'
                                    : m.fereAcordo
                                      ? '#fbbf24'
                                      : '#4ade80'
                              }`,
                            }}
                          >
                            {m.reajusteRecomposMargem ? (
                              <>
                                <div
                                  style={{
                                    fontSize: '0.8rem',
                                    fontWeight: 800,
                                    color: '#15803d',
                                    marginBottom: '0.3rem',
                                  }}
                                >
                                  ✅ COM A NOVA PROPOSTA ({formatCurrency(m.valorVendaPosReajuste)}), NÃO HÁ PREJUÍZO!
                                  <div style={{ fontSize: '0.76rem', color: '#166534', marginTop: '0.1rem' }}>
                                    🎯 Novo Lucro Garantido:{' '}
                                    <strong>{formatCurrency(m.lucroPosReajusteUnit)} por unidade</strong>{' '}
                                    ({formatCurrency(m.valorVendaPosReajuste)} venda − {formatCurrency(m.custoAtual)} custo)
                                  </div>
                                </div>

                                {(m.temPrejuizoDireto || m.ficaInviavelSemReajuste) && (
                                  <div
                                    style={{
                                      fontSize: '0.72rem',
                                      background: '#fffbeb',
                                      border: '1px solid #fde68a',
                                      borderRadius: '4px',
                                      padding: '0.35rem 0.45rem',
                                      color: '#92400e',
                                      marginBottom: '0.35rem',
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    <strong>💡 Por que o reajuste foi solicitado ao órgão?</strong>
                                    <br />
                                    Se mantivéssemos o{' '}
                                    <strong>preço antigo da assinatura ({formatCurrency(m.valorFechado)})</strong>{' '}
                                    pagando o <strong>novo custo ({formatCurrency(m.custoAtual)})</strong>, daria{' '}
                                    <strong style={{ color: '#b91c1c' }}>
                                      {m.temPrejuizoDireto
                                        ? `PREJUÍZO de ${formatCurrency(m.prejuizoUnitario)}/un.`
                                        : `lucro insuficiente de apenas ${formatCurrency(m.resultadoAtualUnit)}/un.`}
                                    </strong>{' '}
                                    ({formatCurrency(m.valorFechado)} − {formatCurrency(m.custoAtual)} ={' '}
                                    {formatCurrency(m.resultadoAtualUnit)}). Com o novo preço de{' '}
                                    <strong>{formatCurrency(m.valorVendaPosReajuste)}</strong>, o prejuízo deixa de existir!
                                  </div>
                                )}
                              </>
                            ) : (
                              <div
                                style={{
                                  fontSize: '0.8rem',
                                  fontWeight: 800,
                                  color:
                                    m.temPrejuizoPosReajuste || m.ficaInviavelOperacional
                                      ? '#b91c1c'
                                      : m.fereAcordo
                                        ? '#92400e'
                                        : '#166534',
                                  marginBottom: '0.25rem',
                                }}
                              >
                                {m.temPrejuizoPosReajuste
                                  ? `🔻 PREJUÍZO DE ${formatCurrency(Math.abs(m.lucroPosReajusteUnit))}/UN. (Mantendo venda em ${formatCurrency(m.valorVendaPosReajuste)} contra custo de ${formatCurrency(m.custoAtual)})`
                                  : m.ficaInviavelOperacional
                                    ? `⚠️ INVIÁVEL OPERACIONALMENTE: Mantendo a venda em ${formatCurrency(m.valorVendaPosReajuste)}, o lucro cai de ${formatCurrency(m.lucroContratoUnit)} para ${formatCurrency(m.lucroPosReajusteUnit)}/un. (não cobre logística e pessoal)`
                                    : m.aumentoCustoUnit > 0
                                      ? `📈 Reajuste de Custo (+${formatCurrency(m.aumentoCustoUnit)}/un.) | Nova Venda Proposta: ${formatCurrency(m.valorVendaPosReajuste)} (Lucro: ${formatCurrency(m.lucroPosReajusteUnit)}/un.)`
                                      : `✅ Custo dentro do previsto no contrato`}
                              </div>
                            )}

                            <div
                              style={{
                                fontSize: '0.72rem',
                                color: '#334155',
                                marginTop: '0.2rem',
                                borderTop: '1px dashed #cbd5e1',
                                paddingTop: '0.25rem',
                              }}
                            >
                              <strong>📐 Preço Mínimo de Referência p/ Reequilíbrio (Lei 14.133/2021):</strong>
                              <br />• Para manter o mesmo lucro da assinatura ({formatCurrency(m.lucroContratoUnit)}):{' '}
                              <strong style={{ color: '#047857' }}>
                                {formatCurrency(m.valorReajusteLucroFixo)}
                              </strong>{' '}
                              | Mantendo % ({m.percentualMarkupContrato.toFixed(2)}%):{' '}
                              <strong style={{ color: '#047857' }}>
                                {formatCurrency(m.valorReajustePercentual)}
                              </strong>
                            </div>
                          </div>

                          {/* Botões de Impressão / Download do Relatório Individual ou Contrato Completo */}
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.4rem',
                              marginTop: '0.2rem',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                gap: '0.5rem',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  handleExportarContratoCompleto(
                                    'XLS',
                                    relItem.pregaoNumero,
                                    relItem.uasg,
                                  )
                                }
                                style={{
                                  flex: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.35rem',
                                  padding: '0.55rem',
                                  background: '#10b981',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontWeight: 700,
                                  fontSize: '0.76rem',
                                  cursor: 'pointer',
                                }}
                                title="Imprime todos os itens convocados/contratados deste Pregão (ex: Itens 23, 24 e 140)"
                              >
                                <FileSpreadsheet size={15} /> Imprimir .XLS (Contrato)
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleExportarContratoCompleto(
                                    'DOC',
                                    relItem.pregaoNumero,
                                    relItem.uasg,
                                  )
                                }
                                style={{
                                  flex: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.35rem',
                                  padding: '0.55rem',
                                  background: '#2563eb',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontWeight: 700,
                                  fontSize: '0.76rem',
                                  cursor: 'pointer',
                                }}
                                title="Imprime todos os itens convocados/contratados deste Pregão (ex: Itens 23, 24 e 140)"
                              >
                                <FileText size={15} /> Imprimir .DOC (Contrato)
                              </button>
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                gap: '0.5rem',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  exportarRelatorioReajusteXLS([relItem])
                                }
                                style={{
                                  flex: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.3rem',
                                  padding: '0.35rem',
                                  background: '#ecfdf5',
                                  color: '#047857',
                                  border: '1px solid #6ee7b7',
                                  borderRadius: '5px',
                                  fontWeight: 700,
                                  fontSize: '0.68rem',
                                  cursor: 'pointer',
                                }}
                                title={`Imprime somente o Item ${relItem.numeroItem || ''}`}
                              >
                                <FileSpreadsheet size={13} /> Só Item {relItem.numeroItem || ''} (.XLS)
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  exportarRelatorioReajusteDOC([relItem])
                                }
                                style={{
                                  flex: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.3rem',
                                  padding: '0.35rem',
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  border: '1px solid #93c5fd',
                                  borderRadius: '5px',
                                  fontWeight: 700,
                                  fontSize: '0.68rem',
                                  cursor: 'pointer',
                                }}
                                title={`Imprime somente o Item ${relItem.numeroItem || ''}`}
                              >
                                <FileText size={13} /> Só Item {relItem.numeroItem || ''} (.DOC)
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && produtos.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  style={{
                    textAlign: 'center',
                    padding: '2rem',
                    color: '#94a3b8',
                  }}
                >
                  Nenhum produto encontrado para "{busca}". Clique em{' '}
                  <strong>
                    "⚓ Carregar Contrato Marinha (Pregão 51/2027 - Suco &
                    Arroz)"
                  </strong>{' '}
                  ou <strong>"Registrar Atualização / Produto"</strong> no topo
                  para cadastrar ou atualize diretamente lá no Painel de Cotação
                  da Oportunidade.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td
                  colSpan={3}
                  style={{
                    textAlign: 'center',
                    padding: '2rem',
                    color: '#3b82f6',
                  }}
                >
                  Carregando...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1rem',
          marginTop: '1rem',
        }}
      >
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="btn-primary"
          style={{ background: '#e2e8f0', color: '#475569' }}
        >
          Anterior
        </button>
        <span>
          Página {page} de {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="btn-primary"
          style={{ background: '#e2e8f0', color: '#475569' }}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
