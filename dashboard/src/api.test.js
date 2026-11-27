// URL da API e link/QR do totem (configuração de build e de execução).
import { afterEach, describe, expect, it, vi } from 'vitest';

// api.js lê a configuração ao carregar: cada caso recarrega o módulo.
// Os valores padrão neutralizam um .env.local do desenvolvedor.
async function load({ env = {}, runtime } = {}) {
  vi.resetModules();
  const vars = { VITE_API_URL: '', VITE_TOTEM_URL: '', ...env };
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  vi.stubGlobal('window', runtime ? { __APP_CONFIG__: runtime } : {});
  return import('./api.js');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('API_URL', () => {
  it('sem configuração usa a mesma origem (nunca localhost)', async () => {
    const { API_URL } = await load();
    expect(API_URL).toBe('');
  });

  it('usa VITE_API_URL sem a barra final', async () => {
    const { API_URL } = await load({ env: { VITE_API_URL: 'https://api.exemplo.com/' } });
    expect(API_URL).toBe('https://api.exemplo.com');
  });
});

describe('totemEventUrl', () => {
  it('configuração de execução tem prioridade sobre o build', async () => {
    const { totemEventUrl } = await load({
      env: { VITE_TOTEM_URL: 'https://build.exemplo' },
      runtime: { totemUrl: 'https://totem.exemplo/' },
    });
    expect(totemEventUrl('festa')).toBe('https://totem.exemplo/festa');
  });

  it('API na mesma origem: link sem ?api=', async () => {
    const { totemEventUrl } = await load({ env: { VITE_TOTEM_URL: 'https://totem.exemplo' } });
    expect(totemEventUrl('festa')).toBe('https://totem.exemplo/festa');
  });

  it('API com endereço próprio vai no link (deploy sem proxy)', async () => {
    const { totemEventUrl } = await load({
      env: { VITE_API_URL: 'https://api.exemplo.com', VITE_TOTEM_URL: 'https://totem.exemplo' },
    });
    expect(totemEventUrl('festa')).toBe('https://totem.exemplo/festa?api=https%3A%2F%2Fapi.exemplo.com');
  });

  it('API em localhost não vai no link', async () => {
    const { totemEventUrl } = await load({
      env: { VITE_API_URL: 'http://localhost:3001', VITE_TOTEM_URL: 'http://localhost:5173' },
    });
    expect(totemEventUrl('festa')).toBe('http://localhost:5173/festa');
  });

  it('sem nenhuma configuração mantém o endereço legado do Netlify', async () => {
    const { TOTEM_URL } = await load();
    expect(TOTEM_URL).toBe('https://totem-esg-totem.netlify.app');
  });
});
