// Executa todos os arquivos .sql de /migrations em ordem alfabética,
// registrando os já aplicados na tabela _migrations.
import { pool } from '../src/db.js';
import { runMigrations } from '../src/migrations.js';

runMigrations({ log: (m) => console.log(m) })
  .then(async () => {
    await pool.end();
    console.log('Migrations concluídas.');
  })
  .catch(async (err) => {
    console.error(`✗ ${err.message}`);
    await pool.end().catch(() => {});
    process.exit(1);
  });
