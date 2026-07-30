export default function StartScreen({ event, onStart }) {
  const place = [event.city, event.state].filter(Boolean).join('/') || event.location;

  return (
    <div className="screen center">
      <img className="brand-logo" src="/logo.svg" alt="EcoTrajeto" />

      {event.image
        ? <img className="event-image" src={event.image} alt={event.name} />
        : <div className="badge-leaf">🌿</div>}

      <h1 className="event-name">{event.name || 'Evento'}</h1>

      {(place || event.venue || event.organizer_name) && (
        <div className="event-meta">
          {event.venue && <span className="pill">🏟️ {event.venue}</span>}
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
    </div>
  );
}
