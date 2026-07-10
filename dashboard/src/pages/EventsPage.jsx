import { Fragment, useEffect, useState } from 'react';
import { api, isAdmin, TOTEM_URL } from '../api.js';
import { fileToScaledDataUrl } from '../img.js';
import { Card, fmt } from '../components/ui.jsx';
import EventLink from '../components/EventLink.jsx';

const EMPTY = { name: '', location: '', start_date: '', end_date: '' };
const totemLink = (slug) => `${TOTEM_URL}/${slug}`;

export default function EventsPage() {
  const admin = isAdmin();
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [openLink, setOpenLink] = useState(null); // id do evento com link/QR aberto

  // imagem: 'keep' (mantém), 'set' (nova, em imagePreview) ou 'remove'
  const [imageAction, setImageAction] = useState('keep');
  const [imagePreview, setImagePreview] = useState('');
  const [editingHasImage, setEditingHasImage] = useState(false);

  const load = () => api('/api/admin/events').then(setEvents).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  function resetForm() {
    setForm(EMPTY);
    setEditingId(null);
    setImageAction('keep');
    setImagePreview('');
    setEditingHasImage(false);
  }

  async function pickImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const dataUrl = await fileToScaledDataUrl(file);
      setImagePreview(dataUrl);
      setImageAction('set');
    } catch (err) { setError(err.message); }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const body = {
        ...form,
        location: form.location || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };
      // image_data: enviado só quando muda (nova imagem ou remoção)
      if (imageAction === 'set') body.image_data = imagePreview;
      else if (imageAction === 'remove') body.image_data = null;

      const saved = editingId
        ? await api(`/api/admin/events/${editingId}`, { method: 'PUT', body: JSON.stringify(body) })
        : await api('/api/admin/events', { method: 'POST', body: JSON.stringify(body) });
      resetForm();
      await load();
      setOpenLink(saved.id); // já mostra o link/QR do evento salvo
    } catch (err) { setError(err.message); }
  }

  function startEdit(ev) {
    setEditingId(ev.id);
    setForm({
      name: ev.name, location: ev.location || '',
      start_date: ev.start_date?.slice(0, 10) || '', end_date: ev.end_date?.slice(0, 10) || '',
    });
    setEditingHasImage(ev.has_image);
    setImageAction('keep');
    setImagePreview('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const input = 'rounded-lg border border-black/15 bg-white px-3 py-2 text-sm w-full';
  // imagem exibida no formulário: preview novo, ou "já tem imagem" ao editar
  const showsExistingImage = imageAction === 'keep' && editingHasImage;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Eventos</h1>

      {admin && (
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

            <div className="md:col-span-5 flex items-center gap-4 flex-wrap">
              {imagePreview && <img src={imagePreview} alt="Prévia" className="h-16 rounded border border-black/10" />}
              <label className="text-sm">
                <span className="block text-(--ink-2) mb-1">
                  Imagem do evento (aparece no totem)
                  {showsExistingImage && <span className="ml-1 text-emerald-700">— imagem atual definida</span>}
                </span>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pickImage} className="text-sm" />
              </label>
              {(imageAction === 'set' || showsExistingImage) && (
                <button type="button" className="text-sm text-red-600 hover:underline"
                  onClick={() => { setImageAction('remove'); setImagePreview(''); }}>
                  Remover imagem
                </button>
              )}
              {imageAction === 'remove' && <span className="text-sm text-(--muted)">Imagem será removida ao salvar.</span>}
            </div>

            <div className="md:col-span-5 flex gap-2">
              <button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
                {editingId ? 'Salvar alterações' : 'Criar evento'}
              </button>
              {editingId && (
                <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={resetForm}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </Card>
      )}

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-(--ink-2) border-b border-(--grid)">
              <th className="py-2">Nome</th><th>Local</th><th>Período</th>
              <th className="text-right">Respostas</th><th className="text-right">CO₂e total (kg)</th><th></th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <Fragment key={ev.id}>
                <tr className="border-b border-(--grid) last:border-0">
                  <td className="py-2 font-medium">
                    {ev.name}
                    {ev.has_image && <span className="ml-1" title="Tem imagem no totem">🖼️</span>}
                  </td>
                  <td>{ev.location || '—'}</td>
                  <td>{ev.start_date ? `${ev.start_date.slice(0, 10)} → ${ev.end_date?.slice(0, 10) || '?'}` : '—'}</td>
                  <td className="text-right tabular-nums">{ev.answers_count}</td>
                  <td className="text-right tabular-nums">{fmt(ev.total_co2e)}</td>
                  <td className="text-right whitespace-nowrap">
                    <button className="text-emerald-700 hover:underline"
                      onClick={() => setOpenLink(openLink === ev.id ? null : ev.id)}>
                      Link/QR
                    </button>
                    {admin && (
                      <button className="ml-3 text-emerald-700 hover:underline" onClick={() => startEdit(ev)}>
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
                {openLink === ev.id && (
                  <tr>
                    <td colSpan={6} className="pb-4">
                      <EventLink url={totemLink(ev.slug)} filename={ev.slug} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-(--muted)">
          Cada evento tem um <strong>link próprio</strong> do totem (ex.: <span className="font-mono">{TOTEM_URL}/festa-junina</span>).
          Clique em <strong>Link/QR</strong> para copiar o link ou baixar o QR code que os participantes vão escanear.
        </p>
      </Card>
    </div>
  );
}
