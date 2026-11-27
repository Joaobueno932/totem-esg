// Municípios por UF (gerado por scripts/fetch-cities.mjs): { "UF": [[nome, lat, lon], ...] }
import CITIES_BY_UF from './cities.json';

export const UFS = Object.keys(CITIES_BY_UF);

// Só para exibição no seletor ("MS — Mato Grosso do Sul"); o valor salvo continua a sigla.
export const UF_NAMES = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná',
  PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina',
  SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};

export function cityNames(uf) {
  return (CITIES_BY_UF[uf] || []).map(([name]) => name);
}

// A cidade do evento vem do CEP (ViaCEP) ou é digitada no dashboard: a comparação
// ignora acento, caixa e um sufixo de UF ("Campo Grande - MS", "Campo Grande/MS").
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const norm = (s) => fold(s).replace(/\s*(?:[-/,]\s*|\()[a-z]{2}\)?\s*$/, '').trim();

// Busca da cidade de origem: ignora acento e caixa; quem começa com o texto vem primeiro.
export function searchCities(uf, query, limit = 8) {
  const q = fold(query).trim();
  const names = cityNames(uf);
  if (!q) return names.slice(0, limit);
  const starts = [];
  const contains = [];
  for (const name of names) {
    const f = fold(name);
    if (f.startsWith(q)) starts.push(name);
    else if (f.includes(q)) contains.push(name);
  }
  return [...starts, ...contains].slice(0, limit);
}

// Nome oficial da cidade quando o texto digitado é exatamente ela (sem acento/caixa).
export function matchCity(uf, text) {
  const q = fold(text).trim();
  return q ? cityNames(uf).find((name) => fold(name) === q) || null : null;
}

// [lat, lon] da sede do município, ou null se não houver
export function cityCoords(uf, city) {
  if (!uf || !city) return null;
  const key = norm(city);
  const found = (CITIES_BY_UF[uf.toUpperCase()] || []).find(([name]) => norm(name) === key);
  return found && found.length === 3 ? [found[1], found[2]] : null;
}
