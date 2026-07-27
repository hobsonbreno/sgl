import { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';

export default function PerfisBusca() {
  const [perfis, setPerfis] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [nome, setNome] = useState('');
  const [ufs, setUfs] = useState('');
  const [modalidades, setModalidades] = useState('');
  const [palavrasChave, setPalavrasChave] = useState('');
  const [municipiosIbge, setMunicipiosIbge] = useState('');
  const [orgaosCnpj, setOrgaosCnpj] = useState('');
  const [unidadesUasg, setUnidadesUasg] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [municipiosList, setMunicipiosList] = useState<{ id: string; nome: string; uf: string }[]>([]);
  
  const [estadosBuscaFornecedores, setEstadosBuscaFornecedores] = useState('');
  const [municipiosBuscaFornecedores, setMunicipiosBuscaFornecedores] = useState('');
  const [municipiosFornecedoresList, setMunicipiosFornecedoresList] = useState<{ id: string; nome: string; uf: string }[]>([]);

  useEffect(() => {
    const fetchMunicipios = async () => {
      const u = ufs.split(',').map(v => v.trim().toUpperCase()).filter(v => v.length === 2);
      if (u.length === 0) {
        setMunicipiosList([]);
        return;
      }
      try {
        const ufsParam = u.join('|');
        const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufsParam}/municipios`);
        if (res.ok) {
          const data = await res.json();
          const formatted = data.map((m: any) => ({
            id: m.id.toString(),
            nome: m.nome,
            uf: m.microrregiao.mesorregiao.UF.sigla
          }));
          setMunicipiosList(formatted);
        }
      } catch(e) {
        console.error('Erro ao buscar municípios', e);
      }
    };
    
    const timeout = setTimeout(fetchMunicipios, 500);
    return () => clearTimeout(timeout);
  }, [ufs]);

  useEffect(() => {
    const fetchMunicipiosFornecedores = async () => {
      const u = estadosBuscaFornecedores.split(',').map(v => v.trim().toUpperCase()).filter(v => v.length === 2);
      if (u.length === 0) {
        setMunicipiosFornecedoresList([]);
        return;
      }
      try {
        const ufsParam = u.join('|');
        const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufsParam}/municipios`);
        if (res.ok) {
          const data = await res.json();
          const formatted = data.map((m: any) => ({
            id: m.nome, // Para fornecedores, salvamos o NOME do município para usar na API de busca
            nome: m.nome,
            uf: m.microrregiao.mesorregiao.UF.sigla
          }));
          setMunicipiosFornecedoresList(formatted);
        }
      } catch(e) {
        console.error('Erro ao buscar municípios fornecedores', e);
      }
    };
    
    const timeout = setTimeout(fetchMunicipiosFornecedores, 500);
    return () => clearTimeout(timeout);
  }, [estadosBuscaFornecedores]);

  const loadPerfis = async () => {
    try {
      const res = await fetch('http://192.168.1.16:30000/perfis-busca');
      const data = await res.json();
      setPerfis(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadPerfis();
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      const m = modalidades.split(',').map(v => Number(v.trim())).filter(v => !isNaN(v));
      const u = ufs.split(',').map(v => v.trim()).filter(v => v !== '');
      const p = palavrasChave.split(',').map(v => v.trim()).filter(v => v !== '');
      const mun = municipiosIbge.split(',').map(v => v.trim()).filter(v => v !== '');
      const org = orgaosCnpj.split(',').map(v => v.trim().replace(/\D/g, '')).filter(v => v !== '');
      const uasg = unidadesUasg.split(',').map(v => v.trim()).filter(v => v !== '');
      
      const ufFornecedores = estadosBuscaFornecedores.split(',').map(v => v.trim().toUpperCase()).filter(v => v !== '');
      const munFornecedores = municipiosBuscaFornecedores.split(',').map(v => v.trim()).filter(v => v !== '');
      
      const payload = {
        nome,
        modalidades: m,
        ufs: u,
        palavrasChave: p,
        municipiosIbge: mun,
        orgaosCnpj: org,
        unidadesUasg: uasg,
        estadosBuscaFornecedores: ufFornecedores,
        municipiosBuscaFornecedores: munFornecedores
      };
      
      const url = editingId ? `http://192.168.1.16:30000/perfis-busca/${editingId}` : 'http://192.168.1.16:30000/perfis-busca';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        cancelEdit();
        loadPerfis();
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const startEdit = (p: any) => {
    setEditingId(p._id);
    setNome(p.nome || '');
    setUfs(p.ufs ? p.ufs.join(', ') : '');
    setModalidades(p.modalidades ? p.modalidades.join(', ') : '');
    setPalavrasChave(p.palavrasChave ? p.palavrasChave.join(', ') : '');
    setMunicipiosIbge(p.municipiosIbge ? p.municipiosIbge.join(', ') : '');
    setOrgaosCnpj(p.orgaosCnpj ? p.orgaosCnpj.join(', ') : '');
    setUnidadesUasg(p.unidadesUasg ? p.unidadesUasg.join(', ') : '');
    setEstadosBuscaFornecedores(p.estadosBuscaFornecedores ? p.estadosBuscaFornecedores.join(', ') : '');
    setMunicipiosBuscaFornecedores(p.municipiosBuscaFornecedores ? p.municipiosBuscaFornecedores.join(', ') : '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNome('');
    setUfs('');
    setModalidades('');
    setPalavrasChave('');
    setMunicipiosIbge('');
    setOrgaosCnpj('');
    setUnidadesUasg('');
    setEstadosBuscaFornecedores('');
    setMunicipiosBuscaFornecedores('');
  };

  const duplicateProfile = (p: any) => {
    startEdit(p);
    setEditingId(null);
    setNome(p.nome ? `${p.nome} (Cópia)` : 'Cópia');
  };

  const toggle = async (id: string) => {
    await fetch(`http://192.168.1.16:30000/perfis-busca/${id}/toggle`, { method: 'PATCH' });
    loadPerfis();
  };

  const remove = async (id: string) => {
    if (!confirm('Deseja realmente excluir?')) return;
    await fetch(`http://192.168.1.16:30000/perfis-busca/${id}`, { method: 'DELETE' });
    loadPerfis();
  };

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>Filtros do Robô (Perfis de Busca)</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Configure quais estados, modalidades e produtos o bot deve rastrear diariamente.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        <div className="stat-card" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>{editingId ? 'Editar Filtro' : 'Novo Filtro'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nome (ex: Compra de Materiais)</label>
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
            <div className="form-group">
              <label>Produtos / Palavras Chave (Opcional)</label>
              <input type="text" className="form-control" value={palavrasChave} onChange={e => setPalavrasChave(e.target.value)} />
              <small style={{ color: 'var(--text-muted)' }}>Ex: fralda, lençol (Separados por vírgula)</small>
            </div>
            
            <details style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Filtros Avançados Opcionais (PNCP)</summary>
              <div style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ margin: 0 }}>Municípios (Clique para selecionar)</label>
                    {municipiosList.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          type="button" 
                          onClick={() => setMunicipiosIbge(municipiosList.map(m => m.id).join(', '))}
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Selecionar Todos
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setMunicipiosIbge('')}
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Limpar
                        </button>
                      </div>
                    )}
                  </div>
                  {municipiosList.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', border: '1px solid #cbd5e1', padding: '0.5rem', borderRadius: '4px', background: '#fff' }}>
                      {municipiosList.map(m => {
                        const selectedArray = municipiosIbge.split(',').map(v => v.trim()).filter(Boolean);
                        const isSelected = selectedArray.includes(m.id);
                        return (
                          <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', background: isSelected ? '#e0e7ff' : '#f8fafc', padding: '0.4rem', borderRadius: '4px', border: isSelected ? '1px solid #a5b4fc' : '1px solid transparent', transition: 'all 0.2s' }}>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={(e) => {
                                let newSelected = [...selectedArray];
                                if (e.target.checked) {
                                  newSelected.push(m.id);
                                } else {
                                  newSelected = newSelected.filter(id => id !== m.id);
                                }
                                setMunicipiosIbge(newSelected.join(', '));
                              }}
                              style={{ cursor: 'pointer' }}
                            />
                            {m.nome} - {m.uf}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: '0.75rem', background: '#f1f5f9', color: '#64748b', fontSize: '0.85rem', borderRadius: '4px', border: '1px dashed #cbd5e1' }}>
                      Digite as siglas dos Estados (ex: CE, SP) acima para carregar os quadrinhos de municípios.
                    </div>
                  )}
                  {municipiosList.length > 0 && (
                    <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                      * Você pode selecionar vários quadrinhos simultaneamente.
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label>Órgãos (CNPJ)</label>
                  <input type="text" className="form-control" value={orgaosCnpj} onChange={e => setOrgaosCnpj(e.target.value)} placeholder="Somente números" />
                </div>
                <div className="form-group">
                  <label>Unidades (UASG / Cód. PNCP)</label>
                  <input type="text" className="form-control" value={unidadesUasg} onChange={e => setUnidadesUasg(e.target.value)} placeholder="Ex: 981253" />
                </div>
              </div>
            </details>

            <details style={{ marginBottom: '1.5rem', background: '#fffbeb', padding: '0.75rem', borderRadius: '6px', border: '1px solid #fde68a' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#92400e', fontSize: '0.9rem' }}>🔍 Localização Inteligente (Busca de Fornecedores na Web)</summary>
              <div style={{ marginTop: '1rem' }}>
                <p style={{ fontSize: '0.8rem', color: '#b45309', marginBottom: '1rem' }}>
                  Restrinja em quais regiões o bot buscará lojas e distribuidores na internet (via API Google). 
                  Isso ajuda a encontrar fornecedores mais próximos, economizando no frete.
                </p>
                <div className="form-group">
                  <label>Estados (Siglas separadas por vírgula. Ex: SP, RJ)</label>
                  <input type="text" className="form-control" value={estadosBuscaFornecedores} onChange={e => setEstadosBuscaFornecedores(e.target.value)} />
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ margin: 0 }}>Municípios Foco (Clique para selecionar)</label>
                    {municipiosFornecedoresList.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          type="button" 
                          onClick={() => setMunicipiosBuscaFornecedores(municipiosFornecedoresList.map(m => m.id).join(', '))}
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#fef3c7', color: '#d97706', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Selecionar Todos
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setMunicipiosBuscaFornecedores('')}
                          style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Limpar
                        </button>
                      </div>
                    )}
                  </div>
                  {municipiosFornecedoresList.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', border: '1px solid #fcd34d', padding: '0.5rem', borderRadius: '4px', background: '#fff' }}>
                      {municipiosFornecedoresList.map(m => {
                        const selectedArray = municipiosBuscaFornecedores.split(',').map(v => v.trim()).filter(Boolean);
                        const isSelected = selectedArray.includes(m.id);
                        return (
                          <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', background: isSelected ? '#fef3c7' : '#fffbeb', padding: '0.4rem', borderRadius: '4px', border: isSelected ? '1px solid #fbbf24' : '1px solid transparent', transition: 'all 0.2s' }}>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={(e) => {
                                let newSelected = [...selectedArray];
                                if (e.target.checked) {
                                  newSelected.push(m.id);
                                } else {
                                  newSelected = newSelected.filter(id => id !== m.id);
                                }
                                setMunicipiosBuscaFornecedores(newSelected.join(', '));
                              }}
                              style={{ cursor: 'pointer' }}
                            />
                            {m.nome} - {m.uf}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: '0.75rem', background: '#fef9c3', color: '#854d0e', fontSize: '0.85rem', borderRadius: '4px', border: '1px dashed #fde047' }}>
                      Digite as siglas dos Estados acima para carregar as cidades da Inteligência de Mercado.
                    </div>
                  )}
                </div>
              </div>
            </details>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
                <Plus size={18} /> {editingId ? 'Salvar' : 'Adicionar Filtro'}
              </button>
              {editingId && (
                <button type="button" onClick={cancelEdit} className="btn-primary" style={{ background: '#e2e8f0', color: '#475569' }}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>UFs / Locais</th>
                <th>Modalidades</th>
                <th>Produtos</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {perfis.map(p => (
                <tr key={p._id}>
                  <td><strong>{p.nome}</strong></td>
                  <td>
                    {p.ufs?.length > 0 && <div><small style={{ color: '#64748b' }}>UF PNCP: </small>{p.ufs.join(', ')}</div>}
                    {p.municipiosIbge?.length > 0 && <div><small style={{ color: '#64748b' }}>IBGE: </small>{p.municipiosIbge.join(', ')}</div>}
                    {p.orgaosCnpj?.length > 0 && <div><small style={{ color: '#64748b' }}>CNPJ: </small>{p.orgaosCnpj.join(', ')}</div>}
                    {p.unidadesUasg?.length > 0 && <div><small style={{ color: '#64748b' }}>UASG: </small>{p.unidadesUasg.join(', ')}</div>}
                    
                    {(p.estadosBuscaFornecedores?.length > 0 || p.municipiosBuscaFornecedores?.length > 0) && (
                        <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1' }}>
                            <strong style={{ fontSize: '0.75rem', color: '#b45309' }}>🤖 Bot Web:</strong>
                            {p.estadosBuscaFornecedores?.length > 0 && <div><small style={{ color: '#d97706' }}>UF: </small><span style={{color: '#92400e', fontSize: '0.8rem'}}>{p.estadosBuscaFornecedores.join(', ')}</span></div>}
                            {p.municipiosBuscaFornecedores?.length > 0 && <div><small style={{ color: '#d97706' }}>Cidades: </small><span style={{color: '#92400e', fontSize: '0.8rem'}}>{p.municipiosBuscaFornecedores.join(', ')}</span></div>}
                        </div>
                    )}

                    {!p.ufs?.length && !p.municipiosIbge?.length && !p.orgaosCnpj?.length && !p.unidadesUasg?.length && 'Nacional / Todos'}
                  </td>
                  <td>{p.modalidades.join(', ')}</td>
                  <td>{p.palavrasChave && p.palavrasChave.length > 0 ? p.palavrasChave.join(', ') : 'Tudo'}</td>
                  <td>
                    {p.ativo ? (
                      <span className="badge-warning" style={{ background: '#dcfce7', color: '#166534' }}><CheckCircle size={12} style={{marginRight:'4px'}}/>Ativo</span>
                    ) : (
                      <span className="badge-danger"><XCircle size={12} style={{marginRight:'4px'}}/>Inativo</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => startEdit(p)} className="btn-primary" style={{ padding: '0.4rem', background: '#e0e7ff', color: '#4f46e5', minWidth: '60px' }}>
                        Editar
                      </button>
                      <button onClick={() => duplicateProfile(p)} className="btn-primary" style={{ padding: '0.4rem', background: '#dbeafe', color: '#1d4ed8', minWidth: '70px' }}>
                        Duplicar
                      </button>
                      <button onClick={() => toggle(p._id)} className="btn-primary" style={{ padding: '0.4rem', background: '#e2e8f0', color: '#475569', minWidth: '75px' }}>
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
                <tr><td colSpan={6} style={{textAlign:'center'}}>Nenhum filtro cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
