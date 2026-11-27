import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Em dev/preview a API fica na mesma origem: /api/... é encaminhado ao backend local
  // (o mesmo papel do nginx da imagem Docker). API_PROXY_TARGET troca o destino.
  const proxy = {
    '/api': { target: env.API_PROXY_TARGET || 'http://localhost:3001', changeOrigin: true },
  };

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'icon-192.png', 'icon-512.webp', 'logo.webp', 'logo-light.webp'],
        manifest: {
          name: 'Pegada de Carbono do evento',
          short_name: 'Pegada de Carbono',
          description: 'Calcule a emissão estimada de CO2e do seu deslocamento até o evento',
          display: 'fullscreen',
          orientation: 'portrait',
          theme_color: '#0b4d34',
          background_color: '#eaf4ee',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icon-512.webp', sizes: '512x512', type: 'image/webp', purpose: 'any' },
          ],
        },
        workbox: {
          // app shell completo em cache: o totem funciona 100% offline após o primeiro carregamento
          globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
          navigateFallback: 'index.html',
          // a API pode estar na mesma origem: navegação para /api/ nunca vira o index.html
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [],
        },
      }),
    ],
    server: { port: 5173, proxy },
    preview: { proxy },
  };
});
