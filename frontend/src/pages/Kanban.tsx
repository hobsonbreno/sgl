import { useEffect, useState, useRef } from 'react';
import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Trash2, Trophy, Settings, Plus, ArrowUp, ArrowDown, ChevronUp, ChevronDown, Archive, Copy, ExternalLink } from 'lucide-react';
import { io } from 'socket.io-client';
import Countdown from '../components/Countdown';

const generateId = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, '_');

export default function Kanban() {
  const [oportunidades, setOportunidades] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [scores, setScores] = useState<Record<string, any>>({});
  const [cotacoes, setCotacoes] = useState<Record<string, any>>({});
  const [collapsedCols, setCollapsedCols] = useState<Record<string, boolean>>({});
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('sgl_collapsed_cards');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [expandedObjects, setExpandedObjects] = useState<Record<string, boolean>>({});
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const [socketRef, setSocketRef] = useState<any>(null);
  
  const toggleObjectExpand = (cardId: string) => {
    setExpandedObjects(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const toggleItemsExpand = (cardId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };


  const toggleCardCollapse = (cardId: string) => {
    setCollapsedCards(prev => {
      const currentState = prev[cardId] !== undefined ? prev[cardId] : true;
      const collapsed = !currentState;
      const newState = { ...prev, [cardId]: collapsed };
      localStorage.setItem('sgl_collapsed_cards', JSON.stringify(newState));
      
      // Emit the change to all other computers in real time
      if (socketRef) {
        socketRef.emit('toggle_card_collapse', { cardId, collapsed });
      }

      return newState;
    });
  };

  const getSuffixMessage = (colNome: string) => {
    const upper = colNome.toUpperCase();
    if (upper.includes('FAZENDO')) return 'EM COTAÇÃO DE PREÇOS COM FORNECEDORES';
    if (upper.includes('FEITO')) return 'Cotação Realizada e Proposta Lançada No Site do Órgão Licitante, Aguardando convocação para envio dos documentos';
    if (upper.includes('NEGOCIA')) return 'AGUARDANDO APROVAÇÃO DOS DOCUMENTOS';
    if (upper.includes('HOMOLOGA')) return 'DOCUMENTOS APROVADOS AGUARDANDO ASSINATURA DO CONTRATO';
    if (upper.includes('FECHADO') || upper.includes('NEGÓCIO')) return '🎉 PARABÉNS NEGÓCIO FECHADO 🏆';
    return undefined;
  };

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
        fetch(`${window.API_URL}/oportunidades?limit=500`),
        fetch(`${window.API_URL}/produto?limit=10000`),
        fetch(`${window.API_URL}/configuracoes`)
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
      
      const now = new Date().getTime();
      const validOps = [];
      for (const op of ops) {
        let expirou = false;
        if (!op.dataEncerramentoProposta) {
          expirou = true;
        } else {
          const dt = new Date(op.dataEncerramentoProposta).getTime();
          expirou = isNaN(dt) || dt <= now;
        }

        let st = op.kanbanStatus?.toUpperCase() || '';
        const opProdutos = dataProd.data ? dataProd.data.filter((p: any) => p.oportunidadeId === op._id) : [];
        const hasProdutos = opProdutos.length > 0;
        
        // Auto-Excluir: Expirou e não fez cotações/puxou -> move pra EXCLUIDA
        if (expirou && !hasProdutos && st !== 'EXCLUIDA' && st !== 'ARQUIVADA') {
          fetch(`${window.API_URL}/oportunidades/${op._id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kanbanStatus: 'EXCLUIDA' })
          }).catch(console.error);
          st = 'EXCLUIDA';
          op.kanbanStatus = 'EXCLUIDA';
        }

        // Auto-Venceu: Finalizada e empresa campeã -> move pra NEGÓCIO FECHADO
        const isFinalizada = opProdutos.length > 0 && opProdutos.every((p: any) => {
          const s = p.situacaoJulgamento?.toLowerCase() || '';
          return s.includes('finalizada') || s.includes('homologado') || s.includes('adjudicado') || s.includes('fracassada') || s.includes('fracassado') || s.includes('cancelad') || s.includes('deserta');
        });
        const won = opProdutos.some((p: any) => {
          const nome = p.vencedorNome?.toUpperCase() || '';
          const cnpj = p.vencedorCnpj || '';
          return nome.includes('IRMÃOS NASCIMENTO') || nome.includes('IRMAOS NASCIMENTO') || cnpj.includes('48262939') || cnpj.includes('48.262.939');
        });
        
        if (isFinalizada && st !== 'ARQUIVADA') {
          if (won) {
            const fechadoCol = dataConfig?.colunasKanban?.find((c: any) => c.nome.toUpperCase().includes('FECHADO') || c.nome.toUpperCase().includes('NEGÓCIO'))?.id;
            if (fechadoCol && st !== fechadoCol) {
               fetch(`${window.API_URL}/oportunidades/${op._id}/status`, {
                 method: 'PATCH',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ kanbanStatus: fechadoCol })
               }).catch(console.error);
               st = fechadoCol;
               op.kanbanStatus = fechadoCol;
            }
          } else {
            // Não venceu, move automaticamente para a coluna de Arquivados (para aprovação manual posterior)
            const arquivadosCol = dataConfig?.colunasKanban?.find((c: any) => c.nome.toUpperCase().includes('ARQUIVADOS') || c.nome.toUpperCase() === 'ARQUIVADO')?.id;
            if (arquivadosCol && st !== arquivadosCol) {
               fetch(`${window.API_URL}/oportunidades/${op._id}/status`, {
                 method: 'PATCH',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ kanbanStatus: arquivadosCol })
               }).catch(console.error);
               st = arquivadosCol;
               op.kanbanStatus = arquivadosCol;
            }
          }
        }
        
        // Regra 1: ARQUIVADAS somem imediatamente da tela
        if (st === 'ARQUIVADA' || st === 'ARQUIVADAS') {
          continue; 
        }
        
        // Regra 2: EXCLUÍDAS somem a não ser que seja o sistema mostrando as que não foram puxadas
        if (st === 'EXCLUIDA' || st === 'EXCLUIDAS') {
          if (!(expirou && !hasProdutos)) {
            continue; // Movimentação manual para excluída (SOME DA TELA)
          }
        }

        validOps.push(op);
      }

      setOportunidades(validOps);
      setProdutos(dataProd.data || []);

      // Load cotações for each oportunidade (best proposal data)
      validOps.forEach(async (op: any) => {
        try {
          const cotRes = await fetch(`${window.API_URL}/oportunidades/${op._id}/cotacao`);
          if (cotRes.ok) {
            const cotData = await cotRes.json();
            setCotacoes(prev => ({ ...prev, [op._id]: cotData }));
          }
        } catch {
          // cotacao may not exist yet
        }
      });

      validOps.forEach(async (op: any) => {
        try {
          const scoreRes = await fetch(`${window.MARKET_URL}/market/score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oportunidadeId: op._id, modalidade: op.modalidadeNome || '', uf: op.uf || '', valorEstimado: op.valorTotalEstimado || 0, orgaoCnpj: op.orgaoCnpj || '' })
          });
          const scoreData = await scoreRes.json();
          setScores(prev => ({ ...prev, [op._id]: scoreData }));
        } catch {
          // ML API might not be reachable
        }
      });
    } catch {
    }
  };

  useEffect(() => {
    carregarOportunidadesEProdutos();

    // WebSocket Connection
    const socket = io(window.API_URL);
    setSocketRef(socket);

    socket.on('oportunidade_updated', (updatedOp: any) => {
      setOportunidades(prev => {
        const idx = prev.findIndex(op => op._id === updatedOp._id);
        if (idx !== -1) {
          const newOps = [...prev];
          newOps[idx] = updatedOp;
          return newOps;
        }
        return [updatedOp, ...prev];
      });
    });

    socket.on('oportunidade_deleted', (data: { id: string }) => {
      setOportunidades(prev => prev.filter(op => op._id !== data.id));
    });

    socket.on('kanban_card_collapsed', (data: { cardId: string, collapsed: boolean }) => {
      setCollapsedCards(prev => {
        const newState = { ...prev, [data.cardId]: data.collapsed };
        localStorage.setItem('sgl_collapsed_cards', JSON.stringify(newState));
        return newState;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Monitora mudanças de estado de tempo real (ex: card na coluna excluídas que acaba de expirar)
  useEffect(() => {
    const now = new Date().getTime();
    const checkExpirado = (op: any) => {
      if (!op.dataEncerramentoProposta) return true;
      const dt = new Date(op.dataEncerramentoProposta).getTime();
      return isNaN(dt) || dt <= now;
    };

    const isExcluida = (st: string) => st === 'EXCLUIDA' || st === 'EXCLUIDAS';
    
    // Move os A_FAZER expirados para EXCLUIDA no banco
    const aFazerExpirados = oportunidades.filter(op => op.kanbanStatus?.toUpperCase() === 'A_FAZER' && checkExpirado(op));
    if (aFazerExpirados.length > 0) {
      aFazerExpirados.forEach(op => {
        fetch(`${window.API_URL}/oportunidades/${op._id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kanbanStatus: 'EXCLUIDA' })
        }).catch(console.error);
      });
    }

    // Remove da tela os que estão em EXCLUIDA expirados E os de A_FAZER que acabaram de expirar
    const precisamSumir = oportunidades.filter(op => 
      (op.kanbanStatus?.toUpperCase() === 'A_FAZER' && checkExpirado(op)) || 
      (isExcluida(op.kanbanStatus?.toUpperCase() || '') && checkExpirado(op))
    );
    
    if (precisamSumir.length > 0) {
      setOportunidades(prev => prev.filter(op => {
        const expirou = checkExpirado(op);
        const st = op.kanbanStatus?.toUpperCase() || '';
        const deveSumir = (st === 'A_FAZER' && expirou) || (isExcluida(st) && expirou);
        return !deveSumir;
      }));
    }
  }, [oportunidades]);

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
    const destSt = destId.toUpperCase();
    
    // Se foi para ARQUIVADAS, some na hora. 
    // Se foi para EXCLUIDA, verificamos se já está expirado para sumir.
    if (destSt === 'ARQUIVADA' || destSt === 'ARQUIVADAS') {
      setOportunidades(prev => prev.filter(op => op._id !== itemId));
    } else {
      setOportunidades(prev => prev.map(op => 
        op._id === itemId ? { ...op, kanbanStatus: destId } : op
      ));
    }

    try {
      const res = await fetch(`${window.API_URL}/oportunidades/${itemId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kanbanStatus: destId })
      });
      if (!res.ok) throw new Error('Falha ao atualizar');
    } catch {
      setOportunidades(previous);
    }
  };

  const moverPorMenu = async (itemId: string, novoStatus: string) => {
    const previous = [...oportunidades];
    const destSt = novoStatus.toUpperCase();
    if (destSt === 'ARQUIVADA' || destSt === 'ARQUIVADAS') {
      setOportunidades(prev => prev.filter(op => op._id !== itemId));
    } else {
      setOportunidades(prev => prev.map(op => 
        op._id === itemId ? { ...op, kanbanStatus: novoStatus } : op
      ));
    }
    try {
      const res = await fetch(`${window.API_URL}/oportunidades/${itemId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kanbanStatus: novoStatus })
      });
      if (!res.ok) throw new Error('Falha ao atualizar');
    } catch {
      setOportunidades(previous);
    }
  };

  const handleDelete = async (id: string, skipConfirm = false) => {
    if (skipConfirm || window.confirm("Tem certeza? Isso vai remover permanentemente esta oportunidade, seus itens, cotações e qualquer proposta associada. Essa ação não pode ser desfeita.")) {
      try {
        const res = await fetch(`${window.API_URL}/oportunidades/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setOportunidades(prev => prev.filter(op => op._id !== id));
        } else {
          alert('Erro ao excluir oportunidade');
        }
      } catch {
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

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input 
            type="text" 
            placeholder="Pesquisar por órgão, CNPJ/UASG, modalidade, objeto ou item..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-control"
            style={{ width: '100%', padding: '0.6rem 1rem', paddingLeft: '2.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
          />
          <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
            🔍
          </span>
        </div>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem', flexShrink: 0 }}>Arraste os cards ou utilize o menu.</p>
      </div>
      
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
              .filter(op => {
                const search = searchTerm.toLowerCase().trim();
                if (!search) return true;
                
                const isDispensa = op.modalidadeNome?.toLowerCase().includes('dispensa') || op.tipo === 'dispensa';
                
                const searchTemAviso = search.includes('aviso');
                const searchTemEdital = search.includes('edital');

                if (searchTemAviso && !isDispensa) return false;
                if (searchTemEdital && isDispensa) return false;

                const searchDigits = search.replace(/[^\d]/g, '');
                
                const matchOrgao = op.orgaoNome?.toLowerCase().includes(search);
                const matchObjeto = op.objetoCompra?.toLowerCase().includes(search);
                const matchModalidade = op.modalidadeNome?.toLowerCase().includes(search);
                const matchCnpj = op.orgaoCnpj?.toLowerCase().includes(search) || 
                                  (searchDigits.length > 3 && op.orgaoCnpj?.replace(/[^\d]/g, '').includes(searchDigits));
                
                const matchUasg = op.unidadeCompradora?.toLowerCase().includes(search);
                const matchPncp = op.numeroControlePNCP?.toLowerCase().includes(search) || 
                                  (searchDigits.length > 4 && op.numeroControlePNCP?.replace(/[^\d]/g, '').includes(searchDigits));

                const numeroCompraCompleto = (() => {
                  if (op.numeroCompraOrigem && op.anoCompraOrigem) return `${op.numeroCompraOrigem}/${op.anoCompraOrigem}`;
                  if (op.linkSistemaOrigem && op.linkSistemaOrigem.includes('compra=')) {
                    const match = op.linkSistemaOrigem.match(/compra=\d{8}(\d{5})(\d{4})/);
                    if (match) return `${parseInt(match[1], 10)}/${match[2]}`;
                  }
                  if (op.numeroControlePNCP) {
                    const parts = op.numeroControlePNCP.split('-');
                    if (parts.length >= 3) {
                      const numYear = parts[2].split('/');
                      if (numYear.length === 2) return `${parseInt(numYear[0], 10)}/${numYear[1]}`;
                      return parts[2];
                    }
                  }
                  return op.numeroCompraOrigem || '';
                })();

                const numeroCompraFormatado = (() => {
                  if (!numeroCompraCompleto) return '';
                  const parts = numeroCompraCompleto.split('/');
                  if (parts.length === 2 && parts[0].length === 9 && parts[0].startsWith('20')) {
                      const year = parts[0].substring(0, 4);
                      const seq = parts[0].substring(4);
                      return `${year}/${seq}`;
                  }
                  return numeroCompraCompleto;
                })();

                const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regexCompra = new RegExp(`(?:^|[^\\d])${escapedSearch}(?:[^\\d]|$)`, 'i');
                const matchCompra = regexCompra.test(numeroCompraCompleto.toLowerCase()) || 
                                    regexCompra.test(numeroCompraFormatado.toLowerCase()) ||
                                    (searchDigits.length > 0 && numeroCompraCompleto.replace(/[^\d]/g, '') === searchDigits);
                                  
                const prods = produtos.filter(p => p.oportunidadeId === op._id);
                const matchProd = prods.some(p => p.descricao?.toLowerCase().includes(search));
                
                return matchOrgao || matchObjeto || matchModalidade || matchCnpj || matchUasg || matchPncp || matchCompra || matchProd;
              })
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
                        const prods = produtos.filter(p => p.oportunidadeId === item._id);
                        const isFinalizada = prods.length > 0 && prods.every(p => {
                          const s = p.situacaoJulgamento?.toLowerCase() || '';
                          return s.includes('finalizada') || s.includes('homologado') || s.includes('adjudicado') || s.includes('fracassada') || s.includes('fracassado') || s.includes('cancelad') || s.includes('deserta');
                        });
                        const bestOffer = getBestOfferInfo(item._id);
                        
                        return (
                        <Draggable key={item._id} draggableId={item._id} index={index}>
                          {(provided) => {
                            const isCardCollapsed = collapsedCards[item._id] !== undefined ? collapsedCards[item._id] : true;
                            return (
                            <div className="kanban-card" ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={provided.draggableProps.style}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isCardCollapsed ? 0 : '1rem' }}>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                  <Link to={`/oportunidades/${item._id}`} style={{ textDecoration: 'none' }} aria-label={`Ver detalhes da oportunidade: ${item.orgaoNome}`}>
                                    <h4 style={{ color: '#0ea5e9', margin: '0 0 0.25rem 0' }}>{item.orgaoNome}</h4>
                                  </Link>
                                  <div style={{ marginBottom: '0.5rem' }}>
                                    <Countdown 
                                      targetDate={item.dataEncerramentoProposta} 
                                      onExpire={() => {}}
                                    />
                                  </div>
                                  {(() => {
                                    const infoExtraida = (() => {
                                      let edital = null;
                                      let uasg = item.unidadeCompradora || null;
                                      
                                      if (item.numeroCompraOrigem && item.anoCompraOrigem) {
                                        edital = `${item.numeroCompraOrigem}/${item.anoCompraOrigem}`;
                                      }
                                      
                                      if (item.linkSistemaOrigem && item.linkSistemaOrigem.includes('compra=')) {
                                        const match = item.linkSistemaOrigem.match(/compra=(\d{6})\d{2}(\d{5})(\d{4})/);
                                        if (match) {
                                          if (!edital) edital = `${parseInt(match[2], 10)}/${match[3]}`;
                                          if (!uasg) uasg = match[1];
                                        }
                                      }
                                      
                                      if (!edital && item.numeroControlePNCP) {
                                        const parts = item.numeroControlePNCP.split('-');
                                        if (parts.length >= 3) {
                                          const numYear = parts[2].split('/');
                                          if (numYear.length === 2) edital = `${parseInt(numYear[0], 10)}/${numYear[1]}`;
                                          else edital = parts[2];
                                        }
                                      }
                                      
                                      if (!edital) edital = item.numeroCompraOrigem || null;
                                      
                                      let editalCopia = edital || '';
                                      let isCeara = false;
                                      if (edital) {
                                          const parts = edital.split('/');
                                          if (parts.length === 2 && parts[0].length === 9 && parts[0].startsWith('20')) {
                                              const year = parts[0].substring(0, 4);
                                              const seq = parts[0].substring(4);
                                              editalCopia = `${year}/${seq}`;
                                              isCeara = true;
                                          }
                                      }
                                      
                                      const isDispensa = item.modalidadeNome?.toLowerCase().includes('dispensa') || item.tipo === 'dispensa';
                                      const labelEdital = (isDispensa && isCeara) ? 'Aviso' : (isDispensa ? 'Dispensa' : 'Edital');
                                      
                                      let editalStyle;
                                      if (isDispensa && isCeara) {
                                          editalStyle = { bg: '#d1fae5', text: '#047857', border: '#a7f3d0', icon: '#10b981', iconHover: '#047857' };
                                      } else if (isDispensa && !isCeara) {
                                          editalStyle = { bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff', icon: '#a855f7', iconHover: '#7e22ce' };
                                      } else {
                                          editalStyle = { bg: '#e0e7ff', text: '#4338ca', border: '#c7d2fe', icon: '#6366f1', iconHover: '#4338ca' };
                                      }
                                      
                                      let linkFonte = item.linkSistemaOrigem || '';
                                      if (isCeara) {
                                          linkFonte = 'https://s2gpr.sefaz.ce.gov.br/cotacao-web/paginas/proposta/PropostaList.seam';
                                      } else if (isDispensa && (!linkFonte || linkFonte.includes('comprasnet') || linkFonte.includes('cnetmobile'))) {
                                          const match = linkFonte.match(/compra=([^&]+)/);
                                          const compraId = match ? match[1] : '';
                                          linkFonte = `https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/seguro/fornecedor/compras?compra=${compraId}`;
                                      }
                                      
                                      let fonteLabel = '';
                                      if (isCeara) {
                                          fonteLabel = 'Sefaz-CE';
                                      } else if (linkFonte.includes('comprasnet') || linkFonte.includes('cnetmobile') || item.usuarioNome?.toLowerCase().includes('compras.gov.br')) {
                                          fonteLabel = 'Compras.gov.br';
                                      } else if (linkFonte.includes('licitacoes-e')) {
                                          fonteLabel = 'Licitações-e';
                                      } else if (item.usuarioNome) {
                                          fonteLabel = item.usuarioNome.length > 20 ? item.usuarioNome.substring(0, 20) + '...' : item.usuarioNome;
                                      } else {
                                          fonteLabel = 'Portal PNCP';
                                      }
                                      
                                      return { edital, uasg, editalCopia, labelEdital, editalStyle, linkFonte, fonteLabel };
                                    })();
                                    
                                    if (!infoExtraida.edital) return null;
                                    const { editalStyle } = infoExtraida;
                                    
                                    return (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.25rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', background: editalStyle.bg, color: editalStyle.text, padding: '0.1rem 0.4rem', borderRadius: '4px', border: `1px solid ${editalStyle.border}` }} title={infoExtraida.labelEdital === 'Aviso' ? 'Aviso de Contratação Direta' : 'Edital'}>
                                            {infoExtraida.labelEdital}: {infoExtraida.edital}
                                          </span>
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(infoExtraida.editalCopia); alert(`${infoExtraida.labelEdital} copiado: ${infoExtraida.editalCopia}`); }} 
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.15rem', color: editalStyle.icon, display: 'flex', alignItems: 'center', borderRadius: '4px' }}
                                            title={`Copiar ${infoExtraida.labelEdital}`}
                                            onMouseEnter={(e) => e.currentTarget.style.color = editalStyle.iconHover}
                                            onMouseLeave={(e) => e.currentTarget.style.color = editalStyle.icon}
                                          >
                                            <Copy size={14} />
                                          </button>
                                        </div>
                                        {infoExtraida.uasg && (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                            <span style={{ background: '#fef3c7', color: '#b45309', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid #fde68a' }} title="Unidade Compradora (UASG)">
                                              UASG: {infoExtraida.uasg}
                                            </span>
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(infoExtraida.uasg || ''); alert('UASG copiada!'); }} 
                                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.15rem', color: '#f59e0b', display: 'flex', alignItems: 'center', borderRadius: '4px' }}
                                              title="Copiar UASG"
                                              onMouseEnter={(e) => e.currentTarget.style.color = '#b45309'}
                                              onMouseLeave={(e) => e.currentTarget.style.color = '#f59e0b'}
                                            >
                                              <Copy size={14} />
                                            </button>
                                          </div>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                          {infoExtraida.linkFonte ? (
                                            <a href={infoExtraida.linkFonte} target="_blank" rel="noopener noreferrer" style={{ background: '#f1f5f9', color: '#475569', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.65rem', fontWeight: 'bold', textDecoration: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }} title="Clique para abrir o portal de origem" onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#334155'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569'; }}>
                                              Fonte: {infoExtraida.fonteLabel}
                                              <ExternalLink size={10} />
                                            </a>
                                          ) : (
                                            <span style={{ background: '#f1f5f9', color: '#475569', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.65rem', fontWeight: 'bold' }} title="Fonte / Portal">
                                              Fonte: {infoExtraida.fonteLabel}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                  {(() => {
                                    const isObjExpanded = expandedObjects[item._id] || false;
                                    return (
                                      <div style={{ marginTop: '0.75rem', marginBottom: '0.5rem', padding: '0.5rem', background: '#f1f5f9', borderRadius: '4px', border: '1px solid #e2e8f0', position: 'relative' }}>
                                        <div 
                                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                                          onClick={(e) => { e.stopPropagation(); toggleObjectExpand(item._id); }}
                                          title={isObjExpanded ? "Recolher Objeto" : "Expandir Objeto"}
                                        >
                                          <strong style={{ color: '#0f172a', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            Objeto da Compra:
                                          </strong>
                                          <button 
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#64748b', display: 'flex', alignItems: 'center' }}
                                            title={isObjExpanded ? "Recolher Objeto" : "Expandir Objeto"}
                                          >
                                            {isObjExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                          </button>
                                        </div>
                                        {isObjExpanded ? (
                                          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#334155', lineHeight: '1.5', textAlign: 'justify' }}>
                                            {item.objetoCompra}
                                          </p>
                                        ) : (
                                          <p className="desc" title={item.objetoCompra} style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#475569', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {item.objetoCompra}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                                <button 
                                  onClick={() => toggleCardCollapse(item._id)} 
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  title={isCardCollapsed ? "Expandir Card" : "Recolher Card"}
                                >
                                  {isCardCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                </button>
                              </div>
                              
                              {!isCardCollapsed && (
                                <>
                                  {colId === 'EXCLUIDA' && (
                                    <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                      ⚠️ Você já excluiu esta proposta antes
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
                                        📦 {bestOffer.descricao.split(',')[0]} — {bestOffer.quantidade} un.
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
                                </>
                              )}
                              
                              <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                
                                {prods.length > 0 && (() => {
                                  const isItemsExpanded = expandedItems[item._id] || false;
                                  
                                  const searchStr = searchTerm.toLowerCase().trim();
                                  const todosProdutos = produtos.filter(p => p.oportunidadeId === item._id);
                                  
                                  let prodsParaMostrar = todosProdutos;
                                  if (searchStr) {
                                      const matchProds = todosProdutos.filter(p => p.descricao?.toLowerCase().includes(searchStr) || p.descricaoCurta?.toLowerCase().includes(searchStr));
                                      if (matchProds.length > 0) {
                                          prodsParaMostrar = matchProds;
                                      }
                                  }
                                  const primeiroStatus = prodsParaMostrar.length > 0 && prodsParaMostrar[0].situacaoJulgamento ? prodsParaMostrar[0].situacaoJulgamento : 'Aguardando atualização';

                                  return (
                                    <div style={{ background: '#f1f5f9', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid #e2e8f0', position: 'relative' }}>
                                      <div 
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                                        onClick={(e) => { e.stopPropagation(); toggleItemsExpand(item._id); }}
                                        title={isItemsExpanded ? "Ocultar Status dos Itens" : "Mostrar Status dos Itens"}
                                      >
                                        <strong style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
                                          Status dos Itens:
                                          {!isItemsExpanded && (
                                            <span style={{ fontWeight: 'bold', color: '#3b82f6', marginLeft: '0.2rem' }}>
                                              {primeiroStatus}
                                            </span>
                                          )}
                                        </strong>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                          <button 
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#64748b', display: 'flex', alignItems: 'center' }}
                                          >
                                            {isItemsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                          </button>
                                        </div>
                                      </div>
                                      {isItemsExpanded && (
                                        <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1rem', color: '#334155' }}>
                                          {(() => {
                                            const produtosFiltrados = prodsParaMostrar.slice(0, 5);
                                            return produtosFiltrados.map((p, i) => {
                                              const rawName = (p.descricaoCurta || p.descricao || '').split(',')[0].trim();
                                              const cleanName = rawName.replace(/^(.+)(?:\s+\1)+$/i, '$1');
                                              return (
                                                <li key={p._id} style={{ marginBottom: '0.25rem' }}>
                                                  item {p.numeroItem || (i + 1)}: {cleanName} - <strong>{p.situacaoJulgamento || 'Aguardando atualização'}</strong>
                                                  {p.vencedorNome && (
                                                    <div style={{ fontSize: '0.65rem', color: '#166534', marginTop: '0.1rem' }}>
                                                      🏆 {p.vencedorNome} (R$ {p.valorVencedor?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })})
                                                    </div>
                                                  )}
                                                </li>
                                              );
                                            });
                                          })()}
                                          {produtos.filter(p => p.oportunidadeId === item._id).length > 5 && (
                                            <li style={{ color: '#64748b', listStyle: 'none', marginLeft: '-1rem', marginTop: '0.25rem' }}>
                                              +{produtos.filter(p => p.oportunidadeId === item._id).length - 5} mais...
                                            </li>
                                          )}
                                        </ul>
                                      )}
                                    </div>
                                  );
                                })()}
                                
                                {(isFinalizada || col.nome.toUpperCase().includes('ARQUIVADOS') || col.nome.toUpperCase() === 'ARQUIVADO') ? (
                                  (isFinalizada && (col.nome.toUpperCase().includes('FECHADO') || col.nome.toUpperCase().includes('NEGÓCIO'))) ? (
                                    <span style={{ 
                                      background: '#dcfce7', 
                                      color: '#166534', 
                                      padding: '0.4rem 0.8rem', 
                                      borderRadius: '12px', 
                                      fontSize: '0.75rem', 
                                      fontWeight: '800',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px',
                                      width: 'fit-content',
                                      lineHeight: '1.2'
                                    }}>
                                      Favor Acompanhar Assinatura Do Contrato
                                    </span>
                                  ) : (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); moverPorMenu(item._id, 'ARQUIVADA'); }}
                                      title="Mover para Arquivadas"
                                      style={{ 
                                        background: 'linear-gradient(135deg, #f3e8ff, #e9d5ff)', 
                                        color: '#7e22ce', 
                                        padding: '0.4rem 0.8rem', 
                                        borderRadius: '12px', 
                                        fontSize: '0.75rem', 
                                        fontWeight: '800',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        width: 'fit-content',
                                        lineHeight: '1.2',
                                        boxShadow: '0 2px 4px rgba(126, 34, 206, 0.15)',
                                        border: '1px solid #d8b4fe',
                                        cursor: 'pointer',
                                        marginBottom: '0.5rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                      }}>
                                      <Archive size={14} /> Favor Arquivar Proposta
                                    </button>
                                  )
                                ) : (col.nome.toUpperCase().includes('FAZENDO') && !bestOffer) ? (
                                  <div style={{ 
                                    background: 'linear-gradient(135deg, #fef3c7, #fde68a)', 
                                    color: '#92400e', 
                                    padding: '0.6rem 0.8rem', 
                                    borderRadius: '8px', 
                                    fontSize: '0.75rem', 
                                    fontWeight: '600',
                                    lineHeight: '1.4',
                                    border: '1px solid #fcd34d',
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    display: 'block',
                                    marginTop: '0.5rem',
                                    wordBreak: 'break-word'
                                  }}>
                                    <strong style={{ display: 'block', marginBottom: '0.2rem' }}>⚠️ ATENÇÃO:</strong> 
                                    Você ainda não inseriu cotações para esta proposta. Favor analisar, caso contrário ela será excluída assim que expirar.
                                  </div>
                                ) : getSuffixMessage(col.nome) ? (
                                  (() => {
                                    const isFechado = col.nome.toUpperCase().includes('FECHADO') || col.nome.toUpperCase().includes('NEGÓCIO');
                                    const bg = isFechado ? '#dcfce7' : '#e0e7ff';
                                    const text = isFechado ? '#15803d' : '#4338ca';
                                    const border = isFechado ? '#bbf7d0' : '#c7d2fe';
                                    return (
                                      <span style={{ 
                                        background: bg, 
                                        color: text, 
                                        border: `1px solid ${border}`,
                                        padding: '0.1rem 0.4rem', 
                                        borderRadius: '4px', 
                                        fontSize: '0.75rem', 
                                        fontWeight: 'bold',
                                        width: 'fit-content',
                                        lineHeight: '1.2'
                                      }}>
                                        {getSuffixMessage(col.nome)}
                                      </span>
                                    );
                                  })()
                                ) : null}
                              </div>

                              <div className="kanban-card-footer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', gap: '0.25rem', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', width: '100%' }}>
                                  {(() => {
                                    const cName = col.nome.toUpperCase();
                                    let finLabel = 'VALOR ESTIMADO';
                                    let finColor = '#10b981'; // default green
                                    
                                    if (cName.includes('A FAZER') || cName.includes('NOVAS')) {
                                      finLabel = 'NOVAS OP. (A FAZER)';
                                      finColor = '#8b5cf6'; // purple
                                    } else if (cName.includes('NEGOCIAÇÃO') || cName.includes('PROPOSTA') || cName.includes('FAZENDO')) {
                                      finLabel = 'SALDO PROJETADO (FUTURO)';
                                      finColor = '#3b82f6'; // blue
                                    } else if (cName.includes('FECHADO') || cName.includes('HOMOLOGA') || cName.includes('VENCE')) {
                                      finLabel = 'FATURAMENTO A RECEBER';
                                      finColor = '#eab308'; // yellow/gold
                                    } else if (cName.includes('PERDE') || cName.includes('ARQUIVAD') || cName.includes('EXCLUI')) {
                                      finLabel = 'VALOR PERDIDO / ARQUIVADO';
                                      finColor = '#64748b'; // gray
                                    }

                                    return (
                                      <>
                                        <span style={{ fontSize: '0.6rem', fontWeight: '800', color: finColor, textTransform: 'uppercase', letterSpacing: '0.5px' }} title={finLabel}>
                                          {finLabel}
                                        </span>
                                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', width: '100%' }}>
                                          <span className="kanban-card-price" style={{ fontSize: '1.05rem', fontWeight: '800', color: finColor, letterSpacing: '-0.5px', lineHeight: '1', whiteSpace: 'nowrap' }} aria-label={`${finLabel}: R$ ${item.valorTotalEstimado?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                                            R$ {item.valorTotalEstimado?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </span>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0, marginLeft: 'auto' }}>
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
                                              style={{ padding: '0.35rem 0.5rem', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569', cursor: 'pointer', fontWeight: '700', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}
                                              aria-label={`Alterar status da oportunidade ${item.orgaoNome}`}
                                            >
                                              {colunas.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                            </select>
                                            {colId !== 'EXCLUIDA' && (
                                              <button 
                                                onClick={() => handleDelete(item._id)} 
                                                aria-label="Excluir Oportunidade"
                                                title="Excluir" 
                                                style={{ 
                                                  background: '#fee2e2', border: '1px solid #fecaca', cursor: 'pointer', color: '#ef4444', 
                                                  padding: '0.35rem', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}
                                              >
                                                <Trash2 size={14} />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      </>
                                    );
                                  })()}
                              </div>
                            </div>
                          );}}
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
                  const res = await fetch(`${window.API_URL}/configuracoes`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ colunasKanban: colunas })
                  });
                  if (res.ok) {
                    setModalConfigColsOpen(false);
                  } else {
                    alert('Erro ao salvar colunas');
                  }
                } catch {
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

