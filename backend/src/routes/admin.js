import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { uniqueSlug } from '../util/slug.js';

export const adminRouter = Router();
adminRouter.use(requireAuth);

const TREES_KG_PER_TREE = 163.14; // ver docs/metodologia.md

// ---------- Eventos ----------

// Imagem do evento: data URL base64 exibida na tela inicial do totem.
// Limite conservador; o dashboard já reduz a imagem no navegador antes de enviar.
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
const imageSchema = z.string().refine((v) => {
  const m = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/.exec(v);
  if (!m) return false;
  return Math.floor(m[2].length * 0.75) <= MAX_IMAGE_BYTES; // bytes decodificados
}, 'Imagem inválida (use PNG/JPG/WebP até 1,5 MB)');

const eventSchema = z.object({
  name: z.string().trim().min(1).max(200),
  location: z.string().trim().max(300).optional().nullable(),
  start_date: z.string().date().optional().nullable(),
  end_date: z.string().date().optional().nullable(),
  // string = definir imagem; null = remover; ausente = manter (no PUT)
  image_data: imageSchema.nullable().optional(),
});

// Nunca devolve image_data nas listas (payload pesado); expõe apenas has_image.
// Colunas sem prefixo de alias para funcionar tanto em RETURNING quanto em SELECT.
const EVENT_COLUMNS = `id, name, location, start_date, end_date, slug,
  image_updated_at, (image_data IS NOT NULL) AS has_image, created_at, updated_at`;

adminRouter.get('/events', asyncHandler(async (_req, res) => {
  // uma resposta = um local_uuid (pode ter vários trechos de transporte)
  const { rows } = await query(
    `SELECT ${EVENT_COLUMNS},
            (SELECT count(DISTINCT a.local_uuid) FROM transport_answers a WHERE a.event_id = e.id)::int AS answers_count,
            COALESCE((SELECT sum(a.emission_kg_co2e) FROM transport_answers a WHERE a.event_id = e.id), 0)::float AS total_co2e
       FROM events e ORDER BY e.start_date DESC NULLS LAST, e.id DESC`
  );
  res.json(rows);
}));

adminRouter.post('/events', requireAdmin, asyncHandler(async (req, res) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.issues });
  const { name, location, start_date, end_date, image_data } = parsed.data;
  const slug = await uniqueSlug(name, async (s) => {
    const { rowCount } = await query('SELECT 1 FROM events WHERE slug = $1', [s]);
    return rowCount > 0;
  });
  const { rows } = await query(
    `INSERT INTO events (name, location, start_date, end_date, slug, image_data, image_updated_at)
     VALUES ($1,$2,$3,$4,$5,$6::text, CASE WHEN $6::text IS NULL THEN NULL ELSE now() END)
     RETURNING ${EVENT_COLUMNS}`,
    [name, location || null, start_date || null, end_date || null, slug, image_data || null]
  );
  res.status(201).json(rows[0]);
}));

adminRouter.put('/events/:id', requireAdmin, asyncHandler(async (req, res) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.issues });
  const { name, location, start_date, end_date, image_data } = parsed.data;
  // O slug fica FIXO após a criação — mudá-lo invalidaria QR codes já impressos.
  // image_data: undefined = mantém; null = remove; string = substitui.
  const touchImage = image_data !== undefined;
  const { rows } = await query(
    `UPDATE events SET name=$1, location=$2, start_date=$3, end_date=$4,
       image_data = CASE WHEN $5::boolean THEN $6::text ELSE image_data END,
       image_updated_at = CASE WHEN $5::boolean THEN (CASE WHEN $6::text IS NULL THEN NULL ELSE now() END) ELSE image_updated_at END,
       updated_at = now()
     WHERE id=$7 RETURNING ${EVENT_COLUMNS}`,
    [name, location || null, start_date || null, end_date || null, touchImage, image_data ?? null, req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Evento não encontrado' });
  res.json(rows[0]);
}));

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

