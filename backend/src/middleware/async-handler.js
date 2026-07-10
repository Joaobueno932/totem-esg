// Express 4 não encaminha rejeições de handlers async para o error middleware:
// um erro vira "unhandledRejection" e DERRUBA o processo (na Netlify Function isso
// aparece no navegador como "Failed to fetch", sem resposta nem CORS). Este wrapper
// captura a rejeição e a repassa via next(err), que responde 500 normalmente.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
