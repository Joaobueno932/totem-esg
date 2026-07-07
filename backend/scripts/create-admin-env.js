// Cria (ou atualiza) o admin a partir de variáveis de ambiente — seguro para o build do Netlify.
// Lê ADMIN_EMAIL, ADMIN_PASSWORD e ADMIN_NAME.
// Se ADMIN_EMAIL ou ADMIN_PASSWORD não existirem, apenas avisa e sai sem falhar o build.
import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';

const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';
const name = (process.env.ADMIN_NAME || 'Administrador').trim();

async function main() {
  if (!email || !password) {
    console.log('[create-admin:env] ADMIN_EMAIL/ADMIN_PASSWORD não definidos — pulando criação do admin.');
    return;
  }
  if (password.length < 8) {
    // Não falha o build, apenas avisa (sem imprimir a senha).
    console.log('[create-admin:env] ADMIN_PASSWORD tem menos de 8 caracteres — admin NÃO criado.');
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO admin_users (name, email, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name`,
    [name, email, hash]
  );
  console.log(`[create-admin:env] Admin "${email}" criado/atualizado.`);
}

main()
  .catch((err) => {
    // Não derruba o build por falha aqui; apenas registra (sem expor segredos).
    console.error('[create-admin:env] Falha ao criar/atualizar admin:', err.message);
  })
  .finally(async () => {
    await pool.end();
  });
