export default function StartScreen({ event, onStart, pending, online }) {
  const place = [event.city, event.state].filter(Boolean).join('/') || event.location;

  return (
    <div className="screen center">
      <div className="brand-badge">
        <img src="/logo.png" alt="EcoTrajeto" />
      </div>

      {event.image
        ? <img className="event-image" src={event.image} alt={event.name} />
        : <div className="badge-leaf">🌿</div>}

      <h1 className="event-name">{event.name || 'Evento'}</h1>

      {(place || event.organizer_name) && (
        <div className="event-meta">
          {place && <span className="pill">📍 {place}</span>}
          {event.organizer_name && <span className="pill">🏛️ {event.organizer_name}</span>}
        </div>
      )}

      <p className="intro">
        {event.description
          ? event.description
          : 'Descubra em menos de 1 minuto a emissão estimada de CO₂e do seu deslocamento até este evento.'}
      </p>

      <button className="btn-primary btn-xl" onClick={onStart}>Começar →</button>

      <div className="status-bar">
        <span className={online ? 'dot dot-on' : 'dot dot-off'} />
        {online ? 'Conectado' : 'Sem internet — suas respostas ficam salvas'}
        {pending > 0 && <span className="pending-chip">{pending} aguardando envio</span>}
      </div>
    </div>
  );
}
