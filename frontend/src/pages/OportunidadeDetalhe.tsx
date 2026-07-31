import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle, Trash2, ChevronDown, ChevronUp, X, ExternalLink, Copy, XCircle, RotateCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SimuladorTributario } from '../components/SimuladorTributario';
function CopyRow({ label, value }: { label: string, value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>{label}</div>
        <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={value || ''}>{value || 'N/A'}</div>
      </div>
      <button 
        onClick={() => {
          if(value) {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }
        }}
        title={copied ? "Copiado!" : "Copiar para área de transferência"}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#10b981' : '#3b82f6', padding: '0.5rem', transition: 'color 0.2s' }}
      >
        {copied ? <Check size={18} /> : <Copy size={18} />}
      </button>
    </div>
  );
}

function FornecedorPrecoInput({ item, f, pf, precoEmbalagemSalvo, handlePrecoComFator }: any) {
  const [precoStr, setPrecoStr] = useState(() => {
    const val = pf?.precoEmbalagem ?? precoEmbalagemSalvo;
    if (val === undefined || val === null) return '';
    return Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  });

  useEffect(() => {
    const val = pf?.precoEmbalagem ?? precoEmbalagemSalvo;
    if (val !== undefined && val !== null) {
      setPrecoStr(Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }));
    } else {
      setPrecoStr('');
    }
  }, [pf?.precoEmbalagem, precoEmbalagemSalvo]);

  const onBlurHandler = () => {
    handlePrecoComFator(item._id, f.id, precoStr);
    const parsed = parseFloat(precoStr.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(parsed)) {
      setPrecoStr(Number(parsed).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }));
    }
  };

  return (
    <input 
      type="text"
      className="form-control" 
      placeholder="0,0000"
      value={precoStr}
      onChange={(e) => setPrecoStr(e.target.value)}
      onBlur={onBlurHandler}
      style={{ width: '100%' }}
    />
  );
}

