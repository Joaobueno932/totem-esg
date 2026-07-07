// Configuração do totem (evento ativo + URL da API), guardada em localStorage.
// A equipe acessa a tela de configuração abrindo a URL com ?config=1
// ou tocando 7 vezes no canto superior esquerdo da tela inicial.
const KEY = 'carbono-zero-totem-config';

export function getConfig() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* config corrompida → retorna padrão */ }
  return { eventId: null, eventName: '', apiUrl: '' };
}

export function saveConfig(config) {
  localStorage.setItem(KEY, JSON.stringify(config));
}

export function isConfigured() {
  const c = getConfig();
  return Boolean(c.eventId && c.apiUrl);
}
