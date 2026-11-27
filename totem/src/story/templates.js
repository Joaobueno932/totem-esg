// Artes para stories por evento. Cada arte é do evento (marca, data, organizador),
// então só aparece nos eventos listados aqui, reconhecidos pelo slug do link.
// O slug nasce do nome no dashboard ("Bonito 21k" → "bonito-21k"); "contém" cobre
// variações como "bonito-21k-2026".
export const STORY_TEMPLATES = [
  { id: 'bonito21k', match: (slug) => slug.includes('bonito-21k') },
];

export function storyTemplateFor(event) {
  const slug = String(event?.slug || '').toLowerCase();
  return STORY_TEMPLATES.find((t) => t.match(slug)) || null;
}

// Quilômetros do deslocamento inteiro, como o participante informou (ida e volta
// conta os dois sentidos) — a mesma distância usada no cálculo da emissão.
export function totalKm(transports) {
  return transports.reduce((sum, t) => sum + (Number(t.distance_km) || 0) * (t.round_trip ? 2 : 1), 0);
}

export const formatKmTotal = (km) => Math.round(km).toLocaleString('pt-BR');
