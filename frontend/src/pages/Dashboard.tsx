import { useEffect, useState } from 'react';
import { Play, TrendingUp, AlertTriangle, FileText, CheckCircle, Clock, RefreshCw, Activity, Bot, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { io } from 'socket.io-client';
import { Link } from 'react-router-dom';
import Countdown from '../components/Countdown';

export default function Dashboard() {
  const [resumo, setResumo] = useState<any>(null);
  const [loadingBot, setLoadingBot] = useState(false);
  const [alertasMonitoramento, setAlertasMonitoramento] = useState<{ id: string, msg: string }[]>([]);
  const [monitoramentoData, setMonitoramentoData] = useState<any>(null);

  const [colunasKanban, setColunasKanban] = useState<{id: string, nome: string}[]>([]);
  const [expandedPregoes, setExpandedPregoes] = useState<string[]>([]);
  
  const togglePregao = (id: string) => {
    setExpandedPregoes(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const carregarResumo = async () => {
    try {
      const [resResumo, resConfig, resMonitoramento] = await Promise.all([
        fetch(`${window.API_URL}/dashboard/resumo`),
        fetch(`${window.API_URL}/configuracoes`),
        fetch(`${window.API_URL}/compras-gov-monitor/latest`).catch(() => null)
      ]);
      
      const dataResumo = await resResumo.json();
      const dataConfig = await resConfig.json();
      
      if (resMonitoramento && resMonitoramento.ok) {
        const dataMonitoramento = await resMonitoramento.json();
        setMonitoramentoData(dataMonitoramento);
      }
      
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
    
    const socket = io(window.API_URL);

    const refresh = () => carregarResumo();

    socket.on('oportunidade_updated', refresh);
    socket.on('oportunidade_deleted', refresh);
    socket.on('cotacao_updated', refresh);
    socket.on('financeiro_updated', refresh);
    socket.on('bot_execution_updated', refresh); // if we ever need it

    socket.on('alerta_monitoramento', (data) => {
      setAlertasMonitoramento(prev => [...prev, { id: Math.random().toString(), msg: data.mensagem }]);
    });
    
    socket.on('monitoramento_concluido', (data: any) => {
      setMonitoramentoData((prev: any) => {
        if (prev && prev.pregoes && data.pregoes) {
          data.pregoes.forEach((newP: any) => {
            const oldP = prev.pregoes.find((p: any) => p.id === newP.id);
            if (oldP) {
              newP.itens.forEach((newI: any) => {
                const oldI = oldP.itens.find((i: any) => i.itemId === newI.itemId);
                if (oldI) {
                  const oldPos = oldI.nossaPosicao || 999;
                  const newPos = newI.nossaPosicao || 999;
                  if (newPos < oldPos && newPos <= 2) {
                    setAlertasMonitoramento(a => [...a, { 
                      id: Math.random().toString(), 
                      msg: `ALERTA: Subimos para o ${newPos}º LUGAR no Pregão ${newP.pregao} (${newI.itemId})!` 
                    }]);
                  }
                }
              });
            }
          });
        }
        return data;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const rodarBot = async () => {
    setLoadingBot(true);
    try {
      await fetch(`${window.API_URL}/bot/run-now`, { method: 'POST' });
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', zIndex: 1, alignItems: 'flex-end' }}>
          {resumo.botEmExecucao && (
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(96, 165, 250, 0.4)', color: '#ffffff', padding: '0.75rem 1.5rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '1rem', fontWeight: 700, boxShadow: '0 10px 25px rgba(0,0,0,0.3), inset 0 0 15px rgba(59, 130, 246, 0.2)' }}>
              <div className="radar-sync-wrapper" style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '0.5rem' }}>
                <RefreshCw size={22} className="spin-animation" color="#60a5fa" /> 
              </div>
              <span className="sync-text-glow" style={{ color: '#93c5fd', letterSpacing: '0.5px' }}>Robô em Sincronização Ativa...</span>
            </div>
          )}
        </div>
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
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* ACOMPANHAMENTO DE PROPOSTAS */}
          <div style={{ background: '#ffffff', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '16px' }}>
                  <TrendingUp size={32} color="#3b82f6" />
                </div>
                <div>
                  <h3 style={{ color: '#0f172a', fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Acompanhamento de Propostas</h3>
                  <p style={{ color: '#475569', margin: 0, fontSize: '1.05rem', fontWeight: 500 }}>Minhas participações ativas e ranking atualizado</p>
                </div>
              </div>
              
              {monitoramentoData?.data && (
                <div style={{ fontSize: '0.85rem', color: '#64748b', background: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '999px', border: '1px solid #e2e8f0' }}>
                  Atualizado: {new Date(monitoramentoData.data).toLocaleTimeString('pt-BR')}
                </div>
              )}
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {(!monitoramentoData?.pregoes || monitoramentoData.pregoes.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b', background: '#f8fafc', borderRadius: '20px', border: '2px dashed #cbd5e1', marginTop: '1rem' }}>
                  <Bot size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
                  <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>Nenhuma proposta processada</p>
                  <p style={{ fontSize: '1rem' }}>Dispare a varredura para extrair o ranking do Compras.gov</p>
                </div>
              ) : (
                (() => {
                  const pregoesOrdenados = [...monitoramentoData.pregoes].map((p: any) => {
                    const validPositions = p.itens.map((i: any) => i.nossaPosicao || 999);
                    const bestPos = Math.min(...validPositions);
                    const bestItem = p.itens.find((i: any) => (i.nossaPosicao || 999) === bestPos);
                    return { ...p, bestPos, bestItem };
                  }).sort((a: any, b: any) => a.bestPos - b.bestPos);
                  
                  return pregoesOrdenados.map((pregao: any) => {
                    const isExpanded = expandedPregoes.includes(pregao.id);
                    
                    let corTexto = '#64748b';
                    if (pregao.bestPos === 1) corTexto = '#16a34a';
                    else if (pregao.bestPos === 2) corTexto = '#ca8a04';
                    else if (pregao.bestPos === 3) corTexto = '#dc2626';
                    else if (pregao.bestPos === 4) corTexto = '#ea580c';
                    else if (pregao.bestPos >= 5 && pregao.bestPos < 999) corTexto = '#2563eb';

                    return (
                      <div key={pregao.id} style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
                        {/* Cabeçalho do Pregão */}
                        <div 
                          onClick={() => togglePregao(pregao.id)}
                          style={{ background: '#f8fafc', padding: '1.25rem 1.5rem', borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              UASG: {pregao.uasg}
                            </div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
                              PREGÃO ELETRÔNICO Nº {pregao.pregao}
                            </div>
                            {pregao.itens.length > 0 && (
                              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: corTexto, marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <AlertTriangle size={16} />
                                {pregao.itens.length} propostas neste pregão. A melhor está em {pregao.bestPos < 999 ? `${pregao.bestPos}º lugar` : 'Posição não encontrada'} ({pregao.bestItem?.itemId || 'Desconhecido'})
                              </div>
                            )}
                          </div>
                          <div>
                            {isExpanded ? <ChevronUp size={24} color="#64748b" /> : <ChevronDown size={24} color="#64748b" />}
                          </div>
                        </div>
                        
                        {/* Lista de Itens do Pregão */}
                        {isExpanded && (
                          <div style={{ padding: '1rem' }}>
                            {[...pregao.itens].sort((a: any, b: any) => (a.nossaPosicao || 999) - (b.nossaPosicao || 999)).map((item: any, idx: number) => {
                              const pos = item.nossaPosicao || 999;
                        let corFundo, corBorda, corTexto, corNumero;
                        if (pos === 1) {
                          corFundo = '#f0fdf4'; corBorda = '#bbf7d0'; corTexto = '#16a34a'; corNumero = '#15803d'; // Verde
                        } else if (pos === 2) {
                          corFundo = '#fefce8'; corBorda = '#fef08a'; corTexto = '#ca8a04'; corNumero = '#a16207'; // Amarelo
                        } else if (pos === 3) {
                          corFundo = '#fef2f2'; corBorda = '#fecaca'; corTexto = '#dc2626'; corNumero = '#b91c1c'; // Vermelho
                        } else if (pos === 4) {
                          corFundo = '#fff7ed'; corBorda = '#fed7aa'; corTexto = '#ea580c'; corNumero = '#c2410c'; // Laranja
                        } else if (pos >= 5 && pos < 999) {
                          corFundo = '#eff6ff'; corBorda = '#bfdbfe'; corTexto = '#2563eb'; corNumero = '#1d4ed8'; // Azul
                        } else {
                          corFundo = '#f8fafc'; corBorda = '#e2e8f0'; corTexto = '#64748b'; corNumero = '#0f172a'; // Cinza (Padrão/Erro)
                        }
                        
                        const desclassificados = item.concorrentesDesclassificados?.length || 0;

                        return (
                          <div key={idx} style={{
                            padding: '1.25rem',
                            borderBottom: idx < pregao.itens.length - 1 ? '1px solid #f1f5f9' : 'none',
                            display: 'grid',
                            gridTemplateColumns: '1fr auto',
                            gap: '1.5rem',
                            alignItems: 'center'
                          }}>
                            {/* Info do Item */}
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <span style={{ background: '#e2e8f0', color: '#475569', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                  {item.itemId || `Item ${idx + 1}`}
                                </span>
                                <span style={{ fontWeight: 700, color: '#1e293b' }}>Participando</span>
                              </div>
                              
                              {/* Explicação da Classificação Detalhada */}
                              <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#475569', lineHeight: '1.5' }}>
                                {item.competidores && item.competidores.length > 0 ? (
                                  (() => {
                                    const empresasNaFrente = item.competidores.filter((c: any) => c.status === 'Ativa').length;
                                    const inabilitadas = item.competidores.filter((c: any) => c.status === 'Inabilitada').length;
                                    const primeiroLugar = item.competidores.find((c: any) => c.status === 'Ativa');
                                    let primeiroNome = 'N/A';
                                    if (primeiroLugar && primeiroLugar.textoBruto) {
                                       const matchNome = primeiroLugar.textoBruto.match(/[A-ZÀ-Ÿ0-9\s\.\-\&]{10,}/);
                                       primeiroNome = matchNome ? matchNome[0].trim() : primeiroLugar.cnpj;
                                    }
                                    
                                    return (
                                      <>
                                        <div>
                                          A empresa se encontra na <strong>posição {pos > 0 && pos < 999 ? pos : 'X'}</strong>.
                                          Tem <strong>{empresasNaFrente}</strong> empresas ativas na sua frente (<strong>{inabilitadas}</strong> desclassificadas/inabilitadas).
                                        </div>
                                        {empresasNaFrente > 0 && primeiroLugar && (
                                          <div style={{ marginTop: '0.25rem' }}>
                                            O atual 1º lugar é: <strong>{primeiroNome}</strong>
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()
                                ) : (
                                  desclassificados > 0 ? (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: '#fef2f2', color: '#b91c1c', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                                      <AlertTriangle size={14} />
                                      {desclassificados} empresa(s) na frente desclassificada(s)
                                    </div>
                                  ) : null
                                )}
                              </div>
                              
                              {/* Sanfonas do Item */}
                              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {['chat', 'proposta', 'anexos', 'faseRecursal', 'diligencias'].map(key => {
                                  const content = item[key] ? item[key] : 'Nenhuma informação disponível.';
                                  const titles: Record<string, string> = {
                                    chat: '💬 Chat',
                                    proposta: '📄 Proposta',
                                    anexos: '📎 Anexos',
                                    faseRecursal: '⚖️ Fase Recursal',
                                    diligencias: '🔍 Diligências'
                                  };
                                  return (
                                    <details key={key} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                      <summary style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#334155', cursor: 'pointer', outline: 'none' }}>
                                        {titles[key]}
                                      </summary>
                                      <div style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569', background: '#fff', borderTop: '1px solid #e2e8f0', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto' }}>
                                        {content}
                                      </div>
                                    </details>
                                  );
                                })}
                              </div>
                            </div>
                            
                            {/* Ranking */}
                            <div style={{ 
                              background: corFundo,
                              border: `2px solid ${corBorda}`,
                              borderRadius: '12px',
                              padding: '1rem',
                              textAlign: 'center',
                              minWidth: '120px',
                              boxShadow: pos <= 3 ? `0 4px 15px -3px ${corBorda}` : 'none'
                            }}>
                              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: corTexto, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                CLASSIFICAÇÃO
                              </span>
                              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.25rem' }}>
                                <span style={{ fontSize: '2.5rem', fontWeight: 900, color: corNumero, lineHeight: 1, marginTop: '0.25rem' }}>
                                  {pos > 0 && pos < 999 ? `${pos}º` : '-'}
                                </span>
                              </div>
                              <span style={{ display: 'block', fontSize: '0.8rem', color: corTexto, marginTop: '0.25rem', fontWeight: 600 }}>
                                {(pos > 1 && pos < 999) ? `${pos - 1} na frente` : (pos === 1 ? 'Líder' : '')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            });
          })()
        )}
        </div>
      </div>

      {/* NEGOCIAÇÕES QUENTES (Radar Crítico original) */}
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
      
      {/* ALERTS OVERLAY */}
      {alertasMonitoramento.length > 0 && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 9999 }}>
          {alertasMonitoramento.map(alerta => (
            <div key={alerta.id} style={{ 
              background: '#0f172a', 
              color: '#fff', 
              padding: '1.5rem', 
              borderRadius: '12px', 
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              maxWidth: '400px',
              borderLeft: alerta.msg.includes('ALERTA') ? '8px solid #ef4444' : '8px solid #3b82f6',
              animation: 'slideIn 0.3s ease-out forwards'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: alerta.msg.includes('ALERTA') ? '#fca5a5' : '#93c5fd' }}>
                  {alerta.msg.includes('ALERTA') ? 'Atenção Crítica' : 'Atualização de Posição'}
                </h4>
                <button 
                  onClick={() => setAlertasMonitoramento(prev => prev.filter(a => a.id !== alerta.id))}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  X
                </button>
              </div>
              <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{alerta.msg}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
