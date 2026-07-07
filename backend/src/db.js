import pg from 'pg';
import { config } from './config.js';

// Neon (e a maioria dos Postgres gerenciados) exige TLS. Se a connection string
// pedir SSL (sslmode=require) ou apontar para o Neon, habilitamos SSL explicitamente.
// Nenhum segredo é embutido aqui — tudo vem de DATABASE_URL (Environment Variables).
const url = config.databaseUrl;
const needsSsl = /sslmode=require|sslmode=verify|neon\.tech/i.test(url);

// Em ambiente serverless (Netlify Functions), cada invocação pode abrir seu próprio
// pool; mantemos o número de conexões baixo para não estourar o limite do banco.
const isServerless = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);

export const pool = new pg.Pool({
  connectionString: url,
  ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  max: isServerless ? 1 : 10,
});

export async function query(text, params) {
  return pool.query(text, params);
}

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
