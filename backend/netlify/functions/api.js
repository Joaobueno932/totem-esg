import serverless from 'serverless-http';
import { createApp } from '../../src/app.js';

const app = createApp();
const serverlessHandler = serverless(app);

// O Express registra todas as rotas com o prefixo /api (ex.: /api/health).
// Dependendo de como o Netlify entrega o path da requisição para a Function
// (path original /api/health ou path reescrito /.netlify/functions/api/health),
// normalizamos aqui para que as rotas sempre casem, sem tocar na definição das rotas.
export const handler = (event, context) => {
  if (event && typeof event.path === 'string') {
    let path = event.path.replace(/^\/\.netlify\/functions\/api/, '');
    if (!path.startsWith('/api')) {
      path = `/api${path === '/' || path === '' ? '' : path}`;
    }
    event.path = path || '/api';
  }
  return serverlessHandler(event, context);
};
