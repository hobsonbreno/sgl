import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function AccordionItem({ item, index, columnsFornecedores, handlePrecoBlur, handleRemovePreco }: any) {
  const [open, setOpen] = useState(false);
  // fator de embalagem por fornecedor: quantas unidades tem cada embalagem/caixa cotada
  const [fatores, setFatores] = useState<Record<string, number>>({});
  const isSigiloso = !item.valorUnitarioEstimado || item.valorUnitarioEstimado <= 0;

  const getFator = (fornecedorId: string) => fatores[fornecedorId] || 1;

  const handleFatorChange = (fornecedorId: string, value: string) => {
    const n = Math.max(1, Number(value) || 1);
    setFatores(prev => ({ ...prev, [fornecedorId]: n }));
  };

  // precoUnitario real = precoEmbalagem / fator
  const handlePrecoComFator = (itemId: string, fornecedorId: string, precoEmbalagem: string) => {
    const fator = getFator(fornecedorId);
    const embalagem = parseFloat(precoEmbalagem.replace(',', '.'));
    if (isNaN(embalagem)) return;
    const unitario = parseFloat((embalagem / fator).toFixed(6));
    handlePrecoBlur(itemId, fornecedorId, String(unitario));
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
                    await fetch(`http://localhost:7005/produto/${item.produtoId || item._id}`, {
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
            <h4 style={{ marginBottom: '1rem', color: '#0f172a', fontSize: '0.95rem' }}>Valores Ofertados pelos Fornecedores</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              {columnsFornecedores.map((f: any) => {
                const pf = item.precosFornecedores?.find((p:any) => p.fornecedorId?._id === f.id);
                const isMelhor = item.melhorPreco && pf && item.melhorPreco.fornecedorId === f.id;
                const fator = getFator(f.id);
                // precoEmbalagem = precoUnitario * fator (para mostrar de volta o valor da embalagem quando já cotado)
                const precoEmbalagemSalvo = pf ? parseFloat((pf.precoUnitario * fator).toFixed(6)) : undefined;
                const precoUnitCalc = pf ? pf.precoUnitario : null;

                return (
                  <div key={f.id} style={{ 
                    padding: '1rem', border: '1px solid', borderColor: isMelhor ? '#10b981' : '#e2e8f0', 
                    borderRadius: '6px', background: isMelhor ? '#f0fdf4' : '#f8fafc', minWidth: '200px', maxWidth: '260px', flex: '1 1 200px'
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem', gap: '0.25rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', lineHeight: 1.3, wordBreak: 'break-word' }}>
                        {f.razaoSocial}
                      </div>
                      {pf && (
                        <button
                          title="Remover cotação deste fornecedor"
                          onClick={() => handleRemovePreco(item._id, f.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px', flexShrink: 0 }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Fator de embalagem */}
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>
                        Unid. por embalagem
                      </label>
                      <input
                        type="number"
                        min="1"
                        className="form-control"
                        placeholder="1"
                        defaultValue={1}
                        onChange={(e) => handleFatorChange(f.id, e.target.value)}
                        style={{ width: '100%', fontSize: '0.8rem' }}
                        title="Quantas unidades tem cada embalagem/caixa cotada (ex: 100 para pacote com 100 folhas)"
                      />
                    </div>

                    {/* Preço da embalagem */}
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>
                        {fator > 1 ? `Preço da embalagem (${fator} un.)` : 'Preço unitário'}
                      </label>
                      <input 
                        key={`${f.id}-${pf?.precoUnitario}`}
                        type="number"
                        step="0.0001"
                        className="form-control" 
                        placeholder="0,00"
                        defaultValue={precoEmbalagemSalvo ?? ''}
                        onBlur={(e) => handlePrecoComFator(item._id, f.id, e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>

                    {/* Preço unitário calculado */}
                    {fator > 1 && (
                      <div style={{ padding: '0.4rem 0.5rem', background: '#eff6ff', borderRadius: '4px', marginBottom: '0.4rem', fontSize: '0.72rem' }}>
                        <span style={{ color: '#64748b' }}>Preço unit.: </span>
                        <strong style={{ color: '#1d4ed8' }}>
                          {precoEmbalagemSalvo !== undefined
                            ? `R$ ${(precoEmbalagemSalvo / fator).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`
                            : '—'}
                        </strong>
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
                  </div>
                );
              })}
              {columnsFornecedores.length === 0 && (
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Adicione fornecedores à disputa no seletor acima para lançar preços.</div>
              )}
            </div>
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
  const [aba, setAba] = useState<'edital' | 'cotacao'>('edital');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Form state para adicionar fornecedor na cotacao (placeholder simples)
  const [novoFornecedorId, setNovoFornecedorId] = useState('');
  const [fornecedoresDisponiveis, setFornecedoresDisponiveis] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const resOp = await fetch(`http://localhost:7005/oportunidades/${id}`);
      const dataOp = await resOp.json();
      setOportunidade(dataOp);

      // Buscar produtos vinculados a esta oportunidade
      let resProds = await fetch(`http://localhost:7005/produto?oportunidadeId=${id}&limit=1000`);
      let dataProds = await resProds.json();
      
      // Sincronizar itens se a oportunidade não tiver nenhum
      if (!dataProds.data || dataProds.data.length === 0) {
        try {
          const syncRes = await fetch(`http://localhost:7005/oportunidades/${id}/sincronizar-itens`, { method: 'POST' });
          if (!syncRes.ok) {
            const err = await syncRes.json();
            alert(err.message || 'Erro ao sincronizar itens.');
          } else {
            // Busca novamente após sincronizar
            resProds = await fetch(`http://localhost:7005/produto?oportunidadeId=${id}&limit=1000`);
            dataProds = await resProds.json();
          }
        } catch (e) {
          console.error('Falha ao sincronizar itens', e);
        }
      }

      const produtosDaOportunidade = dataProds.data || [];

      // Iniciar ou obter cotação vinculada
      const resCot = await fetch(`http://localhost:7005/oportunidades/${id}/cotacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens: produtosDaOportunidade })
      });
      const dataCot = await resCot.json();

      // Recarregar com populate
      const resCotFull = await fetch(`http://localhost:7005/cotacoes/${dataCot._id}`);
      setCotacao(await resCotFull.json());

      // Carregar lista de fornecedores para o dropdown
      const resForn = await fetch('http://localhost:7005/fornecedores');
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

  const handlePrecoBlur = async (itemId: string, fornecedorId: string, value: string) => {
    const numValue = Number(value.replace(',', '.'));
    if (isNaN(numValue)) return;

    try {
      await fetch(`http://localhost:7005/cotacoes/${cotacao._id}/itens/${itemId}/preco`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fornecedorId, precoUnitario: numValue })
      });
      // Recarrega cotação para refletir os novos totais e melhor preço
      const resCotFull = await fetch(`http://localhost:7005/cotacoes/${cotacao._id}`);
      setCotacao(await resCotFull.json());
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar preço.');
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Tem certeza? Isso vai remover permanentemente esta oportunidade, seus itens, cotações e qualquer proposta associada. Essa ação não pode ser desfeita.")) {
      try {
        const res = await fetch(`http://localhost:7005/oportunidades/${id}`, { method: 'DELETE' });
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
      await fetch(`http://localhost:7005/cotacoes/${cotacao._id}/itens/${itemId}/preco/${fornecedorId}`, {
        method: 'DELETE'
      });
      // Recarrega cotação para atualizar o melhor preço
      const resCotFull = await fetch(`http://localhost:7005/cotacoes/${cotacao._id}`);
      setCotacao(await resCotFull.json());
    } catch (e) {
      console.error(e);
      alert('Erro ao remover preço.');
    }
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
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/kanban" className="btn-primary" style={{ background: '#e2e8f0', color: '#475569', padding: '0.5rem 1rem' }}>
            <ArrowLeft size={16} /> Voltar
          </Link>
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
            {oportunidade.linkSistemaOrigem && (
              <div style={{ marginTop: '1rem' }}>
                <a href={oportunidade.linkSistemaOrigem} target="_blank" rel="noreferrer" className="btn-primary" style={{ display: 'inline-block', padding: '0.5rem 1rem', textDecoration: 'none' }}>
                  📄 Abrir edital completo no PNCP
                </a>
              </div>
            )}
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
                />
              ))
            )}
          </div>

          <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#1e293b', borderRadius: '8px', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, color: '#94a3b8', fontSize: '1rem' }}>Estimativa Total Vencedora (Soma dos melhores)</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Cálculo automático de Unitário × Quantidade para cada item</p>
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
                      R$ {Number(it.melhorPreco.precoUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} × {it.quantidade} = R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {economiaTotal !== null && economiaTotal > 0 && (
                      <span style={{ color: '#4ade80', fontWeight: 700, marginLeft: '1rem' }}>
                        ↓ R$ {economiaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} economizado
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
