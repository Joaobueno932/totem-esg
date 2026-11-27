// Motor de cálculo do servidor (o valor que prevalece na sincronização), com os fatores
// do seed versionado. Os casos espelham o teste ponta a ponta (scripts/e2e-test.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// O módulo importa db.js: aponta para um endereço inalcançável, nunca para o banco do .env.
process.env.DATABASE_URL = 'postgres://teste:teste@127.0.0.1:1/teste';
const { computeEmission, findFactor } = await import('../src/services/emissions.js');

const seed = JSON.parse(await readFile(new URL('../seeds/emission_factors.json', import.meta.url), 'utf8'));
// Formato das linhas de emission_factors (NUMERIC chega do pg como string).
const factors = seed.factors.map((f) => ({ ...f, factor_kg_co2e_per_km: String(f.factor_kg_co2e_per_km), version: seed.version }));

const calc = (leg) => computeEmission({ roundTrip: false, passengers: 1, ...leg }, factors);

test('carro: fator por veículo dividido pelos ocupantes, ida e volta dobra', () => {
  const r = calc({ mode: 'carro', fuelType: 'gasolina', distanceKm: 25, roundTrip: true, passengers: 2 });
  assert.deepEqual(r, { emissionKgCo2e: 4.675, version: seed.version });
});

test('ônibus e avião: fator por passageiro ignora o nº de ocupantes', () => {
  assert.equal(calc({ mode: 'onibus', distanceKm: 100, roundTrip: true, passengers: 40 }).emissionKgCo2e, 5.4);
  assert.equal(calc({ mode: 'aviao', distanceKm: 500 }).emissionKgCo2e, 79);
});

test('bicicleta/a pé é sempre zero', () => {
  assert.deepEqual(calc({ mode: 'bicicleta_pe', distanceKm: 5 }), { emissionKgCo2e: 0, version: seed.version });
});

test('combustível sem fator cai no "outro" do mesmo modal', () => {
  const semFator = calc({ mode: 'moto', fuelType: 'diesel', distanceKm: 10 });
  const outro = calc({ mode: 'moto', fuelType: 'outro', distanceKm: 10 });
  assert.deepEqual(semFator, outro);
  assert.equal(findFactor(factors, 'carro', null).fuel_type, 'outro');
});

test('modal desconhecido não tem fator', () => {
  assert.equal(calc({ mode: 'foguete', distanceKm: 10 }), null);
});

test('resultado arredondado em 4 casas', () => {
  assert.equal(calc({ mode: 'aplicativo_taxi', fuelType: 'gasolina', distanceKm: 12, passengers: 3 }).emissionKgCo2e, 0.748);
  assert.equal(calc({ mode: 'carro', fuelType: 'flex', distanceKm: 7.33, passengers: 3 }).emissionKgCo2e, 0.3079);
});
