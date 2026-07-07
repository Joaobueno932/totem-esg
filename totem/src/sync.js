// Sincronização automática da fila local com o backend.
// Dispara: ao voltar a conexão (evento 'online'), a cada 60 s e após cada resposta.
// Falhou? Os dados continuam em IndexedDB e serão reenviados depois.
import { getPending, markSynced, purgeOldSynced } from './db.js';
import { getConfig } from './config.js';

let syncing = false;
const listeners = new Set();

export function onSyncChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn());
}

export async function trySync() {
  if (syncing || !navigator.onLine) return;
  const { apiUrl } = getConfig();
  if (!apiUrl) return;

  syncing = true;
  try {
    const pending = await getPending();
    if (pending.length === 0) return;

    const answers = pending.map(({ status, synced_at, ...payload }) => payload);
    const res = await fetch(`${apiUrl.replace(/\/$/, '')}/api/sync/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    if (!res.ok) return; // mantém tudo pendente; tentará de novo

    const { results } = await res.json();
    // 'ok' inclui duplicados (idempotência por UUID). Erros de validação também são
    // marcados como sincronizados para não travar a fila — ficam registrados em sync_logs.
    const done = results
      .filter((r) => r.status === 'ok' || r.status === 'error')
      .map((r) => r.local_uuid)
      .filter(Boolean);
    if (done.length > 0) await markSynced(done);
    await purgeOldSynced();
  } catch {
    // sem rede ou servidor fora: silencioso, dados seguem salvos localmente
  } finally {
    syncing = false;
    notify();
  }
}

export function startAutoSync() {
  window.addEventListener('online', trySync);
  setInterval(trySync, 60_000);
  trySync();
}
