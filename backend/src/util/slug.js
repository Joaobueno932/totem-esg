// Gera um slug legível a partir do nome do evento: "Festa Junina 2026" → "festa-junina-2026".
// Usado no link/QR do totem (totem.app/<slug>).
const DIACRITICS = /[̀-ͯ]/g; // marcas de acento após normalizar em NFD

export function slugify(text) {
  return String(text)
    .normalize('NFD').replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'evento';
}

// Garante unicidade consultando o banco. isTaken(slug) → boolean.
// Colisão vira "festa-junina-2", "festa-junina-3"...
export async function uniqueSlug(base, isTaken) {
  const root = slugify(base);
  let candidate = root;
  let n = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await isTaken(candidate)) {
    candidate = `${root}-${n}`;
    n += 1;
  }
  return candidate;
}