// Um lead = um participante. Como ele pode ter vários trechos, os modais viram uma
// lista e a emissão é a soma dos trechos (filtrados, quando há filtro de modal).
adminRouter.get('/leads', asyncHandler(async (req, res) => {
  const { where, params } = buildFilters(req.query);
  const { rows } = await query(
    `SELECT p.id, p.name, p.company, p.email, p.phone, p.city, p.state,
            p.consent_lgpd, p.consent_marketing, p.created_at,
            array_agg(a.transport_mode ORDER BY a.leg_index) AS transport_modes,
            sum(a.emission_kg_co2e)::float AS emission_kg_co2e,
            e.name AS event_name
       FROM participants p
       JOIN transport_answers a ON a.participant_id = p.id
       JOIN events e ON e.id = p.event_id
       ${where}
       GROUP BY p.id, e.name
       ORDER BY p.created_at DESC
       LIMIT 5000`, params);
  res.json(rows);
}));

// Aqui cada linha é um TRECHO; legs_count diz de quantos trechos é a resposta.
adminRouter.get('/answers', asyncHandler(async (req, res) => {
  const { where, params } = buildFilters(req.query);
  const { rows } = await query(
    `SELECT a.id, a.local_uuid, a.leg_index, a.transport_mode, a.fuel_type, a.origin_text,
            a.distance_km::float, a.round_trip, a.passengers_in_vehicle,
            a.emission_kg_co2e::float, a.calculation_version, a.answered_at, a.synced_at,
            (SELECT count(*) FROM transport_answers x WHERE x.local_uuid = a.local_uuid)::int AS legs_count,
            p.name AS participant_name, p.company, p.city, p.state, e.name AS event_name
       FROM transport_answers a
       JOIN participants p ON p.id = a.participant_id
       JOIN events e ON e.id = a.event_id
       ${where}
       ORDER BY a.synced_at DESC, a.local_uuid, a.leg_index
       LIMIT 5000`, params);
  res.json(rows);
}));

// ---------- Indicadores ----------

adminRouter.get('/stats', asyncHandler(async (req, res) => {
  const { where, params } = buildFilters(req.query);
  const base = `FROM transport_answers a JOIN participants p ON p.id = a.participant_id ${where}`;

  // Cada linha é um trecho de transporte: contagens de gente usam DISTINCT p.id,
  // e a média é por participante (não por trecho).
  const [totals, byMode, byCity, byCompany, ranking] = await Promise.all([
    query(`SELECT count(DISTINCT p.id)::int AS participants,
                  count(DISTINCT p.id) FILTER (WHERE p.consent_marketing)::int AS marketing_leads,
                  COALESCE(sum(a.emission_kg_co2e),0)::float AS total_co2e ${base}`, params),
    query(`SELECT a.transport_mode AS mode, count(DISTINCT p.id)::int AS participants,
                  COALESCE(sum(a.emission_kg_co2e),0)::float AS co2e
             ${base} GROUP BY 1 ORDER BY co2e DESC`, params),
    query(`SELECT COALESCE(NULLIF(trim(p.city),''),'Não informado') AS city, count(DISTINCT p.id)::int AS participants
             ${base} GROUP BY 1 ORDER BY participants DESC LIMIT 15`, params),
    query(`SELECT COALESCE(NULLIF(trim(p.company),''),'Não informado') AS company, count(DISTINCT p.id)::int AS participants
             ${base} GROUP BY 1 ORDER BY participants DESC LIMIT 15`, params),
    query(`SELECT p.name, p.company, p.city,
                  array_agg(a.transport_mode ORDER BY a.leg_index) AS transport_modes,
                  sum(a.emission_kg_co2e)::float AS emission_kg_co2e
             ${base} GROUP BY p.id ORDER BY sum(a.emission_kg_co2e) DESC LIMIT 10`, params),
  ]);

  const t = totals.rows[0];
  res.json({
    totals: {
      participants: t.participants,
      leads: t.participants, // todo participante com consentimento LGPD é um lead
      marketing_leads: t.marketing_leads,
      total_co2e: t.total_co2e,
      avg_co2e: t.participants > 0 ? t.total_co2e / t.participants : 0,
      trees_needed: Math.ceil(t.total_co2e / TREES_KG_PER_TREE),
      trees_kg_per_tree: TREES_KG_PER_TREE,
    },
    by_mode: byMode.rows,
    by_city: byCity.rows,
    by_company: byCompany.rows,
    ranking: ranking.rows,
  });
}));

