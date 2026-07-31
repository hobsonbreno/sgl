import { useState, useEffect } from 'react';
import { Building2, Search } from 'lucide-react';

export default function Orgaos() {
  const [orgaos, setOrgaos] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadOrgaos = async () => {
    try {
      const res = await fetch(`http://localhost:7005/orgao?page=${page}&limit=50`);
      const payload = await res.json();
      let list = payload.data || [];
      if (busca) {
        list = list.filter((o: any) => o.nome?.toLowerCase().includes(busca.toLowerCase()) || o.cnpj?.includes(busca));
      }
      setOrgaos(list);
      setTotalPages(payload.totalPages || 1);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadOrgaos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, page]);

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>Órgãos Públicos</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Órgãos capturados automaticamente pelo robô nas licitações e dispensas do PNCP.
      </p>

      <div>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', color: '#94a3b8' }} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Buscar por CNPJ ou Nome do Órgão..." 
              style={{ paddingLeft: '2.5rem' }}
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
        </div>
        
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nome do Órgão</th>
                <th>CNPJ</th>
                <th>Origem</th>
              </tr>
            </thead>
            <tbody>
              {orgaos.map(o => (
                <tr key={o._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Building2 size={16} color="#64748b" />
                      <strong>{o.nome}</strong>
                    </div>
                  </td>
                  <td>{o.cnpj}</td>
                  <td>
                    <span className="badge-warning" style={{ background: '#e0e7ff', color: '#4338ca' }}>Capturado (Robô)</span>
                  </td>
                </tr>
              ))}
              {orgaos.length === 0 && (
                <tr><td colSpan={3} style={{textAlign:'center'}}>Nenhum órgão encontrado.</td></tr>
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
    </div>
  );
}
