import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { api, qs } from '../api.js';
import { Card, KpiCard, BarList, FilterBar, EMPTY_FILTERS, MODE_LABELS, fmt } from '../components/ui.jsx';

export default function DashboardPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/api/admin/stats${qs(filters)}`).then(setStats).catch((e) => setError(e.message));
  }, [filters]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!stats) return <p className="text-(--muted)">Carregando…</p>;

  const { totals } = stats;
  const modeData = stats.by_mode.map((m) => ({
    name: MODE_LABELS[m.mode] || m.mode,
    co2e: Math.round(m.co2e * 100) / 100,
    participants: m.participants,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Dashboard do evento</h1>
      </div>

      <FilterBar filters={filters} setFilters={setFilters} />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Participantes" value={totals.participants.toLocaleString('pt-BR')} />
        <KpiCard
          label="Leads coletados" value={totals.leads.toLocaleString('pt-BR')}
          hint={`${totals.marketing_leads.toLocaleString('pt-BR')} aceitaram comunicações`}
        />
        <KpiCard label="Emissão total" value={fmt(totals.total_co2e)} unit="kg CO₂e" />
        <KpiCard label="Emissão média" value={fmt(totals.avg_co2e)} unit="kg CO₂e / participante" />
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Árvores para neutralizar" value={totals.trees_needed.toLocaleString('pt-BR')} unit="árvores"
          hint={`1 árvore ≈ ${fmt(totals.trees_kg_per_tree)} kg CO₂e em 20 anos`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold mb-1">Emissão por modal de transporte</h2>
          <p className="text-xs text-(--muted) mb-3">kg CO₂e</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={modeData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--muted)' }} tickLine={false} axisLine={{ stroke: 'var(--grid)' }} interval={0} angle={-20} textAnchor="end" height={52} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--muted)' }} tickLine={false} axisLine={false} width={56} />
              <Tooltip
                formatter={(v, name) => [name === 'co2e' ? `${fmt(v)} kg CO₂e` : v, name === 'co2e' ? 'Emissão' : 'Participantes']}
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
              />
              <Bar dataKey="co2e" fill="var(--series-green)" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="font-semibold mb-1">Participantes por modal</h2>
          <p className="text-xs text-(--muted) mb-3">nº de respostas</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={modeData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--muted)' }} tickLine={false} axisLine={{ stroke: 'var(--grid)' }} interval={0} angle={-20} textAnchor="end" height={52} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--muted)' }} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
              <Tooltip formatter={(v) => [v, 'Participantes']} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="participants" fill="var(--series-blue)" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="font-semibold mb-3">Participantes por cidade</h2>
          <BarList items={stats.by_city} labelKey="city" valueKey="participants" color="var(--series-blue)" />
        </Card>

        <Card>
          <h2 className="font-semibold mb-3">Participantes por empresa/instituição</h2>
          <BarList items={stats.by_company} labelKey="company" valueKey="participants" color="var(--series-green)" />
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold mb-3">Ranking — maiores emissões individuais</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-(--ink-2) border-b border-(--grid)">
              <th className="py-2">#</th><th>Nome</th><th>Empresa</th><th>Cidade</th><th>Modal</th>
              <th className="text-right">kg CO₂e</th>
            </tr>
          </thead>
          <tbody>
            {stats.ranking.map((r, i) => (
              <tr key={i} className="border-b border-(--grid) last:border-0">
                <td className="py-2 text-(--muted)">{i + 1}</td>
                <td className="font-medium">{r.name}</td>
                <td>{r.company || '—'}</td>
                <td>{r.city || '—'}</td>
                <td>{MODE_LABELS[r.transport_mode] || r.transport_mode}</td>
                <td className="text-right font-semibold tabular-nums">{fmt(r.emission_kg_co2e)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
