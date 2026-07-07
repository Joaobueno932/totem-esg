// IndexedDB via Dexie: fila local de respostas com UUID próprio.
// Nada é perdido se o navegador fechar, a página recarregar ou a internet cair.
import Dexie from 'dexie';

export const db = new Dexie('carbono-zero-totem');

db.version(1).stores({
  // status: 'pending' (aguardando sync) | 'synced' (confirmada pelo servidor)
  answers: 'local_uuid, status, created_at',
});

export function newLocalUuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  // fallback para navegadores antigos / contexto não seguro
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function enqueueAnswer(payload) {
  await db.answers.put({ ...payload, status: 'pending' });
}

export async function pendingCount() {
  return db.answers.where('status').equals('pending').count();
}

export async function getPending(limit = 50) {
  return db.answers.where('status').equals('pending').limit(limit).toArray();
}

export async function markSynced(uuids) {
  await db.answers.where('local_uuid').anyOf(uuids).modify({ status: 'synced', synced_at: new Date().toISOString() });
}

// remove respostas já sincronizadas com mais de 7 dias (minimização de dados / LGPD)
export async function purgeOldSynced() {
  const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  await db.answers.where('status').equals('synced').and((a) => a.created_at < cutoff).delete();
}
