import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

export const adminRouter = Router();
adminRouter.use(requireAuth);

const TREES_KG_PER_TREE = 163.14; // ver docs/metodologia.md

// ---------- Eventos ----------

const eventSchema = z.object({
  name: z.string().trim().min(1).max(200),
  location: z.string().trim().max(300).optional().nullable(),
  start_date: z.string().date().optional().nullable(),
  end_date: z.string().date().optional().nullable(),
});

adminRouter.get('/events', async (_req, res) => {
  const { rows } = await query(
    `SELECT e.*,
            (SELECT count(*) FROM transport_answers a WHERE a.event_id = e.id)::int AS answers_count,
            COALESCE((SELECT sum(a.emission_kg_co2e) FROM transport_answers a WHERE a.event_id = e.id), 0)::float AS total_co2e
       FROM events e ORDER BY e.start_date DESC NULLS LAST, e.id DESC`
  );
  res.json(rows);
});

adminRouter.post('/events', async (req, res) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.issues });
  const { name, location, start_date, end_date } = parsed.data;
  const { rows } = await query(
    'INSERT INTO events (name, location, start_date, end_date) VALUES ($1,$2,$3,$4) RETURNING *',
    [name, location || null, start_date || null, end_date || null]
  );
  res.status(201).json(rows[0]);
});

adminRouter.put('/events/:id', async (req, res) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.issues });
  const { name, location, start_date, end_date } = parsed.data;
  const { rows } = await query(
    'UPDATE events SET name=$1, location=$2, start_date=$3, end_date=$4, updated_at=now() WHERE id=$5 RETURNING *',
    [name, location || null, start_date || null, end_date || null, req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Evento não encontrado' });
  res.json(rows[0]);
});

// ---------- Filtros compartilhados ----------

