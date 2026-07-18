import { useState, useEffect } from 'react';
import { Package, Search } from 'lucide-react';

export default function Produtos() {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadProdutos = async () => {
    try {
      // Usando regex básico no back via query? O back ainda não tem "busca" no Produtos. 
      // Mas a gente tem pagination.
      const res = await fetch(`http://localhost:7005/produto?page=${page}&limit=50`);
      const payload = await res.json();
      let list = payload.data || [];
      if (busca) {
        list = list.filter((p: any) => p.descricao?.toLowerCase().includes(busca.toLowerCase()));
      }
      setProdutos(list);
      setTotalPages(payload.totalPages || 1);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadProdutos();
  }, [busca, page]);

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>Produtos e Serviços</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Produtos e serviços encontrados pelo robô nas licitações de acordo com as palavras-chave cadastradas no perfil.
      </p>

      <div>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', color: '#94a3b8' }} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Buscar por descrição..." 
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
                <th>Descrição</th>
                <th>Valor Estimado</th>
                <th>Vinculado à Oportunidade ID</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map(p => (
                <tr key={p._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Package size={16} color="#64748b" />
                      <strong>{p.descricao}</strong>
                    </div>
                  </td>
                  <td>
                    {p.valorEstimado ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valorEstimado) : 'N/I'}
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', color: '#64748b' }}>{p.oportunidadeId}</span>
                  </td>
                </tr>
              ))}
              {produtos.length === 0 && (
                <tr><td colSpan={3} style={{textAlign:'center'}}>Nenhum produto encontrado.</td></tr>
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
