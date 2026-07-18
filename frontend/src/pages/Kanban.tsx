import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Clock, Trash2, Trophy } from 'lucide-react';

const COLUNAS = ['A_FAZER', 'FAZENDO', 'FEITO', 'AGUARDANDO_RESPOSTA'];

export default function Kanban() {
  const [oportunidades, setOportunidades] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, any>>({});
  const [cotacoes, setCotacoes] = useState<Record<string, any>>({});

  const carregarOportunidadesEProdutos = async () => {
    try {
      const [resOp, resProd] = await Promise.all([
        fetch('http://localhost:7005/oportunidades?limit=100'),
        fetch('http://localhost:7005/produto?limit=1000')
      ]);
      const dataOp = await resOp.json();
      const dataProd = await resProd.json();
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
    
    const sourceId = result.source.droppableId;
    const destId = result.destination.droppableId;
    const itemId = result.draggableId;

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
      <h1 style={{ marginBottom: '0.5rem' }}>Kanban de Oportunidades</h1>
      <p style={{ color: 'var(--text-muted)' }}>Arraste os cards ou utilize o menu seletor para organizar as cotações.</p>
      
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="kanban-board">
          {COLUNAS.map(colId => {
            const itensDaColuna = oportunidades.filter(op => op.kanbanStatus === colId);

            return (
              <Droppable key={colId} droppableId={colId}>
                {(provided) => (
                  <div className="kanban-col" ref={provided.innerRef} {...provided.droppableProps}>
                    <div className="kanban-col-header">
                      <span>{colId.replace('_', ' ')}</span>
                      <span className="badge">{itensDaColuna.length}</span>
                    </div>
                    
                    <div className="kanban-list">
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
                                  onChange={(e) => moverPorMenu(item._id, e.target.value)}
                                  className="form-control"
                                  style={{ width: 'auto', padding: '0.25rem', fontSize: '0.75rem', cursor: 'pointer' }}
                                  aria-label={`Alterar status da oportunidade ${item.orgaoNome}`}
                                >
                                  {COLUNAS.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                                </select>
                                <button 
                                  onClick={() => handleDelete(item._id)} 
                                  aria-label="Excluir Oportunidade" 
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.25rem' }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      )})}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}

