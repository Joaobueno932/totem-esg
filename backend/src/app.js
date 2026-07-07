import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { syncRouter } from './routes/sync.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(cors({
    origin: config.corsOrigins.includes('*') ? true : config.corsOrigins,
  }));

  app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

  // rota pública usada pelo totem — protegida por rate limit
  const syncLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.syncRateLimit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Limite de requisições atingido. Tente novamente em instantes.' },
  });
  app.use('/api/sync', syncLimiter, syncRouter);

  app.use('/api/admin', authRouter);   // /api/admin/login (público, com limite próprio)
  app.use('/api/admin', adminRouter);  // demais rotas exigem JWT

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  });

  return app;
}
