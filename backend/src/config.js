import 'dotenv/config';

// Plataformas serverless (Netlify Functions rodam em AWS Lambda): sem processo longo
// nem socket TCP direto com o cliente.
export const isServerless = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);

// TRUST_PROXY segue o 'trust proxy' do Express: true, false, nº de saltos (ex.: 2 =
// ingress + nginx do frontend) ou lista de IPs/sub-redes. Com true, o req.ip vem do
// primeiro X-Forwarded-For — que o próprio cliente consegue forjar; atrás de proxies
// conhecidos, prefira o nº de saltos para o rate limit enxergar o IP real.
export function parseTrustProxy(value) {
  const v = String(value ?? '').trim();
  if (v === '' || v.toLowerCase() === 'true') return true;
  if (v.toLowerCase() === 'false') return false;
  if (/^\d+$/.test(v)) return Number(v);
  return v;
}

export const config = {
  port: Number(process.env.PORT || 3001),
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/carbono_zero',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-inseguro',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigins: (process.env.CORS_ORIGINS || '*').split(',').map((s) => s.trim()),
  syncRateLimit: Number(process.env.SYNC_RATE_LIMIT || 300),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
};

if (process.env.NODE_ENV === 'production' && config.jwtSecret === 'dev-secret-inseguro') {
  throw new Error('JWT_SECRET obrigatório em produção. Configure a variável de ambiente.');
}

// O padrão acima (localhost) é só para desenvolvimento.
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL obrigatório em produção. Configure a variável de ambiente.');
}
