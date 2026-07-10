// O totem não tem mais tela de configuração: cada evento tem um link próprio
// (ex.: https://totem.../festa-junina). O slug vem da URL e a URL da API é fixada
// no build (VITE_API_URL), igual ao dashboard.
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const EVENT_CACHE_KEY = 'carbono-zero-event';

export function getApiUrl() {
  return API_URL;
}

// /festa-junina → "festa-junina" (ignora barras, query e hash)
export function getEventSlug() {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
  return path ? decodeURIComponent(path.split('/')[0]) : '';
}

export function getCachedEvent() {
  try { return JSON.parse(localStorage.getItem(EVENT_CACHE_KEY)); } catch { return null; }
}

// Resolve o evento pelo slug. Online: busca na API e guarda em cache (para reabrir
// offline durante o evento). Offline: usa o cache se for do mesmo slug.
export async function loadEvent(slug) {
  const cached = getCachedEvent();
  try {
    const res = await fetch(`${API_URL}/api/public/events/${encodeURIComponent(slug)}`);
    if (res.status === 404) return { error: 'not_found' };
    if (!res.ok) throw new Error('network');
    const ev = await res.json();
    const info = { id: ev.id, slug: ev.slug, name: ev.name, image: ev.image || null };
    localStorage.setItem(EVENT_CACHE_KEY, JSON.stringify(info));
    return { event: info };
  } catch {
    if (cached && cached.slug === slug) return { event: cached, offline: true };
    return { error: 'offline' };
  }
}
