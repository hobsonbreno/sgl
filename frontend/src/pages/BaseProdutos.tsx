import { useState, useEffect } from 'react';
import { Package, Award, Building2, Search, Edit2, Save, Globe, FileText } from 'lucide-react';

export default function BaseProdutos() {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  
  // State to hold manual edits before saving
  const [editValues, setEditValues] = useState<{nossoLanceOficial: string, valorCampeaoLicitacao: string}>({
    nossoLanceOficial: '',
    valorCampeaoLicitacao: ''
  });

  useEffect(() => {
    carregarBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, page]);

  const carregarBase = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:7005/fornecedores/produtos/base?page=${page}&limit=10&busca=${encodeURIComponent(busca)}`);
      const payload = await res.json();
      setProdutos(payload.data || []);
      setTotalPages(payload.totalPages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (p: any) => {
    setEditandoId(p.descricaoItem);
    setEditValues({
      nossoLanceOficial: p.nossoLanceOficial ? p.nossoLanceOficial.toString() : '',
      valorCampeaoLicitacao: p.valorCampeaoLicitacao ? p.valorCampeaoLicitacao.toString() : ''
    });
  };

  const handleSaveIntel = async (descricaoItem: string) => {
    try {
      const payload = {
        descricaoItem,
        nossoLanceOficial: editValues.nossoLanceOficial ? parseFloat(editValues.nossoLanceOficial.replace(',','.')) : undefined,
        valorCampeaoLicitacao: editValues.valorCampeaoLicitacao ? parseFloat(editValues.valorCampeaoLicitacao.replace(',','.')) : undefined,
      };

      await fetch('http://localhost:7005/fornecedores/produtos/base', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      setEditandoId(null);
      carregarBase();
    } catch (e) {
      console.error("Erro ao salvar", e);
      alert("Erro ao salvar valores.");
    }
  };

  const formatCurrency = (val: any) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Base Geral de Produtos</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Catálogo estratégico: Acompanhe as cotações detalhadas, a empresa campeã de fornecimento e seus lances oficiais para inteligência de mercado.
      </p>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', color: '#94a3b8' }} />
          <input 
            type="text" 
            className="form-control" 
            placeholder="Buscar por nome do produto..." 
            style={{ paddingLeft: '2.5rem' }}
            value={busca}
            onChange={e => { setBusca(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: '30%' }}>Produto / Descrição</th>
              <th style={{ width: '35%' }}>Detalhamento das Cotações</th>
              <th style={{ width: '35%' }}>Inteligência de Mercado (Licitação)</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((p, i) => {
              const lance = p.nossoLanceOficial || 0;
              const campeao = p.valorCampeaoLicitacao || 0;
              const diferenca = (lance && campeao) ? (lance - campeao) : null;

              return (
                <tr key={i}>
                  <td style={{ verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <Package size={18} color="#64748b" style={{ marginTop: '0.2rem' }} />
                      <strong style={{ color: '#334155', lineHeight: '1.4' }}>{p.descricaoItem}</strong>
                    </div>
                    {p.campea && (
                      <div style={{ 
                        marginTop: '1rem',
                        background: 'rgba(34, 197, 94, 0.1)', 
                        border: '1px solid rgba(34, 197, 94, 0.2)',
                        padding: '0.75rem', 
                        borderRadius: '6px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', fontWeight: 600, fontSize: '0.85rem' }}>
                          <Award size={16} /> Fornecedor Campeão Atual:
                        </div>
                        <div style={{ color: '#15803d', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                          <strong>{p.campea.razaoSocial}</strong> <br/>
                          {p.campea.observacao && (
                            <span style={{ fontSize: '0.75rem', color: '#166534', display: 'block', marginBottom: '0.2rem', fontStyle: 'italic' }}>
                              Marca/Ref: {p.campea.observacao}
                            </span>
                          )}
                          {p.campea.fatorEmbalagem > 1 && (
                            <span style={{ fontSize: '0.75rem', color: '#166534', display: 'block', marginBottom: '0.2rem' }}>
                              {p.campea.nomeEmbalagem || 'Pacote'} com {p.campea.fatorEmbalagem} un. | Preço: {formatCurrency(p.campea.precoEmbalagem)}
                            </span>
                          )}
                          Custo Unitário: {formatCurrency(p.campea.precoUnitario)}
                        </div>
                        {(p.campea.site || p.campea.portifolio) && (
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {p.campea.site && (
                              <a href={p.campea.site} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}>
                                <Globe size={12} /> Site
                              </a>
                            )}
                            {p.campea.portifolio && (
                              <span style={{ fontSize: '0.75rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.2rem' }} title={p.campea.portifolio}>
                                <FileText size={12} /> Portfólio
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {p.cotacoes.map((c: any) => (
                        <div key={c.fornecedorId} style={{ 
                          fontSize: '0.85rem', 
                          borderLeft: '3px solid #e2e8f0', 
                          paddingLeft: '0.75rem' 
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                            <Building2 size={14} color="#64748b" />
                            <span style={{ textDecoration: c.desclassificado ? 'line-through' : 'none', opacity: c.desclassificado ? 0.6 : 1 }}>
                              {c.razaoSocial}
                            </span>
                            {c.desclassificado && <span style={{ marginLeft: '0.5rem', color: '#ef4444', fontSize: '0.7rem', background: '#fef2f2', padding: '0.1rem 0.3rem', borderRadius: '4px', border: '1px solid #fca5a5' }}>Desclassificado</span>}
                            {c.site && (
                              <a href={c.site} target="_blank" rel="noreferrer" style={{ marginLeft: '0.5rem', color: '#3b82f6' }} title="Acessar Site">
                                <Globe size={14} />
                              </a>
                            )}
                            {c.portifolio && (
                              <span style={{ marginLeft: '0.25rem', color: '#8b5cf6', cursor: 'help' }} title={`Portfólio: ${c.portifolio}`}>
                                <FileText size={14} />
                              </span>
                            )}
                          </div>
                          <div style={{ color: '#64748b' }}>
                            {c.fatorEmbalagem > 1 ? (
                              <>
                                {c.observacao && <><span style={{ fontStyle: 'italic', fontSize: '0.75rem' }}>Marca/Ref: {c.observacao}</span> <br/></>}
                                {c.nomeEmbalagem || 'Pacote'} com {c.fatorEmbalagem} unidades | 
                                Preço do {c.nomeEmbalagem || 'Pacote'}: <strong>{formatCurrency(c.precoEmbalagem)}</strong> <br/>
                                Custo Unitário: <strong>{formatCurrency(c.precoUnitario)}</strong>
                              </>
                            ) : (
                              <>
                                {c.observacao && <><span style={{ fontStyle: 'italic', fontSize: '0.75rem' }}>Marca/Ref: {c.observacao}</span> <br/></>}
                                Preço Unitário: <strong>{formatCurrency(c.precoUnitario)}</strong>
                              </>
                            )}
                            <span style={{ fontSize: '0.7rem', marginLeft: '0.5rem' }}>({new Date(c.data).toLocaleDateString('pt-BR')})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      {editandoId === p.descricaoItem ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div>
                            <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Nosso Lance Oficial (Unitário)</label>
                            <input 
                              type="number" step="0.01" className="form-control"
                              value={editValues.nossoLanceOficial} 
                              onChange={e => setEditValues({...editValues, nossoLanceOficial: e.target.value})}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Valor Campeão da Licitação</label>
                            <input 
                              type="number" step="0.01" className="form-control"
                              value={editValues.valorCampeaoLicitacao} 
                              onChange={e => setEditValues({...editValues, valorCampeaoLicitacao: e.target.value})}
                            />
                          </div>
                          <button 
                            className="btn-primary" 
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
                            onClick={() => handleSaveIntel(p.descricaoItem)}
                          >
                            <Save size={16} /> Salvar Inteligência
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Nosso Lance Oficial (Unitário)</div>
                              <div style={{ fontWeight: 600, color: '#334155' }}>{formatCurrency(p.nossoLanceOficial)}</div>
                            </div>
                            <button 
                              onClick={() => handleEditClick(p)}
                              style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '0.2rem' }}
                              title="Editar Inteligência"
                            >
                              <Edit2 size={16} />
                            </button>
                          </div>
                          
                          <div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Valor Campeão da Licitação</div>
                            <div style={{ fontWeight: 600, color: '#334155' }}>{formatCurrency(p.valorCampeaoLicitacao)}</div>
                          </div>

                          {diferenca !== null && (
                            <div style={{ 
                              marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0',
                              color: diferenca > 0 ? '#ef4444' : '#10b981',
                              fontWeight: 600, fontSize: '0.9rem'
                            }}>
                              Diferença do seu lance: {formatCurrency(diferenca)}
                              <span style={{ fontSize: '0.75rem', fontWeight: 400, display: 'block', color: '#64748b' }}>
                                (Seu Lance - Valor Campeão)
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && produtos.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: '#3b82f6' }}>
                  Carregando...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-primary" style={{ background: '#e2e8f0', color: '#475569' }}>Anterior</button>
        <span>Página {page} de {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-primary" style={{ background: '#e2e8f0', color: '#475569' }}>Próxima</button>
      </div>
    </div>
  );
}
