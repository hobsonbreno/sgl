import { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';

export default function PerfisBusca() {
  const [perfis, setPerfis] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [nome, setNome] = useState('');
  const [ufs, setUfs] = useState('');
  const [modalidades, setModalidades] = useState('');

  const loadPerfis = async () => {
    try {
      const res = await fetch('http://localhost:7005/perfis-busca');
      const data = await res.json();
      setPerfis(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadPerfis();
  }, []);

  const handleCreate = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      const m = modalidades.split(',').map(v => Number(v.trim())).filter(v => !isNaN(v));
      const u = ufs.split(',').map(v => v.trim()).filter(v => v !== '');
      
      const payload = {
        nome,
        modalidades: m,
        ufs: u
      };
      
      const res = await fetch('http://localhost:7005/perfis-busca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setNome('');
        setUfs('');
        setModalidades('');
        loadPerfis();
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const toggle = async (id: string) => {
    await fetch(`http://localhost:7005/perfis-busca/${id}/toggle`, { method: 'PATCH' });
    loadPerfis();
  };

  const remove = async (id: string) => {
    if (!confirm('Deseja realmente excluir?')) return;
    await fetch(`http://localhost:7005/perfis-busca/${id}`, { method: 'DELETE' });
    loadPerfis();
  };

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>Filtros do Robô (Perfis de Busca)</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Configure quais estados e modalidades de licitação o bot deve rastrear diariamente.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        <div className="stat-card" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Novo Filtro</h3>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Nome (ex: TI Ceará)</label>
              <input type="text" className="form-control" value={nome} onChange={e => setNome(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Estados (Siglas separadas por vírgula. Ex: CE, SP)</label>
              <input type="text" className="form-control" value={ufs} onChange={e => setUfs(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Códigos Modalidade (Ex: 6 para Pregão Eletrônico, 8 Dispensa)</label>
              <input type="text" className="form-control" value={modalidades} onChange={e => setModalidades(e.target.value)} required />
              <small style={{ color: 'var(--text-muted)' }}>Separados por vírgula</small>
            </div>
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
              <Plus size={18} /> Adicionar Filtro
            </button>
          </form>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>UFs</th>
                <th>Modalidades</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {perfis.map(p => (
                <tr key={p._id}>
                  <td><strong>{p.nome}</strong></td>
                  <td>{p.ufs.length > 0 ? p.ufs.join(', ') : 'Nacional'}</td>
                  <td>{p.modalidades.join(', ')}</td>
                  <td>
                    {p.ativo ? (
                      <span className="badge-warning" style={{ background: '#dcfce7', color: '#166534' }}><CheckCircle size={12} style={{marginRight:'4px'}}/>Ativo</span>
                    ) : (
                      <span className="badge-danger"><XCircle size={12} style={{marginRight:'4px'}}/>Inativo</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => toggle(p._id)} className="btn-primary" style={{ padding: '0.4rem', background: '#e2e8f0', color: '#475569' }}>
                        {p.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      <button onClick={() => remove(p._id)} className="btn-primary" style={{ padding: '0.4rem', background: '#fee2e2', color: '#ef4444' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {perfis.length === 0 && (
                <tr><td colSpan={5} style={{textAlign:'center'}}>Nenhum filtro cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
