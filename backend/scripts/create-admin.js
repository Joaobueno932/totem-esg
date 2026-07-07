// Cria (ou atualiza a senha de) um usuário administrador.
// Uso: node scripts/create-admin.js email@dominio.com "senha" "Nome Completo"
import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';

const [email, password, name = 'Administrador'] = process.argv.slice(2);
if (!email || !password) {
  console.error('Uso: node scripts/create-admin.js <email> <senha> [nome]');
  process.exit(1);
}
if (password.length < 8) {
  console.error('A senha deve ter pelo menos 8 caracteres.');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
await pool.query(
  `INSERT INTO admin_users (name, email, password_hash)
   VALUES ($1, $2, $3)
   ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name`,
  [name, email.toLowerCase(), hash]
);
console.log(`Admin "${email}" criado/atualizado.`);
await pool.end();
