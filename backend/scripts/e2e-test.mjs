// Teste de ponta a ponta da API Carbono Zero.
// Pré-requisitos: API rodando (npm run dev), banco migrado/seedado e admin criado com:
//   npm run create-admin admin@evento.com "SenhaForte123" "Admin Teste"
// Atenção: cria um evento "Evento Teste E2E" com 3 respostas a cada execução.
const API = process.env.API_URL || 'http://localhost:3001';
let failures = 0;

function check(name, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) failures++;
}

async function j(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json', ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
    method: opts.method || 'GET',
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null), raw: res };
}

// aguarda API subir
for (let i = 0; i < 20; i++) {
  try { const r = await fetch(API + '/api/health'); if (r.ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 500));
}

// 1. health
const health = await j('/api/health');
check('health', health.status === 200 && health.body.ok === true);

// 2. rota admin sem token → 401
const noAuth = await j('/api/admin/events');
check('rota admin exige token', noAuth.status === 401);

// 3. login errado → 401
const badLogin = await j('/api/admin/login', { method: 'POST', body: { email: 'admin@evento.com', password: 'errada' } });
check('login com senha errada rejeitado', badLogin.status === 401);

// 4. login correto
const login = await j('/api/admin/login', { method: 'POST', body: { email: 'admin@evento.com', password: 'SenhaForte123' } });
check('login', login.status === 200 && !!login.body.token);
const token = login.body.token;

// 5. criar evento
const ev = await j('/api/admin/events', { method: 'POST', token, body: { name: 'Evento Teste E2E', location: 'São Paulo/SP', start_date: '2026-07-10', end_date: '2026-07-11' } });
check('criar evento', ev.status === 201 && ev.body.id > 0);
const eventId = ev.body.id;

// 6. sync de uma resposta (carro gasolina, 25 km ida e volta, 2 pessoas)
// esperado: 25*2*0.187/2 = 4.675 kg
const uuid = crypto.randomUUID();
const answer = {
  local_uuid: uuid,
  event_id: eventId,
  answered_at: new Date().toISOString(),
  participant: {
    name: 'Maria Silva', company: 'ACME', email: 'maria@acme.com', phone: '11999990000',
    city: 'Campinas', state: 'SP', consent_lgpd: true, consent_marketing: true,
  },
  transport: {
    transport_mode: 'carro', fuel_type: 'gasolina', origin_text: 'Campinas centro',
    distance_km: 25, round_trip: true, passengers_in_vehicle: 2,
    emission_kg_co2e: 4.675, calculation_version: '1.0.0-2026.07',
  },
};
const sync1 = await j('/api/sync/answers', { method: 'POST', body: { answers: [answer] } });
const r1 = sync1.body?.results?.[0];
check('sync resposta', sync1.status === 200 && r1?.status === 'ok', JSON.stringify(r1));
check('cálculo servidor = 4.675', Math.abs((r1?.emission_kg_co2e ?? 0) - 4.675) < 1e-9, `got ${r1?.emission_kg_co2e}`);

// 7. reenvio do mesmo UUID → duplicado, não regrava
const sync2 = await j('/api/sync/answers', { method: 'POST', body: { answers: [answer] } });
const r2 = sync2.body?.results?.[0];
check('deduplicação por UUID', r2?.status === 'ok' && r2?.duplicate === true, JSON.stringify(r2));

// 8. resposta bicicleta → 0 kg
const bike = {
  ...answer, local_uuid: crypto.randomUUID(),
  participant: { ...answer.participant, name: 'João Bike', email: 'joao@x.com', city: 'São Paulo' },
  transport: { ...answer.transport, transport_mode: 'bicicleta_pe', fuel_type: null, distance_km: 5, passengers_in_vehicle: 1, emission_kg_co2e: 0 },
};
const sync3 = await j('/api/sync/answers', { method: 'POST', body: { answers: [bike] } });
check('bicicleta = 0 kg', sync3.body?.results?.[0]?.emission_kg_co2e === 0, JSON.stringify(sync3.body?.results?.[0]));

// 9. ônibus (fator por passageiro, NÃO divide por ocupantes): 100*2*0.027 = 5.4
const bus = {
  ...answer, local_uuid: crypto.randomUUID(),
  participant: { ...answer.participant, name: 'Ana Bus', email: 'ana@x.com', city: 'Sorocaba' },
  transport: { ...answer.transport, transport_mode: 'onibus', fuel_type: null, distance_km: 100, passengers_in_vehicle: 40, emission_kg_co2e: 5.4 },
};
const sync4 = await j('/api/sync/answers', { method: 'POST', body: { answers: [bus] } });
const r4 = sync4.body?.results?.[0];
check('ônibus por passageiro = 5.4', Math.abs((r4?.emission_kg_co2e ?? 0) - 5.4) < 1e-9, `got ${r4?.emission_kg_co2e}`);

// 10. sem consentimento LGPD → erro de validação
const noLgpd = { ...answer, local_uuid: crypto.randomUUID(), participant: { ...answer.participant, consent_lgpd: false } };
const sync5 = await j('/api/sync/answers', { method: 'POST', body: { answers: [noLgpd] } });
check('rejeita sem consentimento LGPD', sync5.body?.results?.[0]?.status === 'error');

// 11. stats
const stats = await j(`/api/admin/stats?event_id=${eventId}`, { token });
const tot = stats.body?.totals;
check('stats: 3 participantes', tot?.participants === 3, JSON.stringify(tot));
check('stats: total CO2e = 10.075', Math.abs((tot?.total_co2e ?? 0) - 10.075) < 1e-6, `got ${tot?.total_co2e}`);
check('stats: árvores = 1', tot?.trees_needed === 1);
check('stats: by_mode tem 3 modais', stats.body?.by_mode?.length === 3);

// 12. filtro por cidade
const filtered = await j(`/api/admin/stats?event_id=${eventId}&city=Campinas`, { token });
check('filtro por cidade', filtered.body?.totals?.participants === 1);

// 13. relatório
const report = await j(`/api/admin/events/${eventId}/report`, { token });
check('relatório', report.status === 200 && report.body?.totals?.participants === 3 &&
  report.body?.calculation_versions?.includes('1.0.0-2026.07') && !!report.body?.methodology_note);

// 14. leads
const leads = await j(`/api/admin/leads?event_id=${eventId}`, { token });
check('leads', leads.body?.length === 3);

// 15. CSV export
const csvRes = await fetch(`${API}/api/admin/export/leads.csv?event_id=${eventId}`, { headers: { Authorization: `Bearer ${token}` } });
const csvBytes = new Uint8Array(await csvRes.arrayBuffer());
const csv = new TextDecoder().decode(csvBytes);
const hasBom = csvBytes[0] === 0xef && csvBytes[1] === 0xbb && csvBytes[2] === 0xbf;
check('export CSV (com BOM UTF-8)', csvRes.ok && csv.includes('Maria Silva') && hasBom);

// 16. sync logs
const logs = await j('/api/admin/sync-logs', { token });
check('sync logs registrados', Array.isArray(logs.body) && logs.body.some((l) => l.status === 'duplicate'));

// 17. fatores públicos p/ atualização do totem
const factors = await j('/api/sync/factors');
check('GET /api/sync/factors', factors.body?.version === '1.0.0-2026.07' && factors.body?.factors?.length === 22);

console.log(failures === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${failures} TESTE(S) FALHARAM`);
process.exit(failures === 0 ? 0 : 1);
