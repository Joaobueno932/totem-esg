import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { createRateLimiter } from './rate-limit.js';
import { syncRouter } from './routes/sync.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { publicRouter } from './routes/public.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // Atrás do proxy do Netlify (e de qualquer serverless), o IP do cliente vem no
  // cabeçalho X-Forwarded-For. Sem isto, req.ip fica indefinido e o express-rate-limit
  // lança erro. Em dev (sem proxy) o Express usa o IP do socket normalmente.
  app.set('trust proxy', true);
  // 3mb acomoda a imagem base64 do evento (limitada a ~1,5 MB) enviada pelo dashboard.
  app.use(express.json({ limit: '3mb' }));
  app.use(cors({
    origin: config.corsOrigins.includes('*') ? true : config.corsOrigins,
  }));

  app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

  // rota pública usada pelo totem — protegida por rate limit
  const syncLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: config.syncRateLimit,
    message: { error: 'Limite de requisições atingido. Tente novamente em instantes.' },
  });
  app.use('/api/sync', syncLimiter, syncRouter);

  // rotas públicas do totem (resolver evento pelo slug) — mesmo limite de sync
  app.use('/api/public', syncLimiter, publicRouter);

  app.use('/api/admin', authRouter);   // /api/admin/login (público, com limite próprio)
  app.use('/api/admin', adminRouter);  // demais rotas exigem JWT

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  });

  return app;
}
