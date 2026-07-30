// Aplicação das migrations .sql, compartilhada pelo script `npm run migrate` e
// pela inicialização da API. Rodar no boot garante que um deploy novo nunca fique
// com o código na frente do schema (era a origem de "Erro interno do servidor"
// logo após subir uma coluna nova).
import fs from 'node:fs';
import path from 'node:path';
import { pool } from './db.js';

// Nada de import.meta.url aqui: este módulo é empacotado pelo esbuild na Netlify
// Function e, dependendo do formato de saída, import.meta fica indefinido — o módulo
// quebrava no load e a API inteira respondia 502 ("Failed to fetch" no navegador).
// Procuramos a pasta a partir do diretório de trabalho, com MIGRATIONS_DIR como escape.
function migrationsDir() {
  const candidates = [
    process.env.MIGRATIONS_DIR,
    path.join(process.cwd(), 'migrations'),
    path.join(process.cwd(), 'backend', 'migrations'),
    path.join(process.cwd(), '..', 'migrations'),
  ].filter(Boolean);
  try {
    return candidates.find((d) => fs.existsSync(d)) || null;
  } catch {
    return null;
  }
}

// Chave arbitrária, só precisa ser estável: serializa dois processos subindo juntos.
const LOCK_KEY = '8273461982734';

export async function runMigrations({ log = () => {} } = {}) {
  const dir = migrationsDir();
  if (!dir) {
    log('pasta migrations não encontrada — pulando (rode `npm run migrate` manualmente)');
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [String(LOCK_KEY)]);
    await client.query('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now())');
    const applied = new Set((await client.query('SELECT name FROM _migrations')).rows.map((r) => r.name));
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      if (applied.has(file)) { log(`- ${file} (já aplicada)`); continue; }
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        log(`✓ ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} falhou: ${err.message}`);
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [String(LOCK_KEY)]).catch(() => {});
    client.release();
  }
}

// Uma tentativa por processo: as requisições esperam esta promessa antes de tocar o banco.
// Falha aqui NUNCA derruba a API — o schema pode já estar correto (migrations rodadas
// pelo `npm run migrate`); registramos no log e seguimos atendendo.
let pending = null;
export function ensureMigrations() {
  if (!pending) {
    pending = runMigrations({ log: (m) => console.log(`[migrate] ${m}`) })
      .catch((err) => { console.error(`[migrate] ${err.message}`); });
  }
  return pending;
}
