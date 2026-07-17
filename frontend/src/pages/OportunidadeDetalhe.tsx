import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';

export default function OportunidadeDetalhe() {
  const { id } = useParams();
  const [oportunidade, setOportunidade] = useState<any>(null);
  const [cotacao, setCotacao] = useState<any>(null);
  const [aba, setAba] = useState<'edital' | 'cotacao'>('edital');
  const [loading, setLoading] = useState(true);

  // Form state para adicionar fornecedor na cotacao (placeholder simples)
  const [novoFornecedorId, setNovoFornecedorId] = useState('');
  const [fornecedoresDisponiveis, setFornecedoresDisponiveis] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const resOp = await fetch(`http://localhost:7005/oportunidades/${id}`);
      const dataOp = await resOp.json();
      setOportunidade(dataOp);

      // Iniciar ou obter cotação vinculada
      const resCot = await fetch(`http://localhost:7005/oportunidades/${id}/cotacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens: dataOp.itens || [] })
      });
      const dataCot = await resCot.json();

      // Recarregar com populate
      const resCotFull = await fetch(`http://localhost:7005/cotacoes/${dataCot._id}`);
      setCotacao(await resCotFull.json());

      // Carregar lista de fornecedores para o dropdown
      const resForn = await fetch('http://localhost:7005/fornecedores');
      setFornecedoresDisponiveis(await resForn.json());

    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handlePrecoBlur = async (itemId: string, fornecedorId: string, value: string) => {
    const numValue = Number(value.replace(',', '.'));
    if (isNaN(numValue)) return;

    try {
      await fetch(`http://localhost:7005/cotacoes/${cotacao._id}/itens/${itemId}/preco`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fornecedorId, precoUnitario: numValue })
      });
      // Recarrega cotação para refletir os novos totais e melhor preço
      const resCotFull = await fetch(`http://localhost:7005/cotacoes/${cotacao._id}`);
      setCotacao(await resCotFull.json());
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar preço.');
    }
  };

  if (loading || !oportunidade) return <div style={{ padding: '2rem' }}>Carregando dados da negociação...</div>;

  // Montar as colunas (fornecedores distintos que já cotaram algo nesta oportunidade)
  const fornecedoresCotados = new Map<string, { id: string, razaoSocial: string }>();
  if (cotacao?.itens) {
    cotacao.itens.forEach((it: any) => {
      it.precosFornecedores?.forEach((pf: any) => {
        if (pf.fornecedorId) {
          fornecedoresCotados.set(pf.fornecedorId._id, { id: pf.fornecedorId._id, razaoSocial: pf.fornecedorId.razaoSocial });
        }
      });
    });
  }

  // Novo fornecedor state na UI
  if (novoFornecedorId && !fornecedoresCotados.has(novoFornecedorId)) {
    const fData = fornecedoresDisponiveis.find(f => f._id === novoFornecedorId);
    if (fData) {
      fornecedoresCotados.set(fData._id, { id: fData._id, razaoSocial: fData.razaoSocial });
    }
  }

  const columnsFornecedores = Array.from(fornecedoresCotados.values());

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/kanban" className="btn-primary" style={{ background: '#e2e8f0', color: '#475569', padding: '0.5rem 1rem' }}>
          <ArrowLeft size={16} /> Voltar
        </Link>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Negociação: {oportunidade.orgaoNome}</h1>
      </div>

      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => setAba('edital')}
          style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: aba === 'edital' ? '2px solid var(--primary)' : '2px solid transparent', color: aba === 'edital' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
        >
          Dados do Edital
        </button>
        <button 
          onClick={() => setAba('cotacao')}
          style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: aba === 'cotacao' ? '2px solid var(--primary)' : '2px solid transparent', color: aba === 'cotacao' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
        >
          Painel de Cotação
        </button>
      </div>

      {aba === 'edital' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div className="stat-card" style={{ height: 'fit-content' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)', fontSize: '1rem' }}>Informações Básicas</h3>
            <p style={{ marginBottom: '0.5rem' }}><strong>Objeto:</strong> {oportunidade.objetoCompra}</p>
            <p style={{ marginBottom: '0.5rem' }}><strong>Modalidade:</strong> {oportunidade.modalidadeNome}</p>
            <p style={{ marginBottom: '0.5rem' }}><strong>UASG / Órgão:</strong> {oportunidade.orgaoCnpj} - {oportunidade.orgaoNome}</p>
            <p style={{ marginBottom: '0.5rem' }}><strong>Local:</strong> {oportunidade.municipio} - {oportunidade.uf}</p>
            <p style={{ marginBottom: '0.5rem' }}><strong>Valor Estimado:</strong> R$ {oportunidade.valorTotalEstimado?.toLocaleString('pt-BR')}</p>
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <AlertCircle size={18} color="#4f46e5" />
              <span>Status atual: <strong>{oportunidade.kanbanStatus.replace('_', ' ')}</strong></span>
            </div>
          </div>
        </div>
      )}

      {aba === 'cotacao' && cotacao && (
        <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Matriz de Preços e Melhores Ofertas</h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <select className="form-control" value="" onChange={e => setNovoFornecedorId(e.target.value)} style={{ width: '250px' }}>
                <option value="" disabled>+ Adicionar Fornecedor à disputa...</option>
                {fornecedoresDisponiveis.map(f => (
                  <option key={f._id} value={f._id}>{f.razaoSocial} ({f.cnpj})</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width: '30%', borderBottom: '2px solid #e2e8f0', padding: '1rem', textAlign: 'left', background: '#f8fafc' }}>Produto / Item</th>
                  <th style={{ width: '10%', borderBottom: '2px solid #e2e8f0', padding: '1rem', textAlign: 'center', background: '#f8fafc' }}>Melhor Preço</th>
                  {columnsFornecedores.map(f => (
                    <th key={f.id} style={{ borderBottom: '2px solid #e2e8f0', padding: '1rem', textAlign: 'center', background: '#f8fafc' }}>{f.razaoSocial}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cotacao.itens.length === 0 ? (
                  <tr>
                    <td colSpan={columnsFornecedores.length + 2} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      Nenhum item inserido no sistema PNCP para este edital, ou o parse de itens ainda não ocorreu.
                    </td>
                  </tr>
                ) : (
                  cotacao.itens.map((item: any) => (
                    <tr key={item._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '1rem', color: '#334155', fontWeight: 500 }}>
                        {item.descricaoItem || 'Item sem descrição'}
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>Qtd: {item.quantidade || 1}</div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', background: '#f0fdf4', color: '#166534', fontWeight: 'bold' }}>
                        {item.melhorPreco ? `R$ ${item.melhorPreco.precoUnitario.toLocaleString('pt-BR')}` : '-'}
                      </td>
                      {columnsFornecedores.map(f => {
                        const pf = item.precosFornecedores?.find((p:any) => p.fornecedorId?._id === f.id);
                        const isMelhor = item.melhorPreco && pf && item.melhorPreco.fornecedorId === f.id;
                        
                        return (
                          <td key={f.id} style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                              <input 
                                type="number" 
                                className="form-control" 
                                placeholder="0,00"
                                defaultValue={pf ? pf.precoUnitario : ''}
                                onBlur={(e) => handlePrecoBlur(item._id, f.id, e.target.value)}
                                style={{ width: '100px', textAlign: 'center', borderColor: isMelhor ? '#10b981' : 'var(--border-color)', borderWidth: isMelhor ? '2px' : '1px' }}
                              />
                              {isMelhor && <span style={{ fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Check size={12}/> Vencedor</span>}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#1e293b', borderRadius: '8px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, color: '#94a3b8', fontSize: '1rem' }}>Estimativa Total Vencedora (Soma dos melhores)</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Cálculo automático de Unitário x Quantidade</p>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>
              R$ {cotacao.valorTotalMelhorCotacao?.toLocaleString('pt-BR')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
