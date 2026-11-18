import { useEffect, useState } from 'react';
import { api, qs, canManageEvents } from '../api.js';
import { Card, FilterBar, Loading, EMPTY_FILTERS, MODE_LABELS, fmt } from '../components/ui.jsx';

const FUEL_LABELS = {
  gasolina: 'Gasolina', etanol: 'Etanol', diesel: 'Diesel', gnv: 'GNV', flex: 'Flex', outro: 'Outro',
};

export default function AnswersPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [answers, setAnswers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  // seleção por RESPOSTA (local_uuid): marcar um trecho marca todos os trechos dela
  const [selected, setSelected] = useState(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const manager = canManageEvents();

  function load() {
    setLoading(true);
    return api(`/api/admin/answers${qs(filters)}`)
      .then((rows) => { setAnswers(rows); setSelected(new Set()); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [filters]);

  const visibleUuids = [...new Set(answers.map((a) => a.local_uuid))];
  const allSelected = visibleUuids.length > 0 && visibleUuids.every((u) => selected.has(u));
  const selectedLegs = answers.filter((a) => selected.has(a.local_uuid)).length;

  function toggle(uuid) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(uuid)) next.delete(uuid); else next.add(uuid);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(visibleUuids));
  }

  async function removeSelected() {
    const n = selected.size;
    if (!window.confirm(`Excluir ${n} resposta(s) (${selectedLegs} trecho(s))?\n\nO participante de cada resposta também sai dos leads e dos relatórios. Não dá para desfazer.`)) return;
    setError('');
    setDeleting(true);
    try {
      await api('/api/admin/answers/delete', {
        method: 'POST',
        body: JSON.stringify({ local_uuids: [...selected] }),
      });
      await load();
    } catch (err) { setError(err.message); }
    finally { setDeleting(false); }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Respostas de transporte</h1>
      <FilterBar filters={filters} setFilters={setFilters} />
      {error && <p className="text-red-600">{error}</p>}

      <Card>
        <div className="mb-3 flex min-h-9 items-center justify-between gap-3 flex-wrap text-sm text-(--ink-2)">
          {loading ? <Loading label="Carregando respostas…" /> : `${answers.length.toLocaleString('pt-BR')} trechos de transporte`}
          {manager && selected.size > 0 && (
            <button className="cz-btn cz-btn-danger" style={{ padding: '6px 14px' }} onClick={removeSelected} disabled={deleting}>
              {deleting ? 'Excluindo…' : `Excluir ${selected.size} resposta(s)`}
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-(--ink-2) border-b border-(--grid)">
                {manager && (
                  <th className="w-8 py-2">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Selecionar todas as respostas" />
                  </th>
                )}
                <th className="py-2">Participante</th><th>Trecho</th><th>Modal</th><th>Combustível</th>
                <th className="text-right">Distância (km)</th><th>Trajeto</th>
                <th className="text-right">Pessoas</th><th className="text-right">kg CO₂e</th>
                <th>Versão do cálculo</th><th>Sincronizada em</th>
              </tr>
            </thead>
            <tbody>
              {answers.map((a) => (
                <tr key={a.id} className={`border-b border-(--grid) last:border-0 ${selected.has(a.local_uuid) ? 'bg-red-50' : ''}`}>
                  {manager && (
                    <td className="py-2">
                      <input type="checkbox" checked={selected.has(a.local_uuid)} onChange={() => toggle(a.local_uuid)}
                        aria-label={`Selecionar resposta de ${a.participant_name}`} />
                    </td>
                  )}
                  <td className="py-2 font-medium">{a.participant_name}</td>
                  <td className="whitespace-nowrap text-(--ink-2)">{a.leg_index + 1} de {a.legs_count}</td>
                  <td>{MODE_LABELS[a.transport_mode] || a.transport_mode}</td>
                  <td>{FUEL_LABELS[a.fuel_type] || '—'}</td>
                  <td className="text-right tabular-nums">{fmt(a.distance_km, 1)}</td>
                  <td>{a.round_trip ? 'Ida e volta' : 'Somente ida'}</td>
                  <td className="text-right tabular-nums">{a.passengers_in_vehicle}</td>
                  <td className="text-right font-semibold tabular-nums">{fmt(a.emission_kg_co2e)}</td>
                  <td className="font-mono text-xs">{a.calculation_version}</td>
                  <td className="whitespace-nowrap">{new Date(a.synced_at).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
