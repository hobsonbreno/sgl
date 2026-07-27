import { useState, useEffect } from 'react';
import { BrainCircuit, Trophy, Building, TrendingDown, Target, FileWarning } from 'lucide-react';

export default function MarketIntelligence() {
  const [stats, setStats] = useState<any>(null);
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [botStats, setBotStats] = useState<any>(null);
  const [teamStats, setTeamStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resStats, resModel, resBot, resOps] = await Promise.all([
        fetch('http://192.168.1.16:30010/market/stats'),
        fetch('http://192.168.1.16:30010/market/model-info'),
        fetch('http://192.168.1.16:30000/bot/execucoes?limit=50'),
        fetch('http://192.168.1.16:30000/oportunidades?limit=1000')
      ]);
      setStats(await resStats.json());
      setModelInfo(await resModel.json());
      
      const botData = await resBot.json();
      const opsData = await resOps.json();

      // Bot Performance
      const captadas = botData.reduce((acc: number, curr: any) => acc + (curr.totalNovos || 0), 0);
      const encontradas = botData.reduce((acc: number, curr: any) => acc + (curr.totalEncontrados || 0), 0);
      setBotStats({ captadas, encontradas, execucoes: botData.length });

      // Team Conversion
      const ops = opsData.data || [];
      const descartadas = ops.filter((o: any) => o.kanbanStatus === 'EXCLUIDA').length;
      const aguardando = ops.filter((o: any) => o.kanbanStatus === 'A_FAZER' || !o.kanbanStatus).length;
      const emAndamento = ops.filter((o: any) => o.kanbanStatus !== 'A_FAZER' && o.kanbanStatus !== 'EXCLUIDA').length;
      
      const taxaEngajamento = ops.length > 0 ? (emAndamento / ops.length) * 100 : 0;
      const taxaRejeicao = ops.length > 0 ? (descartadas / ops.length) * 100 : 0;
      
      setTeamStats({ descartadas, aguardando, emAndamento, taxaEngajamento, taxaRejeicao, total: ops.length });

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
        Estatísticas baseadas no histórico do Robô, engajamento da equipe e modelo de Machine Learning.
      </p>

      {/* Team & Bot Performance */}
      {teamStats && botStats && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Target size={20} color="#3b82f6" /> Performance do Robô vs Engajamento da Equipe
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Oportunidades Captadas</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>{botStats.captadas}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Últimas {botStats.execucoes} buscas</div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Taxa de Engajamento</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>{teamStats.taxaEngajamento.toFixed(1)}%</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Movidas p/ Cotação ({teamStats.emAndamento})</div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Taxa de Rejeição</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>{teamStats.taxaRejeicao.toFixed(1)}%</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Descartadas ({teamStats.descartadas})</div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Fila Ociosa (A Fazer)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>{teamStats.aguardando}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Esperando triagem</div>
            </div>
          </div>
        </div>
      )}

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
