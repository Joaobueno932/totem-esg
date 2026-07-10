export default function StartScreen({ event, onStart, pending, online }) {
  return (
    <div className="screen center">
      {event.image
        ? <img className="event-image" src={event.image} alt={event.name} />
        : <div className="badge-leaf">🌱</div>}
      <h1 className="event-name">{event.name || 'Evento Carbono Zero'}</h1>
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
