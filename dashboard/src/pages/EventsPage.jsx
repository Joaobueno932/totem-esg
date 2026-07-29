import { Fragment, useEffect, useState } from 'react';
import { api, canManageEvents, totemEventUrl } from '../api.js';
import { fileToScaledDataUrl } from '../img.js';
import { Card, fmt } from '../components/ui.jsx';
import EventLink from '../components/EventLink.jsx';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const EMPTY = {
  name: '', location: '', city: '', state: '', start_date: '', end_date: '',
  expected_attendees: '', organizer_name: '', contact_email: '', contact_phone: '', description: '',
};

export default function EventsPage() {
  const admin = canManageEvents();
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [openLink, setOpenLink] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [imageAction, setImageAction] = useState('keep'); // keep | set | remove
  const [imagePreview, setImagePreview] = useState('');
  const [editingHasImage, setEditingHasImage] = useState(false);

  const load = () => api('/api/admin/events').then(setEvents).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function resetForm() {
    setForm(EMPTY); setEditingId(null); setShowForm(false);
    setImageAction('keep'); setImagePreview(''); setEditingHasImage(false);
  }

  function openNew() {
    setForm(EMPTY); setEditingId(null); setImageAction('keep');
    setImagePreview(''); setEditingHasImage(false); setShowForm(true);
  }

  async function pickImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      setImagePreview(await fileToScaledDataUrl(file));
      setImageAction('set');
    } catch (err) { setError(err.message); }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const body = {
        name: form.name,
        location: form.location || null,
        city: form.city || null,
        state: form.state || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        expected_attendees: form.expected_attendees === '' ? null : Number(form.expected_attendees),
        organizer_name: form.organizer_name || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        description: form.description || null,
      };
      if (imageAction === 'set') body.image_data = imagePreview;
      else if (imageAction === 'remove') body.image_data = null;

      const saved = editingId
        ? await api(`/api/admin/events/${editingId}`, { method: 'PUT', body: JSON.stringify(body) })
        : await api('/api/admin/events', { method: 'POST', body: JSON.stringify(body) });
      resetForm();
      await load();
      setOpenLink(saved.id);
    } catch (err) { setError(err.message); }
  }

  function startEdit(ev) {
    setEditingId(ev.id); setShowForm(true);
    setForm({
      name: ev.name, location: ev.location || '', city: ev.city || '', state: ev.state || '',
      start_date: ev.start_date?.slice(0, 10) || '', end_date: ev.end_date?.slice(0, 10) || '',
      expected_attendees: ev.expected_attendees ?? '', organizer_name: ev.organizer_name || '',
      contact_email: ev.contact_email || '', contact_phone: ev.contact_phone || '', description: ev.description || '',
    });
    setEditingHasImage(ev.has_image); setImageAction('keep'); setImagePreview('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function remove(ev) {
    if (!window.confirm(`Excluir o evento "${ev.name}"?\n\nIsto apaga também os ${ev.answers_count} participante(s)/resposta(s) deste evento. Não dá para desfazer.`)) return;
    setError('');
    try {
      await api(`/api/admin/events/${ev.id}`, { method: 'DELETE' });
      if (editingId === ev.id) resetForm();
      await load();
    } catch (err) { setError(err.message); }
  }

  const showsExistingImage = imageAction === 'keep' && editingHasImage;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-(--ink)">Eventos</h1>
          <p className="text-sm text-(--ink-2)">Crie o evento e compartilhe o link/QR do totem.</p>
        </div>
        {admin && !showForm && (
          <button className="cz-btn cz-btn-primary" onClick={openNew}>＋ Novo evento</button>
        )}
      </div>

      {admin && showForm && (
        <Card>
          <h2 className="font-semibold mb-4 text-(--ink)">{editingId ? 'Editar evento' : 'Novo evento'}</h2>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-6">
            <Field className="sm:col-span-4" label="Nome do evento*">
              <input className="cz-input" required value={form.name} onChange={set('name')} placeholder="Ex.: Feira de Sustentabilidade 2026" />
            </Field>
            <Field className="sm:col-span-2" label="Organizador">
              <input className="cz-input" value={form.organizer_name} onChange={set('organizer_name')} placeholder="Empresa / instituição" />
            </Field>

            <Field className="sm:col-span-3" label="Local (espaço/endereço)">
              <input className="cz-input" value={form.location} onChange={set('location')} placeholder="Ex.: Centro de Convenções" />
            </Field>
            <Field className="sm:col-span-2" label="Cidade">
              <input className="cz-input" value={form.city} onChange={set('city')} placeholder="Cidade" />
            </Field>
            <Field className="sm:col-span-1" label="UF">
              <select className="cz-input" value={form.state} onChange={set('state')}>
                <option value="">—</option>
                {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </Field>

            <Field className="sm:col-span-2" label="Início">
              <input className="cz-input" type="date" value={form.start_date} onChange={set('start_date')} />
            </Field>
            <Field className="sm:col-span-2" label="Término">
              <input className="cz-input" type="date" value={form.end_date} onChange={set('end_date')} />
            </Field>
            <Field className="sm:col-span-2" label="Público estimado">
              <input className="cz-input" type="number" min="0" value={form.expected_attendees} onChange={set('expected_attendees')} placeholder="Nº de pessoas" />
            </Field>

            <Field className="sm:col-span-3" label="E-mail de contato">
              <input className="cz-input" type="email" value={form.contact_email} onChange={set('contact_email')} placeholder="contato@evento.com" />
            </Field>
            <Field className="sm:col-span-3" label="Telefone de contato">
              <input className="cz-input" value={form.contact_phone} onChange={set('contact_phone')} placeholder="(00) 00000-0000" />
            </Field>

            <Field className="sm:col-span-6" label="Descrição (aparece no totem)">
              <textarea className="cz-input min-h-24 resize-y" value={form.description} onChange={set('description')} maxLength={2000}
                placeholder="Sobre o evento…" />
            </Field>

            <div className="sm:col-span-6 flex items-center gap-4 flex-wrap">
              {imagePreview && <img src={imagePreview} alt="Prévia" className="h-16 rounded-lg border border-(--grid)" />}
              <label className="text-sm text-(--ink-2)">
                <span className="block mb-1 font-medium">
                  Imagem do evento (aparece no totem)
                  {showsExistingImage && <span className="ml-1 text-emerald-700">— já definida</span>}
                </span>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pickImage} className="text-sm" />
              </label>
              {(imageAction === 'set' || showsExistingImage) && (
                <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => { setImageAction('remove'); setImagePreview(''); }}>
                  Remover imagem
                </button>
              )}
              {imageAction === 'remove' && <span className="text-sm text-(--muted)">Imagem será removida ao salvar.</span>}
            </div>

            <div className="sm:col-span-6 flex gap-2 pt-1">
              <button className="cz-btn cz-btn-primary">{editingId ? 'Salvar alterações' : 'Criar evento'}</button>
              <button type="button" className="cz-btn cz-btn-ghost" onClick={resetForm}>Cancelar</button>
            </div>
          </form>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </Card>
      )}

      {error && !showForm && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-(--ink-2) border-b border-(--grid)">
                <th className="py-2.5">Evento</th><th>Local</th><th>Período</th>
                <th className="text-right">Respostas</th><th className="text-right">CO₂e (kg)</th><th></th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <Fragment key={ev.id}>
                  <tr className="border-b border-(--grid) last:border-0 align-top">
                    <td className="py-3">
                      <div className="font-semibold text-(--ink) flex items-center gap-1.5">
                        {ev.name}{ev.has_image && <span title="Tem imagem no totem">🖼️</span>}
                      </div>
                      {ev.organizer_name && <div className="text-xs text-(--muted)">{ev.organizer_name}</div>}
                    </td>
                    <td>{[ev.city, ev.state].filter(Boolean).join('/') || ev.location || '—'}</td>
                    <td className="whitespace-nowrap">{ev.start_date ? `${ev.start_date.slice(0, 10)}${ev.end_date ? ' → ' + ev.end_date.slice(0, 10) : ''}` : '—'}</td>
                    <td className="text-right tabular-nums">{ev.answers_count}</td>
                    <td className="text-right tabular-nums">{fmt(ev.total_co2e)}</td>
                    <td className="text-right whitespace-nowrap">
                      <button className="cz-btn cz-btn-ghost" style={{ padding: '6px 12px' }} onClick={() => setOpenLink(openLink === ev.id ? null : ev.id)}>
                        🔗 Link/QR
                      </button>
                      {admin && (
                        <>
                          <button className="text-(--brand-700) hover:underline ml-3 text-sm font-medium" onClick={() => startEdit(ev)}>Editar</button>
                          <button className="text-red-600 hover:underline ml-3 text-sm font-medium" onClick={() => remove(ev)}>Excluir</button>
                        </>
                      )}
                    </td>
                  </tr>
                  {openLink === ev.id && (
                    <tr><td colSpan={6} className="pb-4"><EventLink url={totemEventUrl(ev.slug)} filename={ev.slug} /></td></tr>
                  )}
                </Fragment>
              ))}
              {events.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-(--muted)">Nenhum evento ainda. Clique em “Novo evento”.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, className = '', children }) {
  return (
    <label className={`text-sm font-medium text-(--ink-2) flex flex-col gap-1.5 ${className}`}>
      {label}
      {children}
    </label>
  );
}
