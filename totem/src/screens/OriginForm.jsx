import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import CityPicker from '../components/CityPicker.jsx';
import StepLayout, { BackButton, Field, focusFirstError } from '../components/StepLayout.jsx';
import { UFS, UF_NAMES } from '../data/cities.js';
import { originErrors } from '../flow.js';

// Etapa 2 — estado e cidade de origem do participante (base da estimativa de distância).
export default function OriginForm({ participant, event, onChange, onNext, onBack, dir }) {
  const [tried, setTried] = useState(false);
  const errors = tried ? originErrors(participant) : {};
  const hasErrors = Object.keys(errors).length > 0;

  // Trocar a UF invalida a cidade escolhida para a UF anterior.
  const setState = (e) => onChange({ ...participant, state: e.target.value, city: '' });
  const setCity = (city) => onChange({ ...participant, city });

  function submit(e) {
    e.preventDefault();
    const errs = originErrors(participant);
    setTried(true);
    if (Object.keys(errs).length > 0) {
      focusFirstError(errs, ['state', 'city']);
      return;
    }
    onNext();
  }

  const destination = [event.city, event.state].filter(Boolean).join('/');

  return (
    <StepLayout
      screen="origin" title="Origem" dir={dir} pose="pensativa" onBack={onBack} onSubmit={submit}
      bubble={hasErrors
        ? { title: 'Hmm, ainda não sei de onde você veio.', text: 'Escolha o estado e a cidade de origem.' }
        : { title: 'De onde você veio?', text: 'Conta pra mim a sua cidade de origem, assim eu estimo o seu trajeto.' }}
      actions={<>
        <BackButton onClick={onBack} />
        <button type="submit" className="btn btn-primary">Continuar <Icon name="arrow-right" /></button>
      </>}
    >
      <Field id="f-state" label="Estado (UF) de origem" icon="map" required error={errors.state}>
        <select
          id="f-state" className="input" value={participant.state} onChange={setState}
          aria-required="true" aria-invalid={!!errors.state} aria-describedby={errors.state ? 'f-state-error' : undefined}
        >
          <option value="">Selecione o estado</option>
          {UFS.map((uf) => <option key={uf} value={uf}>{uf} — {UF_NAMES[uf] || uf}</option>)}
        </select>
      </Field>

      <Field id="f-city" label="Cidade de origem" icon="city" required error={errors.city}>
        <CityPicker
          key={participant.state} id="f-city" uf={participant.state} value={participant.city} onChange={setCity}
          invalid={!!errors.city} describedBy={errors.city ? 'f-city-error' : undefined}
        />
      </Field>

      <p className="note">
        <Icon name="route" size={20} />
        <span>
          {destination
            ? <>Com essa informação eu estimo a distância do seu trajeto até <strong>{destination}</strong>. Você confirma o valor depois.</>
            : 'Com essa informação compomos o relatório de deslocamentos do evento.'}
        </span>
      </p>
    </StepLayout>
  );
}
