import { useEffect, useMemo, useState } from 'react';
import { api, qs } from '../api.js';
import { MODE_LABELS, fmt, Loading } from '../components/ui.jsx';

const dateBR = (d) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const EMPTY = { event_id: '', from: '', to: '', city: '', state: '', mode: '', company: '' };

// Relatório consolidado, formatado para impressão / PDF (Ctrl+P).
// Sem evento selecionado o relatório cobre todos os eventos do recorte de filtros.
export default function ReportPage() {
  const [events, setEvents] = useState([]);
  const [filters, setFilters] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY); // só consulta ao clicar em "Gerar"
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/admin/events').then(setEvents).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    api(`/api/admin/report${qs(applied)}`)
      .then(setReport)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [applied]);

  const totalModeCo2e = report ? Math.max(1e-9, report.by_mode.reduce((s, m) => s + m.co2e, 0)) : 1;

  const scope = useMemo(() => describeScope(applied, events), [applied, events]);
  const dirty = JSON.stringify(filters) !== JSON.stringify(applied);

  // O cabeçalho/rodapé do PDF usa o title da página; sem isso sai "PegadaNeutra — Painel".
  function print() {
    const previous = document.title;
    document.title = `Relatorio PegadaNeutra - ${report?.event?.name || 'consolidado'}`;
    window.print();
    setTimeout(() => { document.title = previous; }, 500);
  }

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="no-print flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Relatório</h1>
          <p className="text-sm text-(--ink-2) mt-0.5">
            Monte o recorte por evento, período ou origem e gere o PDF.
          </p>
        </div>
        <button className="cz-btn cz-btn-primary" onClick={print} disabled={!report}>
          🖨️ Imprimir / salvar PDF
        </button>
      </div>

      {/* ---- Painel de filtros ---- */}
      <div className="no-print cz-card p-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Evento" hint="Vazio = todos os eventos">
            <select className="cz-input" value={filters.event_id} onChange={set('event_id')}>
              <option value="">Todos os eventos</option>
              {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </Field>
          <Field label="Modal">
            <select className="cz-input" value={filters.mode} onChange={set('mode')}>
              <option value="">Todos</option>
              {Object.entries(MODE_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </Field>
          <Field label="De">
            <input type="date" className="cz-input" value={filters.from} onChange={set('from')} />
          </Field>
          <Field label="Até">
            <input type="date" className="cz-input" value={filters.to} onChange={set('to')} />
          </Field>
          <Field label="Cidade">
            <input className="cz-input" value={filters.city} onChange={set('city')} placeholder="Ex.: Campo Grande" />
          </Field>
          <Field label="Estado (UF)">
            <input className="cz-input uppercase" value={filters.state} onChange={set('state')} placeholder="MS" maxLength={2} />
          </Field>
          <Field label="Empresa / instituição">
            <input className="cz-input" value={filters.company} onChange={set('company')} placeholder="Ex.: FIEMS" />
          </Field>
          <div className="flex items-end gap-2">
            <button className="cz-btn cz-btn-primary flex-1 justify-center" onClick={() => setApplied(filters)}>
              Gerar relatório
            </button>
            <button className="cz-btn cz-btn-ghost" onClick={() => { setFilters(EMPTY); setApplied(EMPTY); }}>
              Limpar
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-(--grid) pt-3">
          <span className="text-xs font-semibold text-(--ink-2)">Recorte atual:</span>
          {scope.chips.map((c) => (
            <span key={c} className="rounded-full bg-(--brand-50) px-3 py-1 text-xs font-semibold text-(--brand-700)">{c}</span>
          ))}
          {dirty && <span className="text-xs text-amber-700">• filtros alterados — clique em “Gerar relatório”</span>}
        </div>
      </div>

      {error && <p className="text-red-600">{error}</p>}
      {loading && !error && <Loading label="Gerando relatório…" />}

      {report && !loading && (
        <div className="print-page mx-auto max-w-3xl rounded-xl bg-white border border-black/10 p-10 space-y-8">
          <header className="border-b border-(--grid) pb-6">
            <p className="text-sm text-emerald-800 font-semibold">🌱 Relatório PegadaNeutra — transporte de participantes</p>
            <h2 className="text-3xl font-bold mt-1">{report.event ? report.event.name : 'Relatório consolidado'}</h2>
            <p className="text-(--ink-2) mt-1">
              {report.event ? (
                <>
                  {report.event.location || 'Local não informado'}
                  {report.event.start_date && ` · ${dateBR(report.event.start_date)}`}
                  {report.event.end_date && ` a ${dateBR(report.event.end_date)}`}
                </>
              ) : scope.line}
            </p>
            {report.event && scope.extra && <p className="text-(--ink-2) text-sm mt-0.5">{scope.extra}</p>}
          </header>

          <section className="grid grid-cols-2 gap-6">
            <Stat label="Total de participantes" value={report.totals.participants.toLocaleString('pt-BR')} />
            <Stat
              label="Respostas válidas"
              value={report.totals.valid_answers.toLocaleString('pt-BR')}
              hint={`${report.totals.transport_legs.toLocaleString('pt-BR')} trechos de transporte informados`}
            />
            <Stat label="Emissão total estimada" value={`${fmt(report.totals.total_co2e)} kg CO₂e`} />
            <Stat label="Emissão média por participante" value={`${fmt(report.totals.avg_co2e)} kg CO₂e`} />
            <Stat label="Árvores estimadas para neutralização" value={`${report.totals.trees_needed.toLocaleString('pt-BR')} árvores`} />
            <Stat label="Versão dos fatores de emissão" value={report.calculation_versions.join(', ') || '—'} />
          </section>

          {!report.event && report.by_event.length > 0 && (
            <section>
              <h3 className="font-bold mb-3">Eventos incluídos</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-(--ink-2) border-b border-(--grid)">
                    <th className="py-1.5">Evento</th>
                    <th className="text-right">Participantes</th>
                    <th className="text-right">kg CO₂e</th>
                  </tr>
                </thead>
                <tbody>
                  {report.by_event.map((e) => (
                    <tr key={e.id} className="border-b border-(--grid) last:border-0">
                      <td className="py-1.5">{e.name}</td>
                      <td className="text-right tabular-nums">{e.participants}</td>
                      <td className="text-right tabular-nums">{fmt(e.co2e)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <section>
            <h3 className="font-bold mb-1">Distribuição por modal de transporte</h3>
            <p className="text-xs text-(--muted) mb-3">
              Participantes que usaram mais de um transporte são contados em cada modal,
              então a soma da coluna pode superar o total de participantes.
            </p>
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
                {report.by_mode.length === 0 && (
                  <tr><td className="py-1.5 text-(--muted)" colSpan={4}>Sem respostas para este recorte.</td></tr>
                )}
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

// Descreve o recorte em texto (para o documento) e em chips (para o painel de filtros).
function describeScope(f, events) {
  const chips = [];
  const eventName = f.event_id && events.find((e) => String(e.id) === String(f.event_id))?.name;
  chips.push(eventName || 'Todos os eventos');
  if (f.from || f.to) {
    chips.push(f.from && f.to ? `${dateBR(f.from)} a ${dateBR(f.to)}`
      : f.from ? `A partir de ${dateBR(f.from)}` : `Até ${dateBR(f.to)}`);
  } else {
    chips.push('Período completo');
  }
  if (f.city) chips.push(`Cidade: ${f.city}`);
  if (f.state) chips.push(`UF: ${f.state.toUpperCase()}`);
  if (f.mode) chips.push(`Modal: ${MODE_LABELS[f.mode] || f.mode}`);
  if (f.company) chips.push(`Empresa: ${f.company}`);

  const extra = chips.slice(1).join(' · ');
  return { chips, line: chips.join(' · '), extra: extra || null };
}

function Field({ label, hint, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-(--ink-2)">{label}</span>
      {children}
      {hint && <span className="text-[.68rem] text-(--muted)">{hint}</span>}
    </label>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div>
      <p className="text-sm text-(--ink-2)">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {hint && <p className="text-xs text-(--muted)">{hint}</p>}
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
