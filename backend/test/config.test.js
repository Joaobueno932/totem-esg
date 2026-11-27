import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL = 'postgres://teste:teste@127.0.0.1:1/teste';
const { parseTrustProxy } = await import('../src/config.js');

test('TRUST_PROXY ausente mantém o comportamento anterior (true)', () => {
  assert.equal(parseTrustProxy(undefined), true);
  assert.equal(parseTrustProxy(''), true);
  assert.equal(parseTrustProxy('TRUE'), true);
});

test('TRUST_PROXY aceita false, nº de saltos e lista de sub-redes', () => {
  assert.equal(parseTrustProxy('false'), false);
  assert.equal(parseTrustProxy(' 2 '), 2);
  assert.equal(parseTrustProxy('loopback, 10.0.0.0/8'), 'loopback, 10.0.0.0/8');
});
