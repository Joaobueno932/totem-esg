import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { MODE_LABELS, fmt } from '../components/ui.jsx';

// Relatório consolidado por evento, formatado para impressão / PDF (Ctrl+P).
export default function ReportPage() {
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/admin/events').then((evs) => {
      setEvents(evs);
      if (evs.length > 0) setEventId(String(evs[0].id));
    }).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!eventId) return;
    setReport(null);
    api(`/api/admin/events/${eventId}/report`).then(setReport).catch((e) => setError(e.message));
  }, [eventId]);

  const totalModeCo2e = report ? Math.max(1e-9, report.by_mode.reduce((s, m) => s + m.co2e, 0)) : 1;

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Relatório do evento</h1>
        <div className="flex gap-2 items-center">
          <select
            className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
            value={eventId} onChange={(e) => setEventId(e.target.value)}
          >
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <button
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            onClick={() => window.print()}
          >
            Imprimir / salvar PDF
          </button>
        </div>
      </div>

      {error && <p className="text-red-600">{error}</p>}
      {!report && !error && <p className="text-(--muted)">Carregando…</p>}

      {report && (
        <div className="print-page mx-auto max-w-3xl rounded-xl bg-white border border-black/10 p-10 space-y-8">
          <header className="border-b border-(--grid) pb-6">
            <p className="text-sm text-emerald-800 font-semibold">🌱 Relatório Carbono Zero — transporte de participantes</p>
            <h2 className="text-3xl font-bold mt-1">{report.event.name}</h2>
            <p className="text-(--ink-2) mt-1">
              {report.event.location || 'Local não informado'}
              {report.event.start_date && ` · ${new Date(report.event.start_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`}
              {report.event.end_date && ` a ${new Date(report.event.end_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`}
            </p>
          </header>

          <section className="grid grid-cols-2 gap-6">
            <Stat label="Total de participantes" value={report.totals.participants.toLocaleString('pt-BR')} />
            <Stat label="Respostas válidas" value={report.totals.valid_answers.toLocaleString('pt-BR')} />
            <Stat label="Emissão total estimada" value={`${fmt(report.totals.total_co2e)} kg CO₂e`} />
            <Stat label="Emissão média por participante" value={`${fmt(report.totals.avg_co2e)} kg CO₂e`} />
            <Stat label="Árvores estimadas para neutralização" value={`${report.totals.trees_needed.toLocaleString('pt-BR')} árvores`} />
            <Stat label="Versão dos fatores de emissão" value={report.calculation_versions.join(', ') || '—'} />
          </section>

          <section>
            <h3 className="font-bold mb-3">Distribuição por modal de transporte</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-(--ink-2) border-b border-(--grid)">
                  <th className="py-1.5">Modal</th>
                  <th className="text-right">Participantes</th>
                  <th className="text-right">kg CO₂e</th>
                  <th className="text-right">% das emissões</th>
                </tr>
              </thead>
              <tbody>
                {report.by_mode.map((m) => (
                  <tr key={m.mode} className="border-b border-(--grid) last:border-0">
                    <td className="py-1.5">{MODE_LABELS[m.mode] || m.mode}</td>
                    <td className="text-right tabular-nums">{m.participants}</td>
                    <td className="text-right tabular-nums">{fmt(m.co2e)}</td>
                    <td className="text-right tabular-nums">{fmt((m.co2e / totalModeCo2e) * 100, 1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold mb-3">Cidades de origem</h3>
              <TwoColTable rows={report.by_city} labelKey="city" />
            </div>
            <div>
              <h3 className="font-bold mb-3">Empresas / instituições</h3>
              <TwoColTable rows={report.by_company} labelKey="company" />
            </div>
          </section>

          <section className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-950 leading-relaxed">
            <strong>Observação metodológica.</strong> {report.methodology_note}
          </section>

          <footer className="text-xs text-(--muted) border-t border-(--grid) pt-4">
            Relatório gerado em {new Date(report.generated_at).toLocaleString('pt-BR')}.
          </footer>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-sm text-(--ink-2)">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function TwoColTable({ rows, labelKey }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.slice(0, 20).map((r) => (
          <tr key={r[labelKey]} className="border-b border-(--grid) last:border-0">
            <td className="py-1">{r[labelKey]}</td>
            <td className="text-right tabular-nums">{r.participants}</td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td className="py-1 text-(--muted)">Sem dados</td></tr>}
      </tbody>
    </table>
  );
}
