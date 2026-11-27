// Rascunho do participante em localStorage: se a página recarregar (ou o celular
// descartar a aba) no meio do fluxo, ninguém perde o que digitou — e o resultado
// continua na tela até tocar em "Finalizar".
// O rascunho pertence ao evento em que foi iniciado: o link de outro evento nunca o
// reaproveita. Expira em 24 h (minimização de dados pessoais / LGPD).
import { EMPTY_PARTICIPANT, MAX_LEGS, MAX_PASSENGERS, emptyLeg } from './flow.js';
import { MODES } from './emissions/calc.js';

const DRAFT_KEY = 'carbono-zero-draft';
const VERSION = 2;
export const DRAFT_TTL_MS = 24 * 3600 * 1000;

const SCREENS = ['start', 'identity', 'origin', 'transport', 'details', 'result'];
const MODE_IDS = new Set(MODES.map((m) => m.id));

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

function sanitizeParticipant(p) {
  if (!p || typeof p !== 'object') return { ...EMPTY_PARTICIPANT };
  return {
    name: str(p.name, 200), company: str(p.company, 200), email: str(p.email, 200),
    phone: str(p.phone, 40), city: str(p.city, 120), state: str(p.state, 2),
    consent_lgpd: p.consent_lgpd === true, consent_marketing: p.consent_marketing === true,
  };
}

function sanitizeLeg(l) {
  const base = emptyLeg();
  if (!l || typeof l !== 'object') return base;
  const passengers = Number(l.passengers);
  return {
    mode: MODE_IDS.has(l.mode) ? l.mode : null,
    fuel: str(l.fuel, 20),
    distance: str(l.distance, 7),
    roundTrip: typeof l.roundTrip === 'boolean' ? l.roundTrip : base.roundTrip,
    passengers: Number.isInteger(passengers) ? Math.min(MAX_PASSENGERS, Math.max(1, passengers)) : 1,
    origin: str(l.origin, 300),
  };
}

const validTransport = (t) => t && typeof t === 'object' && MODE_IDS.has(t.transport_mode)
  && typeof t.distance_km === 'number' && typeof t.emission_kg_co2e === 'number';

function sanitizeResult(r) {
  if (!r || typeof r !== 'object' || typeof r.total !== 'number' || !Array.isArray(r.transports)) return null;
  if (r.transports.length === 0 || !r.transports.every(validTransport)) return null;
  return { total: r.total, transports: r.transports, local_uuid: str(r.local_uuid, 64), from: str(r.from, 130) };
}

function read() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch { return null; }
}

// Devolve o rascunho deste evento, ou null. Rascunho expirado ou do formato antigo
// (sem evento, não dá para saber de onde veio) é apagado.
export function loadDraft(event, now = Date.now()) {
  const d = read();
  if (!d || typeof d !== 'object') return null;
  if (d.v !== VERSION || !(now - d.saved_at < DRAFT_TTL_MS)) {
    clearDraft();
    return null;
  }
  if (d.event_slug !== event.slug || d.event_id !== event.id) return null;

  const screen = SCREENS.includes(d.screen) ? d.screen : 'start';
  if (screen === 'result') {
    const result = sanitizeResult(d.result);
    return result ? { screen, result } : null;
  }
  const legs = (Array.isArray(d.legs) ? d.legs : []).slice(0, MAX_LEGS).map(sanitizeLeg);
  if (legs.length === 0) legs.push(emptyLeg());
  const cur = Number.isInteger(d.cur) ? Math.min(Math.max(0, d.cur), legs.length - 1) : 0;
  // sem modal escolhido não há o que detalhar: volta para a escolha do transporte
  const fixedScreen = screen === 'details' && !legs[cur].mode ? 'transport' : screen;
  return { screen: fixedScreen, participant: sanitizeParticipant(d.participant), legs, cur };
}

export function saveDraft(event, data, now = Date.now()) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      v: VERSION, event_slug: event.slug, event_id: event.id, saved_at: now, ...data,
    }));
  } catch { /* storage cheio/bloqueado: segue sem rascunho */ }
}

export function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}
