import { useState } from 'react';
import { MODES, fuelsForMode } from '../emissions/calc.js';

export default function TransportForm({ onSubmit, onBack }) {
  const [mode, setMode] = useState(null);
  const [fuel, setFuel] = useState('');
  const [distance, setDistance] = useState('');
  const [roundTrip, setRoundTrip] = useState(true);
  const [passengers, setPassengers] = useState(1);
  const [origin, setOrigin] = useState('');
  const [errors, setErrors] = useState({});

  const modeInfo = MODES.find((m) => m.id === mode);
  const fuels = mode && modeInfo?.hasFuel ? fuelsForMode(mode) : [];

  function selectMode(id) {
    setMode(id);
    setFuel('');
    setErrors({});
  }

  function submit(e) {
    e.preventDefault();
    const errs = {};
    const km = parseFloat(String(distance).replace(',', '.'));
    if (!mode) errs.mode = 'Escolha como você chegou';
    if (modeInfo?.hasFuel && !fuel) errs.fuel = 'Escolha o combustível';
    if (mode !== 'bicicleta_pe' && (Number.isNaN(km) || km < 0 || km > 50000)) {
      errs.distance = 'Informe a distância aproximada em km';
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    onSubmit({
      transport_mode: mode,
      fuel_type: modeInfo?.hasFuel ? fuel : null,
      origin_text: origin.trim() || null,
      distance_km: mode === 'bicicleta_pe' ? (Number.isNaN(km) ? 0 : km) : km,
      round_trip: roundTrip,
      passengers_in_vehicle: modeInfo?.hasPassengers ? Math.max(1, Number(passengers) || 1) : 1,
    });
  }

  return (
    <form className="screen form" onSubmit={submit}>
      <h2>Como você chegou ao evento?</h2>

      <div className="mode-grid">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`mode-card ${mode === m.id ? 'selected' : ''}`}
            onClick={() => selectMode(m.id)}
          >
            <span className="mode-icon">{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>
      {errors.mode && <span className="error">{errors.mode}</span>}

      {mode && mode !== 'bicicleta_pe' && (
        <>
          {modeInfo.hasFuel && (
            <div className="field-group">
              <span className="field-label">Combustível*</span>
              <div className="chip-row">
                {fuels.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`chip ${fuel === f.id ? 'selected' : ''}`}
                    onClick={() => setFuel(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {errors.fuel && <span className="error">{errors.fuel}</span>}
            </div>
          )}

          <label>
            Distância aproximada até o evento (km)*
            <input
              inputMode="decimal"
              placeholder="Ex.: 25"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              maxLength={7}
            />
            {errors.distance && <span className="error">{errors.distance}</span>}
          </label>

          <div className="field-group">
            <span className="field-label">Trajeto</span>
            <div className="chip-row">
              <button type="button" className={`chip ${roundTrip ? 'selected' : ''}`} onClick={() => setRoundTrip(true)}>
                Ida e volta
              </button>
              <button type="button" className={`chip ${!roundTrip ? 'selected' : ''}`} onClick={() => setRoundTrip(false)}>
                Somente ida
              </button>
            </div>
          </div>

          {modeInfo.hasPassengers && (
            <div className="field-group">
              <span className="field-label">Quantas pessoas no mesmo veículo?</span>
              <div className="stepper">
                <button type="button" onClick={() => setPassengers((p) => Math.max(1, p - 1))}>−</button>
                <span>{passengers}</span>
                <button type="button" onClick={() => setPassengers((p) => Math.min(80, p + 1))}>+</button>
              </div>
            </div>
          )}

          <label>
            De onde você saiu? (opcional)
            <input
              placeholder="Bairro, cidade ou local de partida"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              maxLength={300}
            />
          </label>
        </>
      )}

      {mode === 'bicicleta_pe' && (
        <p className="zero-note">🌿 Deslocamento ativo: sua emissão é <strong>zero</strong>!</p>
      )}

      <div className="nav-buttons">
        <button type="button" className="btn-secondary" onClick={onBack}>← Voltar</button>
        <button type="submit" className="btn-primary" disabled={!mode}>Calcular</button>
      </div>
    </form>
  );
}
