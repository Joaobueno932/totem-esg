import { useEffect, useState } from 'react';
import StartScreen from './screens/StartScreen.jsx';
import ParticipantForm from './screens/ParticipantForm.jsx';
import TransportForm from './screens/TransportForm.jsx';
import ResultScreen from './screens/ResultScreen.jsx';
import { getEventSlug, loadEvent } from './config.js';
import { newLocalUuid, enqueueAnswer, pendingCount } from './db.js';
import { onSyncChange, trySync } from './sync.js';
import { computeEmission, CALCULATION_VERSION } from './emissions/calc.js';

const DRAFT_KEY = 'carbono-zero-draft';

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* rascunho corrompido: ignora */ }
  return null;
}

export default function App() {
  // o evento vem do slug na URL (ex.: totem.app/festa-junina)
  const [eventState, setEventState] = useState({ status: 'loading' });

  // rascunho persistido: se a página recarregar no meio do fluxo, o participante não perde o que digitou
  const draft = loadDraft();
  const [step, setStep] = useState(draft?.step || 'start');
  const [participant, setParticipant] = useState(draft?.participant || null);
  const [result, setResult] = useState(null);
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const slug = getEventSlug();
    if (!slug) { setEventState({ status: 'no-slug' }); return; }
    loadEvent(slug).then((r) => {
      if (r.event) setEventState({ status: 'ready', event: r.event, offline: r.offline });
      else setEventState({ status: r.error }); // 'not_found' | 'offline'
    });
  }, []);

  useEffect(() => {
    const refresh = () => pendingCount().then(setPending);
    refresh();
    const offSync = onSyncChange(refresh);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      offSync();
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  function saveDraft(next) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
  }

  function handleStart() {
    setStep('participant');
    saveDraft({ step: 'participant', participant: null });
  }

  function handleParticipant(data) {
    setParticipant(data);
    setStep('transport');
    saveDraft({ step: 'transport', participant: data });
  }

  // recebe os trechos do deslocamento (1 a 6); a emissão da resposta é a soma deles
  async function handleTransport(legs) {
    const transports = legs.map((leg) => ({
      ...leg,
      emission_kg_co2e: computeEmission({
        mode: leg.transport_mode,
        fuelType: leg.fuel_type,
        distanceKm: leg.distance_km,
        roundTrip: leg.round_trip,
        passengers: leg.passengers_in_vehicle,
      }) ?? 0,
      calculation_version: CALCULATION_VERSION,
    }));
    const total = Math.round(transports.reduce((sum, t) => sum + t.emission_kg_co2e, 0) * 10000) / 10000;

    await enqueueAnswer({
      local_uuid: newLocalUuid(),
      event_id: eventState.event.id,
      answered_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      participant,
      transports,
    });

    setResult({ total, transports });
    setStep('result');
    localStorage.removeItem(DRAFT_KEY); // dados já estão seguros na fila IndexedDB
    pendingCount().then(setPending);
    trySync();
  }

  // "Finalizar": limpa a sessão do participante e volta ao início (LGPD)
  function handleFinish() {
    setParticipant(null);
    setResult(null);
    setStep('start');
    localStorage.removeItem(DRAFT_KEY);
  }

  if (eventState.status !== 'ready') {
    return <EventGate status={eventState.status} />;
  }

  return (
    <div className="app">
      {step === 'start' && (
        <StartScreen
          event={eventState.event}
          onStart={handleStart}
          pending={pending}
          online={online}
        />
      )}
      {step === 'participant' && (
        <ParticipantForm initial={participant} onNext={handleParticipant} onBack={handleFinish} />
      )}
      {step === 'transport' && (
        <TransportForm onSubmit={handleTransport} onBack={() => setStep('participant')} />
      )}
      {step === 'result' && <ResultScreen result={result} onFinish={handleFinish} />}
    </div>
  );
}

// Tela mostrada quando o evento não pôde ser carregado do link.
function EventGate({ status }) {
  const messages = {
    loading: { icon: '⏳', title: 'Carregando…', text: '' },
    'no-slug': {
      icon: '🔗', title: 'Abra o link do evento',
      text: 'Use o link/QR gerado para o evento (ex.: .../festa-junina).',
    },
    not_found: {
      icon: '🔍', title: 'Evento não encontrado',
      text: 'Este link não corresponde a nenhum evento. Confira o QR code com a organização.',
    },
    offline: {
      icon: '📡', title: 'Sem conexão',
      text: 'Não foi possível carregar o evento e não há dados salvos deste link. Conecte-se à internet uma vez e recarregue.',
    },
  };
  const m = messages[status] || messages.offline;
  return (
    <div className="app">
      <div className="screen center">
        <div className="badge-leaf">{m.icon}</div>
        <h2>{m.title}</h2>
        {m.text && <p className="intro">{m.text}</p>}
      </div>
    </div>
  );
}