function buildFilters(q, alias = 'a', pAlias = 'p') {
  const where = [];
  const params = [];
  const add = (sql, value) => { params.push(value); where.push(sql.replace('?', `$${params.length}`)); };

  if (q.event_id) add(`${alias}.event_id = ?`, Number(q.event_id));
  if (q.from) add(`${alias}.created_at >= ?`, q.from);
  if (q.to) add(`${alias}.created_at < (?::date + 1)`, q.to);
  if (q.city) add(`${pAlias}.city ILIKE ?`, `%${q.city}%`);
  if (q.state) add(`${pAlias}.state = ?`, String(q.state).toUpperCase());
  if (q.mode) add(`${alias}.transport_mode = ?`, q.mode);
  if (q.company) add(`${pAlias}.company ILIKE ?`, `%${q.company}%`);
  return { where: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

// ---------- Leads e respostas ----------

adminRouter.get('/leads', async (req, res) => {
  const { where, params } = buildFilters(req.query);
  const { rows } = await query(
    `SELECT p.id, p.name, p.company, p.email, p.phone, p.city, p.state,
            p.consent_lgpd, p.consent_marketing, p.created_at,
            a.transport_mode, a.emission_kg_co2e::float, e.name AS event_name
       FROM participants p
       JOIN transport_answers a ON a.participant_id = p.id
       JOIN events e ON e.id = p.event_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT 5000`, params);
  res.json(rows);
});

adminRouter.get('/answers', async (req, res) => {
  const { where, params } = buildFilters(req.query);
  const { rows } = await query(
    `SELECT a.id, a.local_uuid, a.transport_mode, a.fuel_type, a.origin_text,
            a.distance_km::float, a.round_trip, a.passengers_in_vehicle,
            a.emission_kg_co2e::float, a.calculation_version, a.answered_at, a.synced_at,
            p.name AS participant_name, p.company, p.city, p.state, e.name AS event_name
       FROM transport_answers a
       JOIN participants p ON p.id = a.participant_id
       JOIN events e ON e.id = a.event_id
       ${where}
       ORDER BY a.synced_at DESC
       LIMIT 5000`, params);
  res.json(rows);
});

// ---------- Indicadores ----------

adminRouter.get('/stats', async (req, res) => {
  const { where, params } = buildFilters(req.query);
  const base = `FROM transport_answers a JOIN participants p ON p.id = a.participant_id ${where}`;

  const [totals, byMode, byCity, byCompany, ranking] = await Promise.all([
    query(`SELECT count(*)::int AS participants,
                  count(*) FILTER (WHERE p.consent_marketing)::int AS marketing_leads,
                  COALESCE(sum(a.emission_kg_co2e),0)::float AS total_co2e,
                  COALESCE(avg(a.emission_kg_co2e),0)::float AS avg_co2e ${base}`, params),
    query(`SELECT a.transport_mode AS mode, count(*)::int AS participants,
                  COALESCE(sum(a.emission_kg_co2e),0)::float AS co2e
             ${base} GROUP BY 1 ORDER BY co2e DESC`, params),
    query(`SELECT COALESCE(NULLIF(trim(p.city),''),'Não informado') AS city, count(*)::int AS participants
             ${base} GROUP BY 1 ORDER BY participants DESC LIMIT 15`, params),
    query(`SELECT COALESCE(NULLIF(trim(p.company),''),'Não informado') AS company, count(*)::int AS participants
             ${base} GROUP BY 1 ORDER BY participants DESC LIMIT 15`, params),
    query(`SELECT p.name, p.company, p.city, a.transport_mode, a.emission_kg_co2e::float
             ${base} ORDER BY a.emission_kg_co2e DESC LIMIT 10`, params),
  ]);

  const t = totals.rows[0];
  res.json({
    totals: {
      participants: t.participants,
      leads: t.participants, // todo participante com consentimento LGPD é um lead
      marketing_leads: t.marketing_leads,
      total_co2e: t.total_co2e,
      avg_co2e: t.avg_co2e,
      trees_needed: Math.ceil(t.total_co2e / TREES_KG_PER_TREE),
      trees_kg_per_tree: TREES_KG_PER_TREE,
    },
    by_mode: byMode.rows,
    by_city: byCity.rows,
    by_company: byCompany.rows,
    ranking: ranking.rows,
  });
});

// ---------- Relatório consolidado ----------

adminRouter.get('/events/:id/report', async (req, res) => {
  const eventId = Number(req.params.id);
  const ev = await query('SELECT * FROM events WHERE id = $1', [eventId]);
  if (ev.rowCount === 0) return res.status(404).json({ error: 'Evento não encontrado' });

  const { where, params } = buildFilters({ event_id: eventId });
  const base = `FROM transport_answers a JOIN participants p ON p.id = a.participant_id ${where}`;

  const [totals, byMode, byCity, byCompany, versions] = await Promise.all([
    query(`SELECT count(*)::int AS participants,
                  COALESCE(sum(a.emission_kg_co2e),0)::float AS total_co2e,
                  COALESCE(avg(a.emission_kg_co2e),0)::float AS avg_co2e ${base}`, params),
    query(`SELECT a.transport_mode AS mode, count(*)::int AS participants,
                  COALESCE(sum(a.emission_kg_co2e),0)::float AS co2e ${base} GROUP BY 1 ORDER BY co2e DESC`, params),
    query(`SELECT COALESCE(NULLIF(trim(p.city),''),'Não informado') AS city, count(*)::int AS participants
             ${base} GROUP BY 1 ORDER BY participants DESC`, params),
    query(`SELECT COALESCE(NULLIF(trim(p.company),''),'Não informado') AS company, count(*)::int AS participants
             ${base} GROUP BY 1 ORDER BY participants DESC`, params),
    query(`SELECT DISTINCT a.calculation_version ${base}`, params),
  ]);

  const t = totals.rows[0];
  res.json({
    event: ev.rows[0],
    generated_at: new Date().toISOString(),
    totals: {
      participants: t.participants,
      valid_answers: t.participants,
      total_co2e: t.total_co2e,
      avg_co2e: t.avg_co2e,
      trees_needed: Math.ceil(t.total_co2e / TREES_KG_PER_TREE),
    },
    by_mode: byMode.rows,
    by_city: byCity.rows,
    by_company: byCompany.rows,
    calculation_versions: versions.rows.map((r) => r.calculation_version),
    methodology_note:
      'Os cálculos apresentados são estimativas de emissões de CO2 equivalente relacionadas exclusivamente ao transporte ' +
      'dos participantes até o evento. A metodologia foi inspirada na calculadora pública da Fundação SOS Mata Atlântica ' +
      'e utiliza fatores de emissão versionados, documentados e armazenados no sistema.',
  });
});

// ---------- Exportação CSV ----------

function toCsv(rows, columns) {
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => c.label).join(';');
  const lines = rows.map((r) => columns.map((c) => esc(r[c.key])).join(';'));
  return '﻿' + [header, ...lines].join('\r\n'); // inicia com BOM (U+FEFF) para o Excel pt-BR abrir como UTF-8
}

adminRouter.get('/export/leads.csv', async (req, res) => {
  const { where, params } = buildFilters(req.query);
  const { rows } = await query(
    `SELECT p.name, p.company, p.email, p.phone, p.city, p.state,
            p.consent_marketing, a.transport_mode, a.emission_kg_co2e::float, e.name AS event_name, p.created_at
       FROM participants p
       JOIN transport_answers a ON a.participant_id = p.id
       JOIN events e ON e.id = p.event_id
       ${where} ORDER BY p.created_at`, params);
  const csv = toCsv(rows, [
    { key: 'name', label: 'Nome' }, { key: 'company', label: 'Empresa' },
    { key: 'email', label: 'E-mail' }, { key: 'phone', label: 'Telefone' },
    { key: 'city', label: 'Cidade' }, { key: 'state', label: 'Estado' },
    { key: 'consent_marketing', label: 'Aceita comunicações' },
    { key: 'transport_mode', label: 'Modal' },
    { key: 'emission_kg_co2e', label: 'Emissão (kg CO2e)' },
    { key: 'event_name', label: 'Evento' }, { key: 'created_at', label: 'Data' },
  ]);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
  res.send(csv);
});

// ---------- Logs de sincronização ----------

adminRouter.get('/sync-logs', async (req, res) => {
  const status = req.query.status;
  const params = [];
  let where = '';
  if (status) { params.push(status); where = 'WHERE status = $1'; }
  const { rows } = await query(
    `SELECT * FROM sync_logs ${where} ORDER BY created_at DESC LIMIT 500`, params);
  res.json(rows);
});

// ---------- Fatores de emissão ----------

adminRouter.get('/factors', async (_req, res) => {
  const { rows } = await query('SELECT * FROM emission_factors ORDER BY active DESC, mode, fuel_type');
  res.json(rows);
});
