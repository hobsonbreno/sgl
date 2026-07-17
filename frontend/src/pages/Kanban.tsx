import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Clock } from 'lucide-react';

const COLUNAS = ['A_FAZER', 'FAZENDO', 'FEITO', 'AGUARDANDO_RESPOSTA'];

export default function Kanban() {
  const [oportunidades, setOportunidades] = useState<any[]>([]);

  const carregarOportunidades = async () => {
    try {
      const res = await fetch('http://localhost:7005/oportunidades?limit=100');
      const data = await res.json();
      setOportunidades(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    carregarOportunidades();
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
                        return (
                        <Draggable key={item._id} draggableId={item._id} index={index}>
                          {(provided) => (
                            <div className="kanban-card" ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={provided.draggableProps.style}>
                              <Link to={`/oportunidades/${item._id}`} style={{ textDecoration: 'none' }}>
                                <h4 style={{ color: '#0ea5e9' }}>{item.orgaoNome}</h4>
                              </Link>
                              <p className="desc">{item.objetoCompra}</p>
                              
                              {diasRestantes !== null && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '1rem', fontSize: '0.8rem', color: diasRestantes <= 2 ? '#ef4444' : '#eab308', fontWeight: 600 }}>
                                  <Clock size={14} /> Faltam {diasRestantes} dias
                                </div>
                              )}

                              <div className="kanban-card-footer">
                                <span className="kanban-card-price">
                                  R$ {item.valorTotalEstimado?.toLocaleString('pt-BR')}
                                </span>
                                <select 
                                  value={colId} 
                                  onChange={(e) => moverPorMenu(item._id, e.target.value)}
                                  className="form-control"
                                  style={{ width: 'auto', padding: '0.25rem', fontSize: '0.75rem' }}
                                  aria-label="Mover para"
                                >
                                  {COLUNAS.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                                </select>
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
