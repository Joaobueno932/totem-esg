import { useEffect, useState } from 'react';
import StartScreen from './screens/StartScreen.jsx';
import ParticipantForm from './screens/ParticipantForm.jsx';
import TransportForm from './screens/TransportForm.jsx';
import ResultScreen from './screens/ResultScreen.jsx';
import ConfigScreen from './screens/ConfigScreen.jsx';
import { isConfigured } from './config.js';
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
  const wantsConfig = new URLSearchParams(window.location.search).has('config');
  const [showConfig, setShowConfig] = useState(wantsConfig || !isConfigured());

  // rascunho persistido: se a página recarregar no meio do fluxo, o participante não perde o que digitou
  const draft = loadDraft();
  const [step, setStep] = useState(draft?.step || 'start');
  const [participant, setParticipant] = useState(draft?.participant || null);
  const [result, setResult] = useState(null);
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);

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

    const cfg = JSON.parse(localStorage.getItem('carbono-zero-totem-config'));
    await enqueueAnswer({
      local_uuid: newLocalUuid(),
      event_id: Number(cfg.eventId),
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

  if (showConfig) {
    return <ConfigScreen onDone={() => { setShowConfig(false); window.history.replaceState({}, '', window.location.pathname); }} />;
  }

  return (
    <div className="app">
      {step === 'start' && (
        <StartScreen
          onStart={handleStart}
          onSecretConfig={() => setShowConfig(true)}
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
