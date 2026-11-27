import { createApp } from './app.js';
import { config } from './config.js';
import { pool } from './db.js';

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`API Pegada de Carbono rodando na porta ${config.port}`);
});

// Encerramento gracioso (SIGTERM do Kubernetes/Docker, Ctrl+C em dev): para de aceitar
// conexões, conclui as requisições em andamento e fecha o pool do banco.
function shutdown(signal) {
  console.log(`${signal} recebido — encerrando a API`);
  server.close(() => {
    pool.end().catch(() => {}).finally(() => process.exit(0));
  });
  // Se alguma conexão não fechar a tempo, sai assim mesmo (antes do SIGKILL do orquestrador).
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
