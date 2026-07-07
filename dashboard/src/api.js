// Cliente da API administrativa. O token JWT fica em sessionStorage
// (expira ao fechar o navegador) e nunca é exposto em URLs.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
