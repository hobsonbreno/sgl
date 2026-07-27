import { useState, useEffect } from 'react';
import { Plus, Building2, Search, Edit2, X, Trash2 } from 'lucide-react';

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form states (Create)
  const [cnpj, setCnpj] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [categorias, setCategorias] = useState('');
  const [telefone, setTelefone] = useState('');
  const [nomeConsultor, setNomeConsultor] = useState('');
  const [email, setEmail] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [site, setSite] = useState('');
  const [portifolio, setPortifolio] = useState('');

  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editCnpj, setEditCnpj] = useState('');
  const [editRazaoSocial, setEditRazaoSocial] = useState('');
  const [editCategorias, setEditCategorias] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [editNomeConsultor, setEditNomeConsultor] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCep, setEditCep] = useState('');
  const [editEndereco, setEditEndereco] = useState('');
  const [editBairro, setEditBairro] = useState('');
  const [editCidade, setEditCidade] = useState('');
  const [editUf, setEditUf] = useState('');
  const [editSite, setEditSite] = useState('');
  const [editPortifolio, setEditPortifolio] = useState('');

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

  const buscarCnpj = async (cnpjNumber: string, isEdit: boolean) => {
    const apenasNumeros = cnpjNumber.replace(/\D/g, '');
    if (apenasNumeros.length !== 14) return;
    
    setLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${apenasNumeros}`);
      if (res.ok) {
        const data = await res.json();
        const razao = data.razao_social || data.nome_fantasia || '';
        const cats = data.cnae_fiscal_descricao || '';
        if (isEdit) {
          setEditRazaoSocial(razao);
          if (cats && !editCategorias) setEditCategorias(cats);
        } else {
          setRazaoSocial(razao);
          if (cats && !categorias) setCategorias(cats);
        }
      }
    } catch (e) {
      console.error('Erro ao buscar CNPJ', e);
    }
    setLoading(false);
  };

  const buscarCep = async (cepNumber: string, isEdit: boolean) => {
    const apenasNumeros = cepNumber.replace(/\D/g, '');
    if (apenasNumeros.length !== 8) return;

    setLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${apenasNumeros}`);
      if (res.ok) {
        const data = await res.json();
        if (isEdit) {
          setEditEndereco(data.street || '');
          setEditBairro(data.neighborhood || '');
          setEditCidade(data.city || '');
          setEditUf(data.state || '');
        } else {
          setEndereco(data.street || '');
          setBairro(data.neighborhood || '');
          setCidade(data.city || '');
          setUf(data.state || '');
        }
      }
    } catch (e) {
      console.error('Erro ao buscar CEP', e);
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
        categorias: categorias.split(',').map(c => c.trim()).filter(c => c),
        telefone,
        nomeConsultor,
        email,
        cep,
        endereco,
        bairro,
        cidade,
        uf,
        site,
        portifolio
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
        setTelefone('');
        setNomeConsultor('');
        setEmail('');
        setCep('');
        setEndereco('');
        setBairro('');
        setCidade('');
        setUf('');
        setSite('');
        setPortifolio('');
        loadFornecedores();
        alert('Fornecedor cadastrado com sucesso!');
      } else {
        alert('Erro ao cadastrar fornecedor.');
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const openEditModal = (f: any) => {
    setEditId(f._id);
    setEditCnpj(f.cnpj || '');
    setEditRazaoSocial(f.razaoSocial || '');
    setEditCategorias(f.categorias?.join(', ') || '');
    setEditTelefone(f.telefone || '');
    setEditNomeConsultor(f.nomeConsultor || '');
    setEditEmail(f.email || '');
    setEditCep(f.cep || '');
    setEditEndereco(f.endereco || '');
    setEditBairro(f.bairro || '');
    setEditCidade(f.cidade || '');
    setEditUf(f.uf || '');
    setEditSite(f.site || '');
    setEditPortifolio(f.portifolio || '');
    setIsEditModalOpen(true);
  };

  const handleEdit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        cnpj: editCnpj,
        razaoSocial: editRazaoSocial,
        categorias: editCategorias.split(',').map(c => c.trim()).filter(c => c),
        telefone: editTelefone,
        nomeConsultor: editNomeConsultor,
        email: editEmail,
        cep: editCep,
        endereco: editEndereco,
        bairro: editBairro,
        cidade: editCidade,
        uf: editUf,
        site: editSite,
        portifolio: editPortifolio
      };

      const res = await fetch(`http://localhost:7005/fornecedores/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        loadFornecedores();
        alert('Fornecedor atualizado com sucesso!');
      } else {
        alert('Erro ao atualizar fornecedor.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao atualizar fornecedor.');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este fornecedor? Esta ação não pode ser desfeita.')) return;
    
    try {
      const res = await fetch(`http://localhost:7005/fornecedores/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        loadFornecedores();
        alert('Fornecedor excluído com sucesso!');
      } else {
        const err = await res.json();
        alert(err.message || 'Erro ao excluir fornecedor.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao excluir fornecedor.');
    }
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
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
                onBlur={() => buscarCnpj(cnpj, false)}
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
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Telefone</label>
                <input type="text" className="form-control" value={telefone} onChange={e => setTelefone(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label>Nome do Consultor / Contato</label>
              <input type="text" className="form-control" value={nomeConsultor} onChange={e => setNomeConsultor(e.target.value)} />
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', margin: '1rem 0', paddingTop: '1rem' }}>
              <div className="form-group">
                <label>CEP (Apenas números)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={cep} 
                  onChange={e => setCep(e.target.value)} 
                  onBlur={() => buscarCep(cep, false)}
                  placeholder="Ex: 00000000"
                />
              </div>
              <div className="form-group">
                <label>Endereço</label>
                <input type="text" className="form-control" value={endereco} onChange={e => setEndereco(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Bairro</label>
                  <input type="text" className="form-control" value={bairro} onChange={e => setBairro(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Cidade</label>
                  <input type="text" className="form-control" value={cidade} onChange={e => setCidade(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>UF</label>
                  <input type="text" className="form-control" value={uf} onChange={e => setUf(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Categorias (separadas por vírgula)</label>
              <input type="text" className="form-control" value={categorias} onChange={e => setCategorias(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Site</label>
              <input type="url" className="form-control" value={site} onChange={e => setSite(e.target.value)} placeholder="https://..." />
            </div>

            <div className="form-group">
              <label>Portfólio de Produtos (Link ou Descrição)</label>
              <textarea 
                className="form-control" 
                value={portifolio} 
                onChange={e => setPortifolio(e.target.value)} 
                rows={3} 
                placeholder="Ex: Link do drive, lista de produtos principais..."
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
              <Plus size={18} /> {loading ? 'Salvando...' : 'Cadastrar Fornecedor'}
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
                  <th>Contato</th>
                  <th>Ações</th>
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
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                        {f.cidade ? `${f.cidade}-${f.uf}` : 'Sem endereço'}
                      </div>
                    </td>
                    <td>{f.cnpj}</td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>
                        <div>{f.telefone || '-'}</div>
                        <div style={{ color: '#64748b' }}>{f.nomeConsultor || '-'}</div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <button 
                          onClick={() => openEditModal(f)}
                          style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Edit2 size={16} /> Editar
                        </button>
                        <button 
                          onClick={() => handleDelete(f._id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Trash2 size={16} /> Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {fornecedores.length === 0 && (
                  <tr><td colSpan={4} style={{textAlign:'center'}}>Nenhum fornecedor encontrado.</td></tr>
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

      {isEditModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Editar Fornecedor</h3>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} color="#64748b" />
              </button>
            </div>
            
            <form onSubmit={handleEdit}>
              <div className="form-group">
                <label>CNPJ (Apenas números)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={editCnpj} 
                  onChange={e => setEditCnpj(e.target.value)} 
                  onBlur={() => buscarCnpj(editCnpj, true)}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Razão Social</label>
                <input type="text" className="form-control" value={editRazaoSocial} onChange={e => setEditRazaoSocial(e.target.value)} required />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Telefone</label>
                  <input type="text" className="form-control" value={editTelefone} onChange={e => setEditTelefone(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" className="form-control" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label>Nome do Consultor / Contato</label>
                <input type="text" className="form-control" value={editNomeConsultor} onChange={e => setEditNomeConsultor(e.target.value)} />
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', margin: '1rem 0', paddingTop: '1rem' }}>
                <div className="form-group">
                  <label>CEP (Apenas números)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={editCep} 
                    onChange={e => setEditCep(e.target.value)} 
                    onBlur={() => buscarCep(editCep, true)}
                  />
                </div>
                <div className="form-group">
                  <label>Endereço</label>
                  <input type="text" className="form-control" value={editEndereco} onChange={e => setEditEndereco(e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Bairro</label>
                    <input type="text" className="form-control" value={editBairro} onChange={e => setEditBairro(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Cidade</label>
                    <input type="text" className="form-control" value={editCidade} onChange={e => setEditCidade(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>UF</label>
                    <input type="text" className="form-control" value={editUf} onChange={e => setEditUf(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Categorias (separadas por vírgula)</label>
                <input type="text" className="form-control" value={editCategorias} onChange={e => setEditCategorias(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Site</label>
                <input type="url" className="form-control" value={editSite} onChange={e => setEditSite(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Portfólio de Produtos (Link ou Descrição)</label>
                <textarea 
                  className="form-control" 
                  value={editPortifolio} 
                  onChange={e => setEditPortifolio(e.target.value)} 
                  rows={3} 
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn-primary" style={{ background: '#e2e8f0', color: '#475569', flex: 1 }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 2 }}>
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
