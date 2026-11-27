// Insere os fatores de emissão de seeds/emission_factors.json.
// Idempotente: ignora fatores já existentes na mesma versão. Roda numa transação com
// trava consultiva, para que várias réplicas subindo juntas não dupliquem linhas.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db.js';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'seeds', 'emission_factors.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

// Chave arbitrária, só precisa ser estável (diferente da usada pelas migrations).
const LOCK_KEY = '8273461982735';

async function main() {
  const client = await pool.connect();
  let inserted = 0;
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [LOCK_KEY]);
    for (const f of data.factors) {
      // fuel_type nulo (ônibus, avião...) nunca conflita na UNIQUE — no PostgreSQL NULLs
      // são distintos —, então o ON CONFLICT sozinho deixava essas linhas duplicarem a
      // cada execução. O NOT EXISTS compara com IS NOT DISTINCT FROM.
      const res = await client.query(
        `INSERT INTO emission_factors (mode, fuel_type, factor_kg_co2e_per_km, factor_basis, source, source_url, version, active)
         SELECT $1::text, $2::text, $3::numeric, $4::text, $5::text, $6::text, $7::text, true
          WHERE NOT EXISTS (
            SELECT 1 FROM emission_factors
             WHERE mode = $1::text AND fuel_type IS NOT DISTINCT FROM $2::text AND version = $7::text)
         ON CONFLICT (mode, fuel_type, version) DO NOTHING`,
        [f.mode, f.fuel_type, f.factor_kg_co2e_per_km, f.factor_basis, f.source, f.source_url, data.version]
      );
      inserted += res.rowCount;
    }
    // desativa fatores de versões anteriores
    await client.query('UPDATE emission_factors SET active = (version = $1)', [data.version]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  console.log(`Seed concluído: ${inserted} fatores inseridos (versão ${data.version}).`);
  await pool.end();
}

main();
