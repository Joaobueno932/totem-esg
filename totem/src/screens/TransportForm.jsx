import Icon from '../components/Icon.jsx';
import StepLayout, { BackButton } from '../components/StepLayout.jsx';
import { MODES } from '../emissions/calc.js';
import { modeInfo } from '../flow.js';

// Etapa 3 — meio de transporte do trecho atual. Todos os modais de MODES aparecem,
// com os mesmos ids usados no cálculo e na API.
export default function TransportForm({ leg, index, onSelect, onNext, onBack, dir }) {
  const selected = modeInfo(leg.mode);

  function submit(e) {
    e.preventDefault();
    if (leg.mode) onNext();
  }

  let bubble;
  if (selected?.id === 'bicicleta_pe') {
    bubble = { title: 'Deslocamento ativo!', text: 'Este trecho não emite CO₂. Toque em Continuar.' };
  } else if (selected) {
    bubble = { title: `${selected.label}, anotado!`, text: 'Toque em Continuar para os detalhes do trecho.' };
  } else if (index === 0) {
    bubble = {
      title: 'Como você chegou até o evento?',
      text: 'Usou mais de um transporte? Escolha o primeiro — depois você adiciona os outros trechos.',
    };
  } else {
    bubble = { title: `E no trecho ${index + 1}, como você foi?`, text: 'Escolha o transporte deste trecho.' };
  }

  return (
    <StepLayout
      screen="transport" title="Transporte" dir={dir} pose="mostrando" onBack={onBack} onSubmit={submit} bubble={bubble}
      actions={<>
        <BackButton onClick={onBack} />
        <button type="submit" className="btn btn-primary" disabled={!leg.mode}>
          Continuar <Icon name="arrow-right" />
        </button>
      </>}
    >
      {index > 0 && <span className="leg-tag">Trecho {index + 1}</span>}

      <div className="mode-grid" role="group" aria-label="Meio de transporte">
        {MODES.map((m) => {
          const checked = leg.mode === m.id;
          return (
            <button
              key={m.id} type="button" aria-pressed={checked}
              className="mode-card" onClick={() => onSelect(m.id)}
            >
              <span className="mode-check" aria-hidden="true"><Icon name="check" size={14} strokeWidth={3} /></span>
              <Icon name={m.id} size={36} strokeWidth={1.8} />
              <span className="mode-label">{m.label}</span>
            </button>
          );
        })}
      </div>
    </StepLayout>
  );
}
