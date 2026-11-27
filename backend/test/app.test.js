// Sondas e proteção das rotas, sem banco: o DATABASE_URL aponta para uma porta fechada.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL = 'postgres://teste:teste@127.0.0.1:1/teste';
process.env.TRUST_PROXY = '1';
const { createApp } = await import('../src/app.js');
const { pool } = await import('../src/db.js');

let server;
let base;

before(async () => {
  const app = createApp();
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test('liveness não depende do banco', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).ok, true);
});

test('readiness responde 503 sem banco', async () => {
  const res = await fetch(`${base}/api/ready`);
  assert.equal(res.status, 503);
  assert.equal((await res.json()).ok, false);
});

test('rotas administrativas exigem token', async () => {
  const res = await fetch(`${base}/api/admin/events`);
  assert.equal(res.status, 401);
});

test('TRUST_PROXY é aplicado ao Express', () => {
  const app = createApp();
  assert.equal(app.get('trust proxy'), 1);
});
