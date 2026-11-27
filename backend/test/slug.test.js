import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, uniqueSlug } from '../src/util/slug.js';

test('slugify remove acentos e símbolos', () => {
  assert.equal(slugify('Festa Junina São João 2026!'), 'festa-junina-sao-joao-2026');
  assert.equal(slugify('  --Ação & Reação--  '), 'acao-reacao');
});

test('slugify nunca devolve vazio e limita o tamanho', () => {
  assert.equal(slugify('!!!'), 'evento');
  assert.ok(slugify('a'.repeat(200)).length <= 80);
});

test('uniqueSlug numera colisões a partir de 2', async () => {
  const taken = new Set(['festa', 'festa-2']);
  assert.equal(await uniqueSlug('Festa', async (s) => taken.has(s)), 'festa-3');
  assert.equal(await uniqueSlug('Outra', async (s) => taken.has(s)), 'outra');
});
