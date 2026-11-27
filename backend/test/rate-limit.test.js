// Fora de plataforma serverless (contêiner/servidor), a chave do rate limit é o req.ip
// resolvido pelo Express — cabeçalhos enviados pelo cliente não trocam a chave.
import { test } from 'node:test';
import assert from 'node:assert/strict';

delete process.env.NETLIFY;
delete process.env.AWS_LAMBDA_FUNCTION_NAME;
process.env.DATABASE_URL = 'postgres://teste:teste@127.0.0.1:1/teste';
const { clientIp } = await import('../src/rate-limit.js');

test('usa req.ip e ignora cabeçalhos forjáveis', () => {
  const req = {
    ip: '203.0.113.7',
    headers: { 'x-nf-client-connection-ip': '1.1.1.1', 'x-forwarded-for': '2.2.2.2' },
  };
  assert.equal(clientIp(req), '203.0.113.7');
});

test('sem req.ip, cai no endereço do socket', () => {
  assert.equal(clientIp({ headers: {}, socket: { remoteAddress: '::1' } }), '::1');
  assert.equal(clientIp({ headers: {} }), 'unknown');
});
