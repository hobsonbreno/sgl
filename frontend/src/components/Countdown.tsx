import { useEffect, useState } from 'react';
import { AlertTriangle, Timer } from 'lucide-react';

const Countdown = ({ targetDate, onExpire, suffixMessage }: { targetDate: string, onExpire?: () => void, suffixMessage?: string }) => {
  const [timeLeft, setTimeLeft] = useState({ dias: 0, horas: 0, minutos: 0, segundos: 0, expirado: false });
  const [hasNotified, setHasNotified] = useState(false);

  useEffect(() => {
    const calc = () => {
      if (!targetDate) return { dias: 0, horas: 0, minutos: 0, segundos: 0, expirado: true };
      const diff = new Date(targetDate).getTime() - new Date().getTime();
      if (diff <= 0) return { dias: 0, horas: 0, minutos: 0, segundos: 0, expirado: true };
      return {
        dias: Math.floor(diff / (1000 * 60 * 60 * 24)),
        horas: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutos: Math.floor((diff / 1000 / 60) % 60),
        segundos: Math.floor((diff / 1000) % 60),
        expirado: false
      };
    };
    
    setTimeLeft(calc());
    const interval = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  useEffect(() => {
    if (timeLeft.expirado && onExpire && !hasNotified) {
      setHasNotified(true);
      onExpire();
    }
  }, [timeLeft.expirado, onExpire, hasNotified]);

  if (timeLeft.expirado) {
    return (
      <span style={{ color: '#b91c1c', fontWeight: 'bold', fontSize: '0.75rem', background: '#fee2e2', border: '1px solid #fecaca', padding: '0.1rem 0.4rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.3rem', width: 'fit-content', marginBottom: '0.25rem' }}>
        <AlertTriangle size={14} /> Expirado {suffixMessage ? `- ${suffixMessage}` : ''}
      </span>
    );
  }

  const isCritical = timeLeft.dias === 0 && timeLeft.horas === 0 && timeLeft.minutos <= 15;
  const isWarning = timeLeft.dias <= 2;

  const bg = isCritical ? '#fee2e2' : isWarning ? '#ffedd5' : '#dcfce7';
  const color = isCritical ? '#b91c1c' : isWarning ? '#c2410c' : '#15803d';
  const border = isCritical ? '#fecaca' : isWarning ? '#fed7aa' : '#bbf7d0';
  
  let text = '';
  if (timeLeft.dias > 0) text += `${timeLeft.dias}d `;
  if (timeLeft.horas > 0 || timeLeft.dias > 0) text += `${String(timeLeft.horas).padStart(2, '0')}h `;
  text += `${String(timeLeft.minutos).padStart(2, '0')}m ${String(timeLeft.segundos).padStart(2, '0')}s`;

  return (
    <span style={{ color: color, fontWeight: 'bold', fontSize: '0.75rem', background: bg, border: `1px solid ${border}`, padding: '0.1rem 0.4rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.3rem', width: 'fit-content', marginBottom: '0.25rem' }}>
      <Timer size={14} /> Faltam {text} {suffixMessage ? `- ${suffixMessage}` : ''}
    </span>
  );
};

export default Countdown;
