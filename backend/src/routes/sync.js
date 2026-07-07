import { Router } from 'express';
import { z } from 'zod';
import { withTransaction, query } from '../db.js';
import {
  loadActiveFactors, computeEmission, VALID_MODES, VALID_FUELS, MODES_WITH_FUEL,
} from '../services/emissions.js';

export const syncRouter = Router();

const answerSchema = z.object({
  local_uuid: z.string().uuid(),
  event_id: z.number().int().positive(),
  answered_at: z.string().datetime({ offset: true }).optional().nullable(),
  participant: z.object({
    name: z.string().trim().min(1).max(200),
    company: z.string().trim().max(200).optional().nullable(),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().max(40).optional().nullable(),
    city: z.string().trim().max(120).optional().nullable(),
    state: z.string().trim().max(2).optional().nullable(),
    consent_lgpd: z.literal(true), // consentimento obrigatório
    consent_marketing: z.boolean().default(false),
  }),
  transport: z.object({
    transport_mode: z.enum(VALID_MODES),
    fuel_type: z.enum(VALID_FUELS).optional().nullable(),
    origin_text: z.string().trim().max(300).optional().nullable(),
    distance_km: z.number().min(0).max(50000),
    round_trip: z.boolean(),
    passengers_in_vehicle: z.number().int().min(1).max(80).default(1),
    emission_kg_co2e: z.number().min(0),
    calculation_version: z.string().max(50),
  }),
});

// POST /api/sync/answers — recebe um lote de respostas do totem (idempotente por local_uuid)
syncRouter.post('/answers', async (req, res) => {
  const body = Array.isArray(req.body?.answers) ? req.body.answers : null;
  if (!body || body.length === 0 || body.length > 100) {
    return res.status(400).json({ error: 'Envie { answers: [...] } com 1 a 100 itens' });
  }

  const factors = await loadActiveFactors();
  const results = [];

  for (const raw of body) {
    const parsed = answerSchema.safeParse(raw);
    if (!parsed.success) {
      const uuid = typeof raw?.local_uuid === 'string' ? raw.local_uuid : null;
      const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      await logSync(uuid, 'error', message);
      results.push({ local_uuid: uuid, status: 'error', message });
      continue;
    }
    const item = parsed.data;
    try {
      // duplicidade: se o UUID já existe, confirma sucesso sem regravar
      const dup = await query('SELECT id FROM transport_answers WHERE local_uuid = $1', [item.local_uuid]);
      if (dup.rowCount > 0) {
        await logSync(item.local_uuid, 'duplicate', null);
        results.push({ local_uuid: item.local_uuid, status: 'ok', duplicate: true });
        continue;
      }

      const ev = await query('SELECT id FROM events WHERE id = $1', [item.event_id]);
      if (ev.rowCount === 0) {
        await logSync(item.local_uuid, 'error', `Evento ${item.event_id} não existe`);
        results.push({ local_uuid: item.local_uuid, status: 'error', message: 'Evento não encontrado' });
        continue;
      }

      // Recalcula no servidor com os fatores versionados; o valor do servidor prevalece
      const t = item.transport;
      const fuel = MODES_WITH_FUEL.includes(t.transport_mode) ? (t.fuel_type || 'outro') : null;
      const calc = computeEmission({
        mode: t.transport_mode,
        fuelType: fuel,
        distanceKm: t.distance_km,
        roundTrip: t.round_trip,
        passengers: t.passengers_in_vehicle,
      }, factors);
      if (!calc) {
        await logSync(item.local_uuid, 'error', `Fator não encontrado para ${t.transport_mode}/${fuel}`);
        results.push({ local_uuid: item.local_uuid, status: 'error', message: 'Fator de emissão não encontrado' });
        continue;
      }
      const mismatch = Math.abs(calc.emissionKgCo2e - t.emission_kg_co2e) > 0.5;

      await withTransaction(async (client) => {
        const p = item.participant;
        const pRes = await client.query(
          `INSERT INTO participants (event_id, name, company, email, phone, city, state, consent_lgpd, consent_marketing)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
          [item.event_id, p.name, p.company || null, p.email.toLowerCase(), p.phone || null,
            p.city || null, p.state ? p.state.toUpperCase() : null, p.consent_lgpd, p.consent_marketing]
        );
        await client.query(
          `INSERT INTO transport_answers
             (local_uuid, participant_id, event_id, transport_mode, fuel_type, origin_text, distance_km,
              round_trip, passengers_in_vehicle, emission_kg_co2e, calculation_version, answered_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [item.local_uuid, pRes.rows[0].id, item.event_id, t.transport_mode, fuel, t.origin_text || null,
            t.distance_km, t.round_trip, t.passengers_in_vehicle, calc.emissionKgCo2e, calc.version,
            item.answered_at || null]
        );
      });

      await logSync(item.local_uuid, mismatch ? 'recalculated' : 'ok',
        mismatch ? `Cliente enviou ${t.emission_kg_co2e}, servidor calculou ${calc.emissionKgCo2e}` : null);
      results.push({ local_uuid: item.local_uuid, status: 'ok', emission_kg_co2e: calc.emissionKgCo2e });
    } catch (err) {
      await logSync(item.local_uuid, 'error', err.message);
      results.push({ local_uuid: item.local_uuid, status: 'error', message: 'Erro interno ao salvar' });
    }
  }

  res.json({ results });
});

// GET /api/sync/factors — permite ao totem atualizar sua base local quando houver internet
syncRouter.get('/factors', async (_req, res) => {
  const factors = await loadActiveFactors();
  res.json({ version: factors[0]?.version || null, factors });
});

async function logSync(localUuid, status, errorMessage) {
  try {
    await query('INSERT INTO sync_logs (local_uuid, status, error_message) VALUES ($1,$2,$3)',
      [localUuid, status, errorMessage]);
  } catch { /* log não pode derrubar a sincronização */ }
}
