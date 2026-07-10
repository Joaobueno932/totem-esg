import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../middleware/async-handler.js';

// Rotas públicas (sem autenticação) consumidas pelo totem a partir do link/QR.
export const publicRouter = Router();

// GET /api/public/events/:slug — o totem resolve o evento do link (totem.app/<slug>).
// Devolve o necessário para a tela inicial: id (usado no sync), nome e imagem.
publicRouter.get('/events/:slug', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT id, name, slug, location, start_date, end_date, image_data AS image
       FROM events WHERE slug = $1`,
    [String(req.params.slug).toLowerCase()]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Evento não encontrado' });
  res.json(rows[0]);
}));
