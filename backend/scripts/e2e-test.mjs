// Teste de ponta a ponta da API Carbono Zero.
// Pré-requisitos: API rodando (npm run dev), banco migrado/seedado e admin criado com:
//   npm run create-admin admin@evento.com "SenhaForte123" "Admin Teste"
// Atenção: cria um evento "Evento Teste E2E" com 5 respostas a cada execução.
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
const carLeg = {
  transport_mode: 'carro', fuel_type: 'gasolina', origin_text: 'Campinas centro',
  distance_km: 25, round_trip: true, passengers_in_vehicle: 2,
  emission_kg_co2e: 4.675, calculation_version: '1.0.0-2026.07',
};
const answer = {
  local_uuid: uuid,
  event_id: eventId,
  answered_at: new Date().toISOString(),
  participant: {
    name: 'Maria Silva', company: 'ACME', email: 'maria@acme.com', phone: '11999990000',
    city: 'Campinas', state: 'SP', consent_lgpd: true, consent_marketing: true,
  },
  transports: [carLeg],
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
  transports: [{ ...carLeg, transport_mode: 'bicicleta_pe', fuel_type: null, distance_km: 5, passengers_in_vehicle: 1, emission_kg_co2e: 0 }],
};
const sync3 = await j('/api/sync/answers', { method: 'POST', body: { answers: [bike] } });
check('bicicleta = 0 kg', sync3.body?.results?.[0]?.emission_kg_co2e === 0, JSON.stringify(sync3.body?.results?.[0]));

// 9. ônibus (fator por passageiro, NÃO divide por ocupantes): 100*2*0.027 = 5.4
const bus = {
  ...answer, local_uuid: crypto.randomUUID(),
  participant: { ...answer.participant, name: 'Ana Bus', email: 'ana@x.com', city: 'Sorocaba' },
  transports: [{ ...carLeg, transport_mode: 'onibus', fuel_type: null, distance_km: 100, passengers_in_vehicle: 40, emission_kg_co2e: 5.4 }],
};
const sync4 = await j('/api/sync/answers', { method: 'POST', body: { answers: [bus] } });
const r4 = sync4.body?.results?.[0];
check('ônibus por passageiro = 5.4', Math.abs((r4?.emission_kg_co2e ?? 0) - 5.4) < 1e-9, `got ${r4?.emission_kg_co2e}`);

// 10. resposta com VÁRIOS trechos: ônibus 30 km + avião 500 km + táxi 12 km (só ida)
// 30*0.027 = 0.81 | 500*0.158 = 79 | 12*0.187 = 2.244  → total 82.054
const multiUuid = crypto.randomUUID();
const multi = {
  ...answer, local_uuid: multiUuid,
  participant: { ...answer.participant, name: 'Carlos Multi', email: 'carlos@x.com', city: 'Ribeirão Preto' },
  transports: [
    { transport_mode: 'onibus', fuel_type: null, origin_text: 'Rodoviária', distance_km: 30, round_trip: false, passengers_in_vehicle: 1, emission_kg_co2e: 0.81, calculation_version: '1.0.0-2026.07' },
    { transport_mode: 'aviao', fuel_type: null, origin_text: 'Aeroporto', distance_km: 500, round_trip: false, passengers_in_vehicle: 1, emission_kg_co2e: 79, calculation_version: '1.0.0-2026.07' },
    { transport_mode: 'aplicativo_taxi', fuel_type: 'gasolina', origin_text: null, distance_km: 12, round_trip: false, passengers_in_vehicle: 1, emission_kg_co2e: 2.244, calculation_version: '1.0.0-2026.07' },
  ],
};
const sync6 = await j('/api/sync/answers', { method: 'POST', body: { answers: [multi] } });
const r6 = sync6.body?.results?.[0];
check('multi-trecho: soma = 82.054', Math.abs((r6?.emission_kg_co2e ?? 0) - 82.054) < 1e-6, `got ${r6?.emission_kg_co2e}`);
check('multi-trecho: 3 trechos gravados', r6?.legs === 3, JSON.stringify(r6));

// 11. reenvio do multi-trecho → duplicado (não regrava os 3 trechos)
const sync7 = await j('/api/sync/answers', { method: 'POST', body: { answers: [multi] } });
check('deduplicação de multi-trecho', sync7.body?.results?.[0]?.duplicate === true);

// 12. mais trechos que o limite → erro de validação
const tooMany = {
  ...answer, local_uuid: crypto.randomUUID(),
  participant: { ...answer.participant, email: 'muitos@x.com' },
  transports: Array.from({ length: 7 }, () => ({ ...carLeg })),
};
const sync8 = await j('/api/sync/answers', { method: 'POST', body: { answers: [tooMany] } });
check('rejeita mais de 6 trechos', sync8.body?.results?.[0]?.status === 'error');

// 13. sem consentimento LGPD → erro de validação
const noLgpd = { ...answer, local_uuid: crypto.randomUUID(), participant: { ...answer.participant, consent_lgpd: false } };
const sync5 = await j('/api/sync/answers', { method: 'POST', body: { answers: [noLgpd] } });
check('rejeita sem consentimento LGPD', sync5.body?.results?.[0]?.status === 'error');

