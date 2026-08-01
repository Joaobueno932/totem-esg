import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icon-192.png', 'icon-512.webp', 'logo.webp', 'logo-light.webp'],
      manifest: {
        name: 'PegadaNeutra — pegada de carbono do evento',
        short_name: 'PegadaNeutra',
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
        runtimeCaching: [],
      },
    }),
  ],
  server: { port: 5173 },
});
