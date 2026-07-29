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

  // Duas políticas de CORS:
  // - adminCors: restrito à(s) origem(ns) do dashboard (CORS_ORIGINS).
  // - publicCors: liberado, para as rotas do totem — os participantes acessam de
  //   qualquer domínio/dispositivo (o link do evento) e essas rotas já são públicas
  //   e rate-limited. Sem isto, o totem hospedado em outra URL fica sem conexão.
  const adminCors = cors({ origin: config.corsOrigins.includes('*') ? true : config.corsOrigins });
  const publicCors = cors();

  app.get('/api/health', publicCors, (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

  // rotas do totem — protegidas por rate limit e CORS liberado
  const syncLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: config.syncRateLimit,
    message: { error: 'Limite de requisições atingido. Tente novamente em instantes.' },
  });
  app.use('/api/sync', publicCors, syncLimiter, syncRouter);
  app.use('/api/public', publicCors, syncLimiter, publicRouter);

  app.use('/api/admin', adminCors, authRouter);   // /api/admin/login (público, com limite próprio)
  app.use('/api/admin', adminCors, adminRouter);  // demais rotas exigem JWT

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  });

  return app;
}
