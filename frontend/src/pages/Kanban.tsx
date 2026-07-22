import { useEffect, useState, useRef } from 'react';
import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Clock, Trash2, Trophy, Settings, Plus, ArrowUp, ArrowDown } from 'lucide-react';

const generateId = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, '_');

export default function Kanban() {
  const [oportunidades, setOportunidades] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, any>>({});
  const [cotacoes, setCotacoes] = useState<Record<string, any>>({});
  const [collapsedCols, setCollapsedCols] = useState<Record<string, boolean>>({});

  const [colunas, setColunas] = useState<{ id: string, nome: string }[]>([]);
  const [modalConfigColsOpen, setModalConfigColsOpen] = useState(false);

  // Estados para o Drag-to-Scroll
  const boardRef = useRef<HTMLDivElement>(null);
  const [isDraggingBoard, setIsDraggingBoard] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    // Só ativa o drag do board se clicar na área livre (não no card)
    const target = e.target as HTMLElement;
    if (target.closest('.kanban-card') || target.closest('button')) {
      return;
    }
    setIsDraggingBoard(true);
    if (boardRef.current) {
      setStartX(e.pageX - boardRef.current.offsetLeft);
      setScrollLeft(boardRef.current.scrollLeft);
    }
  };

  const handleMouseLeave = () => {
    setIsDraggingBoard(false);
  };

  const handleMouseUp = () => {
    setIsDraggingBoard(false);
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDraggingBoard) return;
    if (boardRef.current) {
      e.preventDefault();
      const x = e.pageX - boardRef.current.offsetLeft;
      const walk = (x - startX) * 2; // velocidade do scroll
      boardRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const toggleCollapse = (colId: string) => {
    setCollapsedCols(prev => ({ ...prev, [colId]: !prev[colId] }));
  };

  const carregarOportunidadesEProdutos = async () => {
    try {
      const [resOp, resProd, resConfig] = await Promise.all([
        fetch('http://localhost:7005/oportunidades?limit=100'),
        fetch('http://localhost:7005/produto?limit=1000'),
        fetch('http://localhost:7005/configuracoes')
      ]);
      const dataOp = await resOp.json();
      const dataProd = await resProd.json();
      const dataConfig = await resConfig.json();
      
      if (dataConfig && dataConfig.colunasKanban) {
        setColunas(dataConfig.colunasKanban);
      } else {
        setColunas([
          { id: 'A_FAZER', nome: 'A FAZER' },
          { id: 'FAZENDO', nome: 'FAZENDO' },
          { id: 'FEITO', nome: 'FEITO' },
          { id: 'AGUARDANDO_RESPOSTA', nome: 'AGUARDANDO RESPOSTA' },
          { id: 'EXCLUIDA', nome: 'EXCLUÍDA' }
        ]);
      }

      const ops = dataOp.data || [];
      setOportunidades(ops);
      setProdutos(dataProd.data || []);

      // Load cotações for each oportunidade (best proposal data)
      ops.forEach(async (op: any) => {
        try {
          const cotRes = await fetch(`http://localhost:7005/oportunidades/${op._id}/cotacao`);
          if (cotRes.ok) {
            const cotData = await cotRes.json();
            setCotacoes(prev => ({ ...prev, [op._id]: cotData }));
          }
        } catch {
          // cotacao may not exist yet
        }
      });

      ops.forEach(async (op: any) => {
        try {
          const scoreRes = await fetch('http://localhost:7010/market/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oportunidadeId: op._id, modalidade: op.modalidadeNome || '', uf: op.uf || '', valorEstimado: op.valorTotalEstimado || 0, orgaoCnpj: op.orgaoCnpj || '' })
          });
          const scoreData = await scoreRes.json();
          setScores(prev => ({ ...prev, [op._id]: scoreData }));
        } catch(e) {
          // ML API might not be reachable
        }
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    carregarOportunidadesEProdutos();
  }, []);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;

    if (source.droppableId !== destination.droppableId) {
      // Reset the collapsed state for the source and destination columns so they auto-adjust
      setCollapsedCols(prev => ({
        ...prev,
        [source.droppableId]: undefined as any,
        [destination.droppableId]: undefined as any
      }));
    }
    
    const sourceId = source.droppableId;
    const destId = destination.droppableId;
    const itemId = draggableId;

    if (sourceId === destId) return;

    const previous = [...oportunidades];
    setOportunidades(prev => prev.map(op => 
      op._id === itemId ? { ...op, kanbanStatus: destId } : op
    ));

    try {
      const res = await fetch(`http://localhost:7005/oportunidades/${itemId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kanbanStatus: destId })
      });
      if (!res.ok) throw new Error('Falha ao atualizar');
    } catch (e) {
      console.error(e);
      setOportunidades(previous);
    }
  };

  const moverPorMenu = async (itemId: string, novoStatus: string) => {
    const previous = [...oportunidades];
    setOportunidades(prev => prev.map(op => 
      op._id === itemId ? { ...op, kanbanStatus: novoStatus } : op
    ));
    try {
      const res = await fetch(`http://localhost:7005/oportunidades/${itemId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kanbanStatus: novoStatus })
      });
      if (!res.ok) throw new Error('Falha ao atualizar');
    } catch (e) {
      setOportunidades(previous);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza? Isso vai remover permanentemente esta oportunidade, seus itens, cotações e qualquer proposta associada. Essa ação não pode ser desfeita.")) {
      try {
        const res = await fetch(`http://localhost:7005/oportunidades/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setOportunidades(prev => prev.filter(op => op._id !== id));
        } else {
          alert('Erro ao excluir oportunidade');
        }
      } catch (e) {
        alert('Erro de conexão ao excluir');
      }
    }
  };

  // Helper: get best offer summary from cotação
  const getBestOfferInfo = (opId: string) => {
    const cot = cotacoes[opId];
    if (!cot || !cot.itens || cot.itens.length === 0) return null;

    // Find items that have a best price
    const itensComMelhor = cot.itens.filter((it: any) => it.melhorPreco);
    if (itensComMelhor.length === 0) return null;

    // Pick item with lowest melhorPreco (most relevant)
    const itemDestaque = itensComMelhor.reduce((best: any, cur: any) => {
      if (!best || cur.melhorPreco.precoUnitario < best.melhorPreco.precoUnitario) return cur;
      return best;
    }, null);

    if (!itemDestaque) return null;

    // Find winner supplier name (from populated data)
    const precoForn = itemDestaque.precosFornecedores?.find(
      (p: any) => p.fornecedorId?._id === itemDestaque.melhorPreco.fornecedorId ||
                  p.fornecedorId?.toString() === itemDestaque.melhorPreco.fornecedorId?.toString()
    );
    const nomeVencedor = precoForn?.fornecedorId?.razaoSocial || 'Fornecedor';

    const quantidade = itemDestaque.quantidade || 1;
    const valorOrgao = itemDestaque.valorUnitarioEstimado || 0;
    const melhorPreco = itemDestaque.melhorPreco.precoUnitario;
    const economiaPorUnidade = valorOrgao > 0 ? valorOrgao - melhorPreco : null;
    const economiaTotal = economiaPorUnidade !== null ? parseFloat((economiaPorUnidade * quantidade).toFixed(2)) : null;
    const totalMelhorProposta = parseFloat((melhorPreco * quantidade).toFixed(2));

    return {
      descricao: itemDestaque.descricaoItem || 'Item',
      valorOrgao,
      melhorPreco,
      quantidade,
      economiaPorUnidade,
      economiaTotal,
      totalMelhorProposta,
      totalItensComOferta: itensComMelhor.length,
      totalItens: cot.itens.length,
      nomeVencedor,
      valorTotal: parseFloat((cot.valorTotalMelhorCotacao || 0).toFixed(2)),
    };
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h1 style={{ margin: 0 }}>Kanban de Oportunidades</h1>
        <button onClick={() => setModalConfigColsOpen(true)} className="btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Settings size={18} /> Configurar Colunas
        </button>
      </div>
      <p style={{ color: 'var(--text-muted)' }}>Arraste os cards ou utilize o menu seletor para organizar as cotações.</p>
      
      <DragDropContext onDragEnd={onDragEnd}>
        <div 
          className="kanban-board" 
          ref={boardRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          style={{ 
            cursor: isDraggingBoard ? 'grabbing' : 'grab',
            overflowX: 'auto',
            display: 'flex',
            gap: '1rem',
            padding: '1rem 0',
            alignItems: 'flex-start'
          }}
        >
          {colunas.map(col => {
            const colId = col.id;
            const itensDaColuna = oportunidades
              .filter(op => op.kanbanStatus === colId)
              .sort((a, b) => {
                const dateA = new Date(a.dataEncerramentoProposta).getTime() || 0;
                const dateB = new Date(b.dataEncerramentoProposta).getTime() || 0;
                return dateA - dateB;
              });

            const isCollapsed = collapsedCols[colId] !== undefined ? collapsedCols[colId] : (itensDaColuna.length === 0);

            return (
              <Droppable key={colId} droppableId={colId}>
                {(provided) => (
                  <div className="kanban-col" ref={provided.innerRef} {...provided.droppableProps} style={{ width: isCollapsed ? 'min-content' : 'min-content', minWidth: isCollapsed ? 'min-content' : '320px', flex: isCollapsed ? '0 0 min-content' : '0 0 auto', transition: 'all 0.2s ease', overflow: 'hidden' }}>
                    <div className="kanban-col-header" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'nowrap', gap: '0.5rem', width: '100%', boxSizing: 'border-box' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                        <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', fontSize: '1rem', color: '#1e293b' }} title={col.nome}>
                          {col.nome}
                        </span>
                        <span className="badge" style={{ flexShrink: 0 }}>{itensDaColuna.length}</span>
                      </div>
                      <button onClick={() => toggleCollapse(colId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.5rem', margin: '-0.5rem', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={isCollapsed ? "Expandir Coluna" : "Recolher Coluna"}>
                        {isCollapsed ? '▶' : '◀'}
                      </button>
                    </div>
                    
                    {isCollapsed ? (
                      <div style={{ flex: 1 }}></div>
                    ) : (
                      <div className="kanban-list" style={{ flex: 1, minHeight: '100px' }}>
                      {itensDaColuna.map((item, index) => {
                        const diasRestantes = item.dataEncerramentoProposta ? Math.ceil((new Date(item.dataEncerramentoProposta).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : null;
                        const prods = produtos.filter(p => p.oportunidadeId === item._id);
                        const bestOffer = getBestOfferInfo(item._id);
                        
                        return (
                        <Draggable key={item._id} draggableId={item._id} index={index}>
                          {(provided) => (
                            <div className="kanban-card" ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={provided.draggableProps.style}>
                              <Link to={`/oportunidades/${item._id}`} style={{ textDecoration: 'none' }} aria-label={`Ver detalhes da oportunidade: ${item.orgaoNome}`}>
                                <h4 style={{ color: '#0ea5e9' }}>{item.orgaoNome}</h4>
                              </Link>
                              <p className="desc" title={item.objetoCompra}>{item.objetoCompra}</p>
                              
                              {colId === 'EXCLUIDA' && (
                                <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                  ⚠️ Você já excluiu esta proposta antes
                                </div>
                              )}
                              
                              {prods.length > 0 && !bestOffer && (
                                <div style={{ background: '#f1f5f9', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.75rem', border: '1px solid #e2e8f0' }}>
                                  <strong style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>Produtos/Serviços:</strong>
                                  <ul style={{ margin: 0, paddingLeft: '1rem', color: '#334155' }}>
                                    {prods.slice(0, 3).map(p => <li key={p._id}>{p.descricao}</li>)}
                                    {prods.length > 3 && <li style={{ color: '#64748b' }}>+{prods.length - 3} mais...</li>}
                                  </ul>
                                </div>
                              )}

                              {/* Melhor proposta em destaque */}
                              {bestOffer && (
                                <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid #86efac', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.75rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700, color: '#166534', marginBottom: '0.4rem' }}>
                                    <Trophy size={12} /> Melhor Proposta ({bestOffer.totalItensComOferta}/{bestOffer.totalItens} itens)
                                  </div>
                                  <div style={{ color: '#334155', marginBottom: '0.2rem', fontWeight: 600 }}>
                                    🏢 {bestOffer.nomeVencedor}
                                  </div>
                                  <div style={{ color: '#475569', marginBottom: '0.4rem' }}>
                                    📦 {bestOffer.descricao} — {bestOffer.quantidade} un.
                                  </div>

                                  {/* Preços e economy */}
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: '0.4rem', padding: '0.4rem', background: 'rgba(255,255,255,0.6)', borderRadius: '4px' }}>
                                    {bestOffer.valorOrgao > 0 && (
                                      <div>
                                        <div style={{ color: '#64748b', fontSize: '0.65rem', marginBottom: '0.1rem' }}>Ref. órgão (unit.)</div>
                                        <div style={{ color: '#475569', fontWeight: 600 }}>R$ {bestOffer.valorOrgao.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</div>
                                      </div>
                                    )}
                                    <div>
                                      <div style={{ color: '#64748b', fontSize: '0.65rem', marginBottom: '0.1rem' }}>Cotação campã (unit.)</div>
                                      <div style={{ color: '#166534', fontWeight: 700 }}>R$ {bestOffer.melhorPreco.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</div>
                                    </div>
                                    {bestOffer.economiaPorUnidade !== null && bestOffer.economiaPorUnidade > 0 && (
                                      <div>
                                        <div style={{ color: '#64748b', fontSize: '0.65rem', marginBottom: '0.1rem' }}>Lucro/unit.</div>
                                        <div style={{ color: '#16a34a', fontWeight: 700 }}>R$ {bestOffer.economiaPorUnidade.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</div>
                                      </div>
                                    )}
                                    {bestOffer.economiaTotal !== null && bestOffer.economiaTotal > 0 && (
                                      <div>
                                        <div style={{ color: '#64748b', fontSize: '0.65rem', marginBottom: '0.1rem' }}>Economia total</div>
                                        <div style={{ color: '#16a34a', fontWeight: 700 }}>↓ R$ {bestOffer.economiaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                      </div>
                                    )}
                                  </div>

                                  {bestOffer.valorTotal > 0 && (
                                    <div style={{ marginTop: '0.4rem', fontSize: '0.7rem', color: '#64748b', textAlign: 'right' }}>
                                      Total cotado: <strong style={{ color: '#166534' }}>R$ {bestOffer.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {scores[item._id] && (
                                <div style={{ marginBottom: '1rem', fontSize: '0.75rem' }}>
                                  {scores[item._id].probabilidadeVitoria !== null ? (
                                    <span style={{ 
                                      background: scores[item._id].probabilidadeVitoria > 0.5 ? '#dcfce7' : '#fef08a', 
                                      color: scores[item._id].probabilidadeVitoria > 0.5 ? '#166534' : '#854d0e',
                                      padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 'bold'
                                    }}>
                                      🎯 Score: {(scores[item._id].probabilidadeVitoria * 100).toFixed(1)}%
                                    </span>
                                  ) : (
                                    <span style={{ background: '#e2e8f0', color: '#475569', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                                      🤖 {scores[item._id].mensagem}
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              {diasRestantes !== null && (
                                <div aria-label={`Faltam ${diasRestantes} dias para o encerramento`} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '1rem', fontSize: '0.8rem', color: diasRestantes <= 2 ? '#ef4444' : '#eab308', fontWeight: 600 }}>
                                  <Clock size={14} aria-hidden="true" /> Faltam {diasRestantes} dias
                                </div>
                              )}

                              <div className="kanban-card-footer">
                                <span className="kanban-card-price" aria-label={`Valor estimado: R$ ${item.valorTotalEstimado?.toLocaleString('pt-BR')}`}>
                                  R$ {item.valorTotalEstimado?.toLocaleString('pt-BR')}
                                </span>
                                <select 
                                  value={colId} 
                                  onChange={(e) => {
                                    moverPorMenu(item._id, e.target.value);
                                    setCollapsedCols(prev => ({
                                      ...prev,
                                      [colId]: undefined as any,
                                      [e.target.value]: undefined as any
                                    }));
                                  }}
                                  className="form-control"
                                  style={{ width: 'auto', padding: '0.25rem', fontSize: '0.75rem', cursor: 'pointer' }}
                                  aria-label={`Alterar status da oportunidade ${item.orgaoNome}`}
                                >
                                  {colunas.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                </select>
                                {colId !== 'EXCLUIDA' && (
                                  <button 
                                    onClick={() => handleDelete(item._id)} 
                                    aria-label="Excluir Oportunidade" 
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.25rem' }}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      )})}
                        {provided.placeholder}
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      {/* Modal de Configuração de Colunas */}
      {modalConfigColsOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModalConfigColsOpen(false); }}>
          <div className="modal-content" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}>
            <h2>Gerenciar Colunas do Kanban</h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Adicione, edite, exclua e reordene as colunas.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {colunas.map((c, idx) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <input 
                    type="text" 
                    value={c.nome} 
                    onChange={(e) => {
                      const newCols = [...colunas];
                      newCols[idx].nome = e.target.value;
                      setColunas(newCols);
                    }}
                    className="form-control"
                    style={{ flex: 1, margin: 0 }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <button type="button" disabled={idx === 0} onClick={() => {
                      const newCols = [...colunas];
                      const temp = newCols[idx - 1];
                      newCols[idx - 1] = newCols[idx];
                      newCols[idx] = temp;
                      setColunas(newCols);
                    }} style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer', color: idx === 0 ? '#cbd5e1' : '#475569' }}>
                      <ArrowUp size={16} />
                    </button>
                    <button type="button" disabled={idx === colunas.length - 1} onClick={() => {
                      const newCols = [...colunas];
                      const temp = newCols[idx + 1];
                      newCols[idx + 1] = newCols[idx];
                      newCols[idx] = temp;
                      setColunas(newCols);
                    }} style={{ background: 'none', border: 'none', cursor: idx === colunas.length - 1 ? 'not-allowed' : 'pointer', color: idx === colunas.length - 1 ? '#cbd5e1' : '#475569' }}>
                      <ArrowDown size={16} />
                    </button>
                  </div>
                  <button type="button" onClick={() => {
                    if (window.confirm(`Tem certeza que deseja excluir a coluna "${c.nome}"? Os cards nela não serão apagados, mas ficarão sem coluna até que você mude o status deles.`)) {
                      setColunas(colunas.filter((_, i) => i !== idx));
                    }
                  }} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', padding: '0.4rem', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              
              <button type="button" onClick={() => {
                const nome = window.prompt("Nome da nova coluna:");
                if (nome) {
                  setColunas([...colunas, { id: generateId(nome), nome }]);
                }
              }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#e0e7ff', color: '#4f46e5', border: '1px dashed #a5b4fc', borderRadius: '8px', padding: '0.75rem', cursor: 'pointer', fontWeight: 'bold', marginTop: '0.5rem' }}>
                <Plus size={18} /> Adicionar Nova Coluna
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setModalConfigColsOpen(false)} className="btn-primary" style={{ background: '#e2e8f0', color: '#475569' }}>Cancelar</button>
              <button onClick={async () => {
                try {
                  const res = await fetch('http://localhost:7005/configuracoes', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ colunasKanban: colunas })
                  });
                  if (res.ok) {
                    setModalConfigColsOpen(false);
                  } else {
                    alert('Erro ao salvar colunas');
                  }
                } catch (e) {
                  alert('Erro de conexão ao salvar colunas');
                }
              }} className="btn-primary">Salvar Colunas</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

