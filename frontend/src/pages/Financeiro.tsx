import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Plus, Check, Trash2 } from 'lucide-react';

export default function Financeiro() {
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [negociosFechados, setNegociosFechados] = useState<any[]>([]);
  const [negociosArquivados, setNegociosArquivados] = useState<any[]>([]);
  const [resumo, setResumo] = useState<any>({
    receitasPendentes: 0, receitasPagas: 0, despesasPendentes: 0, despesasPagas: 0, saldoAtual: 0, saldoProjetado: 0, valorNovasOportunidades: 0
  });

  const [form, setForm] = useState({
    tipo: 'RECEITA',
    descricao: '',
    valor: '',
    dataVencimento: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [resTrans, resResumo, resNegocios, resArquivados] = await Promise.all([
        fetch(`${window.API_URL}/financeiro`),
        fetch(`${window.API_URL}/financeiro/resumo`),
        fetch(`${window.API_URL}/financeiro/negocios-fechados`),
        fetch(`${window.API_URL}/financeiro/arquivados`)
      ]);
      setTransacoes(await resTrans.json());
      setResumo(await resResumo.json());
      
      const negocios = await resNegocios.json();
      setNegociosFechados(Array.isArray(negocios) ? negocios : []);
      
      const arquivados = await resArquivados.json();
      setNegociosArquivados(Array.isArray(arquivados) ? arquivados : []);
    } catch (e) {
      console.error(e);
      setNegociosFechados([]);
      setNegociosArquivados([]);
    }
  };

  const darBaixaNegocio = async (id: string) => {
    if(!window.confirm('Confirmar o recebimento deste negócio? Ele será movido para Arquivados e o valor entrará no Caixa Atual.')) return;
    try {
      await fetch(`${window.API_URL}/financeiro/receber-negocio/${id}`, { method: 'POST' });
      carregarDados();
    } catch (e) {
      console.error(e);
      alert('Erro ao dar baixa. Verifique se você preencheu o "Nosso Lance Vencedor" nos itens da oportunidade.');
    }
  };

  const estornarNegocio = async (id: string) => {
    if(!window.confirm('Tem certeza que deseja desarquivar e voltar este negócio para Negócios Fechados? O recebimento será excluído do Caixa Atual.')) return;
    try {
      await fetch(`${window.API_URL}/financeiro/estornar-negocio/${id}`, { method: 'POST' });
      carregarDados();
    } catch (e) {
      console.error(e);
      alert('Erro ao estornar negócio.');
    }
  };

  const handleSalvar = async (e: any) => {
    e.preventDefault();
    try {
      await fetch(`${window.API_URL}/financeiro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          valor: Number(form.valor)
        })
      });
      setForm({ tipo: 'RECEITA', descricao: '', valor: '', dataVencimento: new Date().toISOString().split('T')[0] });
      carregarDados();
    } catch (e) {
      console.error(e);
    }
  };

  const marcarPago = async (id: string) => {
    try {
      await fetch(`${window.API_URL}/financeiro/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAGO' })
      });
      carregarDados();
    } catch (e) {
      console.error(e);
    }
  };

  const excluir = async (id: string) => {
    if(!window.confirm('Tem certeza?')) return;
    try {
      await fetch(`${window.API_URL}/financeiro/${id}`, {
        method: 'DELETE'
      });
      carregarDados();
    } catch (e) {
      console.error(e);
    }
  };

  const formataMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  };

  const formataData = (data: string) => {
    if (!data) return '';
    const date = new Date(data);
    return new Intl.DateTimeFormat('pt-BR').format(date);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <Wallet size={28} color="var(--primary)" />
        <h1 style={{ margin: 0 }}>Livro Caixa & Financeiro</h1>
      </div>

      {/* Resumo Financeiro */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem', background: '#fff', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>CAIXA ATUAL</span>
            <DollarSign size={20} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.5rem', color: resumo.saldoAtual >= 0 ? '#10b981' : '#ef4444' }}>
            {formataMoeda(resumo.saldoAtual)}
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', background: '#f8fafc', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>NOVAS OP. (A FAZER)</span>
            <TrendingUp size={20} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#8b5cf6' }}>
            {formataMoeda(resumo.valorNovasOportunidades)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>Total Estimado</div>
        </div>

        <div className="card" style={{ padding: '1.5rem', background: '#fff', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>SALDO PROJETADO (FUTURO)</span>
            <TrendingUp size={20} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#334155' }}>
            {formataMoeda(resumo.saldoProjetado)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>A receber - A Pagar</div>
        </div>

        <div className="card" style={{ padding: '1.5rem', background: '#fff', borderLeft: '4px solid #eab308' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>FATURAMENTO A RECEBER</span>
            <TrendingUp size={20} color="#eab308" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#eab308' }}>
            {formataMoeda(resumo.receitasPendentes)}
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', background: '#fff', borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>CONTAS A PAGAR</span>
            <TrendingDown size={20} color="#ef4444" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#ef4444' }}>
            {formataMoeda(resumo.despesasPendentes)}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Formulário */}
        <div className="card" style={{ padding: '1.5rem', background: '#fff', alignSelf: 'start' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.1rem' }}>Nova Transação</h3>
          <form onSubmit={handleSalvar}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>Tipo</label>
              <select className="form-control" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                <option value="RECEITA">Receita (Entrada)</option>
                <option value="DESPESA">Despesa (Saída)</option>
              </select>
            </div>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>Descrição</label>
              <input type="text" required className="form-control" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Ex: Pagamento Edital X / Conta de Luz" />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>Valor (R$)</label>
              <input type="number" step="0.01" required className="form-control" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Data de Vencimento</label>
              <input type="date" required className="form-control" value={form.dataVencimento} onChange={e => setForm({...form, dataVencimento: e.target.value})} />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={18} /> Adicionar
            </button>
          </form>
        </div>

        {/* Lista de Transações */}
        <div className="card" style={{ padding: '1.5rem', background: '#fff' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.1rem' }}>Extrato / Lançamentos</h3>
          {transacoes.length === 0 ? (
            <p style={{ color: '#64748b' }}>Nenhuma transação financeira registrada.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Tipo</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Descrição</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Vencimento</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Valor</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {transacoes.map((t, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{ 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem', 
                          fontWeight: 600,
                          background: t.tipo === 'RECEITA' ? '#dcfce7' : '#fee2e2',
                          color: t.tipo === 'RECEITA' ? '#166534' : '#991b1b'
                        }}>
                          {t.tipo}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500, color: '#334155' }}>
                        {t.descricao}
                        {t.oportunidadeId && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{t.oportunidadeId.orgaoNome}</div>}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: '#64748b' }}>{formataData(t.dataVencimento)}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: t.tipo === 'RECEITA' ? '#10b981' : '#ef4444' }}>
                        {t.tipo === 'DESPESA' ? '-' : ''}{formataMoeda(t.valor)}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{ 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem', 
                          fontWeight: 600,
                          background: t.status === 'PAGO' ? '#e2e8f0' : '#fef9c3',
                          color: t.status === 'PAGO' ? '#475569' : '#854d0e'
                        }}>
                          {t.status === 'PAGO' ? (t.tipo === 'RECEITA' ? 'RECEBIDO' : 'PAGO') : 'PENDENTE'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          {t.status === 'PENDENTE' && (
                            <button 
                              onClick={() => marcarPago(t._id)}
                              style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer' }}
                              title="Marcar como Pago/Recebido"
                            >
                              <Check size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => excluir(t._id)}
                            style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer' }}
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Lista de Negócios Fechados (Kanban) */}
      <div className="card" style={{ padding: '1.5rem', background: '#fff', marginTop: '2rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.1rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Check size={20} color="#166534" /> Negócios Fechados (Aguardando Pagamento)
        </h3>
        {negociosFechados.length === 0 ? (
          <p style={{ color: '#64748b' }}>Nenhum negócio aguardando recebimento no momento.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Órgão</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Nº PNCP</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Objeto</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Faturamento Esperado</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {negociosFechados.map((nf: any) => (
                  <tr key={nf._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: '#334155' }}>{nf.orgaoNome}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#64748b' }}>{nf.numeroControlePNCP}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#64748b', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nf.objetoCompra}</td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: '#10b981' }}>
                      {formataMoeda(nf.valorTotalLancado)}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                      <button 
                        onClick={() => darBaixaNegocio(nf._id)}
                        disabled={nf.valorTotalLancado <= 0}
                        style={{ background: nf.valorTotalLancado > 0 ? '#10b981' : '#cbd5e1', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: nf.valorTotalLancado > 0 ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: '0.8rem' }}
                      >
                        Dar Baixa (Recebido)
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lista de Negócios Arquivados */}
      <div className="card" style={{ padding: '1.5rem', background: '#fff', marginTop: '2rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.1rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Wallet size={20} color="#64748b" /> Histórico de Negócios Arquivados
        </h3>
        {negociosArquivados.length === 0 ? (
          <p style={{ color: '#64748b' }}>Nenhum negócio arquivado no histórico.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Órgão</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Nº PNCP</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Objeto</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Faturamento Registrado</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {negociosArquivados.map((na: any) => (
                  <tr key={na._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: '#334155' }}>{na.orgaoNome}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#64748b' }}>{na.numeroControlePNCP}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#64748b', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{na.objetoCompra}</td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: '#64748b' }}>
                      {formataMoeda(na.valorTotalLancado)}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                      <button 
                        onClick={() => estornarNegocio(na._id)}
                        style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                      >
                        Restaurar (Desarquivar)
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
