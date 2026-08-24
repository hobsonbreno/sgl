import React, { useState, useEffect, useMemo } from 'react';
import { Search} from 'lucide-react';
import { io } from 'socket.io-client';

export default function BaseProdutos() {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [produtosSelecionados, setProdutosSelecionados] = useState<string[]>([]);
  const [showUnifyModal, setShowUnifyModal] = useState(false);
  const [nomeDestino, setNomeDestino] = useState('');
  const [unificando, setUnificando] = useState(false);
  
  useEffect(() => {
    carregarBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  useEffect(() => {
    const socket = io(window.API_URL);
    socket.on('fornecedor_updated', () => setRefresh(r => r + 1));
    socket.on('fornecedor_deleted', () => setRefresh(r => r + 1));
    return () => {
      socket.disconnect();
    };
  }, []);

  const carregarBase = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${window.API_URL}/fornecedores/produtos/base?matrix=true`);
      const payload = await res.json();
      setProdutos(payload.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUnificar = async () => {
    if (!nomeDestino) return;
    setUnificando(true);
    try {
      const res = await fetch(`${window.API_URL}/fornecedores/produtos/base/unificar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produtosOrigem: produtosSelecionados, produtoDestino: nomeDestino })
      });
      if (res.ok) {
        setProdutosSelecionados([]);
        setShowUnifyModal(false);
        carregarBase();
      } else {
        alert('Erro ao unificar produtos');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao unificar produtos');
    } finally {
      setUnificando(false);
    }
  };

  const formatCurrency = (val: any) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (val: any) => {
    if (!val) return '';
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(val));
  };

  // Process data for Matrix View
  const { categoriasAgrupadas, fornecedoresUnicos } = useMemo(() => {
    const fornecedoresMap = new Map<string, { id: string, razaoSocial: string }>();
    const categoriasMap = new Map<string, any[]>();

    const buscaLower = busca.toLowerCase();

    produtos.forEach(p => {
      // Agrupar por Categoria
      let cat = p.categoria;
      if (!cat) {
        cat = 'OUTROS';
      }

      // Filtro local instantâneo
      let match = false;
      let pCotacoes = p.cotacoes;

      if (!buscaLower) {
        match = true;
      } else {
        const pName = (p.descricaoItem || '').toLowerCase();
        const prodMatch = pName.includes(buscaLower);
        const catMatch = cat.toLowerCase().includes(buscaLower);
        
        if (prodMatch || catMatch) {
           match = true;
        } else {
           // Verifica se alguma empresa bate com a busca
           const matchingCotacoes = p.cotacoes.filter((c: any) => (c.razaoSocial || '').toLowerCase().includes(buscaLower));
           if (matchingCotacoes.length > 0) {
              match = true;
              pCotacoes = matchingCotacoes; // Mantém apenas a empresa pesquisada para colapsar a matriz
           }
        }
      }

      if (!match) return; // Pula este produto se não bater com a busca

      // Registrar fornecedores únicos que cotaram esse produto (usando as cotações filtradas)
      pCotacoes.forEach((c: any) => {
        fornecedoresMap.set(c.fornecedorId.toString(), { id: c.fornecedorId, razaoSocial: c.razaoSocial });
      });

      const pFiltrado = { ...p, cotacoes: pCotacoes };

      if (!categoriasMap.has(cat)) {
        categoriasMap.set(cat, []);
      }
      categoriasMap.get(cat)!.push(pFiltrado);
    });

    const fUnicos = Array.from(fornecedoresMap.values()).sort((a, b) => a.razaoSocial.localeCompare(b.razaoSocial));
    
    // Ordenar categorias (Categoria - Cereais pode ir pro final se desejado, mas vamos deixar ordem alfabética)
    const cAgrupadas = Array.from(categoriasMap.entries()).sort(([a], [b]) => {
      return a.localeCompare(b);
    });

    // Ordenar os produtos dentro de cada categoria em forma crescente (A-Z)
    cAgrupadas.forEach(([_catName, lista]) => {
       lista.sort((a, b) => (a.descricaoItem || '').localeCompare(b.descricaoItem || ''));
    });

    return { categoriasAgrupadas: cAgrupadas, fornecedoresUnicos: fUnicos };
  }, [produtos, busca]);

  return (
    <div style={{ paddingBottom: '3rem', width: '100%', overflowX: 'auto' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Base Geral de Produtos</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Catálogo Estratégico: Visualize os produtos separados por categorias cruzados com os preços cotados por cada fornecedor (estilo planilha).
      </p>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ flex: 1, position: 'relative', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', color: '#94a3b8' }} />
          <input 
            type="text" 
            className="form-control" 
            placeholder="Buscar por nome do produto..." 
            style={{ paddingLeft: '2.5rem' }}
            value={busca}
            onChange={e => { setBusca(e.target.value); }}
          />
        </div>
      </div>

      <div className="table-container" style={{ overflow: 'scroll', border: '1px solid #e2e8f0', borderRadius: '8px', maxHeight: '70vh', maxWidth: '100%', background: 'white' }}>
        <table style={{ minWidth: 'max-content', borderCollapse: 'collapse', width: '100%' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 3, background: 'white' }}>
            {/* Header Title Row like Spreadsheet */}
            <tr>
              <th style={{ background: '#000', color: '#fff', padding: '0.75rem', minWidth: '300px', maxWidth: '300px', borderRight: '2px solid #cbd5e1', position: 'sticky', left: 0, zIndex: 4, textTransform: 'uppercase', textAlign: 'center' }}>
                PRODUTOS
              </th>
              <th colSpan={2} style={{ background: '#000', color: 'white', textAlign: 'center', padding: '0.75rem', fontWeight: 'bold', fontSize: '1rem', borderBottom: '2px solid #333', borderRight: '2px solid #cbd5e1', position: 'sticky', left: '300px', zIndex: 4, minWidth: '300px', maxWidth: '300px' }}>
                INTELIGÊNCIA
              </th>
              {fornecedoresUnicos.length > 0 && (
                <th colSpan={1} style={{ background: '#000', color: 'white', textAlign: 'center', padding: '0.75rem', fontWeight: 'bold', fontSize: '1rem', borderBottom: '2px solid #333' }}>
                  FORNECEDORES
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {categoriasAgrupadas.map(([categoria, listaProdutos]) => (
              <React.Fragment key={categoria}>
                {/* Category Header Row */}
                <tr>
                  <td style={{ 
                    background: '#fef3c7', 
                    color: '#b45309', 
                    fontWeight: 'bold', 
                    padding: '0.5rem 1rem',
                    borderTop: '2px solid #fcd34d',
                    borderBottom: '1px solid #fcd34d',
                    position: 'sticky',
                    left: 0,
                    zIndex: 3,
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    minWidth: '300px', 
                    maxWidth: '300px'
                  }}>
                    {categoria}
                  </td>
                  <td style={{ background: '#fef3c7', borderTop: '2px solid #fcd34d', borderBottom: '1px solid #fcd34d', textAlign: 'center', fontWeight: 'bold', color: '#92400e', fontSize: '0.85rem', borderRight: '1px solid #fde68a', padding: '0.5rem', position: 'sticky', left: '300px', zIndex: 3, minWidth: '150px', maxWidth: '150px' }}>Melhor Preço</td>
                  <td style={{ background: '#fef3c7', borderTop: '2px solid #fcd34d', borderBottom: '1px solid #fcd34d', textAlign: 'center', fontWeight: 'bold', color: '#92400e', fontSize: '0.85rem', padding: '0.5rem' }}>
                    Empresas Classificadas
                  </td>
                </tr>
                
                {/* Products Rows */}
                {listaProdutos.map((p, idx) => {
                  // Obter todas as cotações válidas e ordená-las pelo preço
                  const cotacoesValidas = p.cotacoes
                    .filter((c: any) => !c.desclassificado && c.precoUnitario != null)
                    .sort((a: any, b: any) => a.precoUnitario - b.precoUnitario);

                  // Preços únicos ordenados para determinar o rank (em caso de empate, mesmo rank)
                  const precosUnicos = Array.from(new Set(cotacoesValidas.map((c: any) => c.precoUnitario)));

                  const temCampeao = precosUnicos.length > 0;
                  const campeao = temCampeao ? cotacoesValidas[0] : null;

                  return (
                  <tr key={p.descricaoItem} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '0.75rem', borderRight: '2px solid #cbd5e1', borderBottom: '1px solid #e2e8f0', position: 'sticky', left: 0, background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', zIndex: 2, textAlign: 'center', minWidth: '300px', maxWidth: '300px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <input 
                           type="checkbox" 
                           checked={produtosSelecionados.includes(p.descricaoItem)}
                           onChange={(e) => {
                              if (e.target.checked) setProdutosSelecionados([...produtosSelecionados, p.descricaoItem]);
                              else setProdutosSelecionados(produtosSelecionados.filter(item => item !== p.descricaoItem));
                           }}
                           style={{ cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }}
                        />
                        <div 
                          style={{ fontWeight: 500, color: '#334155', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}
                          title={p.descricaoItem}
                        >
                          {p.descricaoItem ? p.descricaoItem.split(/[,;:]/)[0].trim() : ''}
                        </div>
                      </div>
                    </td>
                    
                    {/* Inteligencia Cells first (Melhor Preço) */}
                    <td style={{ padding: '0.75rem', textAlign: 'center', borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #e2e8f0', background: '#dcfce3', position: 'sticky', left: '300px', zIndex: 2, minWidth: '150px', maxWidth: '150px' }}>
                       {temCampeao ? (
                         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                           <span style={{ fontWeight: 900, color: '#15803d', fontSize: '1.1rem', background: '#bbf7d0', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid #4ade80' }}>
                             {formatCurrency(campeao.precoUnitario)}
                           </span>
                           <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase', background: '#86efac', padding: '0.2rem 0.5rem', borderRadius: '4px', textAlign: 'center', lineHeight: '1.2' }}>
                             {campeao.razaoSocial}
                           </span>
                           {campeao.data && (
                             <span style={{ fontSize: '0.65rem', color: '#15803d', fontWeight: 600 }}>
                               {formatDate(campeao.data)}
                             </span>
                           )}
                         </div>
                       ) : (
                         <span style={{ color: '#cbd5e1' }}>-</span>
                       )}
                    </td>

                    {/* Fornecedores Ranked */}
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0', background: 'transparent' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'nowrap', alignItems: 'center' }}>
                        {cotacoesValidas.map((cotacao: any) => {
                             let rank = precosUnicos.indexOf(cotacao.precoUnitario) + 1;
                             const fornecedor = fornecedoresUnicos.find(f => f.id.toString() === cotacao.fornecedorId.toString());
                             const razaoSocial = fornecedor ? fornecedor.razaoSocial : 'Desconhecido';

                             let bgColor = '#f8fafc';
                             let badgeColor = '#475569';
                             let badgeBg = '#e2e8f0';
                             let icon = '';
                             let label = '';
                             
                             if (rank === 1) {
                                 bgColor = '#fef9c3';
                                 badgeColor = '#a16207';
                                 badgeBg = '#fef08a';
                                 icon = '🥇';
                                 label = '1º Ouro';
                             } else if (rank === 2) {
                                 bgColor = '#f1f5f9';
                                 badgeColor = '#334155';
                                 badgeBg = '#e2e8f0';
                                 icon = '🥈';
                                 label = '2º Prata';
                             } else if (rank === 3) {
                                 bgColor = '#fff7ed';
                                 badgeColor = '#9a3412';
                                 badgeBg = '#ffedd5';
                                 icon = '🥉';
                                 label = '3º Bronze';
                             } else {
                                 label = `${rank}º Lugar`;
                             }

                             return (
                               <div key={cotacao.fornecedorId} style={{ 
                                  display: 'flex', flexDirection: 'column', alignItems: 'center', 
                                  background: bgColor, border: `1px solid ${badgeBg}`, borderRadius: '6px', 
                                  padding: '0.5rem', minWidth: '120px'
                               }}>
                                 <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: badgeColor, textTransform: 'uppercase', textAlign: 'center', marginBottom: '0.25rem' }}>
                                   {razaoSocial}
                                 </span>
                                 <span style={{ fontWeight: rank <= 3 ? 800 : 600, color: rank === 1 ? '#a16207' : (rank === 2 ? '#475569' : (rank === 3 ? '#9a3412' : '#334155')) }}>
                                   {formatCurrency(cotacao.precoUnitario)}
                                 </span>
                                 {cotacao.observacao && (
                                   <div style={{ fontSize: '0.65rem', color: '#64748b', textAlign: 'center', marginTop: '2px', fontStyle: 'italic', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cotacao.observacao.replace('Original: ', '')}>
                                     {cotacao.observacao.replace('Original: ', '')}
                                   </div>
                                 )}
                                 {cotacao.data && (
                                   <div style={{ fontSize: '0.65rem', color: '#94a3b8', textAlign: 'center', marginTop: '2px' }}>
                                     {formatDate(cotacao.data)}
                                   </div>
                                 )}
                                 {rank <= 3 && (
                                   <div style={{ fontSize: '0.7rem', color: badgeColor, background: badgeBg, padding: '0.1rem 0.4rem', borderRadius: '4px', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 700 }}>
                                     <span>{icon}</span> {label}
                                   </div>
                                 )}
                                 {rank > 3 && (
                                   <div style={{ fontSize: '0.7rem', color: '#64748b', background: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}>
                                     {label}
                                   </div>
                                 )}
                               </div>
                             );
                        })}
                        {cotacoesValidas.length === 0 && (
                           <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>Nenhuma empresa cotou este produto</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )})}
              </React.Fragment>
            ))}

            {!loading && produtos.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={fornecedoresUnicos.length + 3} style={{ textAlign: 'center', padding: '2rem', color: '#3b82f6' }}>
                  Carregando Matriz de Produtos...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {produtosSelecionados.length > 1 && (
        <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: 'white', padding: '1rem 2rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1.5rem', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)', zIndex: 50 }}>
          <span style={{ fontWeight: 600 }}>{produtosSelecionados.length} produtos selecionados</span>
          <button 
            onClick={() => { setNomeDestino(produtosSelecionados[0]); setShowUnifyModal(true); }}
            style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            UNIFICAR
          </button>
          <button 
            onClick={() => setProdutosSelecionados([])}
            style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #475569', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
          >
            Cancelar
          </button>
        </div>
      )}

      {showUnifyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', width: '90%', maxWidth: '500px', color: '#334155' }}>
            <h2 style={{ marginBottom: '1rem' }}>Unificar Produtos</h2>
            <p style={{ marginBottom: '1rem', color: '#475569' }}>Você está unificando <strong>{produtosSelecionados.length}</strong> produtos. Eles serão mesclados em um único item consolidando todos os fornecedores (com a data mais recente valendo para cada).</p>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Nome Final do Produto</label>
              <input 
                type="text" 
                className="form-control" 
                value={nomeDestino} 
                onChange={e => setNomeDestino(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                onClick={() => setShowUnifyModal(false)}
                style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', background: 'transparent', borderRadius: '4px', cursor: 'pointer' }}
                disabled={unificando}
              >
                Cancelar
              </button>
              <button 
                onClick={handleUnificar}
                style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                disabled={unificando || !nomeDestino}
              >
                {unificando ? 'Unificando...' : 'Confirmar Unificação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
