// Rascunho em localStorage: retomada após recarregar, isolamento entre eventos e expiração.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DRAFT_TTL_MS, clearDraft, loadDraft, saveDraft } from './draft.js';
import { EMPTY_PARTICIPANT, emptyLeg } from './flow.js';

const KEY = 'carbono-zero-draft';
const eventA = { id: 1, slug: 'bonito-21k' };
const eventB = { id: 2, slug: 'festa-junina' };
const participant = { ...EMPTY_PARTICIPANT, name: 'Maria', email: 'maria@ex.com', consent_lgpd: true, state: 'MS', city: 'Bonito' };
const car = { ...emptyLeg(), mode: 'carro', fuel: 'flex', distance: '120', passengers: 2 };

let store;
beforeEach(() => {
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('rascunho', () => {
  it('sem rascunho devolve null', () => {
    expect(loadDraft(eventA)).toBeNull();
  });

  it('salva e retoma a etapa, os dados e os trechos', () => {
    saveDraft(eventA, { screen: 'details', participant, legs: [car], cur: 0 });
    expect(loadDraft(eventA)).toEqual({ screen: 'details', participant, legs: [car], cur: 0 });
  });

  it('o link de outro evento não reaproveita o rascunho (e não o apaga)', () => {
    saveDraft(eventA, { screen: 'origin', participant, legs: [emptyLeg()], cur: 0 });
    expect(loadDraft(eventB)).toBeNull();
    expect(loadDraft({ ...eventA, id: 99 })).toBeNull();
    expect(loadDraft(eventA)).not.toBeNull();
  });

  it('expira em 24 h e é apagado', () => {
    const t0 = 1_000_000;
    saveDraft(eventA, { screen: 'identity', participant, legs: [emptyLeg()], cur: 0 }, t0);
    expect(loadDraft(eventA, t0 + DRAFT_TTL_MS - 1)).not.toBeNull();
    expect(loadDraft(eventA, t0 + DRAFT_TTL_MS)).toBeNull();
    expect(store.has(KEY)).toBe(false);
  });

  it('rascunho do formato antigo (sem evento) é descartado', () => {
    store.set(KEY, JSON.stringify({ step: 'transport', participant }));
    expect(loadDraft(eventA)).toBeNull();
    expect(store.has(KEY)).toBe(false);
  });

  it('dados adulterados são saneados', () => {
    saveDraft(eventA, {
      screen: 'details', cur: 9,
      participant: { ...participant, name: 42, consent_lgpd: 'sim' },
      legs: [{ mode: 'foguete', passengers: 500, distance: '123456789' }],
    });
    const d = loadDraft(eventA);
    expect(d.screen).toBe('transport'); // trecho sem modal válido volta para a escolha
    expect(d.cur).toBe(0);
    expect(d.participant).toMatchObject({ name: '', consent_lgpd: false });
    expect(d.legs[0]).toMatchObject({ mode: null, passengers: 80, distance: '1234567' });
  });

  it('depois do envio guarda só o resultado — sem dados pessoais', () => {
    const result = {
      total: 12.8, local_uuid: 'abc', from: 'Campo Grande/MS',
      transports: [{ transport_mode: 'carro', distance_km: 100, emission_kg_co2e: 12.8 }],
    };
    saveDraft(eventA, { screen: 'result', result });
    expect(store.get(KEY)).not.toContain('maria');
    expect(loadDraft(eventA)).toEqual({ screen: 'result', result });
    saveDraft(eventA, { screen: 'result', result: { ...result, transports: [{ transport_mode: 'x' }] } });
    expect(loadDraft(eventA)).toBeNull();
  });

  it('storage indisponível não quebra o fluxo', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('bloqueado'); },
      setItem: () => { throw new Error('cheio'); },
      removeItem: () => { throw new Error('bloqueado'); },
    });
    expect(() => saveDraft(eventA, { screen: 'identity' })).not.toThrow();
    expect(loadDraft(eventA)).toBeNull();
    expect(() => clearDraft()).not.toThrow();
  });
});
