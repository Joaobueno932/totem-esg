import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { api, qs, downloadCsv } from '../api.js';
import { Card, FilterBar, EMPTY_FILTERS, MODE_LABELS, fmt } from '../components/ui.jsx';

export default function LeadsPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [leads, setLeads] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/api/admin/leads${qs(filters)}`).then(setLeads).catch((e) => setError(e.message));
  }, [filters]);

  function exportXlsx() {
    const rows = leads.map((l) => ({
      Nome: l.name, Empresa: l.company || '', 'E-mail': l.email, Telefone: l.phone || '',
      Cidade: l.city || '', Estado: l.state || '',
      'Aceita comunicações': l.consent_marketing ? 'Sim' : 'Não',
      Modal: MODE_LABELS[l.transport_mode] || l.transport_mode,
      'Emissão (kg CO2e)': l.emission_kg_co2e,
      Evento: l.event_name, Data: new Date(l.created_at).toLocaleString('pt-BR'),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, 'leads.xlsx');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Leads coletados</h1>
        <div className="flex gap-2">
          <button className="rounded-lg border border-black/15 bg-white px-4 py-2 text-sm font-medium hover:bg-black/5"
            onClick={() => downloadCsv(`/api/admin/export/leads.csv${qs(filters)}`, 'leads.csv')}>
            Exportar CSV
          </button>
          <button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            onClick={exportXlsx}>
            Exportar XLSX
          </button>
        </div>
      </div>

      <FilterBar filters={filters} setFilters={setFilters} />
      {error && <p className="text-red-600">{error}</p>}

      <Card>
        <p className="mb-3 text-sm text-(--ink-2)">{leads.length.toLocaleString('pt-BR')} leads</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-(--ink-2) border-b border-(--grid)">
                <th className="py-2">Nome</th><th>Empresa</th><th>E-mail</th><th>Telefone</th>
                <th>Cidade/UF</th><th>Comunicações</th><th>Modal</th>
                <th className="text-right">kg CO₂e</th><th>Data</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-b border-(--grid) last:border-0">
                  <td className="py-2 font-medium">{l.name}</td>
                  <td>{l.company || '—'}</td>
                  <td>{l.email}</td>
                  <td>{l.phone || '—'}</td>
                  <td>{l.city ? `${l.city}/${l.state || '?'}` : '—'}</td>
                  <td>{l.consent_marketing ? '✅ Sim' : '—'}</td>
                  <td>{MODE_LABELS[l.transport_mode] || l.transport_mode}</td>
                  <td className="text-right tabular-nums">{fmt(l.emission_kg_co2e)}</td>
                  <td className="whitespace-nowrap">{new Date(l.created_at).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
