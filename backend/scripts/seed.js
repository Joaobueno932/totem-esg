// Insere os fatores de emissão de seeds/emission_factors.json.
// Idempotente: ignora fatores já existentes na mesma versão.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db.js';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'seeds', 'emission_factors.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

async function main() {
  let inserted = 0;
  for (const f of data.factors) {
    const res = await pool.query(
      `INSERT INTO emission_factors (mode, fuel_type, factor_kg_co2e_per_km, factor_basis, source, source_url, version, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true)
       ON CONFLICT (mode, fuel_type, version) DO NOTHING`,
      [f.mode, f.fuel_type, f.factor_kg_co2e_per_km, f.factor_basis, f.source, f.source_url, data.version]
    );
    inserted += res.rowCount;
  }
  // desativa fatores de versões anteriores
  await pool.query('UPDATE emission_factors SET active = (version = $1)', [data.version]);
  console.log(`Seed concluído: ${inserted} fatores inseridos (versão ${data.version}).`);
  await pool.end();
}

main();
