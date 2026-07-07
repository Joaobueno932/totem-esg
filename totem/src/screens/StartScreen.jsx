import { useRef } from 'react';
import { getConfig } from '../config.js';

export default function StartScreen({ onStart, onSecretConfig, pending, online }) {
  const taps = useRef({ count: 0, last: 0 });
  const { eventName } = getConfig();

  // 7 toques rápidos no canto superior esquerdo abrem a configuração
  function handleSecretTap() {
    const now = Date.now();
    taps.current.count = now - taps.current.last < 1500 ? taps.current.count + 1 : 1;
    taps.current.last = now;
    if (taps.current.count >= 7) {
      taps.current.count = 0;
      onSecretConfig();
    }
  }

  return (
    <div className="screen center">
      <button className="secret-corner" onClick={handleSecretTap} aria-hidden="true" tabIndex={-1} />

      <div className="badge-leaf">🌱</div>
      <h1 className="event-name">{eventName || 'Evento Carbono Zero'}</h1>
      <p className="intro">
        Descubra em menos de 1 minuto a emissão estimada de CO₂e
        do seu deslocamento até este evento.
      </p>
      <button className="btn-primary btn-xl" onClick={onStart}>Começar</button>

      <div className="status-bar">
        <span className={online ? 'dot dot-on' : 'dot dot-off'} />
        {online ? 'Conectado' : 'Sem internet — suas respostas ficam salvas no totem'}
        {pending > 0 && <span className="pending-chip">{pending} aguardando envio</span>}
      </div>
    </div>
  );
}
