// Municípios por UF (gerado por scripts/fetch-cities.mjs): { "UF": [[nome, lat, lon], ...] }
import CITIES_BY_UF from './cities.json';

export const UFS = Object.keys(CITIES_BY_UF);

export function cityNames(uf) {
  return (CITIES_BY_UF[uf] || []).map(([name]) => name);
}

// A cidade do evento vem do CEP (ViaCEP) ou é digitada no dashboard: a comparação
// ignora acento, caixa e um sufixo de UF ("Campo Grande - MS", "Campo Grande/MS").
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/\s*(?:[-/,]\s*|\()[a-z]{2}\)?\s*$/, '').trim();

// [lat, lon] da sede do município, ou null se não houver
export function cityCoords(uf, city) {
  if (!uf || !city) return null;
  const key = norm(city);
  const found = (CITIES_BY_UF[uf.toUpperCase()] || []).find(([name]) => norm(name) === key);
  return found && found.length === 3 ? [found[1], found[2]] : null;
}
