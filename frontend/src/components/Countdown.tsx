import { useEffect, useState } from 'react';
import { AlertTriangle, Timer } from 'lucide-react';

const Countdown = ({ targetDate, onExpire }: { targetDate: string, onExpire?: () => void }) => {
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
      <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#dc2626', padding: '0.4rem 0.8rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.4rem', width: 'fit-content' }}>
        <AlertTriangle size={14} /> Expirado
      </span>
    );
  }

  const isCritical = timeLeft.dias === 0 && timeLeft.horas === 0 && timeLeft.minutos <= 15;
  const isWarning = timeLeft.dias <= 2;

  const bg = isCritical ? '#ef4444' : isWarning ? '#fef2f2' : '#fffbeb';
  const color = isCritical ? '#ffffff' : isWarning ? '#dc2626' : '#d97706';
  
  let text = '';
  if (timeLeft.dias > 0) text += `${timeLeft.dias}d `;
  if (timeLeft.horas > 0 || timeLeft.dias > 0) text += `${String(timeLeft.horas).padStart(2, '0')}h `;
  text += `${String(timeLeft.minutos).padStart(2, '0')}m ${String(timeLeft.segundos).padStart(2, '0')}s`;

  return (
    <span style={{ color: color, fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', background: bg, padding: '0.4rem 0.8rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.4rem', width: 'fit-content', marginBottom: '0.5rem' }}>
      <Timer size={14} /> Faltam {text}
    </span>
  );
};

export default Countdown;
