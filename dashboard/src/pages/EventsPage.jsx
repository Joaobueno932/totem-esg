import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Card, fmt } from '../components/ui.jsx';

const EMPTY = { name: '', location: '', start_date: '', end_date: '' };

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const load = () => api('/api/admin/events').then(setEvents).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const body = JSON.stringify({
        ...form,
        location: form.location || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      });
      if (editingId) await api(`/api/admin/events/${editingId}`, { method: 'PUT', body });
      else await api('/api/admin/events', { method: 'POST', body });
      setForm(EMPTY);
      setEditingId(null);
      load();
    } catch (err) { setError(err.message); }
  }

  const input = 'rounded-lg border border-black/15 bg-white px-3 py-2 text-sm w-full';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Eventos</h1>

      <Card>
        <h2 className="font-semibold mb-3">{editingId ? 'Editar evento' : 'Novo evento'}</h2>
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-5">
          <input className={`${input} md:col-span-2`} placeholder="Nome do evento*" required
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={input} placeholder="Local"
            value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <input className={input} type="date"
            value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          <input className={input} type="date"
            value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          <div className="md:col-span-5 flex gap-2">
            <button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
              {editingId ? 'Salvar alterações' : 'Criar evento'}
            </button>
            {editingId && (
              <button type="button" className="rounded-lg border px-4 py-2 text-sm"
                onClick={() => { setEditingId(null); setForm(EMPTY); }}>
                Cancelar
              </button>
            )}
          </div>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Card>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-(--ink-2) border-b border-(--grid)">
              <th className="py-2">ID</th><th>Nome</th><th>Local</th><th>Período</th>
              <th className="text-right">Respostas</th><th className="text-right">CO₂e total (kg)</th><th></th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id} className="border-b border-(--grid) last:border-0">
                <td className="py-2 font-mono">{ev.id}</td>
                <td className="font-medium">{ev.name}</td>
                <td>{ev.location || '—'}</td>
                <td>{ev.start_date ? `${ev.start_date.slice(0, 10)} → ${ev.end_date?.slice(0, 10) || '?'}` : '—'}</td>
                <td className="text-right tabular-nums">{ev.answers_count}</td>
                <td className="text-right tabular-nums">{fmt(ev.total_co2e)}</td>
                <td className="text-right">
                  <button className="text-emerald-700 hover:underline"
                    onClick={() => {
                      setEditingId(ev.id);
                      setForm({
                        name: ev.name, location: ev.location || '',
                        start_date: ev.start_date?.slice(0, 10) || '', end_date: ev.end_date?.slice(0, 10) || '',
                      });
                    }}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-(--muted)">
          Use o <strong>ID</strong> do evento na tela de configuração do totem (7 toques no canto superior esquerdo ou ?config=1).
        </p>
      </Card>
    </div>
  );
}
