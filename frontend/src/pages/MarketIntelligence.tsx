import { useState, useEffect } from 'react';
import { BrainCircuit, Trophy, Building, TrendingDown, Target, FileWarning } from 'lucide-react';

export default function MarketIntelligence() {
  const [stats, setStats] = useState<any>(null);
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resStats, resModel] = await Promise.all([
        fetch('http://localhost:7010/market/stats'),
        fetch('http://localhost:7010/market/model-info')
      ]);
      setStats(await resStats.json());
      setModelInfo(await resModel.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading || !stats) {
    return <div style={{ padding: '2rem' }}>Carregando dados de inteligência...</div>;
  }

  const taxaSucesso = (stats.vencedoras + stats.perdidas) > 0 
    ? (stats.vencedoras / (stats.vencedoras + stats.perdidas)) * 100 
    : 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <BrainCircuit size={28} color="var(--primary)" />
        <h1 style={{ margin: 0 }}>Inteligência de Mercado</h1>
      </div>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Estatísticas baseadas em seu histórico de atuação, orquestradas pelo módulo de Machine Learning.
      </p>

      {/* Model Info Banner */}
      <div style={{ padding: '1rem', background: modelInfo?.treinado ? '#f0fdf4' : '#fffbeb', border: `1px solid ${modelInfo?.treinado ? '#bbf7d0' : '#fef08a'}`, borderRadius: '8px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {modelInfo?.treinado ? <Target color="#166534" /> : <FileWarning color="#b45309" />}
        <div>
          <h4 style={{ margin: 0, color: modelInfo?.treinado ? '#166534' : '#b45309' }}>
            {modelInfo?.treinado ? 'Modelo Calibrado e Ativo' : 'Calibração Pendente'}
          </h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: modelInfo?.treinado ? '#15803d' : '#d97706' }}>
            {modelInfo?.mensagem} (Amostras usadas: {modelInfo?.amostras_treino})
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
            <Trophy size={18} color="#10b981" /> Taxa Global de Sucesso
          </div>
          <div className="stat-value">{taxaSucesso.toFixed(1)}%</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {stats.vencedoras} Vitórias / {stats.perdidas} Derrotas
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
            <TrendingDown size={18} /> Ticket Médio de Vitória
          </div>
          <div className="stat-value">R$ {stats.ticketMedio?.toLocaleString('pt-BR')}</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
            <Building size={18} /> Total Analisado
          </div>
          <div className="stat-value">{stats.vencedoras + stats.perdidas} Propostas</div>
        </div>
      </div>

      {stats.topOrgaos && stats.topOrgaos.length > 0 && (
        <div className="stat-card" style={{ maxWidth: '600px' }}>
          <h3 style={{ marginBottom: '1rem' }}>Ranking: Órgãos que mais publicam (seu segmento)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {stats.topOrgaos.map((org: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 0', color: '#334155', fontWeight: 500 }}>{org.orgao}</td>
                  <td style={{ padding: '0.75rem 0', textAlign: 'right', color: '#64748b' }}>
                    <span style={{ background: '#e2e8f0', padding: '0.1rem 0.5rem', borderRadius: '12px', fontSize: '0.8rem' }}>
                      {org.count} op
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
