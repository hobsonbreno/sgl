import { useState, useEffect } from 'react';
import { Settings, Clock, Save, Plus, Trash2 } from 'lucide-react';

export default function Configuracoes() {
  const [horarios, setHorarios] = useState<string[]>(['08:00', '12:00', '18:00']);
  const [ultimaExecucao, setUltimaExecucao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });

  useEffect(() => {
    carregarConfig();
  }, []);

  const carregarConfig = async () => {
    try {
      const res = await fetch(`${window.API_URL}/configuracoes`);
      const data = await res.json();
      if (data) {
        if (data.horariosBuscaBot && data.horariosBuscaBot.length > 0) {
          setHorarios(data.horariosBuscaBot);
        } else if (data.horarioBuscaBot) {
          setHorarios([data.horarioBuscaBot]);
        }
        setUltimaExecucao(data.ultimaExecucaoAutomaticaData || 'Ainda não rodou automaticamente');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const salvarHorarios = async () => {
    setSalvando(true);
    setMensagem({ texto: '', tipo: '' });
    try {
      const res = await fetch(`${window.API_URL}/configuracoes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ horariosBuscaBot: horarios.filter(h => h.trim() !== '') })
      });
      
      if (res.ok) {
        setMensagem({ texto: 'Horários salvos e atualizados com sucesso!', tipo: 'success' });
      } else {
        const error = await res.json();
        setMensagem({ texto: error.message || 'Erro ao salvar os horários.', tipo: 'error' });
      }
    } catch (e) {
      console.error(e);
      setMensagem({ texto: 'Erro de conexão.', tipo: 'error' });
    }
    setSalvando(false);
  };

  const addHorario = () => {
    setHorarios([...horarios, '12:00']);
  };

  const removeHorario = (index: number) => {
    const newHorarios = [...horarios];
    newHorarios.splice(index, 1);
    setHorarios(newHorarios);
  };

  const updateHorario = (index: number, value: string) => {
    const newHorarios = [...horarios];
    newHorarios[index] = value;
    setHorarios(newHorarios);
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
          <Clock size={20} /> Agendamentos Diários (Disparos Múltiplos)
        </h3>
        
        <div className="form-group">
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#64748b' }}>Adicione quantos horários desejar para a busca do robô:</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {horarios.map((horario, index) => (
              <div key={index} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input 
                  type="time" 
                  className="form-control" 
                  value={horario}
                  onChange={(e) => updateHorario(index, e.target.value)}
                  style={{ width: '150px' }}
                />
                <button 
                  className="btn-danger" 
                  onClick={() => removeHorario(index)} 
                  title="Remover Horário"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button 
                className="btn-secondary" 
                onClick={addHorario}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', color: '#334155' }}
              >
                <Plus size={16} /> Adicionar Horário
              </button>
              <button 
                className="btn-primary" 
                onClick={salvarHorarios} 
                disabled={salvando}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Save size={18} /> {salvando ? 'Salvando...' : 'Salvar Todos'}
              </button>
            </div>
          </div>
        </div>

        {mensagem.texto && (
          <div style={{ 
            marginTop: '1.5rem', 
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
            <strong>Recuperação de Busca:</strong> O sistema também roda automaticamente assim que você liga o servidor, caso a busca do dia ainda não tenha sido feita em nenhum horário. Então não se preocupe se ligar o computador no meio do dia.
          </p>
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#64748b' }}>
            <strong>Última busca automática:</strong> {formatDate(ultimaExecucao)}
          </div>
        </div>
      </div>
    </div>
  );
}
