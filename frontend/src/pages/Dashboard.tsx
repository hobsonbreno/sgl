import { useEffect, useState } from 'react';
import { Play, TrendingUp, AlertTriangle, FileText, CheckCircle, Clock, RefreshCw, Activity, Bot, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Countdown from '../components/Countdown';

export default function Dashboard() {
  const [resumo, setResumo] = useState<any>(null);
  const [loadingBot, setLoadingBot] = useState(false);

  const [colunasKanban, setColunasKanban] = useState<{id: string, nome: string}[]>([]);

  const carregarResumo = async () => {
    try {
      const [resResumo, resConfig] = await Promise.all([
        fetch('http://localhost:7005/dashboard/resumo'),
        fetch('http://localhost:7005/configuracoes')
      ]);
      const dataResumo = await resResumo.json();
      const dataConfig = await resConfig.json();
      
      setResumo(dataResumo);
      if (dataConfig && dataConfig.colunasKanban) {
        setColunasKanban(dataConfig.colunasKanban);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    carregarResumo();
    const eventSource = new EventSource('http://localhost:7005/dashboard/stream');
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'update') {
          carregarResumo();
        }
      } catch (e) {
        console.error(e);
      }
    };
    return () => eventSource.close();
  }, []);

  const rodarBot = async () => {
    setLoadingBot(true);
    try {
      await fetch('http://localhost:7005/bot/run-now', { method: 'POST' });
      await carregarResumo();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBot(false);
    }
  };

  if (!resumo) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1.5rem', color: '#1e293b' }}>
      <Activity size={56} className="spin-animation" color="#2563eb" />
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Iniciando o Painel de Comando...</h2>
    </div>
  );

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'A_FAZER': return { label: 'Em Fila', icon: <FileText size={24} color="#3b82f6" />, accent: '#3b82f6', bgIcon: '#eff6ff' };
      case 'FAZENDO': return { label: 'Em Andamento', icon: <TrendingUp size={24} color="#f59e0b" />, accent: '#f59e0b', bgIcon: '#fffbeb' };
      case 'AGUARDANDO_RESPOSTA': return { label: 'Aguardando', icon: <Clock size={24} color="#8b5cf6" />, accent: '#8b5cf6', bgIcon: '#f5f3ff' };
      case 'FEITO': return { label: 'Concluído', icon: <CheckCircle size={24} color="#10b981" />, accent: '#10b981', bgIcon: '#f0fdf4' };
      default: return { label: status, icon: <Activity size={24} color="#64748b" />, accent: '#64748b', bgIcon: '#f8fafc' };
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
      
      {/* HEADER PREMIUM BLACK */}
      <div style={{ 
        marginBottom: '2.5rem', 
        padding: '3rem', 
        background: '#0f172a', 
        borderRadius: '24px',
        color: '#ffffff',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ color: '#ffffff', fontSize: '2.8rem', marginBottom: '0.75rem', fontWeight: 900, letterSpacing: '-1px' }}>Painel de Comando Executivo</h1>
          <p style={{ color: '#e2e8f0', fontSize: '1.2rem', maxWidth: '650px', lineHeight: 1.6, fontWeight: 400 }}>
            Monitoramento financeiro e controle absoluto das licitações e captações em andamento.
          </p>
        </div>
        
        {/* Subtle geometric light reflections */}
        <div style={{ position: 'absolute', right: '0%', top: '0%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(15,23,42,0) 70%)', borderRadius: '50%', transform: 'translate(20%, -30%)' }}></div>
        <div style={{ position: 'absolute', right: '25%', bottom: '0%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(15,23,42,0) 70%)', borderRadius: '50%', transform: 'translate(0%, 40%)' }}></div>

        {resumo.botEmExecucao && (
          <div style={{ zIndex: 1, background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#ffffff', padding: '1rem 2rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <RefreshCw size={24} className="spin-animation" color="#60a5fa" /> 
            Robô Ativo e Sincronizando...
          </div>
        )}
      </div>
      
      {/* CARDS DO KANBAN */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        {colunasKanban.length > 0 ? (
          colunasKanban.map((coluna) => {
            const status = coluna.id;
            const nome = coluna.nome;
            const count = resumo.porStatus[status] || 0;
            const config = getStatusConfig(status);
            const valor = resumo.valorTotalPorStatus[status] || 0;
            return (
              <div key={status} style={{ 
                background: '#ffffff', 
                border: '1px solid #e2e8f0',
                padding: '2rem', 
                borderRadius: '24px', 
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.02)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'default',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0,0,0,0.15)'; e.currentTarget.style.borderColor = config.accent; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: config.accent }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', color: '#1e293b', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{nome}</h3>
                  <div style={{ background: config.bgIcon, padding: '0.75rem', borderRadius: '16px' }}>
                    {config.icon}
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: '3.5rem', fontWeight: 900, color: '#0f172a', margin: '0 0 1rem 0', lineHeight: 1, letterSpacing: '-2px' }}>{count}</p>
                  <div style={{ alignItems: 'center', color: '#334155', fontWeight: 700, fontSize: '1.1rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.6rem 1rem', borderRadius: '12px', display: 'inline-flex' }}>
                    R$ {valor.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          Object.entries(resumo.porStatus).map(([status, count]: [string, any]) => {
            const config = getStatusConfig(status);
            const valor = resumo.valorTotalPorStatus[status] || 0;
            return (
              <div key={status} style={{ 
                background: '#ffffff', 
                border: '1px solid #e2e8f0',
                padding: '2rem', 
                borderRadius: '24px', 
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.02)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'default',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0,0,0,0.15)'; e.currentTarget.style.borderColor = config.accent; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: config.accent }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', color: '#1e293b', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{config.label}</h3>
                  <div style={{ background: config.bgIcon, padding: '0.75rem', borderRadius: '16px' }}>
                    {config.icon}
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: '3.5rem', fontWeight: 900, color: '#0f172a', margin: '0 0 1rem 0', lineHeight: 1, letterSpacing: '-2px' }}>{count}</p>
                  <div style={{ alignItems: 'center', color: '#334155', fontWeight: 700, fontSize: '1.1rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.6rem 1rem', borderRadius: '12px', display: 'inline-flex' }}>
                    R$ {valor.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 450px', gap: '2.5rem' }}>
        
        {/* NEGOCIAÇÕES QUENTES */}
        <div style={{ background: '#ffffff', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
            <div style={{ background: '#fef2f2', padding: '1rem', borderRadius: '16px' }}>
              <AlertTriangle size={32} color="#dc2626" />
            </div>
            <div>
              <h3 style={{ color: '#0f172a', fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Radar Crítico</h3>
              <p style={{ color: '#475569', margin: 0, fontSize: '1.05rem', fontWeight: 500 }}>Propostas exigindo atenção imediata</p>
            </div>
          </div>
          
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {resumo.prazosCriticos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '5rem 2rem', color: '#334155', background: '#f8fafc', borderRadius: '20px', border: '2px dashed #cbd5e1' }}>
                <CheckCircle size={64} color="#10b981" style={{ marginBottom: '1.5rem' }} />
                <p style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>Cenário Controlado</p>
                <p style={{ fontSize: '1.1rem', color: '#475569' }}>Nenhum prazo prestes a vencer neste momento.</p>
              </div>
            ) : null}
            
            {resumo.prazosCriticos.map((op: any) => {
              const diasRestantes = Math.ceil((new Date(op.dataEncerramentoProposta).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
              const isUrgent = diasRestantes <= 2;
              
              return (
                <li key={op._id}>
                  <Link to={`/oportunidades/${op._id}`} style={{ 
                    textDecoration: 'none', 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.75rem', 
                    background: '#ffffff', 
                    border: `2px solid ${isUrgent ? '#fca5a5' : '#fde68a'}`,
                    borderLeft: `8px solid ${isUrgent ? '#ef4444' : '#f59e0b'}`,
                    borderRadius: '16px', 
                    color: 'inherit',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = `0 10px 25px -5px ${isUrgent ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'}`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.02)'; }}
                  >
                    <div style={{ flex: 1, paddingRight: '2rem' }}>
                      <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.3rem', display: 'block', marginBottom: '0.75rem' }}>{op.orgaoNome}</span>
                      <div style={{ fontSize: '1rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                        <Clock size={18} color={isUrgent ? '#dc2626' : '#d97706'} /> 
                        Prazo: {new Date(op.dataEncerramentoProposta).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem', minWidth: '180px' }}>
                      <Countdown targetDate={op.dataEncerramentoProposta} />
                      <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.4rem' }}>
                        R$ {op.valorTotalEstimado?.toLocaleString('pt-BR', {minimumFractionDigits:2}) || '0,00'}
                      </span>
                    </div>
                    <ChevronRight size={24} color="#94a3b8" style={{ marginLeft: '1rem' }} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* CONTROLE DO BOT */}
        <div style={{ background: '#ffffff', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem', paddingBottom: '2rem', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '16px', color: '#fff' }}>
              <Bot size={36} />
            </div>
            <div>
              <h3 style={{ color: '#0f172a', fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Automação PNCP</h3>
              <p style={{ color: '#475569', fontSize: '1.05rem', margin: 0, fontWeight: 500 }}>Motor de Busca e Inteligência</p>
            </div>
          </div>
          
          <div style={{ flex: 1 }}>
            {resumo.ultimaExecucaoBot ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#475569', fontSize: '1.05rem', fontWeight: 600 }}>Sincronizado em:</span>
                  <strong style={{ color: '#0f172a', fontSize: '1.1rem' }}>{new Date(resumo.ultimaExecucaoBot.dataExecucao).toLocaleString('pt-BR')}</strong>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div style={{ background: '#f0fdf4', padding: '2rem 1rem', borderRadius: '20px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '3.5rem', fontWeight: 900, color: '#16a34a', lineHeight: 1, letterSpacing: '-1px' }}>{resumo.ultimaExecucaoBot.totalNovos}</span>
                    <span style={{ fontSize: '0.95rem', color: '#15803d', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px', marginTop: '0.75rem', display: 'block' }}>Novas Descobertas</span>
                  </div>
                  
                  <div style={{ background: resumo.ultimaExecucaoBot.erros.length > 0 ? '#fef2f2' : '#f8fafc', padding: '2rem 1rem', borderRadius: '20px', border: `1px solid ${resumo.ultimaExecucaoBot.erros.length > 0 ? '#fecaca' : '#e2e8f0'}`, textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '3.5rem', fontWeight: 900, color: resumo.ultimaExecucaoBot.erros.length > 0 ? '#dc2626' : '#64748b', lineHeight: 1, letterSpacing: '-1px' }}>{resumo.ultimaExecucaoBot.erros.length}</span>
                    <span style={{ fontSize: '0.95rem', color: resumo.ultimaExecucaoBot.erros.length > 0 ? '#b91c1c' : '#475569', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px', marginTop: '0.75rem', display: 'block' }}>Falhas</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#334155', padding: '4rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                <Clock size={56} color="#94a3b8" />
                <span style={{ fontSize: '1.3rem', fontWeight: 600 }}>Nenhuma varredura registrada no sistema.</span>
              </div>
            )}
          </div>
          
          <button 
            onClick={rodarBot} 
            disabled={loadingBot || resumo.botEmExecucao}
            style={{ 
              marginTop: '3rem', 
              width: '100%', 
              padding: '1.5rem', 
              background: (loadingBot || resumo.botEmExecucao) ? '#cbd5e1' : '#0f172a', 
              color: '#ffffff', 
              border: 'none', 
              borderRadius: '16px', 
              cursor: (loadingBot || resumo.botEmExecucao) ? 'not-allowed' : 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '1rem',
              fontWeight: 800,
              fontSize: '1.2rem',
              boxShadow: (loadingBot || resumo.botEmExecucao) ? 'none' : '0 10px 25px -5px rgba(15, 23, 42, 0.4)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
            onMouseEnter={e => { if(!loadingBot && !resumo.botEmExecucao) e.currentTarget.style.transform = 'translateY(-4px)' }}
            onMouseLeave={e => { if(!loadingBot && !resumo.botEmExecucao) e.currentTarget.style.transform = 'none' }}
          >
            {(loadingBot || resumo.botEmExecucao) ? (
              <><RefreshCw size={28} className="spin-animation" /> Sistema Trabalhando...</>
            ) : (
              <><Play size={28} fill="currentColor" /> Disparar Varredura Automática</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
