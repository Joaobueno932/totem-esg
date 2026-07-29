// O totem não tem tela de configuração: cada evento tem um link próprio
// (ex.: https://totem.../festa-junina). O slug vem do caminho da URL.
//
// A URL da API é resolvida nesta ordem, para o link "simplesmente funcionar"
// mesmo sem variável de build no totem:
//   1) parâmetro ?api=... no link (o dashboard já embute a URL da API que ele usa);
//   2) valor guardado em cache (de um acesso anterior);
//   3) VITE_API_URL do build;
//   4) localhost (desenvolvimento).
const BUILD_API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const EVENT_CACHE_KEY = 'carbono-zero-event';
const API_CACHE_KEY = 'carbono-zero-api-url';

export function getApiUrl() {
  const fromUrl = new URLSearchParams(window.location.search).get('api');
  if (fromUrl) {
    try { localStorage.setItem(API_CACHE_KEY, fromUrl); } catch { /* storage cheio/bloqueado */ }
    return fromUrl.replace(/\/$/, '');
  }
  try {
    const cached = localStorage.getItem(API_CACHE_KEY);
    if (cached) return cached.replace(/\/$/, '');
  } catch { /* ignore */ }
  return BUILD_API || 'http://localhost:3001';
}

// /festa-junina → "festa-junina" (ignora barras, query e hash)
export function getEventSlug() {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
  return path ? decodeURIComponent(path.split('/')[0]) : '';
}

// Remove o ?api=... da barra de endereço depois de resolvido (link fica limpo).
export function cleanUrl() {
  if (window.location.search) {
    window.history.replaceState({}, '', window.location.pathname);
  }
}

export function getCachedEvent() {
  try { return JSON.parse(localStorage.getItem(EVENT_CACHE_KEY)); } catch { return null; }
}

// Resolve o evento pelo slug. Online: busca na API e guarda em cache (para reabrir
// offline durante o evento). Offline: usa o cache se for do mesmo slug.
export async function loadEvent(slug) {
  const cached = getCachedEvent();
  try {
    const res = await fetch(`${getApiUrl()}/api/public/events/${encodeURIComponent(slug)}`);
    if (res.status === 404) return { error: 'not_found' };
    if (!res.ok) throw new Error('network');
    const ev = await res.json();
    const info = {
      id: ev.id, slug: ev.slug, name: ev.name, image: ev.image || null,
      description: ev.description || null, organizer_name: ev.organizer_name || null,
      location: ev.location || null, city: ev.city || null, state: ev.state || null,
    };
    localStorage.setItem(EVENT_CACHE_KEY, JSON.stringify(info));
    return { event: info };
  } catch {
    if (cached && cached.slug === slug) return { event: cached, offline: true };
    return { error: 'offline' };
  }
}
