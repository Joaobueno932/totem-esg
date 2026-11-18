import { useState } from 'react';
import { MODES, fuelsForMode } from '../emissions/calc.js';
import { estimateDistanceKm } from '../emissions/distance.js';

// Trechos por resposta — mesmo limite validado pelo backend em routes/sync.js
export const MAX_LEGS = 6;

const emptyDraft = () => ({ mode: null, fuel: '', distance: '', roundTrip: true, passengers: 1, origin: '' });

const MODE_LABEL = Object.fromEntries(MODES.map((m) => [m.id, m.label]));
const MODE_ICON = Object.fromEntries(MODES.map((m) => [m.id, m.icon]));

export default function TransportForm({ participant, event, onSubmit, onBack }) {
  // trechos já confirmados (ex.: ônibus até o aeroporto → avião → táxi até o evento)
  const [legs, setLegs] = useState([]);
  const [draft, setDraft] = useState(emptyDraft());
  const [errors, setErrors] = useState({});

  const modeInfo = MODES.find((m) => m.id === draft.mode);
  const fuels = draft.mode && modeInfo?.hasFuel ? fuelsForMode(draft.mode) : [];
  const full = legs.length >= MAX_LEGS;

  // sugestão: cidade de origem (passo 1) → cidade do evento (cadastro do evento)
  const estimate = draft.mode ? estimateDistanceKm({
    fromUf: participant?.state, fromCity: participant?.city,
    toUf: event?.state, toCity: event?.city, mode: draft.mode,
  }) : null;

  const setField = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));

  function selectMode(id) {
    setDraft((d) => ({ ...d, mode: id, fuel: '' }));
    setErrors({});
  }

  // Valida o trecho em edição e o converte no formato enviado ao backend.
  function buildLeg() {
    const errs = {};
    const km = parseFloat(String(draft.distance).replace(',', '.'));
    if (!draft.mode) errs.mode = 'Escolha como você chegou';
    if (modeInfo?.hasFuel && !draft.fuel) errs.fuel = 'Escolha o combustível';
    if (draft.mode && draft.mode !== 'bicicleta_pe' && (Number.isNaN(km) || km < 0 || km > 50000)) {
      errs.distance = 'Informe a distância aproximada em km';
    }
    if (Object.keys(errs).length > 0) return { errs, leg: null };

    return {
      errs,
      leg: {
        transport_mode: draft.mode,
        fuel_type: modeInfo?.hasFuel ? draft.fuel : null,
        origin_text: draft.origin.trim() || null,
        distance_km: draft.mode === 'bicicleta_pe' ? (Number.isNaN(km) ? 0 : km) : km,
        round_trip: draft.roundTrip,
        passengers_in_vehicle: modeInfo?.hasPassengers ? Math.max(1, Number(draft.passengers) || 1) : 1,
      },
    };
  }

  function addLeg() {
    if (full) return;
    const { errs, leg } = buildLeg();
    setErrors(errs);
    if (!leg) return;
    setLegs((l) => [...l, leg]);
    setDraft(emptyDraft());
  }

  function removeLeg(index) {
    setLegs((l) => l.filter((_, i) => i !== index));
  }

  function submit(e) {
    e.preventDefault();
    // um trecho preenchido mas ainda não adicionado entra junto — ninguém perde o que digitou
    if (draft.mode) {
      const { errs, leg } = buildLeg();
      setErrors(errs);
      if (!leg) return;
      onSubmit([...legs, leg]);
      return;
    }
    if (legs.length === 0) {
      setErrors({ mode: 'Escolha como você chegou' });
      return;
    }
    onSubmit(legs);
  }

  return (
    <form className="screen form" onSubmit={submit}>
      <div className="form-head">
        <span className="step-tag">Passo 2 de 2</span>
        <h2>Como você chegou ao evento?</h2>
      </div>
      <p className="hint">
        Usou mais de um transporte? Adicione um trecho de cada vez — somamos tudo no final.
      </p>

      {legs.length > 0 && (
        <ol className="leg-list">
          {legs.map((leg, i) => (
            <li key={i} className="leg-item">
              <span className="leg-icon">{MODE_ICON[leg.transport_mode]}</span>
              <span className="leg-text">
                <strong>{MODE_LABEL[leg.transport_mode]}</strong>
                <small>
                  {leg.transport_mode === 'bicicleta_pe'
                    ? 'sem emissão'
                    : `${leg.distance_km} km · ${leg.round_trip ? 'ida e volta' : 'somente ida'}`}
                </small>
              </span>
              <button type="button" className="leg-remove" onClick={() => removeLeg(i)} aria-label={`Remover ${MODE_LABEL[leg.transport_mode]}`}>
                ✕
              </button>
            </li>
          ))}
        </ol>
      )}

      {full ? (
        <p className="zero-note">Você já adicionou {MAX_LEGS} trechos — o máximo por resposta.</p>
      ) : (
        <>
          {legs.length > 0 && <span className="field-label">Trecho {legs.length + 1}</span>}

          <div className="mode-grid">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`mode-card ${draft.mode === m.id ? 'selected' : ''}`}
                onClick={() => selectMode(m.id)}
              >
                <span className="mode-icon">{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
          {errors.mode && <span className="error">{errors.mode}</span>}

          {draft.mode && draft.mode !== 'bicicleta_pe' && (
            <>
              {modeInfo.hasFuel && (
                <div className="field-group">
                  <span className="field-label">Combustível*</span>
                  <div className="chip-row">
                    {fuels.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className={`chip ${draft.fuel === f.id ? 'selected' : ''}`}
                        onClick={() => setField('fuel')(f.id)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  {errors.fuel && <span className="error">{errors.fuel}</span>}
                </div>
              )}

              <label>
                Distância aproximada deste trecho (km)*
                <input
                  inputMode="decimal"
                  placeholder="Ex.: 25"
                  value={draft.distance}
                  onChange={(e) => setField('distance')(e.target.value)}
                  maxLength={7}
                />
                {estimate === 0 && (
                  <span className="estimate">
                    Você saiu de {participant.city}, a mesma cidade do evento: informe quantos km rodou até aqui.
                  </span>
                )}
                {estimate > 0 && (
                  <span className="estimate">
                    <span>
                      Estimativa: <strong>{estimate.toLocaleString('pt-BR')} km</strong>
                      {' '}de {participant.city} até {event.city}
                    </span>
                    {draft.distance !== String(estimate) && (
                      <button type="button" className="estimate-use" onClick={() => setField('distance')(String(estimate))}>
                        Usar
                      </button>
                    )}
                  </span>
                )}
                {errors.distance && <span className="error">{errors.distance}</span>}
              </label>

              <div className="field-group">
                <span className="field-label">Trajeto</span>
                <div className="chip-row">
                  <button type="button" className={`chip ${draft.roundTrip ? 'selected' : ''}`} onClick={() => setField('roundTrip')(true)}>
                    Ida e volta
                  </button>
                  <button type="button" className={`chip ${!draft.roundTrip ? 'selected' : ''}`} onClick={() => setField('roundTrip')(false)}>
                    Somente ida
                  </button>
                </div>
              </div>

              {modeInfo.hasPassengers && (
                <div className="field-group">
                  <span className="field-label">Quantas pessoas no mesmo veículo?</span>
                  <div className="stepper">
                    <button type="button" onClick={() => setField('passengers')(Math.max(1, draft.passengers - 1))}>−</button>
                    <span>{draft.passengers}</span>
                    <button type="button" onClick={() => setField('passengers')(Math.min(80, draft.passengers + 1))}>+</button>
                  </div>
                </div>
              )}

              <label>
                De onde você saiu neste trecho? (opcional)
                <input
                  placeholder="Bairro, cidade ou local de partida"
                  value={draft.origin}
                  onChange={(e) => setField('origin')(e.target.value)}
                  maxLength={300}
                />
              </label>
            </>
          )}

          {draft.mode === 'bicicleta_pe' && (
            <p className="zero-note">🌿 Deslocamento ativo: este trecho não emite CO₂!</p>
          )}

          <button type="button" className="btn-add-leg" onClick={addLeg} disabled={!draft.mode}>
            + Adicionar outro transporte
          </button>
        </>
      )}

      <div className="nav-buttons">
        <button type="button" className="btn-secondary" onClick={onBack}>← Voltar</button>
        <button type="submit" className="btn-primary" disabled={!draft.mode && legs.length === 0}>Calcular</button>
      </div>
    </form>
  );
}
