import Icon from '../components/Icon.jsx';
import HeroDecor from '../components/Decor.jsx';
import { EvaGuide } from '../components/Eva.jsx';
import { Brand } from '../components/StepLayout.jsx';

// Abertura do evento: tudo aqui vem do evento do link (nome, local, organizador,
// imagem e descrição) — nada fixo de um evento específico.
export default function StartScreen({ event, onStart, onRestart, resuming, online, pending }) {
  const place = [event.city, event.state].filter(Boolean).join('/') || event.location;

  return (
    <div className="step step-start">
      <header className="hero hero-welcome">
        <HeroDecor />
        <div className="hero-top"><Brand /></div>
        <EvaGuide
          variant="guide-welcome" pose="acenando"
          title="Oi! Eu sou a Eva!"
          text="Vamos descobrir a pegada de carbono da sua viagem?"
        />
      </header>

      <main className="sheet sheet-welcome">
        <div className="sheet-body">
          <span className="tag-event"><Icon name="leaf" size={14} /> Evento</span>

          {event.image && <img className="event-image" src={event.image} alt={event.name} />}

          <h1 className="event-name">{event.name || 'Evento'}</h1>

          {(place || event.venue || event.organizer_name) && (
            <div className="event-meta">
              {event.venue && <span className="pill"><Icon name="flag" size={16} />{event.venue}</span>}
              {place && <span className="pill"><Icon name="pin" size={16} />{place}</span>}
              {event.organizer_name && <span className="pill"><Icon name="building" size={16} />{event.organizer_name}</span>}
            </div>
          )}

          <p className="intro">
            {event.description
              ? event.description
              : 'Descubra em menos de 1 minuto a emissão estimada de CO₂e do seu deslocamento até este evento.'}
          </p>

          <span className="time-chip"><Icon name="clock" size={16} /> Leva cerca de 1 minuto</span>
        </div>

        <div className="actions actions-stack">
          <button type="button" className="btn btn-primary btn-lg" onClick={onStart}>
            {resuming ? 'Continuar de onde parei' : 'Começar'} <Icon name="arrow-right" />
          </button>
          {resuming && (
            <button type="button" className="btn-link" onClick={onRestart}>
              <Icon name="refresh" size={18} /> Começar do zero
            </button>
          )}
          <StatusLine online={online} pending={pending} />
        </div>
      </main>
    </div>
  );
}

// Estado da conexão e da fila local (o mesmo aviso do rodapé antigo do totem).
export function StatusLine({ online, pending }) {
  return (
    <p className="status-line" role="status">
      <span className={online ? 'dot dot-on' : 'dot dot-off'} />
      {online ? 'Conectado' : 'Sem internet — suas respostas ficam salvas'}
      {pending > 0 && <span className="pending-chip">{pending} aguardando envio</span>}
    </p>
  );
}
