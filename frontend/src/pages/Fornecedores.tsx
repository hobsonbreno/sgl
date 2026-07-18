import { useState, useEffect } from 'react';
import { Plus, Building2, Search } from 'lucide-react';

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form states
  const [cnpj, setCnpj] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [categorias, setCategorias] = useState('');

  const loadFornecedores = async () => {
    try {
      const res = await fetch(`http://localhost:7005/fornecedores?busca=${busca}&page=${page}&limit=10`);
      const payload = await res.json();
      setFornecedores(payload.data || []);
      setTotalPages(payload.totalPages || 1);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadFornecedores();
  }, [busca, page]);

  const buscarCnpj = async () => {
    const apenasNumeros = cnpj.replace(/\D/g, '');
    if (apenasNumeros.length !== 14) return;
    
    setLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${apenasNumeros}`);
      if (res.ok) {
        const data = await res.json();
        setRazaoSocial(data.razao_social || data.nome_fantasia || '');
        if (data.cnae_fiscal_descricao) {
          setCategorias(data.cnae_fiscal_descricao);
        }
      }
    } catch (e) {
      console.error('Erro ao buscar CNPJ', e);
    }
    setLoading(false);
  };

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
      <h1 style={{ marginBottom: '1.5rem' }}>Fornecedores</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Gerencie o banco de fornecedores com quem você cota os produtos e serviços.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        <div className="stat-card" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Novo Fornecedor</h3>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>CNPJ (Apenas números)</label>
              <input 
                type="text" 
                className="form-control" 
                value={cnpj} 
                onChange={e => setCnpj(e.target.value)} 
                onBlur={buscarCnpj}
                placeholder="Ex: 00000000000000"
                required 
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                Digite os 14 números e clique fora do campo para buscar dados da Receita Federal.
              </small>
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
              <Plus size={18} /> {loading ? 'Carregando...' : 'Cadastrar Fornecedor'}
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
                  </tr>
                ))}
                {fornecedores.length === 0 && (
                  <tr><td colSpan={5} style={{textAlign:'center'}}>Nenhum fornecedor encontrado.</td></tr>
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
    </div>
  );
}
