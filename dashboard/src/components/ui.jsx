import { useEffect, useState } from 'react';
import { api } from '../api.js';

export const MODE_LABELS = {
  carro: 'Carro', moto: 'Moto', onibus: 'Ônibus', van: 'Van',
  aplicativo_taxi: 'App/Táxi', aviao: 'Avião', bicicleta_pe: 'Bicicleta/A pé', outro: 'Outro',
};

export function fmt(n, digits = 2) {
  return Number(n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-xl bg-(--surface) border border-black/10 p-5 ${className}`}>
      {children}
    </div>
  );
}

export function KpiCard({ label, value, unit, hint }) {
  return (
    <Card>
      <p className="text-sm text-(--ink-2)">{label}</p>
      <p className="mt-1 text-3xl font-bold text-(--ink)">
        {value}{unit && <span className="text-base font-semibold text-(--ink-2)"> {unit}</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-(--muted)">{hint}</p>}
    </Card>
  );
}

// Barra horizontal simples para listas ranqueadas (cidades, empresas)
export function BarList({ items, labelKey, valueKey, color = 'var(--series-blue)', formatValue = (v) => v }) {
  const max = Math.max(1, ...items.map((i) => Number(i[valueKey])));
  return (
    <div className="space-y-2">
      {items.length === 0 && <p className="text-sm text-(--muted)">Sem dados para os filtros atuais.</p>}
      {items.map((item) => (
        <div key={item[labelKey]} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 items-center">
          <div className="min-w-0">
            <p className="text-sm truncate">{item[labelKey]}</p>
            <div className="mt-0.5 h-2 rounded-sm bg-black/5">
              <div
                className="h-2 rounded-sm"
                style={{ width: `${(Number(item[valueKey]) / max) * 100}%`, background: color }}
              />
            </div>
          </div>
          <span className="text-sm font-semibold tabular-nums">{formatValue(item[valueKey])}</span>
        </div>
      ))}
    </div>
  );
}

// Barra de filtros compartilhada (evento, período, cidade, estado, modal, empresa)
export function FilterBar({ filters, setFilters, showMode = true }) {
  const [events, setEvents] = useState([]);
  useEffect(() => { api('/api/admin/events').then(setEvents).catch(() => {}); }, []);

  const input = 'rounded-lg border border-black/15 bg-white px-3 py-2 text-sm';
  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="no-print flex flex-wrap gap-2 items-end">
      <label className="text-xs text-(--ink-2) flex flex-col gap-1">
        Evento
        <select className={input} value={filters.event_id} onChange={set('event_id')}>
          <option value="">Todos</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </label>
      <label className="text-xs text-(--ink-2) flex flex-col gap-1">
        De
        <input type="date" className={input} value={filters.from} onChange={set('from')} />
      </label>
      <label className="text-xs text-(--ink-2) flex flex-col gap-1">
        Até
        <input type="date" className={input} value={filters.to} onChange={set('to')} />
      </label>
      <label className="text-xs text-(--ink-2) flex flex-col gap-1">
        Cidade
        <input className={input} value={filters.city} onChange={set('city')} placeholder="Filtrar cidade" />
      </label>
      <label className="text-xs text-(--ink-2) flex flex-col gap-1">
        Estado
        <input className={input} value={filters.state} onChange={set('state')} placeholder="UF" maxLength={2} />
      </label>
      {showMode && (
        <label className="text-xs text-(--ink-2) flex flex-col gap-1">
          Modal
          <select className={input} value={filters.mode} onChange={set('mode')}>
            <option value="">Todos</option>
            {Object.entries(MODE_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
      )}
      <label className="text-xs text-(--ink-2) flex flex-col gap-1">
        Empresa
        <input className={input} value={filters.company} onChange={set('company')} placeholder="Filtrar empresa" />
      </label>
      <button
        className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm hover:bg-black/5"
        onClick={() => setFilters({ event_id: '', from: '', to: '', city: '', state: '', mode: '', company: '' })}
      >
        Limpar
      </button>
    </div>
  );
}

export const EMPTY_FILTERS = { event_id: '', from: '', to: '', city: '', state: '', mode: '', company: '' };
