import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Calculadora CO2e do Evento',
        short_name: 'Carbono Zero',
        description: 'Calcule a emissão estimada de CO2e do seu deslocamento até o evento',
        display: 'fullscreen',
        orientation: 'portrait',
        theme_color: '#0d5c3f',
        background_color: '#f4f9f6',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // app shell completo em cache: o totem funciona 100% offline após o primeiro carregamento
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [],
      },
    }),
  ],
  server: { port: 5173 },
});
