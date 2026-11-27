// Regras do fluxo do participante, sem React: validações, conversão dos trechos para o
// formato da API e montagem da resposta. São as mesmas regras que ficavam dentro de
// ParticipantForm/TransportForm — só saíram dos componentes para serem testadas.
import { MODES, FUELS, computeEmission, CALCULATION_VERSION } from './emissions/calc.js';
import { estimateDistanceKm } from './emissions/distance.js';

// Trechos por resposta — mesmo limite validado pelo backend em routes/sync.js
export const MAX_LEGS = 6;
export const MAX_PASSENGERS = 80;

// Etapas numeradas do progresso ("Etapa X de 5"). Boas-vindas e encerramento ficam fora.
export const STEPS = ['identity', 'origin', 'transport', 'details', 'result'];

export function stepNumber(screen) {
  const i = STEPS.indexOf(screen);
  return i < 0 ? null : i + 1;
}

export const EMPTY_PARTICIPANT = {
  name: '', company: '', email: '', phone: '', city: '', state: '',
  consent_lgpd: false, consent_marketing: false,
};

export const emptyLeg = () => ({ mode: null, fuel: '', distance: '', roundTrip: true, passengers: 1, origin: '' });

export const modeInfo = (id) => MODES.find((m) => m.id === id) || null;

// ---------- Participante ----------

export function identityErrors(p) {
  const errs = {};
  if (!p.name.trim()) errs.name = 'Informe seu nome';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim())) errs.email = 'Informe um e-mail válido';
  if (!p.consent_lgpd) errs.consent_lgpd = 'É necessário aceitar para continuar';
  return errs;
}

export function originErrors(p) {
  const errs = {};
  if (!p.state) errs.state = 'Selecione o estado';
  else if (!p.city) errs.city = 'Selecione sua cidade';
  return errs;
}

// Participante no formato enviado ao backend (opcionais vazios viram null).
export function participantPayload(p) {
  return {
    ...p,
    name: p.name.trim(),
    email: p.email.trim(),
    company: p.company.trim() || null,
    phone: p.phone.trim() || null,
    city: p.city.trim(),
  };
}

// ---------- Trechos ----------

// O participante informa o total do trajeto; o backend guarda a ida e dobra
// no cálculo quando round_trip (calc.js / services/emissions.js).
function oneWayKm(leg) {
  const totalKm = parseFloat(String(leg.distance).replace(',', '.'));
  return leg.roundTrip ? totalKm / 2 : totalKm;
}

export function legErrors(leg) {
  const errs = {};
  const info = modeInfo(leg.mode);
  const km = oneWayKm(leg);
  if (!leg.mode) errs.mode = 'Escolha como você chegou';
  if (info?.hasFuel && !leg.fuel) errs.fuel = 'Escolha o combustível';
  if (leg.mode && leg.mode !== 'bicicleta_pe' && (Number.isNaN(km) || km < 0 || km > 50000)) {
    errs.distance = 'Informe a distância aproximada em km';
  }
  return errs;
}

// Trecho já validado → formato enviado ao backend.
export function toApiLeg(leg) {
  const info = modeInfo(leg.mode);
  const km = oneWayKm(leg);
  return {
    transport_mode: leg.mode,
    fuel_type: info?.hasFuel ? leg.fuel : null,
    origin_text: leg.origin.trim() || null,
    distance_km: leg.mode === 'bicicleta_pe' ? (Number.isNaN(km) ? 0 : km) : km,
    round_trip: leg.roundTrip,
    passengers_in_vehicle: info?.hasPassengers ? Math.max(1, Number(leg.passengers) || 1) : 1,
  };
}

// Trocar de modal zera o combustível (as opções mudam); tocar no mesmo não apaga nada.
export function withMode(leg, mode) {
  return leg.mode === mode ? leg : { ...leg, mode, fuel: '' };
}

// Estimativa já no trajeto escolhido (ida ou ida e volta), como o km do campo.
// null = sem coordenadas para estimar; 0 = mesma cidade do evento.
export function estimateFor(participant, event, mode, roundTrip) {
  const oneWay = mode ? estimateDistanceKm({
    fromUf: participant?.state, fromCity: participant?.city,
    toUf: event?.state, toCity: event?.city, mode,
  }) : null;
  return oneWay == null ? null : oneWay * (roundTrip ? 2 : 1);
}

// Se o km do campo é a estimativa, ele acompanha a troca de trajeto (660 ↔ 1.320).
export function withRoundTrip(leg, roundTrip, participant, event) {
  const previous = estimateFor(participant, event, leg.mode, leg.roundTrip);
  const usingEstimate = previous != null && leg.distance === String(previous);
  return {
    ...leg,
    roundTrip,
    distance: usingEstimate ? String(estimateFor(participant, event, leg.mode, roundTrip)) : leg.distance,
  };
}

// ---------- Resposta ----------

// Calcula cada trecho com os fatores embarcados; a emissão da resposta é a soma deles.
export function buildTransports(legs) {
  const transports = legs.map((leg) => {
    const t = toApiLeg(leg);
    return {
      ...t,
      emission_kg_co2e: computeEmission({
        mode: t.transport_mode,
        fuelType: t.fuel_type,
        distanceKm: t.distance_km,
        roundTrip: t.round_trip,
        passengers: t.passengers_in_vehicle,
      }) ?? 0,
      calculation_version: CALCULATION_VERSION,
    };
  });
  const total = Math.round(transports.reduce((sum, t) => sum + t.emission_kg_co2e, 0) * 10000) / 10000;
  return { transports, total };
}

// ---------- Textos ----------

export const fmtKm = (km) => km.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

// "Carro (gasolina)" / "Ônibus"
export function legTitle(t) {
  const mode = modeInfo(t.transport_mode)?.label || t.transport_mode;
  const fuel = t.fuel_type && FUELS.find((f) => f.id === t.fuel_type)?.label;
  return fuel ? `${mode} (${fuel.toLowerCase()})` : mode;
}

// "1.780 km · ida e volta" a partir de um trecho no formato da API.
export function legDistanceText(t) {
  if (t.transport_mode === 'bicicleta_pe') return 'sem emissão';
  return t.round_trip
    ? `${fmtKm(t.distance_km * 2)} km · ida e volta`
    : `${fmtKm(t.distance_km)} km · somente ida`;
}
