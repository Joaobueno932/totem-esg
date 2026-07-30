import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { MODE_LABELS, fmt } from '../components/ui.jsx';

// Ícone e cor por modal, para o relatório ser legível de relance (e em preto e branco pela ordem).
const MODE_STYLE = {
  carro: { icon: '🚗', color: '#2a78d6' },
  moto: { icon: '🏍️', color: '#7a5cd6' },
  onibus: { icon: '🚌', color: '#14805a' },
  van: { icon: '🚐', color: '#0f9b8e' },
  aplicativo_taxi: { icon: '🚕', color: '#c08a1e' },
  aviao: { icon: '✈️', color: '#c0563b' },
  bicicleta_pe: { icon: '🚲', color: '#22b378' },
  outro: { icon: '🧭', color: '#8a978f' },
};
const modeStyle = (m) => MODE_STYLE[m] || MODE_STYLE.outro;

const dateBR = (d) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

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
  const maxModeParticipants = report ? Math.max(1, ...report.by_mode.map((m) => m.participants)) : 1;

  const period = report && (report.event.start_date
    ? `${dateBR(report.event.start_date)}${report.event.end_date ? ` a ${dateBR(report.event.end_date)}` : ''}`
    : 'Período não informado');
  const place = report && ([report.event.city, report.event.state].filter(Boolean).join('/') || report.event.location);

  return (
    <div className="space-y-6">
      <div className="no-print flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Relatório do evento</h1>
          <p className="text-sm text-(--ink-2) mt-0.5">
            Documento pronto para compartilhar com a organização e patrocinadores.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            className="cz-input w-auto min-w-52"
            value={eventId} onChange={(e) => setEventId(e.target.value)}
          >
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <button className="cz-btn cz-btn-primary whitespace-nowrap" onClick={() => window.print()}>
            🖨️ Imprimir / salvar PDF
          </button>
        </div>
      </div>

      {error && <p className="text-red-600">{error}</p>}
      {!report && !error && <ReportSkeleton />}

      {report && (
        <div className="print-page mx-auto max-w-3xl overflow-hidden rounded-2xl bg-white border border-(--grid) shadow-[0_1px_2px_rgba(11,45,33,.04),0_18px_40px_rgba(11,45,33,.08)]">
          {/* Capa */}
          <header className="report-cover px-8 md:px-10 py-8 text-white">
            <div className="flex items-center justify-between gap-4">
              <img src="/logo-light.svg" alt="EcoTrajeto" className="h-8" />
              <span className="rounded-full bg-white/15 px-3 py-1 text-[.7rem] font-semibold tracking-wide uppercase">
                Transporte de participantes
              </span>
            </div>
            <h2 className="mt-6 text-3xl md:text-4xl font-bold leading-tight">{report.event.name}</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {place && <CoverPill>📍 {place}</CoverPill>}
              <CoverPill>🗓️ {period}</CoverPill>
              {report.event.organizer_name && <CoverPill>🏛️ {report.event.organizer_name}</CoverPill>}
            </div>
          </header>

          {/* Destaque: emissão total */}
          <section className="px-8 md:px-10 pt-8">
            <div className="rounded-2xl border border-(--grid) bg-(--brand-50) px-6 py-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-(--ink-2)">Emissão total estimada</p>
                <p className="text-4xl font-bold text-(--brand-900) leading-none mt-1 tabular-nums">
                  {fmt(report.totals.total_co2e)}
                  <span className="text-lg font-semibold text-(--brand-700)"> kg CO₂e</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-(--ink-2)">Neutralização estimada</p>
                <p className="text-2xl font-bold text-(--brand-900) leading-none mt-1 tabular-nums">
                  🌳 {report.totals.trees_needed.toLocaleString('pt-BR')}
                  <span className="text-base font-semibold text-(--brand-700)"> árvores</span>
                </p>
              </div>
            </div>
          </section>

          {/* Indicadores */}
          <section className="px-8 md:px-10 pt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Participantes" value={report.totals.participants.toLocaleString('pt-BR')} />
            <Stat label="Respostas válidas" value={report.totals.valid_answers.toLocaleString('pt-BR')} />
            <Stat label="Trechos informados" value={report.totals.transport_legs.toLocaleString('pt-BR')} />
            <Stat label="Média por participante" value={fmt(report.totals.avg_co2e)} unit="kg CO₂e" />
          </section>

          {/* Modais */}
          <Section
            title="Distribuição por modal de transporte"
            note="Participantes que usaram mais de um transporte são contados em cada modal, então a soma da coluna pode superar o total de participantes."
          >
            {report.by_mode.length === 0
              ? <Empty />
              : (
                <ul className="space-y-3">
                  {report.by_mode.map((m) => {
                    const s = modeStyle(m.mode);
                    const share = (m.co2e / totalModeCo2e) * 100;
                    return (
                      <li key={m.mode} className="grid grid-cols-[1.6rem_minmax(0,1fr)_auto] items-center gap-x-3">
                        <span aria-hidden className="text-lg leading-none text-center">{s.icon}</span>
                        <div className="min-w-0">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-sm font-semibold truncate">{MODE_LABELS[m.mode] || m.mode}</span>
                            <span className="text-xs text-(--ink-2) tabular-nums whitespace-nowrap">
                              {m.participants} participante{m.participants === 1 ? '' : 's'} · {fmt(m.co2e)} kg
                            </span>
                          </div>
                          <div className="mt-1 h-2.5 rounded-full bg-black/5 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.max(2, (m.participants / maxModeParticipants) * 100)}%`, background: s.color }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-bold tabular-nums w-14 text-right">{fmt(share, 1)}%</span>
                      </li>
                    );
                  })}
                </ul>
              )}
          </Section>

          {/* Origem */}
          <div className="grid md:grid-cols-2">
            <Section title="Cidades de origem" compact>
              <RankList rows={report.by_city} labelKey="city" />
            </Section>
            <Section title="Empresas / instituições" compact>
              <RankList rows={report.by_company} labelKey="company" />
            </Section>
          </div>

          {/* Metodologia + rodapé */}
          <section className="px-8 md:px-10 pb-8 pt-2 space-y-4">
            <div className="rounded-xl border-l-4 border-(--brand-600) bg-(--brand-50) px-5 py-4 text-sm text-(--ink) leading-relaxed">
              <strong>Observação metodológica.</strong> {report.methodology_note}
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-(--grid) pt-4 text-xs text-(--muted)">
              <span>Gerado em {new Date(report.generated_at).toLocaleString('pt-BR')}</span>
              <span>Fatores de emissão: {report.calculation_versions.join(', ') || '—'}</span>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

function CoverPill({ children }) {
  return <span className="rounded-full bg-white/15 px-3 py-1 font-medium">{children}</span>;
}

function Section({ title, note, children, compact = false }) {
  return (
    <section className={`px-8 md:px-10 ${compact ? 'pt-6' : 'pt-8'}`}>
      <h3 className="font-bold text-(--brand-900)">{title}</h3>
      {note && <p className="text-xs text-(--muted) mt-1 leading-snug">{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Stat({ label, value, unit }) {
  return (
    <div className="rounded-xl border border-(--grid) px-4 py-3">
      <p className="text-xs text-(--ink-2) leading-snug">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">
        {value}{unit && <span className="text-xs font-semibold text-(--ink-2)"> {unit}</span>}
      </p>
    </div>
  );
}

// Lista ranqueada com barra de proporção — mais legível que a tabela de duas colunas.
function RankList({ rows, labelKey }) {
  if (rows.length === 0) return <Empty />;
  const max = Math.max(1, ...rows.map((r) => r.participants));
  return (
    <ul className="space-y-2">
      {rows.slice(0, 10).map((r) => (
        <li key={r[labelKey]}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm truncate">{r[labelKey]}</span>
            <span className="text-sm font-semibold tabular-nums">{r.participants}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-black/5 overflow-hidden">
            <div className="h-full rounded-full bg-(--brand-600)" style={{ width: `${(r.participants / max) * 100}%` }} />
          </div>
        </li>
      ))}
      {rows.length > 10 && (
        <li className="text-xs text-(--muted) pt-1">+{rows.length - 10} não listados</li>
      )}
    </ul>
  );
}

function Empty() {
  return <p className="text-sm text-(--muted)">Sem respostas registradas para este evento.</p>;
}

function ReportSkeleton() {
  return (
    <div className="mx-auto max-w-3xl rounded-2xl bg-white border border-(--grid) overflow-hidden animate-pulse">
      <div className="h-40 report-cover opacity-60" />
      <div className="p-8 space-y-4">
        <div className="h-20 rounded-2xl bg-black/5" />
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-black/5" />)}
        </div>
        <div className="h-32 rounded-xl bg-black/5" />
      </div>
    </div>
  );
}
