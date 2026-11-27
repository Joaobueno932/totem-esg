// Resolução da URL da API do totem (mesma origem, build, link ?api= e cache).
import { afterEach, describe, expect, it, vi } from 'vitest';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
}

// config.js lê as variáveis de build ao carregar: cada caso recarrega o módulo.
// Os valores padrão neutralizam um .env.local do desenvolvedor.
async function load({ env = {}, search = '', storage = {} } = {}) {
  vi.resetModules();
  const vars = { VITE_API_URL: '', VITE_ALLOW_API_OVERRIDE: '', ...env };
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  const localStorage = memoryStorage(storage);
  vi.stubGlobal('window', { location: { search, pathname: '/festa-junina' } });
  vi.stubGlobal('localStorage', localStorage);
  return { ...(await import('./config.js')), localStorage };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('getApiUrl', () => {
  it('sem configuração usa a mesma origem (nunca localhost)', async () => {
    const { getApiUrl } = await load();
    expect(getApiUrl()).toBe('');
  });

  it('usa VITE_API_URL sem a barra final', async () => {
    const { getApiUrl } = await load({ env: { VITE_API_URL: 'https://api.exemplo.com/' } });
    expect(getApiUrl()).toBe('https://api.exemplo.com');
  });

  it('aceita ?api= do link e guarda em cache (comportamento padrão)', async () => {
    const { getApiUrl, localStorage } = await load({ search: '?api=https%3A%2F%2Fapi.netlify.app%2F' });
    expect(getApiUrl()).toBe('https://api.netlify.app');
    expect(localStorage.getItem('carbono-zero-api-url')).toBe('https://api.netlify.app/');
  });

  it('usa a URL em cache quando o link não traz ?api=', async () => {
    const { getApiUrl } = await load({ storage: { 'carbono-zero-api-url': 'https://api.cache.app' } });
    expect(getApiUrl()).toBe('https://api.cache.app');
  });

  it('com VITE_ALLOW_API_OVERRIDE=false ignora ?api= e cache', async () => {
    const { getApiUrl, localStorage } = await load({
      env: { VITE_ALLOW_API_OVERRIDE: 'false' },
      search: '?api=https://atacante.example',
      storage: { 'carbono-zero-api-url': 'https://outro.example' },
    });
    expect(getApiUrl()).toBe('');
    expect(localStorage.getItem('carbono-zero-api-url')).toBe('https://outro.example');
  });
});

describe('getEventSlug', () => {
  it('lê o primeiro segmento do caminho', async () => {
    const { getEventSlug } = await load();
    expect(getEventSlug()).toBe('festa-junina');
  });
});
