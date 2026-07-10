import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db.js';
import { signToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { createRateLimiter } from '../rate-limit.js';

export const authRouter = Router();

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { error: 'Muitas tentativas de login. Tente novamente mais tarde.' },
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

authRouter.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });

  const { email, password } = parsed.data;
  const { rows } = await query('SELECT * FROM admin_users WHERE email = $1', [email.toLowerCase()]);
  const admin = rows[0];
  const ok = admin && await bcrypt.compare(password, admin.password_hash);
  if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

  res.json({
    token: signToken(admin),
    admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
  });
}));
