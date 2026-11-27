// Regras do fluxo do participante. O primeiro bloco compara as funções novas com a
// lógica que ficava dentro do TransportForm antes da reformulação visual: a mesma
// entrada tem de gerar os mesmos erros e o mesmo trecho enviado à API.
import { describe, expect, it } from 'vitest';
import { MODES, fuelsForMode } from './emissions/calc.js';
import {
  EMPTY_PARTICIPANT, MAX_LEGS, STEPS, buildTransports, emptyLeg, estimateFor, identityErrors, legDistanceText,
  legErrors, legTitle, originErrors, participantPayload, stepNumber, toApiLeg, withMode, withRoundTrip,
} from './flow.js';

// Cópia literal de buildLeg() do TransportForm anterior (só "draft"/"modeInfo" viraram parâmetros).
function legacyBuildLeg(draft) {
  const modeInfo = MODES.find((m) => m.id === draft.mode);
  const errs = {};
  const totalKm = parseFloat(String(draft.distance).replace(',', '.'));
  const km = draft.roundTrip ? totalKm / 2 : totalKm;
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

describe('trechos: equivalência com a lógica anterior', () => {
  const distances = ['', '25', '12,5', '0', '-3', 'abc', '12abc', '100000', '100002', '50000', '50001'];
  const cases = [];
  for (const mode of [null, ...MODES.map((m) => m.id)]) {
    const fuels = mode ? ['', ...fuelsForMode(mode).map((f) => f.id)] : [''];
    for (const fuel of fuels) {
      for (const distance of distances) {
        for (const roundTrip of [true, false]) {
          cases.push({ mode, fuel, distance, roundTrip, passengers: 3, origin: '  Centro  ' });
        }
      }
    }
  }

  it(`${cases.length} combinações geram os mesmos erros e o mesmo trecho`, () => {
    for (const draft of cases) {
      const legacy = legacyBuildLeg(draft);
      const errs = legErrors(draft);
      expect(errs, JSON.stringify(draft)).toEqual(legacy.errs);
      if (legacy.leg) expect(toApiLeg(draft), JSON.stringify(draft)).toEqual(legacy.leg);
    }
  });
});

describe('legErrors / toApiLeg', () => {
  const leg = (over) => ({ ...emptyLeg(), ...over });

  it('combustível só é exigido nos modais com fator por combustível', () => {
    expect(legErrors(leg({ mode: 'carro', distance: '10' }))).toHaveProperty('fuel');
    expect(legErrors(leg({ mode: 'onibus', distance: '10' }))).toEqual({});
    expect(legErrors(leg({ mode: 'aviao', distance: '10' }))).toEqual({});
  });

  it('bicicleta/a pé não pede distância e envia 0 km', () => {
    expect(legErrors(leg({ mode: 'bicicleta_pe' }))).toEqual({});
    expect(toApiLeg(leg({ mode: 'bicicleta_pe' })).distance_km).toBe(0);
  });

  it('ida e volta: o total digitado vira a ida no envio', () => {
    const t = toApiLeg(leg({ mode: 'onibus', distance: '1780', roundTrip: true }));
    expect(t).toMatchObject({ distance_km: 890, round_trip: true, fuel_type: null, passengers_in_vehicle: 1 });
  });

  it('ocupantes só valem nos modais por veículo', () => {
    expect(toApiLeg(leg({ mode: 'carro', fuel: 'flex', distance: '10', passengers: 4 })).passengers_in_vehicle).toBe(4);
    expect(toApiLeg(leg({ mode: 'onibus', distance: '10', passengers: 4 })).passengers_in_vehicle).toBe(1);
  });

  it('trocar de modal limpa o combustível; repetir o mesmo não', () => {
    const car = leg({ mode: 'carro', fuel: 'diesel', distance: '10' });
    expect(withMode(car, 'carro')).toBe(car);
    expect(withMode(car, 'moto')).toMatchObject({ mode: 'moto', fuel: '', distance: '10' });
  });
});

describe('estimativa de distância', () => {
  const participant = { state: 'MS', city: 'Campo Grande' };
  const event = { state: 'MS', city: 'Bonito' };

  it('ida e volta dobra a estimativa; mesma cidade é 0; sem cidade é null', () => {
    const oneWay = estimateFor(participant, event, 'carro', false);
    expect(oneWay).toBeGreaterThan(200);
    expect(estimateFor(participant, event, 'carro', true)).toBe(oneWay * 2);
    expect(estimateFor(participant, participant, 'carro', false)).toBe(0);
    expect(estimateFor({ state: 'MS', city: '' }, event, 'carro', false)).toBeNull();
    expect(estimateFor(participant, event, null, false)).toBeNull();
  });

  it('km igual à estimativa acompanha a troca de trajeto; km digitado não muda', () => {
    const oneWay = estimateFor(participant, event, 'carro', false);
    const usingEstimate = { ...emptyLeg(), mode: 'carro', roundTrip: true, distance: String(oneWay * 2) };
    expect(withRoundTrip(usingEstimate, false, participant, event).distance).toBe(String(oneWay));
    const manual = { ...usingEstimate, distance: '700' };
    expect(withRoundTrip(manual, false, participant, event)).toMatchObject({ distance: '700', roundTrip: false });
  });
});

describe('participante', () => {
  const ok = { ...EMPTY_PARTICIPANT, name: 'Maria', email: 'maria@ex.com', consent_lgpd: true, state: 'MS', city: 'Bonito' };

  it('nome, e-mail e aceite LGPD são obrigatórios; telefone, empresa e marketing não', () => {
    expect(identityErrors(ok)).toEqual({});
    expect(Object.keys(identityErrors(EMPTY_PARTICIPANT))).toEqual(['name', 'email', 'consent_lgpd']);
    expect(identityErrors({ ...ok, email: 'maria@' })).toHaveProperty('email');
    expect(identityErrors({ ...ok, name: '   ' })).toHaveProperty('name');
  });

  it('estado e depois cidade são obrigatórios', () => {
    expect(originErrors({ ...ok, state: '', city: '' })).toEqual({ state: 'Selecione o estado' });
    expect(originErrors({ ...ok, city: '' })).toEqual({ city: 'Selecione sua cidade' });
    expect(originErrors(ok)).toEqual({});
  });

  it('payload: apara espaços e opcionais vazios viram null', () => {
    expect(participantPayload({ ...ok, name: ' Maria ', email: ' m@x.com ', company: ' ', phone: '' })).toEqual({
      ...ok, name: 'Maria', email: 'm@x.com', company: null, phone: null,
    });
  });
});

describe('resposta', () => {
  it('soma os trechos com os fatores embarcados (mesmos casos de calc.test.js)', () => {
    const { transports, total } = buildTransports([
      { ...emptyLeg(), mode: 'onibus', distance: '30', roundTrip: false },
      { ...emptyLeg(), mode: 'aviao', distance: '500', roundTrip: false },
      { ...emptyLeg(), mode: 'aplicativo_taxi', fuel: 'gasolina', distance: '12', roundTrip: false },
    ]);
    expect(total).toBe(82.054);
    expect(transports.map((t) => t.emission_kg_co2e)).toEqual([0.81, 79, 2.244]);
    expect(transports.every((t) => t.calculation_version === '1.0.0-2026.07')).toBe(true);
  });

  it('carro com ocupantes, ida e volta', () => {
    const { total, transports } = buildTransports([
      { ...emptyLeg(), mode: 'carro', fuel: 'gasolina', distance: '50', roundTrip: true, passengers: 2 },
    ]);
    expect(transports[0]).toMatchObject({ distance_km: 25, round_trip: true, passengers_in_vehicle: 2 });
    expect(total).toBe(4.675);
  });

  it(`limite de ${MAX_LEGS} trechos igual ao do backend`, () => {
    expect(MAX_LEGS).toBe(6);
  });
});

describe('textos e etapas', () => {
  it('etapas numeradas de 1 a 5', () => {
    expect(STEPS.map(stepNumber)).toEqual([1, 2, 3, 4, 5]);
    expect(stepNumber('start')).toBeNull();
  });

  it('rótulos do trecho', () => {
    const t = { transport_mode: 'carro', fuel_type: 'gasolina', distance_km: 890, round_trip: true };
    expect(legTitle(t)).toBe('Carro (gasolina)');
    expect(legDistanceText(t)).toBe('1.780 km · ida e volta');
    expect(legDistanceText({ transport_mode: 'bicicleta_pe', distance_km: 0 })).toBe('sem emissão');
  });
});
