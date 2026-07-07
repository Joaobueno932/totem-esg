import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Card } from '../components/ui.jsx';

const STATUS_INFO = {
  ok: { label: 'OK', cls: 'bg-emerald-100 text-emerald-800' },
  duplicate: { label: 'Duplicada (ignorada)', cls: 'bg-sky-100 text-sky-800' },
  recalculated: { label: 'Recalculada no servidor', cls: 'bg-amber-100 text-amber-900' },
  error: { label: 'Erro', cls: 'bg-red-100 text-red-800' },
};

export default function SyncLogsPage() {
  const [status, setStatus] = useState('');
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const q = status ? `?status=${status}` : '';
    api(`/api/admin/sync-logs${q}`).then(setLogs).catch((e) => setError(e.message));
  }, [status]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Logs de sincronização</h1>
        <select
          className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
          value={status} onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          <option value="ok">OK</option>
          <option value="duplicate">Duplicadas</option>
          <option value="recalculated">Recalculadas</option>
          <option value="error">Erros</option>
        </select>
      </div>

      <p className="text-sm text-(--ink-2)">
        Respostas ainda não enviadas ficam na fila local de cada totem (visível na tela de
        configuração do próprio totem). Aqui aparecem os registros de tudo que já chegou ao servidor.
      </p>
      {error && <p className="text-red-600">{error}</p>}

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-(--ink-2) border-b border-(--grid)">
              <th className="py-2">Data/hora</th><th>UUID local</th><th>Status</th><th>Mensagem</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const info = STATUS_INFO[log.status] || { label: log.status, cls: 'bg-gray-100 text-gray-700' };
              return (
                <tr key={log.id} className="border-b border-(--grid) last:border-0">
                  <td className="py-2 whitespace-nowrap">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                  <td className="font-mono text-xs">{log.local_uuid || '—'}</td>
                  <td><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${info.cls}`}>{info.label}</span></td>
                  <td className="text-(--ink-2)">{log.error_message || '—'}</td>
                </tr>
              );
            })}
            {logs.length === 0 && <tr><td colSpan={4} className="py-3 text-(--muted)">Nenhum registro.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
