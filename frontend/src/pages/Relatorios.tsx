import { useState, useEffect } from 'react';
import { FileText, TrendingUp, DollarSign, Target } from 'lucide-react';

export default function Relatorios() {
  const [propostas, setPropostas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [statusFiltro, setStatusFiltro] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadPropostas = async () => {
    setLoading(true);
    try {
      let url = `http://localhost:7005/propostas?page=${page}&limit=50`;
      if (statusFiltro) url += `&status=${statusFiltro}`;
      
      const res = await fetch(url);
      const payload = await res.json();
      setPropostas(payload.data || []);
      setTotalPages(payload.totalPages || 1);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPropostas();
  }, [page, statusFiltro]);

  const handleStatusChange = async (id: string, novoStatus: string) => {
    try {
      const res = await fetch(`http://localhost:7005/propostas/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
      });
      if (res.ok) {
        loadPropostas();
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
  const taxaSucesso = (vencidas + perdidas) > 0 ? (vencidas / (vencidas + perdidas)) * 100 : 0;

  const getStatusColor = (s: string) => {
    if (s === 'VENCEDOR') return '#10b981';
    if (s === 'PERDEU') return '#ef4444';
    if (s === 'CANCELADO') return '#f59e0b';
    return '#64748b'; // AGUARDANDO_RESPOSTA
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
            <FileText size={18} /> Total de Propostas Listadas
          </div>
          <div className="stat-value">{propostas.length}</div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
            <Target size={18} /> Taxa de Sucesso
          </div>
          <div className="stat-value">{taxaSucesso.toFixed(1)}%</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Apenas Ganhas vs Perdidas</div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
            <TrendingUp size={18} /> Total Lançado
          </div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>R$ {totalLancado.toLocaleString('pt-BR')}</div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
            <DollarSign size={18} color="#10b981" /> Total Ganho
          </div>
          <div className="stat-value" style={{ fontSize: '1.25rem', color: '#10b981' }}>R$ {totalGanho.toLocaleString('pt-BR')}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Filtrar por Status</label>
          <select className="form-control" value={statusFiltro} onChange={e => { setStatusFiltro(e.target.value); setPage(1); }}>
            <option value="">Todos</option>
            <option value="AGUARDANDO_RESPOSTA">Aguardando Resposta</option>
            <option value="VENCEDOR">Vencedor</option>
            <option value="PERDEU">Perdeu</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Data Lançamento</th>
              <th>Órgão / Objeto</th>
              <th>Valor Lançado</th>
              <th>Status do Pregão</th>
              <th>Ação / Resultado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{textAlign:'center'}}>Carregando...</td></tr>
            ) : propostas.length === 0 ? (
              <tr><td colSpan={5} style={{textAlign:'center'}}>Nenhuma proposta lançada.</td></tr>
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
                  <td><strong>R$ {p.valorLancado?.toLocaleString('pt-BR')}</strong></td>
                  <td>
                    <span style={{ background: getStatusColor(p.status) + '22', color: getStatusColor(p.status), padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      {p.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    {p.status === 'AGUARDANDO_RESPOSTA' ? (
                      <select 
                        className="form-control"
                        style={{ padding: '0.25rem', fontSize: '0.8rem', width: 'auto' }}
                        value=""
                        onChange={(e) => handleStatusChange(p._id, e.target.value)}
                      >
                        <option value="" disabled>Definir...</option>
                        <option value="VENCEDOR">Marcar Vencedor</option>
                        <option value="PERDEU">Marcar Perdeu</option>
                        <option value="CANCELADO">Cancelar</option>
                      </select>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Decidido</span>
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
