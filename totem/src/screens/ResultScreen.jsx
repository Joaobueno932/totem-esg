import { Component, Suspense, lazy, useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import StepLayout from '../components/StepLayout.jsx';
import { formatKg } from '../emissions/calc.js';
import { legDistanceText, legTitle } from '../flow.js';
import { answerStatus } from '../db.js';
import { onSyncChange, trySync } from '../sync.js';
import { storyTemplateFor } from '../story/templates.js';

// A arte para stories só existe em alguns eventos: o código e as imagens dela são
// baixados sob demanda.
const StoryCard = lazy(() => import('../story/StoryCard.jsx'));

// Se a arte não carregar (ex.: sem internet antes de o app ficar em cache), o
// resultado continua aparecendo — só o cartão some.
class Optional extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Conta de 0 até o valor (só apresentação: o último quadro é exatamente o valor calculado).
function useCountUp(value, duration = 900) {
  const [shown, setShown] = useState(() => (reducedMotion() ? value : 0));
  useEffect(() => {
    if (reducedMotion()) {
      setShown(value);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setShown(p < 1 ? value * (1 - (1 - p) ** 3) : value);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return shown;
}

// Tela final: mostra APENAS a emissão individual do participante.
// Nenhum dado consolidado do evento aparece aqui. Fica na tela até "Finalizar"
// (sem a volta automática do modo totem) e sobrevive a um recarregamento.
export default function ResultScreen({ result, event, online, onFinish }) {
  const { total, transports, local_uuid: localUuid, from } = result;
  const shown = useCountUp(total);
  const destination = [event.city, event.state].filter(Boolean).join('/');
  // compartilhar é só pela arte (cartão abaixo do valor), nos eventos que têm uma
  const story = storyTemplateFor(event);

  return (
    <StepLayout
      screen="result" title="Resultado" pose="comemorando"
      bubble={{
        title: 'Prontinho! Descobrimos sua emissão estimada!',
        text: transports.length > 1 ? `Somei os ${transports.length} trechos do seu deslocamento.` : 'Aqui está o resultado do seu deslocamento.',
      }}
      actions={
        <button type="button" className="btn btn-primary btn-lg" onClick={onFinish}>
          Finalizar <Icon name="check" />
        </button>
      }
    >
      <div className="result-card">
        <p className="result-label"><Icon name="leaf" size={20} /> Sua emissão estimada é de</p>
        <p className="result-value">
          <span aria-hidden="true">{formatKg(shown)}</span>
          <span className="sr-only">{formatKg(total)}</span>
          <span className="result-unit">kg CO₂e</span>
        </p>
      </div>

      {story && (
        <Optional>
          <Suspense fallback={<div className="story-card-skeleton" aria-hidden="true" />}>
            <StoryCard templateId={story.id} result={result} />
          </Suspense>
        </Optional>
      )}

      <p className="note">
        <Icon name="info" size={20} />
        <span>
          É a quantidade estimada de gases de efeito estufa (em CO₂ equivalente) gerada pelo seu
          deslocamento para participar deste evento.
        </span>
      </p>

      <section className="summary" aria-labelledby="summary-title">
        <h2 className="section-title" id="summary-title">Resumo do seu deslocamento</h2>
        {from && destination && (
          <p className="route"><Icon name="route" size={18} /> {from} <span aria-hidden="true">→</span><span className="sr-only">até</span> {destination}</p>
        )}
        <ul className="breakdown">
          {transports.map((t, i) => (
            <li key={i}>
              <span className="leg-icon"><Icon name={t.transport_mode} size={24} strokeWidth={1.8} /></span>
              <span className="leg-text">
                <strong>{legTitle(t)}</strong>
                <small>
                  {legDistanceText(t)}
                  {t.passengers_in_vehicle > 1 && ` · ${t.passengers_in_vehicle} pessoas`}
                </small>
              </span>
              <span className="leg-kg">{formatKg(t.emission_kg_co2e)}<small> kg CO₂e</small></span>
            </li>
          ))}
        </ul>
      </section>

      <p className="edu-note">
        Pequenas escolhas — como carona compartilhada, transporte coletivo ou bicicleta —
        reduzem bastante a pegada de carbono dos seus deslocamentos.
      </p>

      <SyncStatus localUuid={localUuid} online={online} />
    </StepLayout>
  );
}

// Situação do envio desta resposta (fila local → servidor).
function SyncStatus({ localUuid, online }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!localUuid) return undefined;
    let alive = true;
    const refresh = () => answerStatus(localUuid).then((s) => { if (alive) setStatus(s); }).catch(() => {});
    refresh();
    const off = onSyncChange(refresh);
    return () => { alive = false; off(); };
  }, [localUuid]);

  if (status === 'synced') {
    return <p className="sync sync-ok" role="status"><Icon name="cloud-check" size={20} /> Resposta enviada. Obrigado por participar!</p>;
  }
  if (status === 'pending') {
    return (
      <div className="sync sync-pending" role="status">
        <Icon name="clock" size={20} />
        <span>
          {online
            ? 'Sua resposta está salva neste aparelho e está sendo enviada.'
            : 'Sem internet agora. Sua resposta ficou salva neste aparelho e será enviada quando a conexão voltar, com esta página aberta.'}
          {online && <button type="button" className="btn-link btn-inline" onClick={() => trySync()}>Tentar agora</button>}
        </span>
      </div>
    );
  }
  return null;
}
