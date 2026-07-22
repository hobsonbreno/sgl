import { useState, useEffect } from 'react';
import { Package, Search, ExternalLink, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';

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
                <th>Descrição do Item / Produto</th>
                <th>Valor Estimado Unitário</th>
                <th>Oportunidade de Venda</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map(p => {
                const op = p.oportunidadeId || {};
                const orgaoNome = op.orgaoNome || 'Órgão Desconhecido';
                const uf = op.uf ? `(${op.uf})` : '';
                const edital = (op.numeroCompraOrigem && op.anoCompraOrigem) ? `Edital ${op.numeroCompraOrigem}/${op.anoCompraOrigem}` : (op.numeroControlePNCP || 'N/A');
                
                return (
                  <tr key={p._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ padding: '0.5rem', background: '#f1f5f9', borderRadius: '6px' }}>
                          <Package size={18} color="#64748b" />
                        </div>
                        <div style={{ maxWidth: '400px', whiteSpace: 'normal', lineHeight: '1.4' }}>
                          <strong style={{ color: '#334155', fontSize: '0.9rem' }}>{p.descricao}</strong>
                          {p.quantidade && (
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                              Quantidade: {p.quantidade}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ color: '#059669', fontWeight: 600 }}>
                        {p.valorEstimado ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valorEstimado) : <span style={{ color: '#94a3b8', fontWeight: 400 }}>Sob demanda (N/I)</span>}
                      </div>
                    </td>
                    <td>
                      {p.oportunidadeId ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>
                            <Building2 size={14} /> {orgaoNome} <span style={{ color: '#94a3b8' }}>{uf}</span>
                          </div>
                          <Link 
                            to={`/oportunidade/${op._id}`} 
                            style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                              fontSize: '0.8rem', color: '#4f46e5', textDecoration: 'none',
                              padding: '0.3rem 0.6rem', background: '#e0e7ff', borderRadius: '4px',
                              width: 'fit-content', fontWeight: 500
                            }}
                          >
                            <ExternalLink size={12} /> {edital}
                          </Link>
                        </div>
                      ) : (
                        <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>Oportunidade Excluída</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {produtos.length === 0 && (
                <tr><td colSpan={3} style={{textAlign:'center', padding: '3rem', color: '#94a3b8'}}>Nenhum produto encontrado.</td></tr>
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
