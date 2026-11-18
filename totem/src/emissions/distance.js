// Estimativa da distância da cidade de origem até a cidade do evento — só uma sugestão
// exibida no formulário; o valor usado no cálculo é sempre o que o participante informa.
import { cityCoords } from '../data/cities.js';

const EARTH_RADIUS_KM = 6371;

// Estradas não seguem linha reta: rotas rodoviárias ficam em média ~20% acima
// da distância em linha reta (ex.: Rio→SP 358 km em linha reta, ~430 km de estrada).
// Rotas aéreas ficam próximas do grande círculo.
const ROUTE_FACTOR = { aviao: 1 };
const DEFAULT_ROUTE_FACTOR = 1.2;

function haversineKm([lat1, lon1], [lat2, lon2]) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

// Arredonda para não passar falsa precisão (ex.: 1.187 → 1.190 km).
function roundKm(km) {
  if (km < 20) return Math.round(km);
  if (km < 200) return Math.round(km / 5) * 5;
  return Math.round(km / 10) * 10;
}

// Distância só de ida, em km; 0 quando é a mesma cidade do evento (não dá para estimar
// o deslocamento dentro dela) e null quando falta cidade/coordenada.
export function estimateDistanceKm({ fromUf, fromCity, toUf, toCity, mode }) {
  const from = cityCoords(fromUf, fromCity);
  const to = cityCoords(toUf, toCity);
  if (!from || !to) return null;
  return roundKm(haversineKm(from, to) * (ROUTE_FACTOR[mode] ?? DEFAULT_ROUTE_FACTOR));
}
