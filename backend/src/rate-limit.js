import rateLimit from 'express-rate-limit';
import { isServerless } from './config.js';

// Extrai o IP real do cliente.
// - Serverless (Netlify): não há socket, então req.ip fica indefinido; o IP verdadeiro
//   chega nos cabeçalhos da plataforma.
// - Servidor/contêiner: req.ip, que o Express resolve conforme TRUST_PROXY. Os cabeçalhos
//   não são lidos direto porque, fora da plataforma, o próprio cliente pode enviá-los e
//   trocar de chave a cada requisição, anulando o limite (inclusive o de login).
export function clientIp(req) {
  const h = req.headers || {};
  const raw = isServerless
    ? h['x-nf-client-connection-ip'] || h['x-forwarded-for'] || req.ip || (req.socket && req.socket.remoteAddress) || ''
    : req.ip || (req.socket && req.socket.remoteAddress) || '';
  // X-Forwarded-For pode ter vários IPs: o do cliente é o primeiro.
  return String(raw).split(',')[0].trim() || 'unknown';
}

// Cria um rate limiter que funciona tanto local quanto em serverless: a chave vem do IP
// real (via cabeçalho) e desativamos as validações de trust-proxy do express-rate-limit,
// que só fazem sentido quando há um socket TCP direto.
export function createRateLimiter(options) {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: clientIp,
    validate: { trustProxy: false, xForwardedForHeader: false, ip: false },
    ...options,
  });
}
