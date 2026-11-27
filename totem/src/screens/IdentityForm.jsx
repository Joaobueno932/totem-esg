import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import StepLayout, { BackButton, Field, FieldError, focusFirstError } from '../components/StepLayout.jsx';
import { identityErrors } from '../flow.js';

const ORDER = ['name', 'email', 'consent_lgpd'];

// Etapa 1 — dados pessoais e consentimentos (LGPD obrigatório, marketing opcional).
export default function IdentityForm({ participant, onChange, onNext, onBack, dir }) {
  // os erros aparecem depois da primeira tentativa de avançar e somem conforme o campo é corrigido
  const [tried, setTried] = useState(false);
  const errors = tried ? identityErrors(participant) : {};
  const hasErrors = Object.keys(errors).length > 0;

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    onChange({ ...participant, [key]: value });
  };

  function submit(e) {
    e.preventDefault();
    const errs = identityErrors(participant);
    setTried(true);
    if (Object.keys(errs).length > 0) {
      focusFirstError(errs, ORDER);
      return;
    }
    onNext();
  }

  const describe = (key) => (errors[key] ? `f-${key}-error` : undefined);

  return (
    <StepLayout
      screen="identity" title="Seus dados" dir={dir} pose="apresentando" onBack={onBack} onSubmit={submit}
      bubble={hasErrors
        ? { title: 'Opa! Faltou alguma coisa.', text: 'Confira os campos destacados.' }
        : { title: 'Antes de começar, quero conhecer você!', text: 'Preencha seus dados para seguirmos.' }}
      actions={<>
        <BackButton onClick={onBack} />
        <button type="submit" className="btn btn-primary">Continuar <Icon name="arrow-right" /></button>
      </>}
    >
      <Field id="f-name" label="Nome completo" icon="user" required error={errors.name}>
        <input
          id="f-name" className="input" value={participant.name} onChange={set('name')}
          autoComplete="name" autoCapitalize="words" maxLength={200} placeholder="Ex.: Maria Silva"
          aria-required="true" aria-invalid={!!errors.name} aria-describedby={describe('name')}
        />
      </Field>

      <Field id="f-email" label="E-mail" icon="mail" required error={errors.email}>
        <input
          id="f-email" className="input" type="email" value={participant.email} onChange={set('email')}
          autoComplete="email" autoCapitalize="none" spellCheck={false} inputMode="email" maxLength={200}
          placeholder="Ex.: maria@email.com"
          aria-required="true" aria-invalid={!!errors.email} aria-describedby={describe('email')}
        />
      </Field>

      <Field id="f-phone" label="Telefone" icon="phone" optional>
        <input
          id="f-phone" className="input" type="tel" value={participant.phone} onChange={set('phone')}
          autoComplete="tel" inputMode="tel" maxLength={40} placeholder="(00) 00000-0000"
        />
      </Field>

      <Field id="f-company" label="Empresa / instituição" icon="briefcase" optional>
        <input
          id="f-company" className="input" value={participant.company} onChange={set('company')}
          autoComplete="organization" maxLength={200} placeholder="Ex.: Minha Empresa"
        />
      </Field>

      <div className="consents">
        <label className={`check${errors.consent_lgpd ? ' invalid' : ''}`}>
          <input
            id="f-consent_lgpd" type="checkbox" checked={participant.consent_lgpd} onChange={set('consent_lgpd')}
            aria-required="true" aria-invalid={!!errors.consent_lgpd} aria-describedby={describe('consent_lgpd')}
          />
          <span className="check-box" aria-hidden="true"><Icon name="check" size={16} strokeWidth={3} /></span>
          <span>
            <strong>Li e aceito</strong> que meus dados sejam usados para calcular a emissão de CO₂e
            e compor o relatório deste evento, conforme a LGPD.<span className="req" aria-hidden="true"> *</span>
          </span>
        </label>
        {errors.consent_lgpd && <FieldError id="f-consent_lgpd-error">{errors.consent_lgpd}</FieldError>}

        <label className="check">
          <input type="checkbox" checked={participant.consent_marketing} onChange={set('consent_marketing')} />
          <span className="check-box" aria-hidden="true"><Icon name="check" size={16} strokeWidth={3} /></span>
          <span>Aceito receber comunicações futuras dos organizadores. <span className="opt">(opcional)</span></span>
        </label>
      </div>
    </StepLayout>
  );
}
