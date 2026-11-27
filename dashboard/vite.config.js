import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Em dev/preview a API fica na mesma origem: /api/... é encaminhado ao backend local
  // (o mesmo papel do nginx da imagem Docker). API_PROXY_TARGET troca o destino.
  const proxy = {
    '/api': { target: env.API_PROXY_TARGET || 'http://localhost:3001', changeOrigin: true },
  };

  return {
    plugins: [react(), tailwindcss()],
    server: { port: 5174, proxy },
    preview: { proxy },
  };
});
