import { createContext, useContext, useEffect, useRef } from 'react';
import Icon from './Icon.jsx';
import HeroDecor from './Decor.jsx';
import { EvaGuide } from './Eva.jsx';
import { STEPS, stepNumber } from '../flow.js';

// Conexão atual, para o aviso de "sem internet" em qualquer etapa.
export const OnlineContext = createContext(true);

export function Brand() {
  return (
    <div className="brand">
      <Icon name="leaf" size={22} />
      <span>Pegada de Carbono</span>
    </div>
  );
}

function Progress({ step }) {
  return (
    <div className="progress">
      <span className="progress-label">Etapa {step} de {STEPS.length}</span>
      <span className="progress-dots" aria-hidden="true">
        {STEPS.map((s, i) => (
          <span key={s} className={i + 1 < step ? 'done' : i + 1 === step ? 'current' : ''} />
        ))}
      </span>
    </div>
  );
}

// Tela de etapa: topo verde com marca, progresso e a Eva falando; abaixo, o cartão
// branco com o formulário e os botões. Cada etapa entra com uma transição curta no
// sentido da navegação (data-dir) e o foco vai para o título, para leitores de tela.
export default function StepLayout({
  screen, title, pose, bubble, onBack, actions, children, dir = 'forward', onSubmit,
}) {
  const headingRef = useRef(null);
  const online = useContext(OnlineContext);
  const step = stepNumber(screen);
  const showProgress = step && screen !== 'result';

  useEffect(() => {
    window.scrollTo(0, 0);
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const Body = onSubmit ? 'form' : 'div';

  return (
    <div className={`step step-${screen}`} data-dir={dir}>
      <header className="hero">
        <HeroDecor />
        <div className="hero-top">
          <Brand />
          {(onBack || showProgress) && (
            <div className="hero-nav">
              {onBack
                ? <button type="button" className="icon-btn" onClick={onBack} aria-label="Voltar"><Icon name="chevron-left" /></button>
                : <span />}
              {showProgress && <Progress step={step} />}
            </div>
          )}
        </div>
        <EvaGuide pose={pose} title={bubble.title} text={bubble.text} />
      </header>

      <Body className="sheet" onSubmit={onSubmit} noValidate={onSubmit ? true : undefined}>
        <h1 className="sr-only" tabIndex={-1} ref={headingRef}>
          {showProgress ? `Etapa ${step} de ${STEPS.length}: ${title}` : title}
        </h1>
        {!online && (
          <p className="offline-banner" role="status">
            <span className="dot dot-off" /> Sem internet — tudo bem, suas respostas ficam salvas neste aparelho.
          </p>
        )}
        <div className="sheet-body">{children}</div>
        {actions && <div className="actions">{actions}</div>}
      </Body>
    </div>
  );
}

// Botão de voltar redondo do rodapé (o mesmo comando do topo, ao alcance do polegar).
export function BackButton({ onClick }) {
  return (
    <button type="button" className="icon-btn icon-btn-outline" onClick={onClick} aria-label="Voltar">
      <Icon name="chevron-left" />
    </button>
  );
}

// Campo com rótulo, ícone e mensagem de erro ligada ao input (aria-describedby).
export function Field({ id, label, icon, required, optional, error, hint, children }) {
  return (
    <div className={`field${error ? ' invalid' : ''}`}>
      <label className="field-label" htmlFor={id}>
        {icon && <Icon name={icon} size={18} />}
        <span>
          {label}
          {required && <span className="req" aria-hidden="true"> *</span>}
          {optional && <span className="opt"> (opcional)</span>}
        </span>
      </label>
      {children}
      {hint && !error && <span className="field-hint" id={`${id}-hint`}>{hint}</span>}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}

export function FieldError({ id, children }) {
  return (
    <span className="error" id={id} role="alert">
      <Icon name="info" size={16} />
      {children}
    </span>
  );
}

// Leva o participante ao primeiro campo com erro (na ordem da tela).
export function focusFirstError(errors, order) {
  const key = order.find((k) => errors[k]);
  if (!key) return;
  const el = document.getElementById(`f-${key}`);
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.focus({ preventScroll: true });
}
