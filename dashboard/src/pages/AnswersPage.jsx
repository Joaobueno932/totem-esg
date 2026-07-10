import { useEffect, useState } from 'react';
import { api, qs } from '../api.js';
import { Card, FilterBar, EMPTY_FILTERS, MODE_LABELS, fmt } from '../components/ui.jsx';

const FUEL_LABELS = {
  gasolina: 'Gasolina', etanol: 'Etanol', diesel: 'Diesel', gnv: 'GNV', flex: 'Flex', outro: 'Outro',
};

export default function AnswersPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [answers, setAnswers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/api/admin/answers${qs(filters)}`).then(setAnswers).catch((e) => setError(e.message));
  }, [filters]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Respostas de transporte</h1>
      <FilterBar filters={filters} setFilters={setFilters} />
      {error && <p className="text-red-600">{error}</p>}

      <Card>
        <p className="mb-3 text-sm text-(--ink-2)">
          {answers.length.toLocaleString('pt-BR')} trechos de transporte
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-(--ink-2) border-b border-(--grid)">
                <th className="py-2">Participante</th><th>Trecho</th><th>Modal</th><th>Combustível</th>
                <th className="text-right">Distância (km)</th><th>Trajeto</th>
                <th className="text-right">Pessoas</th><th className="text-right">kg CO₂e</th>
                <th>Versão do cálculo</th><th>Sincronizada em</th>
              </tr>
            </thead>
            <tbody>
              {answers.map((a) => (
                <tr key={a.id} className="border-b border-(--grid) last:border-0">
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
