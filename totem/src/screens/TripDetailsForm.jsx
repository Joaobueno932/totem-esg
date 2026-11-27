import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import StepLayout, { BackButton, Field, FieldError, focusFirstError } from '../components/StepLayout.jsx';
import { fuelsForMode } from '../emissions/calc.js';
import {
  MAX_LEGS, MAX_PASSENGERS, estimateFor, fmtKm, legDistanceText, legErrors, legTitle, modeInfo, toApiLeg,
  withRoundTrip,
} from '../flow.js';

const has = (o) => Object.keys(o).length > 0;

// Etapa 4 — detalhes do trecho atual. Só aparecem as perguntas que valem para o modal
// (combustível e ocupantes conforme MODES; bicicleta/a pé não pergunta nada).
// Os outros trechos ficam listados acima/abaixo, para editar ou remover.
export default function TripDetailsForm({
  legs, cur, participant, event, reveal, submitting, submitError,
  onChange, onChangeMode, onAddLeg, onEditLeg, onRemoveLeg, onSubmit, onBack, dir,
}) {
  const leg = legs[cur];
  const info = modeInfo(leg.mode);
  // reveal: aberto pelo "Calcular" porque este trecho estava incompleto
  const [tried, setTried] = useState(reveal);
  const errors = tried ? legErrors(leg) : {};
  const isBike = leg.mode === 'bicicleta_pe';
  const fuels = info?.hasFuel ? fuelsForMode(leg.mode) : [];
  const estimate = estimateFor(participant, event, leg.mode, leg.roundTrip);
  const usingEstimate = estimate > 0 && leg.distance === String(estimate);
  const isLast = cur === legs.length - 1;
  const full = legs.length >= MAX_LEGS;

  const set = (key) => (value) => onChange({ ...leg, [key]: value });
  const describe = (key) => (errors[key] ? `f-${key}-error` : undefined);

  function validateCurrent() {
    const errs = legErrors(leg);
    setTried(true);
    if (has(errs)) {
      focusFirstError(errs, ['fuel', 'distance']);
      return false;
    }
    return true;
  }

  function addLeg() {
    if (full || !validateCurrent()) return;
    onAddLeg();
  }

  function submit(e) {
    e.preventDefault();
    if (submitting || !validateCurrent()) return;
    // outro trecho incompleto (ex.: voltou para corrigir um anterior): abre ele com os erros
    const other = legs.findIndex((l, i) => i !== cur && l.mode && has(legErrors(l)));
    if (other >= 0) {
      onEditLeg(other, true);
      return;
    }
    onSubmit();
  }

  let bubble;
  if (has(errors)) bubble = { title: 'Ops! Falta pouco.', text: 'Confira os campos destacados.' };
  else if (isBike) {
    bubble = { title: 'Que demais!', text: 'Bicicleta ou a pé não emite CO₂. Usou outro transporte também? Adicione mais um trecho.' };
  } else {
    bubble = {
      title: 'Agora me conta um pouquinho sobre sua viagem!',
      text: legs.length > 1 ? `Preencha os detalhes do trecho ${cur + 1}.` : 'Preencha as informações deste trecho.',
    };
  }

  const row = (l, i) => (
    <LegRow key={i} leg={l} index={i} onEdit={() => onEditLeg(i, false)} onRemove={() => onRemoveLeg(i)} />
  );

  return (
    <StepLayout
      screen="details" title="Detalhes da viagem" dir={dir} pose="ideia" onBack={onBack} onSubmit={submit} bubble={bubble}
      actions={<>
        <BackButton onClick={onBack} />
        <button type="submit" className="btn btn-primary" disabled={submitting} aria-busy={submitting}>
          {submitting ? <><span className="spinner" aria-hidden="true" /> Calculando…</> : <>Calcular <Icon name="arrow-right" /></>}
        </button>
      </>}
    >
      {cur > 0 && <ol className="leg-list">{legs.slice(0, cur).map((l, i) => row(l, i))}</ol>}

      <section className="leg-editor" aria-labelledby="leg-editor-title">
        <div className="leg-head">
          <span className="leg-icon"><Icon name={leg.mode} size={28} strokeWidth={1.8} /></span>
          <span className="leg-text">
            <span className="leg-num">Trecho {cur + 1}</span>
            <strong id="leg-editor-title">{info?.label}</strong>
          </span>
          <button type="button" className="btn-chip" onClick={onChangeMode}>Trocar</button>
        </div>

        {isBike ? (
          <p className="note note-zero"><Icon name="leaf" size={22} /> Deslocamento ativo: este trecho não emite CO₂!</p>
        ) : (
          <>
            {info?.hasFuel && (
              <div className={`field${errors.fuel ? ' invalid' : ''}`}>
                <span className="field-label" id="f-fuel-label">
                  <Icon name="fuel" size={18} />
                  <span>Combustível<span className="req" aria-hidden="true"> *</span></span>
                </span>
                <div
                  id="f-fuel" tabIndex={-1} className="chip-grid" role="group"
                  aria-labelledby="f-fuel-label" aria-describedby={describe('fuel')}
                >
                  {fuels.map((f) => (
                    <button
                      key={f.id} type="button" className="chip" aria-pressed={leg.fuel === f.id}
                      onClick={() => set('fuel')(f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                {errors.fuel && <FieldError id="f-fuel-error">{errors.fuel}</FieldError>}
              </div>
            )}

            <div className="field">
              <span className="field-label" id="f-trip-label"><Icon name="repeat" size={18} /><span>Tipo de trajeto</span></span>
              <div className="segmented" role="group" aria-labelledby="f-trip-label">
                <button type="button" aria-pressed={!leg.roundTrip} onClick={() => onChange(withRoundTrip(leg, false, participant, event))}>
                  Somente ida
                </button>
                <button type="button" aria-pressed={leg.roundTrip} onClick={() => onChange(withRoundTrip(leg, true, participant, event))}>
                  Ida e volta
                </button>
              </div>
            </div>

            <Field
              id="f-distance" icon="road" required error={errors.distance}
              label={leg.roundTrip
                ? 'Distância aproximada deste trecho, ida e volta (km)'
                : 'Distância aproximada deste trecho, só a ida (km)'}
            >
              <div className="input-affix">
                <input
                  id="f-distance" className="input" inputMode="decimal" placeholder="Ex.: 25" maxLength={7}
                  value={leg.distance} onChange={(e) => set('distance')(e.target.value)} enterKeyHint="done"
                  aria-required="true" aria-invalid={!!errors.distance} aria-describedby={describe('distance')}
                />
                <span className="affix" aria-hidden="true">km</span>
              </div>
              {estimate > 0 && (
                <button
                  type="button" className="estimate-option" aria-pressed={usingEstimate}
                  onClick={() => set('distance')(String(estimate))}
                >
                  <span className="radio" aria-hidden="true" />
                  <span>
                    <strong>Usar distância estimada: {fmtKm(estimate)} km</strong>
                    <small>{leg.roundTrip ? 'Ida e volta' : 'Só a ida'}, de {participant.city} até {event.city}</small>
                  </span>
                </button>
              )}
              {estimate === 0 && (
                <span className="field-hint">
                  Você saiu de {participant.city}, a mesma cidade do evento: informe quantos km rodou até aqui.
                </span>
              )}
            </Field>

            {info?.hasPassengers && (
              <div className="field">
                <span className="field-label" id="f-passengers-label">
                  <Icon name="users" size={18} /><span>Quantas pessoas no mesmo veículo?</span>
                </span>
                <div className="stepper-row">
                  <div className="stepper" role="group" aria-labelledby="f-passengers-label">
                    <button
                      type="button" aria-label="Menos uma pessoa" disabled={leg.passengers <= 1}
                      onClick={() => set('passengers')(Math.max(1, leg.passengers - 1))}
                    >
                      <Icon name="minus" />
                    </button>
                    <output aria-live="polite">{leg.passengers}</output>
                    <button
                      type="button" aria-label="Mais uma pessoa" disabled={leg.passengers >= MAX_PASSENGERS}
                      onClick={() => set('passengers')(Math.min(MAX_PASSENGERS, leg.passengers + 1))}
                    >
                      <Icon name="plus" />
                    </button>
                  </div>
                  <span className="field-hint">Contando com você</span>
                </div>
              </div>
            )}

            <Field id="f-origin" icon="pin" optional label="De onde você saiu neste trecho?">
              <input
                id="f-origin" className="input" placeholder="Bairro, cidade ou local de partida" maxLength={300}
                value={leg.origin} onChange={(e) => set('origin')(e.target.value)} autoComplete="off"
              />
            </Field>
          </>
        )}
      </section>

      {!isLast && <ol className="leg-list">{legs.slice(cur + 1).map((l, j) => row(l, cur + 1 + j))}</ol>}

      {isLast && (full ? (
        <p className="note"><Icon name="info" size={20} /> Você já adicionou {MAX_LEGS} trechos — o máximo por resposta.</p>
      ) : (
        <div className="add-leg">
          <button type="button" className="btn-add" onClick={addLeg}>
            <Icon name="plus" size={20} /> Adicionar outro trecho
          </button>
          <p className="field-hint">Usou mais de um transporte? Adicione um trecho de cada vez — somamos tudo no final.</p>
        </div>
      ))}

      {submitError && <p className="note note-error" role="alert"><Icon name="info" size={20} /> {submitError}</p>}
    </StepLayout>
  );
}

// Trecho fora de edição: toque para editar, ✕ para remover.
function LegRow({ leg, index, onEdit, onRemove }) {
  const info = modeInfo(leg.mode);
  const incomplete = !leg.mode || has(legErrors(leg));
  const t = incomplete ? null : toApiLeg(leg);
  return (
    <li className="leg-item">
      <button type="button" className="leg-main" onClick={onEdit}>
        <span className="leg-icon"><Icon name={leg.mode || 'outro'} size={24} strokeWidth={1.8} /></span>
        <span className="leg-text">
          <span className="leg-num">Trecho {index + 1}</span>
          <strong>{t ? legTitle(t) : info?.label || 'Escolher transporte'}</strong>
          <small className={incomplete ? 'leg-warn' : ''}>{t ? legDistanceText(t) : 'Incompleto — toque para completar'}</small>
        </span>
        <span className="sr-only">Editar</span>
        <Icon name="pencil" size={18} className="leg-edit" />
      </button>
      <button type="button" className="leg-action" onClick={onRemove} aria-label={`Remover trecho ${index + 1}`}>
        <Icon name="x" size={18} />
      </button>
    </li>
  );
}
