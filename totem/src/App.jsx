import { useEffect, useRef, useState } from 'react';
import StartScreen from './screens/StartScreen.jsx';
import IdentityForm from './screens/IdentityForm.jsx';
import OriginForm from './screens/OriginForm.jsx';
import TransportForm from './screens/TransportForm.jsx';
import TripDetailsForm from './screens/TripDetailsForm.jsx';
import ResultScreen from './screens/ResultScreen.jsx';
import DoneScreen from './screens/DoneScreen.jsx';
import HeroDecor from './components/Decor.jsx';
import { Eva, usePreloadPoses } from './components/Eva.jsx';
import { Brand, OnlineContext } from './components/StepLayout.jsx';
import { getEventSlug, loadEvent, cleanUrl } from './config.js';
import { newLocalUuid, enqueueAnswer, pendingCount } from './db.js';
import { onSyncChange, trySync } from './sync.js';
import { loadDraft, saveDraft, clearDraft } from './draft.js';
import {
  EMPTY_PARTICIPANT, MAX_LEGS, buildTransports, emptyLeg, participantPayload, withMode,
} from './flow.js';

export default function App() {
  // o evento vem do slug na URL (ex.: totem.app/festa-junina)
  const [eventState, setEventState] = useState({ status: 'loading' });
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const slug = getEventSlug();
    if (!slug) { setEventState({ status: 'no-slug' }); return; }
    loadEvent(slug).then((r) => {
      cleanUrl(); // tira o ?api=... da barra de endereço depois de resolvido
      if (r.event) setEventState({ status: 'ready', event: r.event, offline: r.offline });
      else setEventState({ status: r.error }); // 'not_found' | 'offline'
    });
  }, []);

  const refreshPending = () => pendingCount().then(setPending).catch(() => {});

  useEffect(() => {
    refreshPending();
    const offSync = onSyncChange(refreshPending);
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

  if (eventState.status !== 'ready') {
    return <EventGate status={eventState.status} />;
  }

  return (
    <OnlineContext.Provider value={online}>
      <div className="app">
        {/* key: outro evento = outro fluxo, sem herdar estado nem rascunho */}
        <Flow key={eventState.event.slug} event={eventState.event} online={online} pending={pending} onQueued={refreshPending} />
      </div>
    </OnlineContext.Provider>
  );
}

const hasProgress = (p, legs) =>
  !!(p.name || p.email || p.phone || p.company || p.state || p.consent_lgpd || p.consent_marketing || legs.some((l) => l.mode));

// Jornada do participante: boas-vindas → dados → origem → (transporte → detalhes) por
// trecho → resultado → encerramento. Todo o estado mora aqui, então voltar uma etapa
// nunca perde respostas; o rascunho é salvo a cada mudança.
function Flow({ event, online, pending, onQueued }) {
  const [initial] = useState(() => loadDraft(event));
  const [screen, setScreen] = useState(initial?.screen || 'start');
  const [participant, setParticipant] = useState(initial?.participant || EMPTY_PARTICIPANT);
  const [legs, setLegs] = useState(initial?.legs || [emptyLeg()]);
  const [cur, setCur] = useState(initial?.cur || 0);
  const [result, setResult] = useState(initial?.result || null);
  const [dir, setDir] = useState('forward');
  const [reveal, setReveal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const submittingRef = useRef(false);

  usePreloadPoses();

  // Rascunho: dados em andamento até o envio; depois só o resultado (sem dados pessoais).
  useEffect(() => {
    if (screen === 'done') return;
    if (screen === 'result') {
      if (result) saveDraft(event, { screen, result });
      return;
    }
    if (screen === 'start' && !hasProgress(participant, legs)) return;
    saveDraft(event, { screen, participant, legs, cur });
  }, [event, screen, participant, legs, cur, result]);

  function go(next, direction = 'forward') {
    setDir(direction);
    setReveal(false);
    setSubmitError(null);
    setScreen(next);
  }

  const updateLeg = (i, leg) => setLegs((ls) => ls.map((l, j) => (j === i ? leg : l)));

  function restart() {
    clearDraft();
    setParticipant(EMPTY_PARTICIPANT);
    setLegs([emptyLeg()]);
    setCur(0);
    go('identity');
  }

  function backFromTransport() {
    if (cur === 0) { go('origin', 'back'); return; }
    // trecho novo ainda em branco: voltar desiste dele (não há o que perder)
    if (!legs[cur].mode) setLegs((ls) => ls.filter((_, j) => j !== cur));
    setCur(cur - 1);
    go('details', 'back');
  }

  function addLeg() {
    if (legs.length >= MAX_LEGS) return;
    setLegs((ls) => [...ls, emptyLeg()]);
    setCur(legs.length);
    go('transport');
  }

  function editLeg(i, showErrors) {
    setCur(i);
    go(legs[i].mode ? 'details' : 'transport', i < cur ? 'back' : 'forward');
    setReveal(showErrors);
  }

  function removeLeg(i) {
    setLegs((ls) => ls.filter((_, j) => j !== i));
    if (i < cur) setCur(cur - 1);
  }

  async function submit() {
    if (submittingRef.current) return; // toque duplo não gera duas respostas
    const filled = legs.filter((l) => l.mode);
    if (filled.length === 0) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { transports, total } = buildTransports(filled);
      const localUuid = newLocalUuid();
      const now = new Date().toISOString();
      await enqueueAnswer({
        local_uuid: localUuid,
        event_id: event.id,
        answered_at: now,
        created_at: now,
        participant: participantPayload(participant),
        transports,
      });
      const from = [participant.city, participant.state].filter(Boolean).join('/');
      setResult({ total, transports, local_uuid: localUuid, from });
      // os dados pessoais já estão seguros na fila IndexedDB: saem da memória e do rascunho
      setParticipant(EMPTY_PARTICIPANT);
      setLegs([emptyLeg()]);
      setCur(0);
      go('result');
      onQueued();
      trySync();
    } catch {
      setSubmitError('Não foi possível salvar sua resposta neste aparelho. Tente de novo; se persistir, saia da navegação anônima.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  // "Finalizar": limpa a sessão do participante (LGPD) e agradece
  function finish() {
    clearDraft();
    setResult(null);
    go('done');
  }

  switch (screen === 'result' && !result ? 'start' : screen) {
    case 'identity':
      return (
        <IdentityForm
          participant={participant} onChange={setParticipant} dir={dir}
          onNext={() => go('origin')} onBack={() => go('start', 'back')}
        />
      );
    case 'origin':
      return (
        <OriginForm
          participant={participant} event={event} onChange={setParticipant} dir={dir}
          onNext={() => { setCur(0); go('transport'); }} onBack={() => go('identity', 'back')}
        />
      );
    case 'transport':
      return (
        <TransportForm
          key={cur} leg={legs[cur]} index={cur} dir={dir}
          onSelect={(mode) => updateLeg(cur, withMode(legs[cur], mode))}
          onNext={() => go('details')} onBack={backFromTransport}
        />
      );
    case 'details':
      return (
        <TripDetailsForm
          key={cur} legs={legs} cur={cur} participant={participant} event={event} dir={dir}
          reveal={reveal} submitting={submitting} submitError={submitError}
          onChange={(leg) => updateLeg(cur, leg)}
          onChangeMode={() => go('transport', 'back')}
          onAddLeg={addLeg} onEditLeg={editLeg} onRemoveLeg={removeLeg}
          onSubmit={submit} onBack={() => go('transport', 'back')}
        />
      );
    case 'result':
      return <ResultScreen result={result} event={event} online={online} onFinish={finish} />;
    case 'done':
      return <DoneScreen online={online} pending={pending} onNew={() => go('start')} />;
    default:
      return (
        <StartScreen
          event={event} online={online} pending={pending}
          resuming={hasProgress(participant, legs)}
          onStart={() => go('identity')} onRestart={restart}
        />
      );
  }
}

// Tela mostrada quando o evento não pôde ser carregado do link.
function EventGate({ status }) {
  const messages = {
    'no-slug': {
      title: 'Abra o link do evento',
      text: 'Use o link ou o QR code gerado para o evento (ex.: .../festa-junina).',
    },
    not_found: {
      title: 'Evento não encontrado',
      text: 'Este link não corresponde a nenhum evento. Confira o QR code com a organização.',
    },
    offline: {
      title: 'Sem conexão',
      text: 'Não foi possível carregar o evento e não há dados salvos deste link. Conecte-se à internet uma vez e recarregue.',
    },
  };
  const m = status === 'loading' ? null : messages[status] || messages.offline;
  return (
    <div className="app">
      <div className="step step-gate">
        <header className="hero hero-gate">
          <HeroDecor />
          <div className="hero-top"><Brand /></div>
          {m ? (
            <div className="gate">
              <Eva pose="pensativa" className="gate-eva" priority />
              <div className="gate-card" role="alert">
                <h1>{m.title}</h1>
                <p>{m.text}</p>
              </div>
            </div>
          ) : (
            <div className="gate gate-loading" role="status">
              <span className="spinner spinner-lg" aria-hidden="true" />
              <span>Carregando o evento…</span>
            </div>
          )}
        </header>
      </div>
    </div>
  );
}
