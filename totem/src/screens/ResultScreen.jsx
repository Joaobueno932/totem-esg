import { useEffect } from 'react';
import { formatKg, MODES } from '../emissions/calc.js';

const MODE_LABEL = Object.fromEntries(MODES.map((m) => [m.id, m.label]));

// Tela final: mostra APENAS a emissão individual do participante.
// Nenhum dado consolidado do evento aparece aqui.
export default function ResultScreen({ result, onFinish }) {
  const { total, transports } = result;

  // volta sozinho ao início após 60 s, caso o participante vá embora sem tocar em "Finalizar"
  useEffect(() => {
    const timer = setTimeout(onFinish, 60_000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="screen center">
      <div className="badge-leaf">✅</div>
      <h2>Obrigado por participar!</h2>

      <p className="result-lead">
        {transports.length > 1
          ? `Somando os ${transports.length} trechos, sua emissão estimada foi de`
          : 'Sua emissão estimada neste deslocamento foi de'}
      </p>
      <div className="result-value">
        {formatKg(total)} <span className="result-unit">kg CO₂e</span>
      </div>

      {transports.length > 1 && (
        <ul className="leg-breakdown">
          {transports.map((t, i) => (
            <li key={i}>
              <span>{MODE_LABEL[t.transport_mode] || t.transport_mode}</span>
              <span className="leg-kg">{formatKg(t.emission_kg_co2e)} kg</span>
            </li>
          ))}
        </ul>
      )}

      <p className="edu-note">
        Pequenas escolhas — como carona compartilhada, transporte coletivo ou bicicleta —
        reduzem bastante a pegada de carbono dos seus deslocamentos.
      </p>

      <button className="btn-primary btn-xl" onClick={onFinish}>Finalizar</button>
    </div>
  );
}
