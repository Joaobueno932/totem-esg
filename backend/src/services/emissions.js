import { query } from '../db.js';

// Modais em que o participante informa o combustível
export const MODES_WITH_FUEL = ['carro', 'moto', 'van', 'aplicativo_taxi'];
export const VALID_MODES = ['carro', 'moto', 'onibus', 'van', 'aplicativo_taxi', 'aviao', 'bicicleta_pe', 'outro'];
export const VALID_FUELS = ['gasolina', 'etanol', 'diesel', 'gnv', 'flex', 'outro'];

let factorsCache = null;

export async function loadActiveFactors() {
  if (factorsCache) return factorsCache;
  const { rows } = await query(
    'SELECT mode, fuel_type, factor_kg_co2e_per_km, factor_basis, version FROM emission_factors WHERE active = true'
  );
  factorsCache = rows;
  return rows;
}

export function invalidateFactorsCache() {
  factorsCache = null;
}

export function findFactor(factors, mode, fuelType) {
  const needsFuel = MODES_WITH_FUEL.includes(mode);
  const fuel = needsFuel ? (fuelType || 'outro') : null;
  let factor = factors.find((f) => f.mode === mode && (f.fuel_type ?? null) === fuel);
  // fallback: modal com combustível não cadastrado → usa 'outro' do mesmo modal
  if (!factor && needsFuel) {
    factor = factors.find((f) => f.mode === mode && f.fuel_type === 'outro');
  }
  return factor || null;
}

/**
 * Calcula a emissão individual em kg CO2e.
 * emissão = distância_km × fator; ida e volta dobra a distância;
 * fator por veículo é dividido pelo nº de ocupantes; bicicleta/a pé = 0.
 */
export function computeEmission({ mode, fuelType, distanceKm, roundTrip, passengers }, factors) {
  if (mode === 'bicicleta_pe') {
    const v = factors.find((f) => f.mode === 'bicicleta_pe');
    return { emissionKgCo2e: 0, version: v ? v.version : 'n/a' };
  }
  const factor = findFactor(factors, mode, fuelType);
  if (!factor) return null;

  const totalDistance = roundTrip ? distanceKm * 2 : distanceKm;
  let emission = totalDistance * Number(factor.factor_kg_co2e_per_km);
  if (factor.factor_basis === 'vehicle') {
    emission = emission / Math.max(1, passengers || 1);
  }
  return { emissionKgCo2e: Math.round(emission * 10000) / 10000, version: factor.version };
}
