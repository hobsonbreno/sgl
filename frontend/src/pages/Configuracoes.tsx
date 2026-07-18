import { useState, useEffect } from 'react';
import { Settings, Clock, Save } from 'lucide-react';

export default function Configuracoes() {
  const [horario, setHorario] = useState('06:00');
  const [ultimaExecucao, setUltimaExecucao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });

  useEffect(() => {
    carregarConfig();
  }, []);

  const carregarConfig = async () => {
    try {
      const res = await fetch('http://localhost:7005/configuracoes');
      const data = await res.json();
      if (data) {
        setHorario(data.horarioBuscaBot || '06:00');
        setUltimaExecucao(data.ultimaExecucaoAutomaticaData || 'Ainda não rodou automaticamente');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const salvarHorario = async () => {
    setSalvando(true);
    setMensagem({ texto: '', tipo: '' });
    try {
      const res = await fetch('http://localhost:7005/configuracoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ horarioBuscaBot: horario })
      });
      
      if (res.ok) {
        setMensagem({ texto: 'Horário salvo e atualizado com sucesso!', tipo: 'success' });
      } else {
        const error = await res.json();
        setMensagem({ texto: error.message || 'Erro ao salvar o horário.', tipo: 'error' });
      }
    } catch (e) {
      console.error(e);
      setMensagem({ texto: 'Erro de conexão.', tipo: 'error' });
    }
    setSalvando(false);
  };

  const formatDate = (dateString: string) => {
    if (!dateString || !dateString.includes('-')) return dateString;
    const [yyyy, mm, dd] = dateString.split('-');
    return `${dd}/${mm}/${yyyy}`;
  };

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <Settings size={28} color="var(--primary)" />
        <h1 style={{ margin: 0 }}>Configurações do Robô</h1>
      </div>

      <div className="card" style={{ padding: '2rem', marginBottom: '2rem', background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={20} /> Agendamento Diário
        </h3>
        
        <div className="form-group">
          <label>Horário da Busca Automática</label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input 
              type="time" 
              className="form-control" 
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
              style={{ width: '150px' }}
            />
            <button 
              className="btn-primary" 
              onClick={salvarHorario} 
              disabled={salvando}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Save size={18} /> {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        {mensagem.texto && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem', 
            borderRadius: '4px', 
            backgroundColor: mensagem.tipo === 'success' ? '#dcfce7' : '#fee2e2',
            color: mensagem.tipo === 'success' ? '#166534' : '#991b1b'
          }}>
            {mensagem.texto}
          </div>
        )}

        <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem', lineHeight: '1.5' }}>
            <strong>Recuperação de Busca:</strong> O sistema também roda automaticamente assim que você liga o servidor, caso a busca do dia ainda não tenha sido feita. Então não se preocupe se ligar o computador depois do horário configurado.
          </p>
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#64748b' }}>
            <strong>Última busca automática:</strong> {formatDate(ultimaExecucao)}
          </div>
        </div>
      </div>
    </div>
  );
}
