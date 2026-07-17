import { useState, useEffect } from 'react';
import { Plus, Building2, Search } from 'lucide-react';

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);

  // Form states
  const [cnpj, setCnpj] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [categorias, setCategorias] = useState('');

  const loadFornecedores = async () => {
    try {
      const res = await fetch(`http://localhost:7005/fornecedores?busca=${busca}`);
      const data = await res.json();
      setFornecedores(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadFornecedores();
  }, [busca]);

  const handleCreate = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        cnpj,
        razaoSocial,
        categorias: categorias.split(',').map(c => c.trim()).filter(c => c)
      };
      
      const res = await fetch('http://localhost:7005/fornecedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setCnpj('');
        setRazaoSocial('');
        setCategorias('');
        loadFornecedores();
      } else {
        alert('Erro ao cadastrar fornecedor.');
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>Fornecedores e Órgãos</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Gerencie o banco de fornecedores cotados e órgãos capturados pelo robô.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        <div className="stat-card" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Novo Fornecedor</h3>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>CNPJ (Apenas números)</label>
              <input type="text" className="form-control" value={cnpj} onChange={e => setCnpj(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Razão Social</label>
              <input type="text" className="form-control" value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Categorias (separadas por vírgula)</label>
              <input type="text" className="form-control" value={categorias} onChange={e => setCategorias(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
              <Plus size={18} /> Cadastrar Fornecedor
            </button>
          </form>
        </div>

        <div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', color: '#94a3b8' }} />
              <input 
                type="text" 
                className="form-control" 
                placeholder="Buscar por CNPJ ou Razão Social..." 
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
                  <th>Empresa</th>
                  <th>CNPJ</th>
                  <th>Categorias</th>
                  <th>Origem</th>
                </tr>
              </thead>
              <tbody>
                {fornecedores.map(f => (
                  <tr key={f._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Building2 size={16} color="#64748b" />
                        <strong>{f.razaoSocial}</strong>
                      </div>
                    </td>
                    <td>{f.cnpj}</td>
                    <td>{f.categorias?.join(', ') || '-'}</td>
                    <td>
                      {f.origem === 'bot' ? (
                        <span className="badge-warning" style={{ background: '#e0e7ff', color: '#4338ca' }}>Capturado (Robô)</span>
                      ) : (
                        <span className="badge-warning" style={{ background: '#dcfce7', color: '#166534' }}>Manual</span>
                      )}
                    </td>
                  </tr>
                ))}
                {fornecedores.length === 0 && (
                  <tr><td colSpan={4} style={{textAlign:'center'}}>Nenhum fornecedor encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
