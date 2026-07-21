import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [resumo, setResumo] = useState<any>(null);
  const [loadingBot, setLoadingBot] = useState(false);

  const carregarResumo = async () => {
    try {
      const res = await fetch('http://localhost:7005/dashboard/resumo');
      const data = await res.json();
      setResumo(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    carregarResumo();
    const eventSource = new EventSource('http://localhost:7005/dashboard/stream');
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'update') {
          carregarResumo();
        }
      } catch (e) {
        console.error(e);
      }
    };
    return () => eventSource.close();
  }, []);

  const rodarBot = async () => {
    setLoadingBot(true);
    try {
      await fetch('http://localhost:7005/bot/run-now', { method: 'POST' });
      await carregarResumo();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBot(false);
    }
  };

  if (!resumo) return <div>Carregando...</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      
      {resumo.botEmExecucao && (
        <div style={{ background: '#3b82f6', color: '#fff', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
          <Play size={18} className="spin-animation" /> 
          O bot está sincronizando novas propostas neste momento...
        </div>
      )}
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '1rem' }}>
        {Object.entries(resumo.porStatus).map(([status, count]: [string, any]) => (
          <div key={status} style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3>{status.replace('_', ' ')}</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{count}</p>
            <p style={{ color: '#64748b' }}>R$ {(resumo.valorTotalPorStatus[status] || 0).toLocaleString('pt-BR')}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', gap: '2rem' }}>
        <div style={{ flex: 1, background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ marginBottom: '1rem', color: '#0f172a' }}>Negociações Mais Quentes</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {resumo.prazosCriticos.length === 0 ? <p>Nenhum prazo crítico.</p> : null}
            {resumo.prazosCriticos.map((op: any) => {
              const diasRestantes = Math.ceil((new Date(op.dataEncerramentoProposta).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
              const cor = diasRestantes <= 2 ? '#ef4444' : '#eab308';
              return (
                <li key={op._id} style={{ padding: '0.75rem 0', borderBottom: '1px solid #e2e8f0' }}>
                  <Link to={`/oportunidades/${op._id}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem', color: 'inherit' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                      <span style={{ fontWeight: 600, color: '#0ea5e9', lineHeight: 1.2 }}>{op.orgaoNome}</span>
                      <span style={{ color: cor, fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap', background: `${cor}15`, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        Faltam {diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                      <span>Prazo final para envio:</span>
                      <strong>{new Date(op.dataEncerramentoProposta).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</strong>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div style={{ width: '300px', background: '#fff', padding: '1.5rem', borderRadius: '8px' }}>
          <h3>Última Execução do Bot</h3>
          {resumo.ultimaExecucaoBot ? (
            <div>
              <p><strong>Data:</strong> {new Date(resumo.ultimaExecucaoBot.dataExecucao).toLocaleString()}</p>
              <p><strong>Novos Encontrados:</strong> {resumo.ultimaExecucaoBot.totalNovos}</p>
              <p><strong>Erros:</strong> {resumo.ultimaExecucaoBot.erros.length}</p>
            </div>
          ) : (
            <p>Nenhuma execução registrada.</p>
          )}
          <button 
            onClick={rodarBot} 
            disabled={loadingBot || resumo.botEmExecucao}
            style={{ marginTop: '1rem', width: '100%', padding: '0.5rem', background: (loadingBot || resumo.botEmExecucao) ? '#94a3b8' : '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: (loadingBot || resumo.botEmExecucao) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <Play size={16} /> {(loadingBot || resumo.botEmExecucao) ? 'Sincronizando...' : 'Rodar Agora'}
          </button>
        </div>
      </div>
    </div>
  );
}