// ---------- Relatório consolidado ----------

adminRouter.get('/events/:id/report', asyncHandler(async (req, res) => {
  const eventId = Number(req.params.id);
  const ev = await query(`SELECT ${EVENT_COLUMNS} FROM events e WHERE e.id = $1`, [eventId]);
  if (ev.rowCount === 0) return res.status(404).json({ error: 'Evento não encontrado' });

  const { where, params } = buildFilters({ event_id: eventId });
  const base = `FROM transport_answers a JOIN participants p ON p.id = a.participant_id ${where}`;

  const [totals, byMode, byCity, byCompany, versions] = await Promise.all([
    query(`SELECT count(DISTINCT p.id)::int AS participants,
                  count(DISTINCT a.local_uuid)::int AS valid_answers,
                  count(*)::int AS legs,
                  COALESCE(sum(a.emission_kg_co2e),0)::float AS total_co2e ${base}`, params),
    query(`SELECT a.transport_mode AS mode, count(DISTINCT p.id)::int AS participants,
                  COALESCE(sum(a.emission_kg_co2e),0)::float AS co2e ${base} GROUP BY 1 ORDER BY co2e DESC`, params),
    query(`SELECT COALESCE(NULLIF(trim(p.city),''),'Não informado') AS city, count(DISTINCT p.id)::int AS participants
             ${base} GROUP BY 1 ORDER BY participants DESC`, params),
    query(`SELECT COALESCE(NULLIF(trim(p.company),''),'Não informado') AS company, count(DISTINCT p.id)::int AS participants
             ${base} GROUP BY 1 ORDER BY participants DESC`, params),
    query(`SELECT DISTINCT a.calculation_version ${base}`, params),
  ]);

  const t = totals.rows[0];
  res.json({
    event: ev.rows[0],
    generated_at: new Date().toISOString(),
    totals: {
      participants: t.participants,
      valid_answers: t.valid_answers,
      transport_legs: t.legs,
      total_co2e: t.total_co2e,
      avg_co2e: t.participants > 0 ? t.total_co2e / t.participants : 0,
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
}));

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

adminRouter.get('/export/leads.csv', asyncHandler(async (req, res) => {
  const { where, params } = buildFilters(req.query);
  const { rows } = await query(
    `SELECT p.name, p.company, p.email, p.phone, p.city, p.state, p.consent_marketing,
            string_agg(a.transport_mode, ' + ' ORDER BY a.leg_index) AS transport_modes,
            count(*)::int AS transport_legs,
            sum(a.emission_kg_co2e)::float AS emission_kg_co2e,
            e.name AS event_name, p.created_at
       FROM participants p
       JOIN transport_answers a ON a.participant_id = p.id
       JOIN events e ON e.id = p.event_id
       ${where} GROUP BY p.id, e.name ORDER BY p.created_at`, params);
  const csv = toCsv(rows, [
    { key: 'name', label: 'Nome' }, { key: 'company', label: 'Empresa' },
    { key: 'email', label: 'E-mail' }, { key: 'phone', label: 'Telefone' },
    { key: 'city', label: 'Cidade' }, { key: 'state', label: 'Estado' },
    { key: 'consent_marketing', label: 'Aceita comunicações' },
    { key: 'transport_modes', label: 'Modais' },
    { key: 'transport_legs', label: 'Trechos' },
    { key: 'emission_kg_co2e', label: 'Emissão (kg CO2e)' },
    { key: 'event_name', label: 'Evento' }, { key: 'created_at', label: 'Data' },
  ]);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
  res.send(csv);
}));

// ---------- Logs de sincronização ----------

adminRouter.get('/sync-logs', asyncHandler(async (req, res) => {
  const status = req.query.status;
  const params = [];
  let where = '';
  if (status) { params.push(status); where = 'WHERE status = $1'; }
  const { rows } = await query(
    `SELECT * FROM sync_logs ${where} ORDER BY created_at DESC LIMIT 500`, params);
  res.json(rows);
}));

// ---------- Fatores de emissão ----------

adminRouter.get('/factors', asyncHandler(async (_req, res) => {
  const { rows } = await query('SELECT * FROM emission_factors ORDER BY active DESC, mode, fuel_type');
  res.json(rows);
}));

// ---------- Usuários (somente admin) ----------

const USER_COLUMNS = 'id, name, email, role, created_at';

adminRouter.get('/users', requireAdmin, asyncHandler(async (_req, res) => {
  const { rows } = await query(`SELECT ${USER_COLUMNS} FROM admin_users ORDER BY created_at`);
  res.json(rows);
}));

const newUserSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(200),
  role: z.enum(['admin', 'viewer']).default('viewer'),
});

adminRouter.post('/users', requireAdmin, asyncHandler(async (req, res) => {
  const parsed = newUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Dados inválidos (senha ≥ 8 caracteres, e-mail válido)' });
  }
  const { name, email, password, role } = parsed.data;
  const exists = await query('SELECT 1 FROM admin_users WHERE email = $1', [email.toLowerCase()]);
  if (exists.rowCount > 0) return res.status(409).json({ error: 'Já existe um usuário com este e-mail' });

  const hash = await bcrypt.hash(password, 12);
  const { rows } = await query(
    `INSERT INTO admin_users (name, email, password_hash, role)
     VALUES ($1,$2,$3,$4) RETURNING ${USER_COLUMNS}`,
    [name, email.toLowerCase(), hash, role]
  );
  res.status(201).json(rows[0]);
}));