function AccordionItem({ item, index, columnsFornecedores, handlePrecoBlur, handleRemovePreco, novoFornecedorId, setNovoFornecedorId, cotacaoId, setCotacao, onLiveValoresChange }: any) {
  const [open, setOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isIntelligenceLoading, setIsIntelligenceLoading] = useState(false);
  const [intelligenceData, setIntelligenceData] = useState<any>(null);
  // fator de embalagem por fornecedor: quantas unidades tem cada embalagem/caixa cotada
  const [fatores, setFatores] = useState<Record<string, number>>({});
  const [nomesEmbalagem, setNomesEmbalagem] = useState<Record<string, string>>({});
  
  // Condições comerciais para desempate
  const [fretes, setFretes] = useState<Record<string, boolean>>({});
  const [parcelamentos, setParcelamentos] = useState<Record<string, boolean>>({});
  const [prazos, setPrazos] = useState<Record<string, number>>({});
  const [observacoes, setObservacoes] = useState<Record<string, string>>({});
  const [desclassificados, setDesclassificados] = useState<Record<string, boolean>>({});
  const [justificativasDesclassificacao, setJustificativasDesclassificacao] = useState<Record<string, string>>({});

  // Estados para Calculadora de Concorrência
  const initialConcorrente = item.produtoId?.valorConcorrente || item.valorConcorrente || '';
  const [precoConcorrenteStr, setPrecoConcorrenteStr] = useState(initialConcorrente ? Number(initialConcorrente).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}) : '');
  const precoConcorrente = parseFloat(precoConcorrenteStr.replace(/\./g, '').replace(',', '.')) || 0;

  const initialNossoLance = item.produtoId?.valorNossoLance || item.valorNossoLance || '';
  const [nossoLanceStr, setNossoLanceStr] = useState(initialNossoLance ? Number(initialNossoLance).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}) : '');
  const nossoLanceVal = parseFloat(nossoLanceStr.replace(/\./g, '').replace(',', '.')) || 0;

  const nossoCusto = item.melhorPreco ? item.melhorPreco.precoUnitario : 0;
  
  const [aliquotaImposto, setAliquotaImposto] = useState<number>(0);

  // Sugere cobrir a oferta por 1 centavo (0.0100)
  const sugestaoLance = precoConcorrente > 0 ? precoConcorrente - 0.01 : 0;
  const impostoSugestaoUnit = sugestaoLance * (aliquotaImposto / 100);
  const lucroSugestao = sugestaoLance - nossoCusto - impostoSugestaoUnit;
  const margemSugestao = nossoCusto > 0 ? (lucroSugestao / nossoCusto) * 100 : 0;
  const isViable = margemSugestao >= 11;

  const [cenarios, setCenarios] = useState<{a: number, b: number, c: number}>(() => {
    const saved = localStorage.getItem('sgl_cenarios_margem');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return { a: 30, b: 20, c: 10 };
  });

  useEffect(() => {
    localStorage.setItem('sgl_cenarios_margem', JSON.stringify(cenarios));
  }, [cenarios]);
  const isSigiloso = !item.valorUnitarioEstimado || item.valorUnitarioEstimado <= 0;

  useEffect(() => {
    if (onLiveValoresChange) {
      onLiveValoresChange(item._id, precoConcorrente, nossoLanceVal);
    }
  }, [precoConcorrente, nossoLanceVal]);

  const getFator = (fornecedorId: string) => {
    if (fatores[fornecedorId]) return fatores[fornecedorId];
    const pf = item.precosFornecedores?.find((p:any) => p.fornecedorId?._id === fornecedorId || p.fornecedorId === fornecedorId);
    return pf?.fatorEmbalagem || 1;
  };

  const getNomeEmbalagem = (fornecedorId: string) => {
    if (nomesEmbalagem[fornecedorId] !== undefined) return nomesEmbalagem[fornecedorId];
    const pf = item.precosFornecedores?.find((p:any) => p.fornecedorId?._id === fornecedorId || p.fornecedorId === fornecedorId);
    return pf?.nomeEmbalagem || 'pacote';
  };

  const getFrete = (fornecedorId: string) => {
    if (fretes[fornecedorId] !== undefined) return fretes[fornecedorId];
    const pf = item.precosFornecedores?.find((p:any) => p.fornecedorId?._id === fornecedorId || p.fornecedorId === fornecedorId);
    return pf?.freteIncluso || false;
  };

  const getParcelamento = (fornecedorId: string) => {
    if (parcelamentos[fornecedorId] !== undefined) return parcelamentos[fornecedorId];
    const pf = item.precosFornecedores?.find((p:any) => p.fornecedorId?._id === fornecedorId || p.fornecedorId === fornecedorId);
    return pf?.permiteParcelamento || false;
  };

  const getPrazo = (fornecedorId: string) => {
    if (prazos[fornecedorId] !== undefined) return prazos[fornecedorId];
    const pf = item.precosFornecedores?.find((p:any) => p.fornecedorId?._id === fornecedorId || p.fornecedorId === fornecedorId);
    return pf?.prazoPagamento || 0;
  };

  const getObservacao = (fornecedorId: string) => {
    if (observacoes[fornecedorId] !== undefined) return observacoes[fornecedorId];
    const pf = item.precosFornecedores?.find((p:any) => p.fornecedorId?._id === fornecedorId || p.fornecedorId === fornecedorId);
    return pf?.observacao || '';
  };

  const getDesclassificado = (fornecedorId: string) => {
    if (desclassificados[fornecedorId] !== undefined) return desclassificados[fornecedorId];
    const pf = item.precosFornecedores?.find((p:any) => p.fornecedorId?._id === fornecedorId || p.fornecedorId === fornecedorId);
    return pf?.desclassificado || false;
  };

  const getJustificativaDesclassificacao = (fornecedorId: string) => {
    if (justificativasDesclassificacao[fornecedorId] !== undefined) return justificativasDesclassificacao[fornecedorId];
    const pf = item.precosFornecedores?.find((p:any) => p.fornecedorId?._id === fornecedorId || p.fornecedorId === fornecedorId);
    return pf?.justificativaDesclassificacao || '';
  };

  const getLinkProduto = (fornecedorId: string) => {
    const pf = item.precosFornecedores?.find((p:any) => p.fornecedorId?._id === fornecedorId || p.fornecedorId === fornecedorId);
    return pf?.linkProduto || '';
  };

  const handleFatorChange = (fornecedorId: string, value: string) => {
    const n = Math.max(1, Number(value) || 1);
    setFatores(prev => ({ ...prev, [fornecedorId]: n }));
  };

  const handleNomeEmbalagemChange = (fornecedorId: string, value: string) => {
    setNomesEmbalagem(prev => ({ ...prev, [fornecedorId]: value }));
  };

  const handleObservacaoChange = (fornecedorId: string, value: string) => {
    setObservacoes(prev => ({ ...prev, [fornecedorId]: value }));
  };

  const handleCondicaoChange = (fornecedorId: string, field: 'frete' | 'parcelamento' | 'prazo' | 'desclassificado', value: any, extraJustificativa?: string) => {
    let override: any = {};
    if (field === 'frete') { setFretes(prev => ({ ...prev, [fornecedorId]: value })); override = { frete: value }; }
    if (field === 'parcelamento') { setParcelamentos(prev => ({ ...prev, [fornecedorId]: value })); override = { parcelamento: value }; }
    if (field === 'prazo') { setPrazos(prev => ({ ...prev, [fornecedorId]: value })); override = { prazo: value }; }
    if (field === 'desclassificado') { 
        setDesclassificados(prev => ({ ...prev, [fornecedorId]: value })); 
        override = { desclassificado: value, justificativa: extraJustificativa || "" }; 
        if (extraJustificativa !== undefined) {
            setJustificativasDesclassificacao(prev => ({ ...prev, [fornecedorId]: extraJustificativa }));
        }
    }
    handleSaveMetadados(fornecedorId, item._id, override);
  };

  // precoUnitario real = precoEmbalagem / fator
  const handlePrecoComFator = (itemId: string, fornecedorId: string, precoEmbalagem: string) => {
    const fator = getFator(fornecedorId);
    const nomeEmba = getNomeEmbalagem(fornecedorId);
    const embalagem = parseFloat(precoEmbalagem.replace(/\./g, '').replace(',', '.'));
    if (isNaN(embalagem)) return;
    const unitario = parseFloat((embalagem / fator).toFixed(6));
    handlePrecoBlur(itemId, fornecedorId, String(unitario), fator, embalagem, nomeEmba, getFrete(fornecedorId), getParcelamento(fornecedorId), getPrazo(fornecedorId), getObservacao(fornecedorId), getDesclassificado(fornecedorId));
  };

  const handleSaveMetadados = (fornecedorId: string, itemId: string, override: any = {}) => {
    const pf = item.precosFornecedores?.find((p:any) => p.fornecedorId?._id === fornecedorId || p.fornecedorId === fornecedorId);
    const precoEmba = pf?.precoEmbalagem ?? pf?.precoUnitario;
    if (precoEmba !== undefined) {
      const fator = getFator(fornecedorId);
      const nomeEmba = getNomeEmbalagem(fornecedorId);
      const unitario = parseFloat((precoEmba / fator).toFixed(6));
      
      const sendFrete = override.frete !== undefined ? override.frete : getFrete(fornecedorId);
      const sendParcelamento = override.parcelamento !== undefined ? override.parcelamento : getParcelamento(fornecedorId);
      const sendPrazo = override.prazo !== undefined ? override.prazo : getPrazo(fornecedorId);
      const sendDesclassificado = override.desclassificado !== undefined ? override.desclassificado : getDesclassificado(fornecedorId);
      const sendJustificativa = override.justificativa !== undefined ? override.justificativa : getJustificativaDesclassificacao(fornecedorId);

      handlePrecoBlur(itemId, fornecedorId, String(unitario), fator, precoEmba, nomeEmba, sendFrete, sendParcelamento, sendPrazo, getObservacao(fornecedorId), sendDesclassificado, sendJustificativa);
    }
  };

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', background: '#fff', overflow: 'hidden' }}>
      <div 
        onClick={() => setOpen(!open)}
        style={{ 
          padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          cursor: 'pointer', background: open ? '#f8fafc' : '#fff'
        }}
      >
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start' }}>
          <div style={{ width: '40%' }}>
            <span style={{ fontWeight: 500, color: '#334155', textTransform: 'uppercase' }}>
              {item.numeroItem || index + 1} {item.descricaoCurta || ((item.descricaoItem || item.descricao) ? (item.descricaoItem || item.descricao).split(' ')[0] : 'ITEM')}
            </span>
          </div>
          
          <div style={{ width: '60%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '4rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', width: '150px' }}>Qtde solicitada</span>
              <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>{item.quantidade || 1}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '4rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', width: '150px' }}>Valor estimado (unitário)</span>
              <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>{isSigiloso ? 'Sigiloso' : `R$ ${item.valorUnitarioEstimado.toLocaleString('pt-BR')}`}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {item.melhorPreco && (
            <span style={{ fontSize: '0.85rem', color: '#166534', background: '#f0fdf4', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>
              Melhor Oferta: R$ {item.melhorPreco.precoUnitario.toLocaleString('pt-BR')}
            </span>
          )}
          {open ? <ChevronUp size={24} color="#3b82f6" /> : <ChevronDown size={24} color="#3b82f6" />}
        </div>
      </div>
      
      {open && (
        <div style={{ padding: '1.5rem', borderTop: '1px solid #e2e8f0', background: '#fff' }}>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Descrição detalhada</span>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Você pode editar este campo se o PNCP trouxer a descrição incompleta</span>
            </p>
            <textarea 
              defaultValue={item.descricaoItem || item.descricao || 'Sem descrição'}
              onBlur={async (e) => {
                const newVal = e.target.value;
                if (newVal && newVal !== (item.descricaoItem || item.descricao)) {
                  try {
                    await fetch(`http://192.168.1.16:30000/produto/${item.produtoId || item._id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ descricao: newVal })
                    });
                  } catch (err) {
                    console.error('Falha ao atualizar descrição do item', err);
                  }
                }
              }}
              style={{ 
                width: '100%', minHeight: '60px', padding: '0.5rem', 
                fontSize: '0.85rem', color: '#334155', lineHeight: 1.5, 
                border: '1px solid #cbd5e1', borderRadius: '4px', resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem' }}>Quantidade solicitada</p>
              <p style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>{item.quantidade || 1}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem' }}>Unidade de fornecimento</p>
              <p style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>{item.unidadeMedida || 'Unidade'}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem' }}>Critério de julgamento</p>
              <p style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>Menor Preço</p>
            </div>

            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem' }}>Valor estimado (unitário)</p>
              <p style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>{isSigiloso ? 'Sigiloso' : `R$ ${item.valorUnitarioEstimado.toLocaleString('pt-BR')}`}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem' }}>Valor estimado (total)</p>
              <p style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>{isSigiloso ? 'Sigiloso' : `R$ ${(item.valorUnitarioEstimado * (item.quantidade || 1)).toLocaleString('pt-BR')}`}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem' }}>Orçamento sigiloso</p>
              <p style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>{isSigiloso ? 'Sim' : 'Não'}</p>
            </div>

            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem' }}>Intervalo mínimo entre Lances</p>
              <p style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>R$ 0,0500</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem' }}>Tratamento diferenciado</p>
              <p style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>Não</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem' }}>Aplicabilidade margem de preferência</p>
              <p style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>Não</p>
            </div>

            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem' }}>Exigência de conteúdo nacional</p>
              <p style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>Não</p>
            </div>
          </div>
          
          <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, color: '#0f172a', fontSize: '0.95rem' }}>Valores Ofertados pelos Fornecedores <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: '0.5rem', fontWeight: 500 }}>({item.precosFornecedores?.length || 0} na lista)</span></h4>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  disabled={isIntelligenceLoading}
                  onClick={async () => {
                     setIsIntelligenceLoading(true);
                     try {
                       let keyword = 'Produto';
                       const desc: string = item.descricaoItem || item.descricao || item.descricaoCurta || '';
                       
                       // A descrição geralmente começa com o nome do produto, seguido de vírgulas. Ex: "ACUCAR, TIPO CRISTAL..."
                       // Extrai tudo até a primeira vírgula ou ponto.
                       let extracted = desc.split(/[,.]/)[0].trim();
                       
                       // Remove caracteres especiais, deixando apenas letras, números e espaços
                       extracted = extracted.replace(/[^a-zA-ZÀ-ÿ0-9 ]/g, '').trim();

                       // Se tiver mais de 2 palavras, tenta pegar a primeira palavra principal
                       const words = extracted.split(/[ -]+/);
                       if (words.length > 0 && words[0].length >= 3) {
                          keyword = words[0];
                       } else if (words.length > 1 && words[1].length >= 3) {
                          keyword = words.slice(0, 2).join(' ');
                       } else if (extracted.length >= 3) {
                          keyword = extracted;
                       } else {
                          keyword = 'Produto';
                       }

                       if (!keyword || keyword.trim() === '') {
                          keyword = 'Produto';
                       }
                       
                       // Busca a UF real configurada no Robô
                       let uf = 'CE'; // fallback
                       try {
                         const perfisRes = await fetch('http://192.168.1.16:30000/perfis-busca');
                         if (perfisRes.ok) {
                           const perfis = await perfisRes.json();
                           const perfilAtivo = perfis.find((p: any) => p.ativo);
                           if (perfilAtivo && perfilAtivo.estadosBuscaFornecedores && perfilAtivo.estadosBuscaFornecedores.length > 0) {
                             uf = perfilAtivo.estadosBuscaFornecedores[0];
                           }
                         }
                       } catch(err) {
                         console.warn('Erro ao buscar perfil do robô, usando uf fallback CE', err);
                       }

                       const res = await fetch(`http://192.168.1.16:30000/pncp/inteligencia-precos?keyword=${encodeURIComponent(keyword)}&uf=${uf}`);
                       if (res.ok) {
                          const data = await res.json();
                          setIntelligenceData(data);
                       } else {
                          setIntelligenceData({ error: "Nenhum histórico de preço encontrado." });
                       }
                     } catch(e) {
                        console.error(e);
                        setIntelligenceData({ error: "Nenhum histórico de preço encontrado." });
                     } finally {
                        setIsIntelligenceLoading(false);
                     }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.4rem 0.8rem', background: isIntelligenceLoading ? '#fcd34d' : '#f59e0b', color: '#fff',
                    border: 'none', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: isIntelligenceLoading ? 'not-allowed' : 'pointer'
                  }}
                  title="Espião de Preços Governamentais (Histórico de licitações recentes)"
                >
                  {isIntelligenceLoading ? 'Consultando...' : '👁️ Espião de Preços'}
                </button>
                <button
                  type="button"
                  disabled={isSearching}
                  onClick={async () => {
                     // Busca 100% Automática e Direta (sem popup)
                     setIsSearching(true);
                     try {
                       const res = await fetch(`http://192.168.1.16:30000/cotacoes/${cotacaoId}/itens/${item._id}/buscar-web`, { 
                         method: 'POST',
                         headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify({}) // Backend pega do PerfilBusca automaticamente
                       });
                       if (res.ok) {
                          const data = await res.json();
                          setTimeout(() => alert(`Busca concluída! ${data.encontrados} fornecedores encontrados.`), 100);
                          if (setCotacao) {
                             const updatedRes = await fetch(`http://192.168.1.16:30000/cotacoes/${cotacaoId}`);
                             const updatedData = await updatedRes.json();
                             setCotacao(updatedData);
                          }
                       } else {
                          alert('Erro ao buscar fornecedores na web.');
                       }
                     } catch(e) {
                        console.error(e);
                        setTimeout(() => alert('Erro na requisição ao robô.'), 100);
                     } finally {
                        setIsSearching(false);
                     }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.4rem 0.8rem', background: isSearching ? '#94a3b8' : '#3b82f6', color: '#fff',
                    border: 'none', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: isSearching ? 'not-allowed' : 'pointer'
                  }}
                  title="Busca automática de Fornecedores na Web (Baseada nos Filtros do Robô)"
                >
                  {isSearching ? <><RotateCw size={14} style={{ animation: 'spin 1.2s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite' }} /> Buscando...</> : '🤖 Buscar CNPJs B2B'}
                </button>
                <button
                  type="button"
                  disabled={isSearching}
                  onClick={async () => {
                     const loc = window.prompt("📍 BUSCA DE EMPRESA ESPECÍFICA\n\nQual o nome da empresa que você deseja puxar? (Ex: GD7, Donizete)");
                     if (loc === null || loc.trim() === '') return;
                     
                     if (!window.confirm("Essa operação consumirá créditos da sua conta SerpApi.\nDeseja continuar?")) return;

                     // Garante que o prefixo BUSCAR: exista para que o backend entenda como override
                     const overrideLoc = loc.trim().toUpperCase().startsWith('BUSCAR') ? loc.trim() : `BUSCAR: ${loc.trim()}`;

                     setIsSearching(true);
                     try {
                       const res = await fetch(`http://192.168.1.16:30000/cotacoes/${cotacaoId}/itens/${item._id}/buscar-web`, { 
                         method: 'POST',
                         headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify({ location: overrideLoc })
                       });
                       if (res.ok) {
                          const data = await res.json();
                          setTimeout(() => alert(`Busca concluída! ${data.encontrados} fornecedores encontrados.`), 100);
                          if (setCotacao) {
                             const updatedRes = await fetch(`http://192.168.1.16:30000/cotacoes/${cotacaoId}`);
                             const updatedData = await updatedRes.json();
                             setCotacao(updatedData);
                          }
                       } else {
                          alert('Erro ao buscar fornecedores na web.');
                       }
                     } catch(e) {
                        console.error(e);
                        setTimeout(() => alert('Erro na requisição ao robô.'), 100);
                     } finally {
                        setIsSearching(false);
                     }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0.4rem 0.6rem', background: isSearching ? '#cbd5e1' : '#64748b', color: '#fff',
                    border: 'none', borderRadius: '4px', cursor: isSearching ? 'not-allowed' : 'pointer'
                  }}
                  title="Busca Manual de Empresa Específica (Override)"
                >
                  <Search size={14} />
                </button>
              </div>
            </div>

            {intelligenceData && intelligenceData.error ? (
              <div style={{ marginBottom: '1.5rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '1rem' }}>
                <h5 style={{ margin: '0', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={16} /> {intelligenceData.error}
                </h5>
              </div>
            ) : intelligenceData && (
              <div style={{ marginBottom: '1.5rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '1rem' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={16} /> Relatório de Inteligência PNCP (Últimos 6 Meses - UF: CE)
                </h5>
                {intelligenceData.baixaConfianca && (
                  <p style={{ margin: '0 0 0.5rem 0', color: '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}>
                    ⚠️ Baseado em apenas {intelligenceData.amostraEncontrada || 0} registro(s) — os dados podem não representar a realidade do mercado.
                  </p>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                  <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #fef3c7' }}>
                    <p style={{ fontSize: '0.75rem', color: '#92400e', margin: 0 }}>Menor Preço Encontrado</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', margin: '0.2rem 0 0 0' }}>
                      R$ {intelligenceData.precoMinimo > 0 ? (intelligenceData.precoMinimo).toLocaleString('pt-BR', {minimumFractionDigits: 2}) : 'N/A'}
                    </p>
                  </div>
                  <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #fef3c7' }}>
                    <p style={{ fontSize: '0.75rem', color: '#92400e', margin: 0 }}>Preço Médio Praticado</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', margin: '0.2rem 0 0 0' }}>
                      R$ {intelligenceData.precoMedio > 0 ? (intelligenceData.precoMedio).toLocaleString('pt-BR', {minimumFractionDigits: 2}) : 'N/A'}
                    </p>
                  </div>
                  <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #fef3c7' }}>
                    <p style={{ fontSize: '0.75rem', color: '#92400e', margin: 0 }}>Maior Preço Encontrado</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', margin: '0.2rem 0 0 0' }}>
                      R$ {intelligenceData.precoMaximo > 0 ? (intelligenceData.precoMaximo).toLocaleString('pt-BR', {minimumFractionDigits: 2}) : 'N/A'}
                    </p>
                  </div>
                </div>
                {intelligenceData.topVencedores && intelligenceData.topVencedores.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <h6 style={{ margin: '0 0 1rem 0', color: '#166534', fontSize: '0.85rem' }}>🏆 Fornecedores Vencedores</h6>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {intelligenceData.topVencedores.map((v: any, idx: number) => (
                        <span key={idx} style={{ background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500, border: '1px solid #fde68a' }}>
                          {v.nome} ({v.vitorias} vitórias)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              {columnsFornecedores
                .filter((f: any) => {
                  const pf = item.precosFornecedores?.find((p:any) => p.fornecedorId?._id === f.id || p.fornecedorId === f.id);
                  return pf || f.id === novoFornecedorId;
                })
                .map((f: any) => {
                const pf = item.precosFornecedores?.find((p:any) => p.fornecedorId?._id === f.id || p.fornecedorId === f.id);
                const isMelhor = item.melhorPreco && pf && item.melhorPreco.fornecedorId === f.id;
                const fator = getFator(f.id);
                // precoEmbalagem = precoUnitario * fator (para mostrar de volta o valor da embalagem quando já cotado)
                const precoEmbalagemSalvo = pf ? parseFloat((pf.precoUnitario * fator).toFixed(6)) : undefined;
                const precoUnitCalc = pf ? pf.precoUnitario : null;

                const isDesclassificado = getDesclassificado(f.id);

                return (
                  <div key={f.id} style={{ 
                    padding: '1rem', border: '1px solid', borderColor: isMelhor ? '#10b981' : isDesclassificado ? '#f87171' : '#e2e8f0', 
                    borderRadius: '6px', background: isMelhor ? '#f0fdf4' : isDesclassificado ? '#fef2f2' : '#f8fafc', minWidth: '200px', maxWidth: '260px', flex: '1 1 200px',
                    opacity: isDesclassificado ? 0.75 : 1
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem', gap: '0.25rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', lineHeight: 1.3, wordBreak: 'break-word', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {f.razaoSocial}
                        {getLinkProduto(f.id) && (
                            <a href={getLinkProduto(f.id)} target="_blank" rel="noreferrer" title="Ver Produto na Loja">
                            <ExternalLink size={14} color="#3b82f6" />
                            </a>
                        )}
                      </div>
                      <button
                        title={pf ? "Remover cotação deste fornecedor" : "Cancelar adição"}
                        onClick={() => {
                          if (pf) {
                            handleRemovePreco(item._id, f.id);
                          } else if (setNovoFornecedorId) {
                            setNovoFornecedorId('');
                          }
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px', flexShrink: 0 }}
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Fator de embalagem */}
                    <div style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>
                          Embalagem Cotada
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          list="unidades-medida"
                          placeholder="Ex: pacote"
                          defaultValue={getNomeEmbalagem(f.id)}
                          onChange={(e) => handleNomeEmbalagemChange(f.id, e.target.value)}
                          onBlur={() => handleSaveMetadados(f.id, item._id)}
                          style={{ width: '100%', fontSize: '0.8rem' }}
                          title="Qual é a unidade de medida fechada fornecida (ex: pacote, fardo, caixa, unidade)"
                        />
                        <datalist id="unidades-medida">
                          <option value="pacote" />
                          <option value="caixa" />
                          <option value="fardo" />
                          <option value="tira" />
                          <option value="rolo" />
                          <option value="galão" />
                          <option value="litro" />
                          <option value="kg" />
                          <option value="unidade" />
                          <option value="kit" />
                          <option value="peça" />
                        </datalist>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem', whiteSpace: 'nowrap' }} title="Não é a quantidade total! É quantos itens vêm dentro de 1 embalagem.">
                          Itens por Embalagem
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="form-control"
                          placeholder="1"
                          value={getFator(f.id) || 1}
                          onChange={(e) => handleFatorChange(f.id, e.target.value)}
                          onBlur={() => handleSaveMetadados(f.id, item._id)}
                          style={{ width: '100%', fontSize: '0.8rem' }}
                          title="Atenção: NÃO é a quantidade total do edital. É apenas quantos itens vêm dentro de 1 embalagem."
                        />
                      </div>
                    </div>

                    {/* Preço da embalagem */}
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem', fontWeight: 600 }}>
                        {fator > 1 ? `Preço Custo de 1 ${getNomeEmbalagem(f.id)} (${fator} un.)` : `Preço Custo de 1 ${getNomeEmbalagem(f.id)}`}
                      </label>
                      <FornecedorPrecoInput 
                        item={item}
                        f={f}
                        pf={pf}
                        precoEmbalagemSalvo={precoEmbalagemSalvo}
                        handlePrecoComFator={handlePrecoComFator}
                      />
                    </div>

                    {/* Marca / Descrição / Observação */}
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem', fontWeight: 600 }}>
                        Marca / Descrição do Produto
                      </label>
                      <input 
                        type="text"
                        className="form-control"
                        placeholder="Ex: Fralda marca: Hipopó RN"
                        value={getObservacao(f.id)}
                        onChange={(e) => handleObservacaoChange(f.id, e.target.value)}
                        onBlur={() => handleSaveMetadados(f.id, item._id)}
                        style={{ width: '100%', fontSize: '0.8rem' }}
                      />
                    </div>

                    {/* Condições Comerciais (Desempate) */}
                    <div style={{ marginBottom: '0.75rem', padding: '0.5rem', background: '#e2e8f0', borderRadius: '4px', border: '1px dashed #cbd5e1' }}>
                      <p style={{ fontSize: '0.65rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Vantagens Comerciais (Desempate)</p>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#334155', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={getFrete(f.id)} 
                            onChange={(e) => handleCondicaoChange(f.id, 'frete', e.target.checked)} 
                          />
                          Frete Grátis Incluso
                        </label>
                        
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#334155', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={getParcelamento(f.id)} 
                            onChange={(e) => handleCondicaoChange(f.id, 'parcelamento', e.target.checked)} 
                          />
                          Permite Parcelamento
                        </label>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#334155' }}>Carência (dias):</span>
                          <input 
                            type="number" 
                            min="0"
                            style={{ width: '60px', padding: '0.2rem', fontSize: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                            value={getPrazo(f.id)}
                            onChange={(e) => handleCondicaoChange(f.id, 'prazo', Number(e.target.value))}
                          />
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#991b1b', cursor: 'pointer', marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid #cbd5e1' }}>
                          <input 
                            type="checkbox" 
                            checked={getDesclassificado(f.id)} 
                            onChange={(e) => {
                                const checked = e.target.checked;
                                if (checked) {
                                    const just = window.prompt("Qual o motivo da desclassificação?");
                                    if (just) {
                                        handleCondicaoChange(f.id, 'desclassificado', true, just);
                                    } else {
                                        e.target.checked = false; // Cancelou
                                    }
                                } else {
                                    handleCondicaoChange(f.id, 'desclassificado', false, "");
                                }
                            }} 
                          />
                          <strong>Desclassificar Fornecedor</strong>
                        </label>
                        {getDesclassificado(f.id) && getJustificativaDesclassificacao(f.id) && (
                            <div style={{ fontSize: '0.65rem', color: '#ef4444', marginTop: '0.25rem', fontStyle: 'italic', background: '#fef2f2', padding: '0.3rem', borderRadius: '4px' }}>
                                Motivo: {getJustificativaDesclassificacao(f.id)}
                            </div>
                        )}
                      </div>
                    </div>

                    {/* Preço unitário calculado e Necessidade de compra */}
                    {fator > 1 && (
                      <div style={{ padding: '0.4rem 0.5rem', background: '#eff6ff', borderRadius: '4px', marginBottom: '0.4rem', fontSize: '0.72rem' }}>
                        <div style={{ marginBottom: '0.3rem' }}>
                          <span style={{ color: '#64748b' }}>Preço unit.: </span>
                          <strong style={{ color: '#1d4ed8' }}>
                            {precoEmbalagemSalvo !== undefined || pf?.precoEmbalagem !== undefined
                              ? `R$ ${((pf?.precoEmbalagem || precoEmbalagemSalvo) / fator).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`
                              : '—'}
                          </strong>
                        </div>
                        <div style={{ borderTop: '1px solid #bfdbfe', paddingTop: '0.3rem' }}>
                          <span style={{ color: '#3b82f6', display: 'block', lineHeight: 1.2 }}>
                            Serão necessários <strong>{Math.ceil((item.quantidade || 1) / fator)} {getNomeEmbalagem(f.id)}s</strong> para suprir a demanda de {item.quantidade || 1} un.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Preço unitário salvo */}
                    {precoUnitCalc !== null && (
                      <div style={{ padding: '0.4rem 0.5rem', background: isMelhor ? '#dcfce7' : '#f1f5f9', borderRadius: '4px', marginBottom: '0.4rem', fontSize: '0.72rem' }}>
                        <span style={{ color: '#64748b' }}>Unit. salvo: </span>
                        <strong style={{ color: isMelhor ? '#166534' : '#334155' }}>
                          R$ {Number(precoUnitCalc).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                        </strong>
                        {item.valorUnitarioEstimado > 0 && (
                          <span style={{ color: '#64748b', marginLeft: '0.5rem' }}>
                            (lucro: R$ {Number(item.valorUnitarioEstimado - precoUnitCalc).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}/un.)
                          </span>
                        )}
                      </div>
                    )}

                    {isMelhor && <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 'bold' }}><Check size={14}/> Vencedor do Item</span>}
                    {isDesclassificado && <span style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 'bold', marginTop: '0.4rem' }}><XCircle size={14}/> Desclassificado</span>}
                    
                    {getLinkProduto(f.id) && (
                      <a href={getLinkProduto(f.id)} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.4rem', textDecoration: 'none' }}>
                        🔗 Ver Oferta na Web
                      </a>
                    )}
                  </div>
                );
              })}
              {columnsFornecedores.length === 0 && (
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Adicione fornecedores à disputa no seletor acima para lançar preços.</div>
              )}
            </div>
          </div>

          {/* SIMULADOR DE LANCES */}
          {item.melhorPreco && (
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ marginBottom: '1rem', color: '#0f172a', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🎯 Simulador de Estratégia de Lances
              </h4>
              <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div><strong>Custo Unit. Vencedor:</strong> R$ {item.melhorPreco.precoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</div>
                <div><strong>Qtd Total:</strong> {item.quantidade || 1} un.</div>
                <div><strong>Custo Total:</strong> R$ {(item.melhorPreco.precoUnitario * (item.quantidade || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                {item.valorUnitarioEstimado > 0 && <div><strong>Teto Órgão (Unitário):</strong> R$ {item.valorUnitarioEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 4 })}</div>}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {['a', 'b', 'c'].map((cId) => {
                  const margem = cenarios[cId as keyof typeof cenarios];
                  // Arredondar para 4 casas decimais para bater exatamente com a multiplicação exibida
                  const lanceUnitarioCru = item.melhorPreco.precoUnitario * (1 + (margem / 100));
                  const lanceUnitario = Number(lanceUnitarioCru.toFixed(4));
                  
                  const lanceTotal = lanceUnitario * (item.quantidade || 1);
                  const lucroUnitario = lanceUnitario - item.melhorPreco.precoUnitario;
                  const lucroTotal = lucroUnitario * (item.quantidade || 1);
                  const margemReal = lanceUnitario > 0 ? (lucroUnitario / lanceUnitario) * 100 : 0;
                  const isAcimaDoTeto = item.valorUnitarioEstimado > 0 && lanceUnitario > item.valorUnitarioEstimado;

                  const title = cId === 'a' ? 'Cenário A (Conservador)' : cId === 'b' ? 'Cenário B (Moderado)' : 'Cenário C (Agressivo)';

                  return (
                    <div key={cId} style={{ padding: '1rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                      <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.75rem' }}>{title}</div>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>Margem (Markup %) sobre o Custo</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          value={margem}
                          onChange={e => setCenarios(prev => ({ ...prev, [cId]: Number(e.target.value) }))}
                          style={{ width: '100%', padding: '0.25rem 0.5rem' }}
                        />
                      </div>
                      <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Lance Unitário:</span>
                          <strong style={{ color: isAcimaDoTeto ? '#ef4444' : '#0f172a' }}>
                            R$ {lanceUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                          </strong>
                        </div>
                        {isAcimaDoTeto && <div style={{ color: '#ef4444', fontSize: '0.7rem', textAlign: 'right', marginTop: '-4px' }}>(Acima do Teto!)</div>}
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Lance Total:</span>
                          <strong style={{ color: '#334155' }}>
                            R$ {lanceTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '0.8rem', marginTop: '0.5rem' }}>
                          <span style={{ color: '#475569', fontWeight: 600 }}>Lucro Unitário:</span>
                          <strong style={{ color: '#15803d', background: '#dcfce7', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '1rem' }}>
                            R$ {lucroUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                          <span style={{ color: '#475569', fontWeight: 600 }}>Lucro Total Bruto:</span>
                          <strong style={{ color: '#15803d', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '1rem' }}>
                            R$ {lucroTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', borderTop: '1px solid #cbd5e1', paddingTop: '0.5rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: '#475569', fontWeight: 600 }}>Imposto Estimado (DAS):</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                              <input 
                                type="number" 
                                value={aliquotaImposto} 
                                onChange={(e) => setAliquotaImposto(Number(e.target.value))} 
                                style={{ width: '60px', padding: '0.1rem 0.3rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                              />
                              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>%</span>
                            </div>
                          </div>
                          <strong style={{ color: '#dc2626', fontSize: '0.9rem' }}>
                            - R$ {(lanceTotal * (aliquotaImposto / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', background: '#f0fdfa', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccfbf1' }}>
                          <span style={{ color: '#0f766e', fontWeight: 700 }}>Lucro Real Líquido:</span>
                          <strong style={{ color: '#0f766e', fontSize: '1.1rem' }}>
                            R$ {(lucroTotal - (lanceTotal * (aliquotaImposto / 100))).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                          <span style={{ color: '#475569', fontWeight: 600 }}>Margem Real Bruta:</span>
                          <strong style={{ color: '#15803d', fontSize: '1.1rem' }}>{margemReal.toFixed(2)}%</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CALCULADORA DE CONCORRENCIA */}
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ marginBottom: '0.25rem', color: '#92400e', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    ⚔️ Calculadora de Concorrência (Lances em Tempo Real)
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: '#b45309', marginBottom: '0.75rem' }}>
                    Simule o menor preço atual do concorrente no portal. O sistema calculará o lance necessário para vencer e analisará a viabilidade do seu lucro.
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'start' }}>
                {/* 1. Preço do Concorrente */}
                <div style={{ padding: '0.75rem', background: '#fff', border: '1px solid #fcd34d', borderRadius: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label style={{ fontSize: '0.75rem', color: '#92400e', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>1. Menor Lance do Concorrente</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: '#b45309', fontWeight: 600 }}>R$</span>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ex: 0,7700"
                      value={precoConcorrenteStr}
                      onChange={e => setPrecoConcorrenteStr(e.target.value)}
                      onBlur={async () => {
                        const val = parseFloat(precoConcorrenteStr.replace(/\./g, '').replace(',', '.')) || 0;
                        setPrecoConcorrenteStr(val > 0 ? val.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}) : '');
                        const currentVal = item.produtoId?.valorConcorrente || item.valorConcorrente || 0;
                        if (val !== currentVal && val >= 0) {
                          try {
                            const pId = item.produtoId?._id || item.produtoId || item._id;
                            await fetch(`http://192.168.1.16:30000/produto/${pId}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ valorConcorrente: val })
                            });
                            if (setCotacao && cotacaoId) {
                              const resCotFull = await fetch(`http://192.168.1.16:30000/cotacoes/${cotacaoId}`);
                              setCotacao(await resCotFull.json());
                            }
                          } catch (err) {
                            console.error('Falha ao salvar lance concorrente', err);
                          }
                        }
                      }}
                      style={{ borderColor: '#fcd34d', background: '#fef3c7', fontWeight: 600, fontSize: '1.1rem' }}
                    />
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#d97706', marginTop: '0.5rem' }}>Pode digitar manualmente ou receber via bot automático.</span>
                </div>

                {/* 2. Sugestão e Viabilidade */}
                {precoConcorrente > 0 && (
                  <>
                    <div style={{ padding: '0.75rem', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', border: '1px solid #94a3b8', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
                      <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '0.4rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>🎯 2. Lance Sugerido (Para Vencer)</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.2rem', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                        R$ {sugestaoLance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>
                        (- R$ 0,01 do concorrente)
                      </div>
                    </div>

                    {item.melhorPreco ? (
                      <div style={{ padding: '0.75rem', background: isViable ? '#f0fdf4' : '#fef2f2', border: `1px solid ${isViable ? '#86efac' : '#fca5a5'}`, borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                        <div style={{ fontSize: '0.8rem', color: isViable ? '#166534' : '#991b1b', marginBottom: '0.6rem', fontWeight: 800, textTransform: 'uppercase' }}>3. Viabilidade da Margem</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600 }}>Seu Custo Unitário:</span>
                          <strong style={{ color: '#475569' }}>R$ {nossoCusto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '1rem', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600 }}>Lucro Unitário:</span>
                          <strong style={{ color: isViable ? '#15803d' : '#b91c1c', background: isViable ? '#dcfce7' : '#fee2e2', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            R$ {lucroSugestao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '1rem', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600 }}>Lucro Total Bruto ({item.quantidade} un):</span>
                          <strong style={{ color: isViable ? '#15803d' : '#b91c1c', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            R$ {((sugestaoLance - nossoCusto) * (item.quantidade || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', borderTop: '1px solid #cbd5e1', paddingTop: '0.5rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: '#475569', fontWeight: 600 }}>Imposto Estimado (DAS):</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                              <input 
                                type="number" 
                                value={aliquotaImposto} 
                                onChange={(e) => setAliquotaImposto(Number(e.target.value))} 
                                style={{ width: '60px', padding: '0.1rem 0.3rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                              />
                              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>%</span>
                            </div>
                          </div>
                          <strong style={{ color: '#dc2626', fontSize: '0.9rem' }}>
                            - R$ {((sugestaoLance * (item.quantidade || 1)) * (aliquotaImposto / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', background: '#f0fdfa', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccfbf1' }}>
                          <span style={{ color: '#0f766e', fontWeight: 700 }}>Lucro Real Líquido:</span>
                          <strong style={{ color: isViable ? '#15803d' : '#b91c1c', fontSize: '1.1rem' }}>
                            R$ {(lucroSugestao * (item.quantidade || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: `1px solid ${isViable ? '#bbf7d0' : '#fecaca'}` }}>
                          <span style={{ fontWeight: 600 }}>Markup Líquido:</span>
                          <strong style={{ color: isViable ? '#15803d' : '#b91c1c', fontSize: '1.2rem' }}>{margemSugestao.toFixed(2)}%</strong>
                        </div>
                        
                        {!isViable && (
                          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#7f1d1d', fontWeight: 600, padding: '0.75rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', textAlign: 'center' }}>
                            ⚠️ Margem (Markup %) sobre o Custo atingiu {margemSugestao.toFixed(2)}%, melhor parar negociação.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ padding: '1rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', fontWeight: 500 }}>
                        Selecione um fornecedor para calcular a viabilidade.
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

          {/* NOSSO LANCE OFICIAL (PARA PROJEÇÃO FINANCEIRA) */}
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#e0e7ff', borderRadius: '8px', border: '1px solid #a5b4fc', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.95rem', color: '#3730a3', fontWeight: 700, marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Check size={18} color="#4338ca"/> Nosso Lance Oficial (Unitário)
                </p>
                <p style={{ fontSize: '0.75rem', color: '#4f46e5', maxWidth: '500px' }}>
                  Último valor que lançamos oficialmente para o órgão antes de encerrar as negociações.
                  Este valor servirá como base para as projeções do Livro Caixa (Faturamento a Receber).
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 600, color: '#312e81' }}>R$</span>
                <input 
                  id={`input-lance-${item.produtoId?._id || item.produtoId || item._id}`}
                  type="text" 
                  value={nossoLanceStr}
                  onChange={e => setNossoLanceStr(e.target.value)}
                  onBlur={() => {
                    const val = parseFloat(nossoLanceStr.replace(/\./g, '').replace(',', '.')) || 0;
                    setNossoLanceStr(val > 0 ? val.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}) : '');
                  }}
                  placeholder="Ex: 6,00"
                  style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #818cf8', fontSize: '1.1rem', width: '130px', fontWeight: 'bold', color: '#312e81' }}
                />
                <button
                  onClick={async () => {
                    const val = parseFloat(nossoLanceStr.replace(/\./g, '').replace(',', '.')) || 0;
                    const pId = item.produtoId?._id || item.produtoId || item._id;
                    if (val >= 0) {
                      try {
                        await fetch(`http://192.168.1.16:30000/produto/${pId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ valorNossoLance: val })
                        });

                        // Sync to ProdutoBase for Market Intelligence globally
                        const desc = item.descricaoItem || item.descricao;
                        if (desc) {
                          await fetch('http://192.168.1.16:30000/fornecedores/produtos/base', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ descricaoItem: desc, nossoLanceOficial: val })
                          });
                        }

                        if (setCotacao && cotacaoId) {
                          const resCotFull = await fetch(`http://192.168.1.16:30000/cotacoes/${cotacaoId}`);
                          setCotacao(await resCotFull.json());
                        }
                        alert('Valor oficial salvo com sucesso!');
                      } catch (err) {
                        console.error('Falha ao salvar nosso lance', err);
                        alert('Erro ao salvar lance!');
                      }
                    }
                  }}
                  style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Salvar Valor
                </button>
              </div>
            </div>

            {nossoLanceVal > 0 && precoConcorrente > 0 && (
              <div style={{ 
                padding: '1rem', 
                background: nossoLanceVal < precoConcorrente ? '#f0fdf4' : '#fef2f2', 
                border: `2px solid ${nossoLanceVal < precoConcorrente ? '#4ade80' : '#f87171'}`, 
                borderRadius: '8px', 
                fontSize: '1rem', 
                color: nossoLanceVal < precoConcorrente ? '#166534' : '#991b1b', 
                fontWeight: 700,
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {nossoLanceVal < precoConcorrente ? (
                  <>✅ Sua proposta está melhor que o concorrente em <strong style={{fontSize:'1.1rem', background:'#dcfce7', padding:'0.1rem 0.4rem', borderRadius:'4px'}}>R$ {Math.abs(precoConcorrente - nossoLanceVal).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong> por unidade.</>
                ) : nossoLanceVal === precoConcorrente ? (
                  !isViable ? (
                    <>🚫 Empate! Cobrir a proposta do concorrente trará margem abaixo de 11%. Recomendamos parar por aqui.</>
                  ) : (
                    <>⚠️ Empate! Sua proposta está igual ao concorrente. Precisamos baixar <strong style={{fontSize:'1.1rem', background:'#fee2e2', padding:'0.1rem 0.4rem', borderRadius:'4px'}}>R$ {Math.abs(nossoLanceVal - sugestaoLance).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong> para vencer a proposta (Sugerido: R$ {sugestaoLance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}).</>
                  )
                ) : (
                  !isViable ? (
                    <>🚫 Atingimos o limite! Sua proposta está maior que a do concorrente, mas cobrir o lance atual trará margem abaixo de 11%.</>
                  ) : (
                    <>⚠️ Sua proposta está maior que o concorrente. Precisamos baixar <strong style={{fontSize:'1.1rem', background:'#fee2e2', padding:'0.1rem 0.4rem', borderRadius:'4px'}}>R$ {Math.abs(nossoLanceVal - sugestaoLance).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong> para vencer a proposta (Sugerido: R$ {sugestaoLance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}).</>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


export default function OportunidadeDetalhe() {
  const { id } = useParams();
  const [oportunidade, setOportunidade] = useState<any>(null);
  const [cotacao, setCotacao] = useState<any>(null);
  const [aba, setAba] = useState<'edital' | 'cotacao' | 'simulador' | 'portal'>('edital');
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const navigate = useNavigate();

  // Form state para adicionar fornecedor na cotacao (placeholder simples)
  const [novoFornecedorId, setNovoFornecedorId] = useState('');
  const [fornecedoresDisponiveis, setFornecedoresDisponiveis] = useState<any[]>([]);

  const [liveLances, setLiveLances] = useState<Record<string, { concorrente: number, nossoLance: number }>>({});

  const handleLiveValoresChange = (itemId: string, concorrente: number, nossoLance: number) => {
    setLiveLances(prev => {
      if (prev[itemId]?.concorrente === concorrente && prev[itemId]?.nossoLance === nossoLance) return prev;
      return { ...prev, [itemId]: { concorrente, nossoLance } };
    });
  };

  const loadData = async () => {
    try {
      const resOp = await fetch(`http://192.168.1.16:30000/oportunidades/${id}`);
      const dataOp = await resOp.json();
      setOportunidade(dataOp);

      // Buscar produtos vinculados a esta oportunidade
      let resProds = await fetch(`http://192.168.1.16:30000/produto?oportunidadeId=${id}&limit=1000`);
      let dataProds = await resProds.json();
      
      // Sincronizar itens se a oportunidade não tiver nenhum
      if (!dataProds.data || dataProds.data.length === 0) {
        try {
          const syncRes = await fetch(`http://192.168.1.16:30000/oportunidades/${id}/sincronizar-itens`, { method: 'POST' });
          if (!syncRes.ok) {
            const err = await syncRes.json();
            alert(err.message || 'Erro ao sincronizar itens.');
          } else {
            // Busca novamente após sincronizar
            resProds = await fetch(`http://192.168.1.16:30000/produto?oportunidadeId=${id}&limit=1000`);
            dataProds = await resProds.json();
          }
        } catch (e) {
          console.error('Falha ao sincronizar itens', e);
        }
      }

      const produtosDaOportunidade = dataProds.data || [];

      // Iniciar ou obter cotação vinculada
      const resCot = await fetch(`http://192.168.1.16:30000/oportunidades/${id}/cotacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens: produtosDaOportunidade })
      });
      const dataCot = await resCot.json();

      // Recarregar com populate
      const resCotFull = await fetch(`http://192.168.1.16:30000/cotacoes/${dataCot._id}`);
      setCotacao(await resCotFull.json());

      // Carregar lista de fornecedores para o dropdown
      const resForn = await fetch('http://192.168.1.16:30000/fornecedores');
      const dataForn = await resForn.json();
      setFornecedoresDisponiveis(dataForn.data || []);

    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handlePrecoBlur = async (
    itemId: string, 
    fornecedorId: string, 
    value: string, 
    fatorEmbalagem: number = 1, 
    precoEmbalagem: number = 0, 
    nomeEmbalagem: string = 'pacote',
    freteIncluso?: boolean,
    permiteParcelamento?: boolean,
    prazoPagamento?: number,
    observacao?: string,
    desclassificado?: boolean,
    justificativaDesclassificacao?: string
  ) => {
    const numValue = Number(value.replace(',', '.'));
    if (isNaN(numValue)) return;

    try {
      await fetch(`http://192.168.1.16:30000/cotacoes/${cotacao._id}/itens/${itemId}/preco`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fornecedorId, 
          precoUnitario: numValue, 
          fatorEmbalagem, 
          precoEmbalagem: precoEmbalagem || numValue, 
          nomeEmbalagem,
          freteIncluso,
          permiteParcelamento,
          prazoPagamento,
          observacao,
          desclassificado,
          justificativaDesclassificacao
        })
      });
      // Recarrega cotação para refletir os novos totais e melhor preço
      const resCotFull = await fetch(`http://192.168.1.16:30000/cotacoes/${cotacao._id}`);
      setCotacao(await resCotFull.json());
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar preço.');
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Tem certeza? Isso vai remover permanentemente esta oportunidade, seus itens, cotações e qualquer proposta associada. Essa ação não pode ser desfeita.")) {
      try {
        const res = await fetch(`http://192.168.1.16:30000/oportunidades/${id}`, { method: 'DELETE' });
        if (res.ok) {
          navigate('/kanban');
        } else {
          alert('Erro ao excluir oportunidade');
        }
      } catch (e) {
        alert('Erro de conexão ao excluir');
      }
    }
  };

  const handleRemovePreco = async (itemId: string, fornecedorId: string) => {
    try {
      await fetch(`http://192.168.1.16:30000/cotacoes/${cotacao._id}/itens/${itemId}/preco/${fornecedorId}`, {
        method: 'DELETE'
      });
      // Recarrega cotação para atualizar o melhor preço
      const resCotFull = await fetch(`http://192.168.1.16:30000/cotacoes/${cotacao._id}`);
      setCotacao(await resCotFull.json());
    } catch (e) {
      console.error(e);
      alert('Erro ao remover preço.');
    }
  };

  const handleExportCSV = () => {
    if (!cotacao || !cotacao.itens) return;

    let csvContent = "Item;Quantidade;Custo Unit. (Orgão);Fornecedor Campeão;CNPJ;Custo Unit. Vencedor;Custo Total Vencedor;Economia Unitária;Economia Total;Link do Produto\n";

    cotacao.itens.forEach((it: any) => {
      const descricao = (it.descricaoItem || "").replace(/;/g, " ").replace(/\n/g, " ");
      const qtd = it.quantidade || 1;
      const orgaoUnit = it.valorUnitarioEstimado || 0;
      
      let fornecedorNome = "-";
      let fornecedorCnpj = "-";
      let unit = 0;
      let total = 0;
      let economiaUnit = 0;
      let economiaTotal = 0;
      let link = "-";

      if (it.melhorPreco) {
         unit = it.melhorPreco.precoUnitario;
         total = unit * qtd;
         economiaUnit = orgaoUnit > 0 ? (orgaoUnit - unit) : 0;
         economiaTotal = economiaUnit * qtd;

         // Find the supplier data
         const pf = it.precosFornecedores?.find((p:any) => p.fornecedorId?._id === it.melhorPreco.fornecedorId || p.fornecedorId === it.melhorPreco.fornecedorId);
         if (pf && pf.fornecedorId) {
            fornecedorNome = (pf.fornecedorId.razaoSocial || "").replace(/;/g, " ");
            fornecedorCnpj = pf.fornecedorId.cnpj || "-";
            link = pf.linkProduto || "-";
         }
      }

      csvContent += `${descricao};${qtd};${orgaoUnit.toFixed(4).replace('.',',')};${fornecedorNome};${fornecedorCnpj};${unit.toFixed(4).replace('.',',')};${total.toFixed(4).replace('.',',')};${economiaUnit.toFixed(4).replace('.',',')};${economiaTotal.toFixed(4).replace('.',',')};${link}\n`;
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const linkObj = document.createElement("a");
    linkObj.href = url;
    linkObj.setAttribute("download", `Mapa_de_Precos_${oportunidade.unidadeCompradora || 'Cotacao'}.csv`);
    document.body.appendChild(linkObj);
    linkObj.click();
    document.body.removeChild(linkObj);
  };

  if (loading || !oportunidade) return <div style={{ padding: '2rem' }}>Carregando dados da negociação...</div>;

  // Montar as colunas (fornecedores distintos que já cotaram algo nesta oportunidade)
  const fornecedoresCotados = new Map<string, { id: string, razaoSocial: string }>();
  if (cotacao?.itens) {
    cotacao.itens.forEach((it: any) => {
      it.precosFornecedores?.forEach((pf: any) => {
        if (pf.fornecedorId) {
          fornecedoresCotados.set(pf.fornecedorId._id, { id: pf.fornecedorId._id, razaoSocial: pf.fornecedorId.razaoSocial });
        }
      });
    });
  }

  // Novo fornecedor state na UI
  if (novoFornecedorId && !fornecedoresCotados.has(novoFornecedorId)) {
    const fData = fornecedoresDisponiveis.find(f => f._id === novoFornecedorId);
    if (fData) {
      fornecedoresCotados.set(fData._id, { id: fData._id, razaoSocial: fData.razaoSocial });
    }
  }

  const columnsFornecedores = Array.from(fornecedoresCotados.values());

  return (
    <div>
      <div 
        id="sgl-extension-data" 
        style={{ display: 'none' }}
        data-uasg={oportunidade.unidadeCompradora || ''}
        data-processo={(function(){
          if (oportunidade.numeroCompraOrigem && oportunidade.anoCompraOrigem) {
            // O Comprasnet exige Número + Ano juntos, sem barras, para a busca de pregão
            return `${oportunidade.numeroCompraOrigem}${oportunidade.anoCompraOrigem}`;
          }
          const parts = oportunidade.numeroControlePNCP ? oportunidade.numeroControlePNCP.split('-') : [];
          if(parts.length < 3) return oportunidade.numeroControlePNCP || '';
          const numYear = parts[2].split('/');
          if(numYear.length === 2) {
            return parseInt(numYear[0], 10) + '/' + numYear[1];
          }
          return parts[2];
        })()}
        data-objeto={oportunidade.objetoCompra || ''}
      ></div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/kanban" className="btn-primary" style={{ background: '#e2e8f0', color: '#475569', padding: '0.5rem 1rem' }}>
            <ArrowLeft size={16} /> Voltar
          </Link>
          <button
            disabled={isSyncing}
            onClick={async () => {
              if (window.confirm("Deseja sincronizar novos itens deste edital direto do PNCP? (Isso não apagará suas cotações atuais)")) {
                setIsSyncing(true);
                try {
                  const syncRes = await fetch(`http://192.168.1.16:30000/oportunidades/${id}/sincronizar-itens`, { method: 'POST' });
                  if (!syncRes.ok) throw new Error();
                  const data = await syncRes.json();
                  setTimeout(() => alert(data.message || `Sincronização concluída!`), 100);
                  // Recarrega cotação
                  const resCotFull = await fetch(`http://192.168.1.16:30000/cotacoes/${cotacao?._id || ''}`);
                  if (resCotFull.ok) setCotacao(await resCotFull.json());
                  // Recarrega janela para garantir que a UI inteira pegue
                  window.location.reload();
                } catch (e) {
                  setTimeout(() => alert('Erro ao sincronizar novos itens com o PNCP.'), 100);
                } finally {
                  setIsSyncing(false);
                }
              }
            }}
            className="btn-primary"
            style={{ background: isSyncing ? '#d97706' : '#f59e0b', color: '#fff', padding: '0.5rem 1rem', cursor: isSyncing ? 'not-allowed' : 'pointer' }}
          >
            {isSyncing ? <><RotateCw size={16} style={{ animation: 'spin 1.2s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite' }} /> Sincronizando...</> : <><RotateCw size={16} /> Sincronizar Edital (PNCP)</>}
          </button>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Negociação: {oportunidade.orgaoNome}</h1>
        </div>
        <button 
          onClick={handleDelete} 
          className="btn-primary" 
          style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
        >
          <Trash2 size={16} /> Excluir Oportunidade
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => setAba('edital')}
          style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: aba === 'edital' ? '2px solid var(--primary)' : '2px solid transparent', color: aba === 'edital' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
        >
          Dados do Edital
        </button>
        <button 
          onClick={() => setAba('cotacao')}
          style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: aba === 'cotacao' ? '2px solid var(--primary)' : '2px solid transparent', color: aba === 'cotacao' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
        >
          Painel de Cotação
        </button>
        <button 
          onClick={() => setAba('portal')}
          style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: aba === 'portal' ? '2px solid var(--primary)' : '2px solid transparent', color: aba === 'portal' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
        >
          Portal de Compras
        </button>
        <button 
          onClick={() => setAba('simulador')}
          style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: aba === 'simulador' ? '2px solid var(--primary)' : '2px solid transparent', color: aba === 'simulador' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
        >
          Simulador Tributário
        </button>
      </div>

      {aba === 'edital' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div className="stat-card" style={{ height: 'fit-content' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)', fontSize: '1rem' }}>Informações Básicas</h3>
            <p style={{ marginBottom: '0.5rem' }}><strong>Objeto:</strong> {oportunidade.objetoCompra}</p>
            <p style={{ marginBottom: '0.5rem' }}><strong>Modalidade:</strong> {oportunidade.modalidadeNome}</p>
            <p style={{ marginBottom: '0.5rem' }}><strong>UASG / Órgão:</strong> {oportunidade.orgaoCnpj} - {oportunidade.orgaoNome}</p>
            <p style={{ marginBottom: '0.5rem' }}><strong>Local:</strong> {oportunidade.municipio} - {oportunidade.uf}</p>
            <p style={{ marginBottom: '0.5rem' }}><strong>Valor Estimado:</strong> R$ {oportunidade.valorTotalEstimado?.toLocaleString('pt-BR')}</p>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {oportunidade.linkSistemaOrigem && (
                <a href={oportunidade.linkSistemaOrigem} target="_blank" rel="noreferrer" className="btn-primary" style={{ display: 'inline-block', padding: '0.5rem 1rem', textDecoration: 'none', fontSize: '0.9rem' }}>
                  📄 Sistema de Origem
                </a>
              )}
              {oportunidade.numeroControlePNCP && (
                <a 
                  href={`https://pncp.gov.br/app/editais/${oportunidade.numeroControlePNCP.split('-')[0]}/${oportunidade.numeroControlePNCP.split('/')[1]}/${parseInt(oportunidade.numeroControlePNCP.split('-')[2]?.split('/')[0] || '0')}`}
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn-primary" 
                  style={{ display: 'inline-block', padding: '0.5rem 1rem', textDecoration: 'none', background: '#0ea5e9', fontSize: '0.9rem' }}
                >
                  📄 Portal PNCP (Baixar Edital)
                </a>
              )}
            </div>
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <AlertCircle size={18} color="#4f46e5" />
              <span>Status atual: <strong>{oportunidade.kanbanStatus.replace('_', ' ')}</strong></span>
            </div>
          </div>
        </div>
      )}

      {aba === 'cotacao' && cotacao && (
        <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Matriz de Preços e Melhores Ofertas</h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button 
                onClick={handleExportCSV}
                style={{
                  background: '#10b981', color: 'white', border: 'none', padding: '0.6rem 1rem', 
                  borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', gap: '0.5rem', alignItems: 'center',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                📊 Exportar Mapa de Preços (CSV)
              </button>
              <select className="form-control" value="" onChange={e => setNovoFornecedorId(e.target.value)} style={{ minWidth: '300px' }}>
                <option value="" disabled>+ Adicionar Fornecedor à disputa...</option>
                {fornecedoresDisponiveis.map(f => (
                  <option key={f._id} value={f._id}>{f.razaoSocial} ({f.cnpj})</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {cotacao.itens.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                Nenhum item inserido no sistema PNCP para este edital, ou o parse de itens ainda não ocorreu.
              </div>
            ) : (
              cotacao.itens.map((item: any, index: number) => (
                <AccordionItem 
                  key={item._id} 
                  item={item} 
                  index={index} 
                  columnsFornecedores={columnsFornecedores}
                  handlePrecoBlur={handlePrecoBlur}
                  handleRemovePreco={handleRemovePreco}
                  cotacaoId={cotacao._id}
                  novoFornecedorId={novoFornecedorId}
                  setNovoFornecedorId={setNovoFornecedorId}
                  setCotacao={setCotacao}
                  onLiveValoresChange={handleLiveValoresChange}
                />
              ))
            )}
          </div>

          <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#1e293b', borderRadius: '8px', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, color: '#94a3b8', fontSize: '1rem' }}>Custo Total Vencedor (Custo com Fornecedores)</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Cálculo automático de Custo Unitário × Quantidade para cada item</p>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>
                R$ {Number(cotacao.valorTotalMelhorCotacao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Breakdown por item */}
            <div style={{ borderTop: '1px solid #334155', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {cotacao.itens.filter((it: any) => it.melhorPreco).map((it: any) => {
                const subtotal = Number(it.melhorPreco.precoUnitario) * Number(it.quantidade || 1);
                const economiaPorUnid = Number(it.valorUnitarioEstimado || 0) > 0 ? Number(it.valorUnitarioEstimado) - Number(it.melhorPreco.precoUnitario) : null;
                const economiaTotal = economiaPorUnid !== null ? economiaPorUnid * Number(it.quantidade || 1) : null;
                return (
                  <div key={it._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94a3b8' }}>
                    <span style={{ flex: 1 }}>{it.descricaoItem} ({it.quantidade} un.)</span>
                    <span style={{ color: '#e2e8f0', fontWeight: 600, marginLeft: '1rem' }}>
                      Custo: R$ {Number(it.melhorPreco.precoUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} × {it.quantidade} = R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {economiaTotal !== null && economiaTotal > 0 && (
                      <span style={{ color: '#4ade80', fontWeight: 700, marginLeft: '1rem' }}>
                        ↓ R$ {economiaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} de margem máxima
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* PAINEL: CENÁRIO DO PREÇO DO CONCORRENTE */}
          <div style={{ marginTop: '1rem', padding: '1.5rem', background: '#451a03', borderRadius: '8px', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, color: '#fcd34d', fontSize: '1rem' }}>Cenário: Menor Lance do Concorrente</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#d97706' }}>Cálculo automático: Menor Lance Concorrente × Quantidade</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fbbf24' }}>
                  R$ {Number(cotacao.itens.reduce((acc: number, it: any) => acc + ((liveLances[it._id]?.concorrente ?? (it.produtoId?.valorConcorrente || it.valorConcorrente || 0)) * Number(it.quantidade || 1)), 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {(() => {
                  const lucroProvisorioTotal = cotacao.itens.reduce((acc: number, it: any) => {
                    const valConc = liveLances[it._id]?.concorrente ?? (it.produtoId?.valorConcorrente || it.valorConcorrente || 0);
                    if (valConc > 0) {
                      const subtotal = Number(valConc) * Number(it.quantidade || 1);
                      const custo = it.melhorPreco ? Number(it.melhorPreco.precoUnitario) * Number(it.quantidade || 1) : 0;
                      return acc + (subtotal - custo);
                    }
                    return acc;
                  }, 0);
                  if (lucroProvisorioTotal !== 0) {
                    const isLucro = lucroProvisorioTotal > 0;
                    return (
                      <span style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        background: isLucro ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: isLucro ? '#34d399' : '#f87171',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        border: `1px solid ${isLucro ? 'rgba(52, 211, 153, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                        boxShadow: `0 0 10px ${isLucro ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)'}`
                      }}>
                        {isLucro ? '💰 Lucro Provisório Total: ' : '🔻 Prejuízo Provisório Total: '}R$ {Math.abs(lucroProvisorioTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #78350f', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {cotacao.itens.filter((it: any) => (liveLances[it._id]?.concorrente ?? (it.produtoId?.valorConcorrente || it.valorConcorrente)) > 0).map((it: any) => {
                const valConc = liveLances[it._id]?.concorrente ?? (it.produtoId?.valorConcorrente || it.valorConcorrente || 0);
                const subtotal = Number(valConc) * Number(it.quantidade || 1);
                const custo = it.melhorPreco ? Number(it.melhorPreco.precoUnitario) * Number(it.quantidade || 1) : 0;
                const lucro = subtotal - custo;
                return (
                  <div key={it._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#fef3c7' }}>
                    <span style={{ flex: 1 }}>{it.descricaoItem} ({it.quantidade} un.)</span>
                    <span style={{ color: '#fde68a', fontWeight: 600, marginLeft: '1rem' }}>
                      Lance: R$ {Number(valConc).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} × {it.quantidade} = R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {lucro !== 0 && (
                      <span style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        background: lucro > 0 ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: lucro > 0 ? '#34d399' : '#f87171',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        fontWeight: 700,
                        marginLeft: '1rem',
                        border: `1px solid ${lucro > 0 ? 'rgba(52, 211, 153, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                        boxShadow: `0 0 10px ${lucro > 0 ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)'}`
                      }}>
                        {lucro > 0 ? '💰 Lucro Provisório: ' : '🔻 Prejuízo Provisório: '}R$ {Math.abs(lucro).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* PAINEL: CENÁRIO DO NOSSO LANCE OFICIAL */}
          <div style={{ marginTop: '1rem', padding: '1.5rem', background: '#1e1b4b', borderRadius: '8px', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, color: '#c7d2fe', fontSize: '1rem' }}>Cenário: Nosso Lance Oficial (Faturamento Real)</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#818cf8' }}>Cálculo automático: Nosso Lance Oficial × Quantidade</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#818cf8' }}>
                  R$ {Number(cotacao.itens.reduce((acc: number, it: any) => acc + ((liveLances[it._id]?.nossoLance ?? (it.produtoId?.valorNossoLance || it.valorNossoLance || 0)) * Number(it.quantidade || 1)), 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {(() => {
                  const lucroRealTotal = cotacao.itens.reduce((acc: number, it: any) => {
                    const valLance = liveLances[it._id]?.nossoLance ?? (it.produtoId?.valorNossoLance || it.valorNossoLance || 0);
                    if (valLance > 0) {
                      const subtotal = Number(valLance) * Number(it.quantidade || 1);
                      const custo = it.melhorPreco ? Number(it.melhorPreco.precoUnitario) * Number(it.quantidade || 1) : 0;
                      return acc + (subtotal - custo);
                    }
                    return acc;
                  }, 0);
                  if (lucroRealTotal !== 0) {
                    const isLucro = lucroRealTotal > 0;
                    return (
                      <span style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        background: isLucro ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: isLucro ? '#10b981' : '#ef4444',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        border: `1px solid ${isLucro ? 'rgba(52, 211, 153, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
                        boxShadow: `0 0 15px ${isLucro ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                      }}>
                        {isLucro ? '🏆 Lucro Real Total: ' : '🔻 Prejuízo Real Total: '}R$ {Math.abs(lucroRealTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #3730a3', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {cotacao.itens.filter((it: any) => (liveLances[it._id]?.nossoLance ?? (it.produtoId?.valorNossoLance || it.valorNossoLance)) > 0).map((it: any) => {
                const valLance = liveLances[it._id]?.nossoLance ?? (it.produtoId?.valorNossoLance || it.valorNossoLance || 0);
                const subtotal = Number(valLance) * Number(it.quantidade || 1);
                const custo = it.melhorPreco ? Number(it.melhorPreco.precoUnitario) * Number(it.quantidade || 1) : 0;
                const lucro = subtotal - custo;
                return (
                  <div key={it._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#e0e7ff' }}>
                    <span style={{ flex: 1 }}>{it.descricaoItem} ({it.quantidade} un.)</span>
                    <span style={{ color: '#c7d2fe', fontWeight: 600, marginLeft: '1rem' }}>
                      Nosso Lance: R$ {Number(valLance).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} × {it.quantidade} = R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {lucro > 0 && (
                      <span style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        background: 'rgba(52, 211, 153, 0.2)',
                        color: '#10b981',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        fontWeight: 800,
                        marginLeft: '1rem',
                        border: '1px solid rgba(52, 211, 153, 0.5)',
                        boxShadow: '0 0 15px rgba(52, 211, 153, 0.2)'
                      }}>
                        🏆 Lucro Real: R$ {lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* COMPARATIVO GLOBAL (FATURAMENTO CONCORRENTE VS NOSSO LANCE) */}
          {(() => {
            const faturamentoTotalConcorrente = Number(cotacao.itens.reduce((acc: number, it: any) => acc + ((liveLances[it._id]?.concorrente ?? (it.produtoId?.valorConcorrente || it.valorConcorrente || 0)) * Number(it.quantidade || 1)), 0));
            const faturamentoTotalNosso = Number(cotacao.itens.reduce((acc: number, it: any) => acc + ((liveLances[it._id]?.nossoLance ?? (it.produtoId?.valorNossoLance || it.valorNossoLance || 0)) * Number(it.quantidade || 1)), 0));
            const custoTotalGlobal = Number(cotacao.itens.reduce((acc: number, it: any) => acc + (it.melhorPreco ? Number(it.melhorPreco.precoUnitario) * Number(it.quantidade || 1) : 0), 0));

            if (faturamentoTotalConcorrente > 0 && faturamentoTotalNosso > 0) {
              const lanceNecessarioGlobal = faturamentoTotalConcorrente - 0.01;
              const lucroGlobalNecessario = lanceNecessarioGlobal - custoTotalGlobal;
              const margemGlobalNecessaria = custoTotalGlobal > 0 ? (lucroGlobalNecessario / custoTotalGlobal) * 100 : 0;

              const isInviavel = margemGlobalNecessaria < 11;
              const isGanhando = faturamentoTotalNosso < faturamentoTotalConcorrente;
              const isEmpate = faturamentoTotalNosso === faturamentoTotalConcorrente;

              // Determina a cor do fundo baseada na situação. Se for inviável, fica vermelho, mesmo que estejamos perdendo.
              const bgColor = isGanhando ? '#f0fdf4' : '#fef2f2';
              const borderColor = isGanhando ? '#4ade80' : '#f87171';
              const textColor = isGanhando ? '#166534' : '#991b1b';

              return (
                <div style={{ 
                  marginTop: '1.5rem',
                  padding: '1.25rem', 
                  background: bgColor, 
                  border: `2px solid ${borderColor}`, 
                  borderRadius: '8px', 
                  fontSize: '1.1rem', 
                  color: textColor, 
                  fontWeight: 700,
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  textAlign: 'center'
                }}>
                  {isGanhando ? (
                    <>✅ No total, a sua proposta está melhor que o concorrente em <strong style={{fontSize:'1.2rem', background:'#dcfce7', padding:'0.2rem 0.5rem', borderRadius:'4px'}}>R$ {Math.abs(faturamentoTotalConcorrente - faturamentoTotalNosso).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong> reais.</>
                  ) : isEmpate ? (
                    <>⚠️ Empate! No total, sua proposta está igual à do concorrente.</>
                  ) : isInviavel ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                      <strong style={{ fontSize: '1.2rem' }}>⚠️ Negociação inviável! Chegamos no percentual de <span style={{ background: '#fca5a5', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{margemGlobalNecessaria.toFixed(2)}%</span> do seu Margem (Markup %) sobre o Custo.</strong>
                      <span style={{ fontSize: '1rem', marginTop: '0.25rem' }}>Abaixo de 11% a negociação não é mais interessante. Devemos parar e prospectar outra oportunidade! É assim mesmo, não desista! 💪</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span>⚠️ No total, sua proposta está maior. Precisamos baixar</span>
                      <strong style={{ fontSize: '1.2rem', background: '#fca5a5', color: '#7f1d1d', padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid #ef4444' }}>
                        R$ {Math.abs(faturamentoTotalNosso - faturamentoTotalConcorrente).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                      </strong>
                      <span>para vencer globalmente.</span>
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}

      {aba === 'portal' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div className="stat-card" style={{ height: 'fit-content' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ExternalLink size={20} /> Acesso Rápido ao Portal
            </h3>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Use os botões abaixo para acessar rapidamente o sistema oficial e lançar sua proposta. Use os ícones de cópia ao lado das informações para agilizar o preenchimento no site do governo.
            </p>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
              {oportunidade.linkSistemaOrigem ? (
                <a href={oportunidade.linkSistemaOrigem} target="_blank" rel="noreferrer" className="btn-primary" style={{ background: '#7c3aed', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px rgba(124, 58, 237, 0.2)' }}>
                  <ExternalLink size={16} /> Portal Original da Licitação
                </a>
              ) : (
                <>
                  <a href={`https://pncp.gov.br/app/editais?q=${oportunidade.numeroControlePNCP}`} target="_blank" rel="noreferrer" className="btn-primary" style={{ background: '#7c3aed', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px rgba(124, 58, 237, 0.2)' }}>
                    <ExternalLink size={16} /> Ver no PNCP
                  </a>
                  {(function(){
                    const portaisEstaduais: Record<string, { nome: string, url: string }> = {
                      'CE': { nome: 'Portal de Compras - CE (S2GPR)', url: 'https://s2gpr.sefaz.ce.gov.br/licita-web/paginas/licita/PublicacaoList.seam' },
                      'SP': { nome: 'BEC/SP', url: 'https://www.bec.sp.gov.br/' },
                      'MG': { nome: 'Portal de Compras - MG', url: 'https://www.compras.mg.gov.br/' },
                      'PR': { nome: 'Compras Paraná', url: 'https://www.comprasparana.pr.gov.br/' },
                      'RS': { nome: 'Compras RS', url: 'https://www.compras.rs.gov.br/' },
                      'SC': { nome: 'Portal de Compras - SC', url: 'https://portaldecompras.sc.gov.br/' },
                      'PE': { nome: 'PE Integrado', url: 'https://www.peintegrado.pe.gov.br/' },
                      'BA': { nome: 'Comprasnet BA', url: 'https://www.comprasnet.ba.gov.br/' }
                    };
                    const portalInfo = portaisEstaduais[oportunidade.uf];
                    if (portalInfo && oportunidade.orgaoNome?.toUpperCase().includes('ESTADO')) {
                      return (
                        <a href={portalInfo.url} target="_blank" rel="noreferrer" className="btn-primary" style={{ background: '#f59e0b', color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px rgba(245, 158, 11, 0.2)' }}>
                          <ExternalLink size={16} /> Acessar {portalInfo.nome}
                        </a>
                      );
                    }
                    return null;
                  })()}
                </>
              )}
              <a href="https://www.gov.br/compras" target="_blank" rel="noreferrer" className="btn-primary" style={{ background: '#005b9f', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ExternalLink size={16} /> Portal Compras.gov
              </a>
              <a href="https://www.comprasnet.gov.br/seguro/loginPortal.asp" target="_blank" rel="noreferrer" className="btn-primary" style={{ background: '#16a34a', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ExternalLink size={16} /> Comprasnet (Área do Fornecedor)
              </a>
            </div>

            <h4 style={{ marginBottom: '1rem', color: '#334155', fontSize: '0.95rem' }}>Dados Rápidos para Copiar</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { label: 'CNPJ do Órgão', value: oportunidade.orgaoCnpj },
                { label: 'Unidade Compradora (UASG)', value: oportunidade.unidadeCompradora || 'N/A' },
                { label: 'Número da Compra', value: (oportunidade.numeroCompraOrigem && oportunidade.anoCompraOrigem) ? `${oportunidade.numeroCompraOrigem}${oportunidade.anoCompraOrigem}` : (oportunidade.numeroControlePNCP ? (function(){
                  const parts = oportunidade.numeroControlePNCP.split('-');
                  if(parts.length < 3) return oportunidade.numeroControlePNCP;
                  const numYear = parts[2].split('/');
                  if(numYear.length === 2) return parseInt(numYear[0], 10) + '/' + numYear[1];
                  return parts[2];
                })() : oportunidade.numeroControlePNCP) },
                { label: 'Objeto', value: oportunidade.objetoCompra }
              ].map((info, i) => {
                // Estado local injetado via closure para feedback
                return <CopyRow key={i} label={info.label} value={info.value} />
              })}
            </div>
            
            <div style={{ marginTop: '2rem', padding: '1rem', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px' }}>
              <h4 style={{ color: '#92400e', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertCircle size={14} /> Dica Importante
              </h4>
              <p style={{ color: '#92400e', fontSize: '0.75rem', lineHeight: 1.5, margin: 0 }}>
                Certifique-se de preencher todos os valores na aba "Painel de Cotação" e verificar as simulações de margem antes de lançar a proposta oficial.
              </p>
            </div>
          </div>
        </div>
      )}

      {aba === 'simulador' && (
        <div style={{ marginTop: '1rem' }} className="animate-fadeIn">
          <SimuladorTributario oportunidadeId={id as string} />
        </div>
      )}
    </div>
  );
}
