// Em serverless (Netlify) não há socket: o IP vem do cabeçalho da plataforma.
// Arquivo separado porque isServerless é lido uma vez, no carregamento do módulo
// (o node --test roda cada arquivo em um processo próprio).
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.NETLIFY = 'true';
process.env.DATABASE_URL = 'postgres://teste:teste@127.0.0.1:1/teste';
const { clientIp } = await import('../src/rate-limit.js');

test('prefere o cabeçalho da Netlify', () => {
  const req = { headers: { 'x-nf-client-connection-ip': '198.51.100.4', 'x-forwarded-for': '2.2.2.2' } };
  assert.equal(clientIp(req), '198.51.100.4');
});

test('usa o primeiro IP do X-Forwarded-For', () => {
  assert.equal(clientIp({ headers: { 'x-forwarded-for': '198.51.100.9, 10.0.0.1' } }), '198.51.100.9');
});
