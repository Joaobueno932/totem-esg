// Gera src/data/cities.json a partir da API de localidades do IBGE, com as coordenadas
// da sede de cada município (usadas para estimar a distância até o evento).
// O totem é offline-first: a lista precisa ir no bundle, não pode ser buscada em runtime.
//
// Formato: { "UF": [["Nome do município", lat, lon], ...] }
//
// Uso: node scripts/fetch-cities.mjs
// (atrás de proxy corporativo: node --use-system-ca scripts/fetch-cities.mjs)
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const API = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados';
// O IBGE não publica coordenadas nessa API; este dataset traz lat/lon por código IBGE.
const COORDS_CSV = 'https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/csv/municipios.csv';

const collator = new Intl.Collator('pt-BR');

// Cruzamento pelo código IBGE (o nome não serve: há municípios renomeados).
const csv = await (await fetch(COORDS_CSV)).text();
const coordsById = new Map();
for (const line of csv.trim().split('\n').slice(1)) {
  const [id, , lat, lon] = line.split(',');
  // 3 casas decimais ≈ 100 m — precisão de sobra para uma estimativa em km
  coordsById.set(Number(id), [Number(Number(lat).toFixed(3)), Number(Number(lon).toFixed(3))]);
}

const cities = {};
const missing = [];

for (const uf of UFS) {
  const res = await fetch(`${API}/${uf}/municipios`);
  if (!res.ok) throw new Error(`IBGE respondeu ${res.status} para ${uf}`);
  const data = await res.json();
  cities[uf] = data
    .map((m) => {
      const coords = coordsById.get(m.id);
      if (!coords) missing.push(`${uf}: ${m.nome} (${m.id})`);
      return coords ? [m.nome, ...coords] : [m.nome];
    })
    .sort((a, b) => collator.compare(a[0], b[0]));
  console.log(`${uf}: ${cities[uf].length} municípios`);
}

if (missing.length) console.warn(`\nSem coordenadas (sem estimativa de distância):\n  ${missing.join('\n  ')}`);

const out = fileURLToPath(new URL('../src/data/cities.json', import.meta.url));
await writeFile(out, `${JSON.stringify(cities)}\n`);
console.log(`\n${Object.values(cities).flat().length} municípios → ${out}`);
