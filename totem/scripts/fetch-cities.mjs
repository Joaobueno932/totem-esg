// Gera src/data/cities.json a partir da API de localidades do IBGE.
// O totem é offline-first: a lista precisa ir no bundle, não pode ser buscada em runtime.
// Uso: node scripts/fetch-cities.mjs
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const API = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados';

const collator = new Intl.Collator('pt-BR');
const cities = {};

for (const uf of UFS) {
  const res = await fetch(`${API}/${uf}/municipios`);
  if (!res.ok) throw new Error(`IBGE respondeu ${res.status} para ${uf}`);
  const data = await res.json();
  cities[uf] = data.map((m) => m.nome).sort(collator.compare);
  console.log(`${uf}: ${cities[uf].length} municípios`);
}

const out = fileURLToPath(new URL('../src/data/cities.json', import.meta.url));
await writeFile(out, `${JSON.stringify(cities)}\n`);
console.log(`\n${Object.values(cities).flat().length} municípios → ${out}`);
