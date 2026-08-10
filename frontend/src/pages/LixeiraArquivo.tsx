import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, RefreshCw, Archive, Trash2 } from 'lucide-react';

export default function LixeiraArquivo() {
  const [oportunidades, setOportunidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('ALL'); // ALL, ARQUIVADA, EXCLUIDA
  const [searchTerm, setSearchTerm] = useState('');

  const fetchArquivadas = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${window.API_URL}/oportunidades?limit=1000&includeDeleted=true`);
      if (res.ok) {
        const data = await res.json();
        // Filtrar apenas as que tem status contendo ARQUIVAD ou EXCLUIDA
        const filtered = data.data.filter((op: any) => {
          if (!op.kanbanStatus) return false;
          const status = op.kanbanStatus.toUpperCase();
          return status.includes('ARQUIVAD') || status.includes('EXCLUIDA') || status.includes('PERDID');
        });
        setOportunidades(filtered);
      }
    } catch (err) {
      console.error('Erro ao buscar arquivadas/excluidas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArquivadas();
  }, []);

  const filteredOportunidades = oportunidades.filter(op => {
    const status = (op.kanbanStatus || '').toUpperCase();
    
    if (filterType === 'ARQUIVADA' && !status.includes('ARQUIVAD') && !status.includes('PERDID')) return false;
    if (filterType === 'EXCLUIDA' && !status.includes('EXCLUIDA')) return false;

      const search = searchTerm.toLowerCase().trim();
      if (!search) return true;

      const searchDigits = search.replace(/[^\d]/g, '');

      const matchOrgao = (op.orgaoNome || '').toLowerCase().includes(search);
      const matchObjeto = (op.objetoCompra || '').toLowerCase().includes(search);
      const matchModalidade = (op.modalidadeNome || '').toLowerCase().includes(search);
      
      const matchCnpj = (op.orgaoCnpj || '').toLowerCase().includes(search) || 
                        (searchDigits.length > 3 && (op.orgaoCnpj || '').replace(/[^\d]/g, '').includes(searchDigits));
      
      const matchUasg = (op.unidadeCompradora || '').toLowerCase().includes(search) ||
                        (searchDigits.length > 3 && (op.unidadeCompradora || '').replace(/[^\d]/g, '').includes(searchDigits));
                        
      const matchPncp = (op.numeroControlePNCP || '').toLowerCase().includes(search) || 
                        (searchDigits.length > 4 && (op.numeroControlePNCP || '').replace(/[^\d]/g, '').includes(searchDigits));

      const numeroCompraCompleto = (() => {
        if (op.numeroCompraOrigem && op.anoCompraOrigem) return `${op.numeroCompraOrigem}/${op.anoCompraOrigem}`;
        if (op.linkSistemaOrigem && op.linkSistemaOrigem.includes('compra=')) {
          const match = op.linkSistemaOrigem.match(/compra=\d{8}(\d{5})(\d{4})/);
          if (match) return `${parseInt(match[1], 10)}/${match[2]}`;
        }
        if (op.numeroControlePNCP) {
          const parts = op.numeroControlePNCP.split('-');
          if (parts.length >= 3) {
            const numYear = parts[2].split('/');
            if (numYear.length === 2) return `${parseInt(numYear[0], 10)}/${numYear[1]}`;
            return parts[2];
          }
        }
        return op.numeroCompraOrigem || '';
      })();

      const numeroCompraFormatado = (() => {
        if (!numeroCompraCompleto) return '';
        const parts = numeroCompraCompleto.split('/');
        if (parts.length === 2 && parts[0].length === 9 && parts[0].startsWith('20')) {
            const year = parts[0].substring(0, 4);
            const seq = parts[0].substring(4);
            return `${year}/${seq}`;
        }
        return numeroCompraCompleto;
      })();

      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regexCompra = new RegExp(`(?:^|[^\\d])${escapedSearch}(?:[^\\d]|$)`, 'i');
      const matchCompra = regexCompra.test(numeroCompraCompleto.toLowerCase()) || 
                          regexCompra.test(numeroCompraFormatado.toLowerCase()) ||
                          (searchDigits.length > 0 && numeroCompraCompleto.replace(/[^\d]/g, '') === searchDigits);
      
      return matchOrgao || matchObjeto || matchModalidade || matchCnpj || matchUasg || matchPncp || matchCompra;
  });

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
            <Archive size={24} />
            Arquivo e Lixeira
          </h1>
          <p style={{ color: '#64748b', marginTop: '0.25rem' }}>
            Consulte as propostas que foram arquivadas, perdidas ou excluídas do quadro principal.
          </p>
        </div>
        <button className="btn-primary" onClick={fetchArquivadas} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          Atualizar
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por órgão, objeto ou número..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.5rem', width: '100%' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${filterType === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterType('ALL')}
          >
            Todos
          </button>
          <button 
            className={`btn ${filterType === 'ARQUIVADA' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ backgroundColor: filterType === 'ARQUIVADA' ? '#3b82f6' : undefined }}
            onClick={() => setFilterType('ARQUIVADA')}
          >
            Arquivados
          </button>
          <button 
            className={`btn ${filterType === 'EXCLUIDA' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ backgroundColor: filterType === 'EXCLUIDA' ? '#ef4444' : undefined }}
            onClick={() => setFilterType('EXCLUIDA')}
          >
            Lixeira (Excluídas)
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={32} className="spin" style={{ margin: '0 auto 1rem', display: 'block' }} />
            <p>Buscando registros...</p>
          </div>
        ) : filteredOportunidades.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <Archive size={48} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.5 }} />
            <p>Nenhum registro encontrado nesta visualização.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '1rem', color: '#475569', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '1rem', color: '#475569', fontWeight: 600 }}>Identificação</th>
                  <th style={{ padding: '1rem', color: '#475569', fontWeight: 600 }}>Órgão</th>
                  <th style={{ padding: '1rem', color: '#475569', fontWeight: 600 }}>Modificação</th>
                  <th style={{ padding: '1rem', color: '#475569', fontWeight: 600 }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {filteredOportunidades.map(op => {
                  const isDeleted = (op.kanbanStatus || '').toUpperCase().includes('EXCLUI');
                  return (
                    <tr key={op._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '9999px', 
                          fontSize: '0.75rem', 
                          fontWeight: 600,
                          backgroundColor: isDeleted ? '#fee2e2' : '#e0f2fe',
                          color: isDeleted ? '#ef4444' : '#0284c7',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          {isDeleted ? <Trash2 size={12} /> : <Archive size={12} />}
                          {op.kanbanStatus === 'EXCLUIDA' ? 'EXCLUÍDA' : op.kanbanStatus}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 500, color: '#1e293b' }}>
                          {op.numeroCompraOrigem && op.anoCompraOrigem ? `${op.numeroCompraOrigem}/${op.anoCompraOrigem}` : (op.numeroControlePNCP || 'N/A')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{op.modalidadeNome}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#334155' }} title={op.orgaoNome}>
                          {op.orgaoNome}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
                        {op.dataMudancaStatus ? new Date(op.dataMudancaStatus).toLocaleDateString('pt-BR') : 'N/A'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <Link to={`/oportunidades/${op._id}`} className="btn-secondary" style={{ textDecoration: 'none', padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}>
                          Visualizar
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
