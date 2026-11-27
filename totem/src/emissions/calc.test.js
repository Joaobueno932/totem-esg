// Motor de cálculo local (offline). Deve dar o mesmo resultado que o servidor, que
// recalcula na sincronização — os casos espelham o teste ponta a ponta do backend.
import { describe, expect, it } from 'vitest';
import { computeEmission, CALCULATION_VERSION, fuelsForMode } from './calc.js';

const calc = (leg) => computeEmission({ roundTrip: false, passengers: 1, ...leg });

describe('computeEmission', () => {
  it('carro: fator por veículo dividido pelos ocupantes, ida e volta dobra', () => {
    expect(calc({ mode: 'carro', fuelType: 'gasolina', distanceKm: 25, roundTrip: true, passengers: 2 })).toBe(4.675);
  });

  it('ônibus e avião: fator por passageiro ignora o nº de ocupantes', () => {
    expect(calc({ mode: 'onibus', distanceKm: 100, roundTrip: true, passengers: 40 })).toBe(5.4);
    expect(calc({ mode: 'aviao', distanceKm: 500 })).toBe(79);
  });

  it('resposta com vários trechos soma 82.054', () => {
    const total = [
      calc({ mode: 'onibus', distanceKm: 30 }),
      calc({ mode: 'aviao', distanceKm: 500 }),
      calc({ mode: 'aplicativo_taxi', fuelType: 'gasolina', distanceKm: 12 }),
    ].reduce((s, v) => s + v, 0);
    expect(Math.round(total * 10000) / 10000).toBe(82.054);
  });

  it('bicicleta/a pé é zero; combustível sem fator cai no "outro"', () => {
    expect(calc({ mode: 'bicicleta_pe', distanceKm: 5 })).toBe(0);
    expect(calc({ mode: 'moto', fuelType: 'diesel', distanceKm: 10 }))
      .toBe(calc({ mode: 'moto', fuelType: 'outro', distanceKm: 10 }));
  });

  it('modal desconhecido não tem fator', () => {
    expect(calc({ mode: 'foguete', distanceKm: 10 })).toBeNull();
  });
});

it('versão dos fatores embarcados é a publicada pelo backend', () => {
  expect(CALCULATION_VERSION).toBe('1.0.0-2026.07');
});

it('combustíveis oferecidos são só os que têm fator', () => {
  expect(fuelsForMode('moto').map((f) => f.id)).toEqual(['gasolina', 'etanol', 'flex', 'outro']);
  expect(fuelsForMode('onibus')).toEqual([]);
});
