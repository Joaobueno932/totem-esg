// Motor de cálculo LOCAL de CO2e — nenhuma dependência de rede.
// Fórmula base: emissão_kg_co2e = distância_km × fator_emissão_modal
// Ida e volta: distância × 2. Fator por veículo: divide pelo nº de ocupantes.
import factorsData from './factors.json';

export const CALCULATION_VERSION = factorsData.version;

export const MODES = [
  { id: 'carro', label: 'Carro', icon: '🚗', hasFuel: true, hasPassengers: true },
  { id: 'moto', label: 'Moto', icon: '🏍️', hasFuel: true, hasPassengers: true },
  { id: 'onibus', label: 'Ônibus', icon: '🚌', hasFuel: false, hasPassengers: false },
  { id: 'van', label: 'Van', icon: '🚐', hasFuel: true, hasPassengers: true },
  { id: 'aplicativo_taxi', label: 'Aplicativo / Táxi', icon: '🚕', hasFuel: true, hasPassengers: true },
  { id: 'aviao', label: 'Avião', icon: '✈️', hasFuel: false, hasPassengers: false },
  { id: 'bicicleta_pe', label: 'Bicicleta / A pé', icon: '🚲', hasFuel: false, hasPassengers: false },
  { id: 'outro', label: 'Outro', icon: '🚏', hasFuel: false, hasPassengers: false },
];

export const FUELS = [
  { id: 'gasolina', label: 'Gasolina' },
  { id: 'etanol', label: 'Etanol' },
  { id: 'diesel', label: 'Diesel' },
  { id: 'gnv', label: 'GNV' },
  { id: 'flex', label: 'Flex' },
  { id: 'outro', label: 'Outro' },
];

export function fuelsForMode(modeId) {
  return FUELS.filter((fuel) =>
    factorsData.factors.some((f) => f.mode === modeId && f.fuel_type === fuel.id)
  );
}

export function computeEmission({ mode, fuelType, distanceKm, roundTrip, passengers }) {
  if (mode === 'bicicleta_pe') return 0;

  const modeInfo = MODES.find((m) => m.id === mode);
  const fuel = modeInfo?.hasFuel ? (fuelType || 'outro') : null;
  let factor = factorsData.factors.find((f) => f.mode === mode && (f.fuel_type ?? null) === fuel);
  if (!factor && modeInfo?.hasFuel) {
    factor = factorsData.factors.find((f) => f.mode === mode && f.fuel_type === 'outro');
  }
  if (!factor) return null;

  const totalDistance = roundTrip ? distanceKm * 2 : distanceKm;
  let emission = totalDistance * factor.factor_kg_co2e_per_km;
  if (factor.factor_basis === 'vehicle') {
    emission = emission / Math.max(1, passengers || 1);
  }
  return Math.round(emission * 10000) / 10000;
}

export function formatKg(value) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