const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  role: z.enum(['admin', 'viewer']).optional(),
  password: z.string().min(8).max(200).optional(),
});

adminRouter.put('/users/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });
  const { name, role, password } = parsed.data;

  // Não deixar o sistema ficar sem nenhum admin (rebaixar o último admin).
  if (role === 'viewer') {
    const target = await query('SELECT role FROM admin_users WHERE id = $1', [id]);
    if (target.rows[0]?.role === 'admin') {
      const admins = await query("SELECT count(*)::int AS n FROM admin_users WHERE role = 'admin'");
      if (admins.rows[0].n <= 1) return res.status(409).json({ error: 'É necessário ao menos um administrador' });
    }
  }

  const sets = [];
  const vals = [];
  const add = (sql, v) => { vals.push(v); sets.push(sql.replace('?', `$${vals.length}`)); };
  if (name !== undefined) add('name = ?', name);
  if (role !== undefined) add('role = ?', role);
  if (password !== undefined) add('password_hash = ?', await bcrypt.hash(password, 12));
  if (sets.length === 0) return res.status(400).json({ error: 'Nada para atualizar' });

  vals.push(id);
  const { rows } = await query(
    `UPDATE admin_users SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING ${USER_COLUMNS}`, vals);
  if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json(rows[0]);
}));

adminRouter.delete('/users/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (id === Number(req.admin.sub)) return res.status(409).json({ error: 'Você não pode remover a si mesmo' });

  const target = await query('SELECT role FROM admin_users WHERE id = $1', [id]);
  if (target.rowCount === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (target.rows[0].role === 'admin') {
    const admins = await query("SELECT count(*)::int AS n FROM admin_users WHERE role = 'admin'");
    if (admins.rows[0].n <= 1) return res.status(409).json({ error: 'É necessário ao menos um administrador' });
  }

  await query('DELETE FROM admin_users WHERE id = $1', [id]);
  res.json({ ok: true });
}));
