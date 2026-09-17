import { useEffect, useState } from 'react';
import { Activity, Search, AlertCircle, Info, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function SystemLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [filterModule, setFilterModule] = useState<string>('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      let url = `${window.API_URL}/observability/system-logs?limit=200`;
      if (filterLevel) url += `&level=${filterLevel}`;
      if (filterModule) url += `&module=${filterModule}`;
      
      const res = await fetch(url);
      const json = await res.json();
      setLogs(json.data || []);
    } catch (e) {
      console.error('Failed to load logs', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [filterLevel, filterModule]);

  const getLevelIcon = (level: string) => {
    switch(level) {
      case 'error': return <ShieldAlert size={18} color="#dc2626" />;
      case 'warn': return <AlertTriangle size={18} color="#d97706" />;
      case 'info': return <Info size={18} color="#2563eb" />;
      default: return <Activity size={18} color="#64748b" />;
    }
  };

  const getLevelStyle = (level: string) => {
    switch(level) {
      case 'error': return { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c' };
      case 'warn': return { bg: '#fffbeb', border: '#fde68a', color: '#b45309' };
      case 'info': return { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' };
      default: return { bg: '#f8fafc', border: '#e2e8f0', color: '#475569' };
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', color: '#0f172a', fontWeight: 900, letterSpacing: '-0.5px', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity size={32} color="#3b82f6" />
            Logs Globais do Sistema
          </h1>
          <p style={{ color: '#475569', fontSize: '1.1rem', marginTop: '0.5rem' }}>
            Auditoria em tempo real de todas as exceções e eventos críticos do SGL.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <select 
            className="form-control" 
            value={filterLevel} 
            onChange={e => setFilterLevel(e.target.value)}
            style={{ minWidth: '150px' }}
          >
            <option value="">Todos os Níveis</option>
            <option value="error">Erros Críticos</option>
            <option value="warn">Avisos (Warn)</option>
            <option value="info">Informação</option>
          </select>
          <input 
            type="text" 
            placeholder="Filtrar por Módulo (ex: Bot)"
            className="form-control"
            value={filterModule}
            onChange={e => setFilterModule(e.target.value)}
          />
          <button onClick={loadLogs} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>
            <Search size={18} />
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '1.25rem 1.5rem', color: '#475569', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>Data / Hora</th>
              <th style={{ padding: '1.25rem 1.5rem', color: '#475569', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>Nível</th>
              <th style={{ padding: '1.25rem 1.5rem', color: '#475569', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>Módulo Origem</th>
              <th style={{ padding: '1.25rem 1.5rem', color: '#475569', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>Mensagem Detalhada</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Carregando logs...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  <AlertCircle size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                  <div>Nenhum log encontrado para estes filtros. Sistema operando perfeitamente!</div>
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const style = getLevelStyle(log.level);
                return (
                  <tr key={log._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem 1.5rem', color: '#334155', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ 
                        background: style.bg, 
                        border: `1px solid ${style.border}`,
                        color: style.color, 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '999px', 
                        fontSize: '0.75rem', 
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        {getLevelIcon(log.level)}
                        {log.level}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#0f172a', fontWeight: 600 }}>
                      {log.module}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', maxWidth: '600px' }}>
                      <div style={{ color: '#1e293b', fontWeight: 500, marginBottom: '0.25rem' }}>{log.message}</div>
                      {log.stacktrace && (
                        <details>
                          <summary style={{ fontSize: '0.8rem', color: '#64748b', cursor: 'pointer' }}>Ver rastreio técnico (Stacktrace)</summary>
                          <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: '1rem', borderRadius: '8px', fontSize: '0.75rem', overflowX: 'auto', marginTop: '0.5rem' }}>
                            {log.stacktrace}
                          </pre>
                        </details>
                      )}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', background: '#f1f5f9', padding: '0.5rem', borderRadius: '6px' }}>
                          <strong style={{ color: '#475569' }}>Contexto:</strong> {JSON.stringify(log.metadata)}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
