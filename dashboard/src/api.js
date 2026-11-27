// Cliente da API administrativa. O token JWT fica em sessionStorage
// (expira ao fechar o navegador) e nunca é exposto em URLs.

// Configuração de execução (public/config.js). Na imagem Docker o nginx gera esse
// arquivo com as variáveis do contêiner: a mesma imagem serve qualquer ambiente.
const RUNTIME = (typeof window !== 'undefined' && window.__APP_CONFIG__) || {};

// URL base da API. Vazio = mesma origem: /api/... no próprio host do dashboard,
// encaminhado ao backend pelo nginx da imagem (ou pelo proxy do Vite em dev).
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// Base do totem, usada para montar o link/QR de cada evento (base + '/' + slug).
// O endereço do Netlify é o padrão legado; a imagem Docker exige TOTEM_PUBLIC_URL.
export const TOTEM_URL = (RUNTIME.totemUrl || import.meta.env.VITE_TOTEM_URL || 'https://totem-esg-totem.netlify.app').replace(/\/$/, '');

// Link do totem para um evento. Quando a API tem endereço próprio e público, ele vai
// no link (?api=) para o totem publicado não depender de configuração própria. Com a
// API na mesma origem (proxy), cada aplicação usa o seu, e o link fica limpo.
export function totemEventUrl(slug) {
  const base = `${TOTEM_URL}/${slug}`;
  const embedApi = /^https?:\/\//i.test(API_URL) && !/localhost/.test(API_URL);
  return embedApi ? `${base}?api=${encodeURIComponent(API_URL)}` : base;
}

export function getToken() {
  return sessionStorage.getItem('cz-token');
}

export function setSession(token, admin) {
  sessionStorage.setItem('cz-token', token);
  sessionStorage.setItem('cz-admin', JSON.stringify(admin));
}

export function clearSession() {
  sessionStorage.removeItem('cz-token');
  sessionStorage.removeItem('cz-admin');
}

export function getAdmin() {
  try { return JSON.parse(sessionStorage.getItem('cz-admin')); } catch { return null; }
}

export function getRole() {
  return getAdmin()?.role;
}

export function isAdmin() {
  return getRole() === 'admin';
}

// Admin e organizador podem gerenciar eventos (criar/editar/excluir) e ver o operacional.
export function canManageEvents() {
  const r = getRole();
  return r === 'admin' || r === 'organizador';
}

export const ROLE_LABELS = { admin: 'Administrador', organizador: 'Organizador', viewer: 'Visualizador' };

export async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    clearSession();
    window.location.href = '/login';
    throw new Error('Sessão expirada');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status}`);
  }
  return res.json();
}

export async function downloadCsv(path, filename) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Falha na exportação');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function qs(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const s = params.toString();
  return s ? `?${s}` : '';
}
