import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'logo.png', 'mark.png'],
      manifest: {
        name: 'EcoTrajeto — pegada de carbono do evento',
        short_name: 'EcoTrajeto',
        description: 'Calcule a emissão estimada de CO2e do seu deslocamento até o evento',
        display: 'fullscreen',
        orientation: 'portrait',
        theme_color: '#0b4d34',
        background_color: '#eaf4ee',
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
