import { useEffect } from 'react';
import { formatKg } from '../emissions/calc.js';

// Tela final: mostra APENAS a emissão individual do participante.
// Nenhum dado consolidado do evento aparece aqui.
export default function ResultScreen({ emission, onFinish }) {
  // volta sozinho ao início após 60 s, caso o participante vá embora sem tocar em "Finalizar"
  useEffect(() => {
    const timer = setTimeout(onFinish, 60_000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="screen center">
      <div className="badge-leaf">✅</div>
      <h2>Obrigado por participar!</h2>

      <p className="result-lead">Sua emissão estimada neste deslocamento foi de</p>
      <div className="result-value">
        {formatKg(emission)} <span className="result-unit">kg CO₂e</span>
      </div>

      <p className="edu-note">
        Pequenas escolhas — como carona compartilhada, transporte coletivo ou bicicleta —
        reduzem bastante a pegada de carbono dos seus deslocamentos.
      </p>

      <button className="btn-primary btn-xl" onClick={onFinish}>Finalizar</button>
    </div>
  );
}
