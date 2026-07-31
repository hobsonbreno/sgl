import { useState, useEffect } from 'react';
import { FileText, TrendingUp, DollarSign, Target } from 'lucide-react';

export default function Relatorios() {
  const [propostas, setPropostas] = useState<any[]>([]);
  const [colunas, setColunas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [statusFiltro, setStatusFiltro] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch configurações para pegar colunas dinâmicas
      const resConfig = await fetch('http://localhost:7005/configuracoes');
      const dataConfig = await resConfig.json();
      const colunasDynamic = dataConfig.colunasKanban || [
        { id: 'A_FAZER', nome: 'A FAZER' },
        { id: 'FAZENDO', nome: 'FAZENDO' },
        { id: 'FEITO', nome: 'FEITO' },
        { id: 'AGUARDANDO_RESPOSTA', nome: 'AGUARDANDO RESPOSTA' },
        { id: 'EXCLUIDA', nome: 'EXCLUÍDA' }
      ];
      setColunas(colunasDynamic);

      // 2. Fetch Oportunidades and Propostas
      const limit = 50;
      let urlOps = `http://localhost:7005/oportunidades?limit=${limit}&page=${page}`;
      
      // Se o filtro for VENCEDOR, PERDEU, CANCELADO, buscamos na Proposta
      const isStatusFinal = ['VENCEDOR', 'PERDEU', 'CANCELADO'].includes(statusFiltro);
      
      if (statusFiltro && !isStatusFinal) {
        urlOps += `&kanbanStatus=${statusFiltro}`;
      }

      const [resOps, resProps] = await Promise.all([
        fetch(urlOps),
        fetch(`http://localhost:7005/propostas?limit=1000`) // Pegamos as propostas globais para merge
      ]);

      const payloadOps = await resOps.json();
      const payloadProps = await resProps.json();

      const ops = payloadOps.data || [];
      const props = payloadProps.data || [];

      // Create a map of propostas by oportunidadeId
      const propsMap = new Map();
      props.forEach((p: any) => {
        if (p.oportunidadeId?._id) propsMap.set(String(p.oportunidadeId._id), p);
        else if (p.oportunidadeId) propsMap.set(String(p.oportunidadeId), p);
      });

      // Merge: Oportunidade -> Proposta
      let mergedData = ops.map((op: any) => {
        const p = propsMap.get(String(op._id));
        return {
          _id: p ? p._id : op._id,
          oportunidadeId: op,
          valorLancado: p ? p.valorLancado : 0,
          dataLancamento: p ? p.dataLancamento : op.createdAt,
          status: p ? p.status : op.kanbanStatus,
          isProposta: !!p
        };
      });

      // Se o filtro for de status final (VENCEDOR, PERDEU), aplica filtro no frontend após o merge
      if (isStatusFinal) {
        mergedData = mergedData.filter((m: any) => m.status === statusFiltro);
      }

      // Ordenar por data
      mergedData.sort((a: any, b: any) => new Date(b.dataLancamento).getTime() - new Date(a.dataLancamento).getTime());

      setPropostas(mergedData);
      setTotalPages(payloadOps.totalPages || 1);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFiltro]);

  const handleStatusChange = async (id: string, novoStatus: string) => {
    try {
      const res = await fetch(`http://localhost:7005/propostas/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
      });
      if (res.ok) {
        loadData();
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao atualizar status');
    }
  };

  // KPIs
  const totalLancado = propostas.reduce((acc, p) => acc + (p.valorLancado || 0), 0);
  const totalGanho = propostas.filter(p => p.status === 'VENCEDOR').reduce((acc, p) => acc + (p.valorLancado || 0), 0);
  const vencidas = propostas.filter(p => p.status === 'VENCEDOR').length;
  const perdidas = propostas.filter(p => p.status === 'PERDEU').length;
  const totalProcessadas = propostas.length;
  const taxaSucesso = (vencidas + perdidas) > 0 ? (vencidas / (vencidas + perdidas)) * 100 : 0;

  const getStatusColor = (s: string) => {
    if (s === 'VENCEDOR') return '#10b981';
    if (s === 'PERDEU') return '#ef4444';
    if (s === 'CANCELADO') return '#f59e0b';
    if (s === 'EXCLUIDA') return '#94a3b8';
    return '#3b82f6'; // Dinâmicos do Kanban em azul
  };

  const getStatusName = (s: string) => {
    if (s === 'VENCEDOR') return 'Vencedor';
    if (s === 'PERDEU') return 'Perdeu';
    if (s === 'CANCELADO') return 'Cancelado';
    if (s === 'AGUARDANDO_RESPOSTA') return 'Aguardando Resposta';
    const col = colunas.find(c => c.id === s);
    return col ? col.nome : s.replace(/_/g, ' ');
  };

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>Relatório Final: Propostas</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Acompanhe o status das propostas lançadas, classifique os resultados e veja as métricas de conversão.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
            <FileText size={18} /> Total da Página
          </div>
          <div className="stat-value">{totalProcessadas}</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Todas as colunas unificadas</div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
            <Target size={18} /> Taxa de Sucesso
          </div>
          <div className="stat-value">{taxaSucesso.toFixed(1)}%</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Vencedor vs Perdeu</div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
            <TrendingUp size={18} /> Total Lançado
          </div>
          <div className="stat-value" style={{ fontSize: '1.15rem' }}>R$ {totalLancado.toLocaleString('pt-BR')}</div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
            <DollarSign size={18} color="#10b981" /> Total Ganho
          </div>
          <div className="stat-value" style={{ fontSize: '1.15rem', color: '#10b981' }}>R$ {totalGanho.toLocaleString('pt-BR')}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Filtro Global (Kanban + Resultados)</label>
          <select className="form-control" value={statusFiltro} onChange={e => { setStatusFiltro(e.target.value); setPage(1); }}>
            <option value="">Todas as Etapas e Status</option>
            <optgroup label="Colunas do Kanban">
              {colunas.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </optgroup>
            <optgroup label="Resultados Finais">
              <option value="VENCEDOR">Vencedor</option>
              <option value="PERDEU">Perdeu</option>
              <option value="CANCELADO">Cancelado</option>
            </optgroup>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Data Inicial</th>
              <th>Órgão / Objeto</th>
              <th>Valor (Estimado / Lançado)</th>
              <th>Status Atual (Kanban)</th>
              <th>Resultado da Proposta</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{textAlign:'center'}}>Carregando...</td></tr>
            ) : propostas.length === 0 ? (
              <tr><td colSpan={5} style={{textAlign:'center'}}>Nenhuma oportunidade ou proposta encontrada.</td></tr>
            ) : (
              propostas.map(p => (
                <tr key={p._id}>
                  <td>{new Date(p.dataLancamento).toLocaleDateString('pt-BR')}</td>
                  <td>
                    <strong>{p.oportunidadeId?.orgaoNome}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }} title={p.oportunidadeId?.objetoCompra}>
                      {p.oportunidadeId?.objetoCompra?.substring(0, 60)}...
                    </div>
                  </td>
                  <td>
                    {p.isProposta ? (
                      <strong>R$ {p.valorLancado?.toLocaleString('pt-BR')}</strong>
                    ) : (
                      <span style={{ color: '#64748b' }}>R$ {(p.oportunidadeId?.valorTotalEstimado || 0).toLocaleString('pt-BR')} <span style={{fontSize: '0.75rem'}}>(Est.)</span></span>
                    )}
                  </td>
                  <td>
                    <span style={{ background: getStatusColor(p.status) + '22', color: getStatusColor(p.status), padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      {getStatusName(p.status).toUpperCase()}
                    </span>
                  </td>
                  <td>
                    {!p.isProposta ? (
                       <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Ainda em Cotação/Kanban</span>
                    ) : p.status === 'AGUARDANDO_RESPOSTA' ? (
                      <select 
                        className="form-control"
                        style={{ padding: '0.25rem', fontSize: '0.8rem', width: 'auto' }}
                        value=""
                        onChange={(e) => handleStatusChange(p._id, e.target.value)}
                      >
                        <option value="" disabled>Definir Resultado...</option>
                        <option value="VENCEDOR">Marcar Vencedor</option>
                        <option value="PERDEU">Marcar Perdeu</option>
                        <option value="CANCELADO">Cancelar</option>
                      </select>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Fechado</span>
                    )}
                  </td>
                </tr>
              ))
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
