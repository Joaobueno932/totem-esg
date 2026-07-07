import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 3001),
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/carbono_zero',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-inseguro',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigins: (process.env.CORS_ORIGINS || '*').split(',').map((s) => s.trim()),
  syncRateLimit: Number(process.env.SYNC_RATE_LIMIT || 300),
};

if (process.env.NODE_ENV === 'production' && config.jwtSecret === 'dev-secret-inseguro') {
  throw new Error('JWT_SECRET obrigatório em produção. Configure a variável de ambiente.');
}
