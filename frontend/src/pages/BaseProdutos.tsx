import React, { useState, useEffect, useMemo } from 'react';
import { Search} from 'lucide-react';
import { io } from 'socket.io-client';

export default function BaseProdutos() {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [refresh, setRefresh] = useState(0);
  
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

  const formatCurrency = (val: any) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Process data for Matrix View
  const { categoriasAgrupadas, fornecedoresUnicos } = useMemo(() => {
    const fornecedoresMap = new Map<string, { id: string, razaoSocial: string }>();
    const categoriasMap = new Map<string, any[]>();

    const buscaLower = busca.toLowerCase();

    produtos.forEach(p => {
      // Agrupar por Categoria
      let cat = p.categoria;
      if (!cat || cat === 'OUTROS') {
        cat = 'Categoria - Cereais'; // Substituindo o nome padrao OUTROS por Categoria - Cereais
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
              <th style={{ background: '#000', color: '#fff', padding: '0.75rem', minWidth: '300px', borderRight: '2px solid #cbd5e1', position: 'sticky', left: 0, zIndex: 4, textTransform: 'uppercase', textAlign: 'center' }}>
                PRODUTOS
              </th>
              <th colSpan={2} style={{ background: '#000', color: 'white', textAlign: 'center', padding: '0.75rem', fontWeight: 'bold', fontSize: '1rem', borderBottom: '2px solid #333', borderRight: '2px solid #cbd5e1' }}>
                INTELIGÊNCIA
              </th>
              {fornecedoresUnicos.length > 0 && (
                <th colSpan={fornecedoresUnicos.length} style={{ background: '#000', color: 'white', textAlign: 'center', padding: '0.75rem', fontWeight: 'bold', fontSize: '1rem', borderBottom: '2px solid #333' }}>
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
                    zIndex: 2,
                    textTransform: 'uppercase',
                    textAlign: 'center'
                  }}>
                    {categoria}
                  </td>
                  <td style={{ background: '#fef3c7', borderTop: '2px solid #fcd34d', borderBottom: '1px solid #fcd34d', textAlign: 'center', fontWeight: 'bold', color: '#92400e', fontSize: '0.85rem', borderRight: '1px solid #fde68a', padding: '0.5rem' }}>Melhor Preço</td>
                  <td style={{ background: '#fef3c7', borderTop: '2px solid #fcd34d', borderBottom: '1px solid #fcd34d', textAlign: 'center', fontWeight: 'bold', color: '#92400e', fontSize: '0.85rem', borderRight: '2px solid #fde68a', padding: '0.5rem' }}>Nosso Lance</td>
                  {fornecedoresUnicos.map(f => (
                    <td key={f.id} style={{ background: '#fef3c7', borderTop: '2px solid #fcd34d', borderBottom: '1px solid #fcd34d', textAlign: 'center', fontWeight: 'bold', color: '#92400e', fontSize: '0.75rem', borderRight: '1px solid #fde68a', maxWidth: '150px', padding: '0.5rem' }}>
                      {f.razaoSocial}
                    </td>
                  ))}
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
                    <td style={{ padding: '0.75rem', borderRight: '2px solid #cbd5e1', borderBottom: '1px solid #e2e8f0', position: 'sticky', left: 0, background: 'inherit', zIndex: 1, textAlign: 'center' }}>
                      <div style={{ fontWeight: 500, color: '#334155', fontSize: '0.85rem' }}>{p.descricaoItem}</div>
                    </td>
                    
                    {/* Inteligencia Cells first (Melhor Preço e Nosso Lance) */}
                    <td style={{ padding: '0.75rem', textAlign: 'center', borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #e2e8f0', background: '#dcfce3' }}>
                       {temCampeao ? (
                         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                           <span style={{ fontWeight: 900, color: '#15803d', fontSize: '1.1rem', background: '#bbf7d0', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid #4ade80' }}>
                             {formatCurrency(campeao.precoUnitario)}
                           </span>
                           <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase', background: '#86efac', padding: '0.2rem 0.5rem', borderRadius: '4px', textAlign: 'center', lineHeight: '1.2' }}>
                             {campeao.razaoSocial}
                           </span>
                         </div>
                       ) : (
                         <span style={{ color: '#cbd5e1' }}>-</span>
                       )}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', borderRight: '2px solid #cbd5e1', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.85rem' }}>{formatCurrency(p.nossoLanceOficial)}</span>
                    </td>

                    {/* Fornecedores Cells */}
                    {fornecedoresUnicos.map(f => {
                      const cotacao = p.cotacoes.find((c: any) => c.fornecedorId.toString() === f.id.toString());
                      
                      let rank = -1;
                      if (cotacao && !cotacao.desclassificado && cotacao.precoUnitario != null) {
                          rank = precosUnicos.indexOf(cotacao.precoUnitario) + 1; // 1-based rank
                      }

                      let bgColor = 'transparent';
                      let badgeColor = '';
                      let badgeBg = '';
                      let icon = '';
                      let label = '';
                      
                      if (rank === 1) {
                          bgColor = '#fef9c3';
                          badgeColor = '#a16207';
                          badgeBg = '#fef08a';
                          icon = '🥇';
                          label = '1º Lugar';
                      } else if (rank === 2) {
                          bgColor = '#f8fafc';
                          badgeColor = '#475569';
                          badgeBg = '#e2e8f0';
                          icon = '🥈';
                          label = '2º Lugar';
                      } else if (rank === 3) {
                          bgColor = '#fff7ed';
                          badgeColor = '#9a3412';
                          badgeBg = '#ffedd5';
                          icon = '🥉';
                          label = '3º Lugar';
                      }

                      return (
                        <td key={f.id} style={{ padding: '0.75rem', textAlign: 'center', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem', background: bgColor }}>
                          {cotacao ? (
                            <div style={{ color: cotacao.desclassificado ? '#ef4444' : (rank === 1 ? '#a16207' : (rank === 2 ? '#475569' : (rank === 3 ? '#9a3412' : '#334155'))), textDecoration: cotacao.desclassificado ? 'line-through' : 'none', fontWeight: rank > 0 && rank <= 3 ? 800 : 600 }}>
                              {formatCurrency(cotacao.precoUnitario)}
                              {rank > 0 && rank <= 3 && (
                                <div style={{ fontSize: '0.7rem', color: badgeColor, background: badgeBg, padding: '0.1rem 0.3rem', borderRadius: '4px', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 700 }}>
                                  <span>{icon}</span> {label}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#cbd5e1' }}>-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )})}
              </React.Fragment>
            ))}

            {!loading && produtos.length === 0 && (
              <tr>
                <td colSpan={fornecedoresUnicos.length + 3} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
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
    </div>
  );
}