// 14. stats — 4 participantes: 4.675 + 0 + 5.4 + 82.054 = 92.129
const stats = await j(`/api/admin/stats?event_id=${eventId}`, { token });
const tot = stats.body?.totals;
check('stats: 4 participantes (não 6 trechos)', tot?.participants === 4, JSON.stringify(tot));
check('stats: total CO2e = 92.129', Math.abs((tot?.total_co2e ?? 0) - 92.129) < 1e-6, `got ${tot?.total_co2e}`);
check('stats: média por participante = 23.03225', Math.abs((tot?.avg_co2e ?? 0) - 92.129 / 4) < 1e-6, `got ${tot?.avg_co2e}`);
check('stats: árvores = 1', tot?.trees_needed === 1);
check('stats: by_mode tem 5 modais', stats.body?.by_mode?.length === 5, JSON.stringify(stats.body?.by_mode?.map((m) => m.mode)));

const onibus = stats.body?.by_mode?.find((m) => m.mode === 'onibus');
check('stats: ônibus usado por 2 participantes', onibus?.participants === 2, JSON.stringify(onibus));

const carlos = stats.body?.ranking?.[0];
check('ranking: maior emissor é o multi-trecho, somado', carlos?.name === 'Carlos Multi' &&
  Math.abs(carlos.emission_kg_co2e - 82.054) < 1e-6, JSON.stringify(carlos));
check('ranking: lista os modais do participante', Array.isArray(carlos?.transport_modes) &&
  carlos.transport_modes.join(',') === 'onibus,aviao,aplicativo_taxi', JSON.stringify(carlos?.transport_modes));

// 15. filtro por cidade
const filtered = await j(`/api/admin/stats?event_id=${eventId}&city=Campinas`, { token });
check('filtro por cidade', filtered.body?.totals?.participants === 1);

// 16. respostas: cada trecho é uma linha, numerada
const answersList = await j(`/api/admin/answers?event_id=${eventId}`, { token });
const multiRows = answersList.body?.filter((a) => a.local_uuid === multiUuid) ?? [];
check('answers: 3 linhas para a resposta multi-trecho', multiRows.length === 3);
check('answers: leg_index 0,1,2 e legs_count 3',
  multiRows.map((a) => a.leg_index).sort().join(',') === '0,1,2' && multiRows.every((a) => a.legs_count === 3));

// 17. relatório
const report = await j(`/api/admin/events/${eventId}/report`, { token });
check('relatório: 4 participantes, 4 respostas, 6 trechos',
  report.status === 200 && report.body?.totals?.participants === 4 &&
  report.body?.totals?.valid_answers === 4 && report.body?.totals?.transport_legs === 6,
  JSON.stringify(report.body?.totals));
check('relatório: versão e nota metodológica',
  report.body?.calculation_versions?.includes('1.0.0-2026.07') && !!report.body?.methodology_note);

// 18. leads — um por participante, com a lista de modais
const leads = await j(`/api/admin/leads?event_id=${eventId}`, { token });
check('leads: 4 (um por participante)', leads.body?.length === 4, `got ${leads.body?.length}`);
const leadCarlos = leads.body?.find((l) => l.name === 'Carlos Multi');
check('leads: modais do multi-trecho', leadCarlos?.transport_modes?.length === 3 &&
  Math.abs(leadCarlos.emission_kg_co2e - 82.054) < 1e-6, JSON.stringify(leadCarlos?.transport_modes));

// 19. formato antigo (totem offline com fila anterior): { transport: {...} } ainda é aceito
const legacy = {
  local_uuid: crypto.randomUUID(), event_id: eventId, answered_at: new Date().toISOString(),
  participant: { ...answer.participant, name: 'Legado Offline', email: 'legado@x.com' },
  transport: { ...carLeg },
};
const sync9 = await j('/api/sync/answers', { method: 'POST', body: { answers: [legacy] } });
const r9 = sync9.body?.results?.[0];
check('aceita payload antigo com transport único', r9?.status === 'ok' && r9?.legs === 1 &&
  Math.abs(r9.emission_kg_co2e - 4.675) < 1e-9, JSON.stringify(r9));

// 20. CSV export — uma linha por participante, modais concatenados
const csvRes = await fetch(`${API}/api/admin/export/leads.csv?event_id=${eventId}`, { headers: { Authorization: `Bearer ${token}` } });
const csvBytes = new Uint8Array(await csvRes.arrayBuffer());
const csv = new TextDecoder().decode(csvBytes);
const hasBom = csvBytes[0] === 0xef && csvBytes[1] === 0xbb && csvBytes[2] === 0xbf;
check('export CSV (com BOM UTF-8)', csvRes.ok && csv.includes('Maria Silva') && hasBom);
check('export CSV: modais do multi-trecho', csv.includes('onibus + aviao + aplicativo_taxi'));

// 21. sync logs
const logs = await j('/api/admin/sync-logs', { token });
check('sync logs registrados', Array.isArray(logs.body) && logs.body.some((l) => l.status === 'duplicate'));

// 22. fatores públicos p/ atualização do totem
const factors = await j('/api/sync/factors');
check('GET /api/sync/factors', factors.body?.version === '1.0.0-2026.07' && factors.body?.factors?.length === 22);

console.log(failures === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${failures} TESTE(S) FALHARAM`);
process.exit(failures === 0 ? 0 : 1);
