import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'Mágina Olivo',
        short_name: 'Mágina Olivo',
        description: 'Tu olivar, campaña tras campaña: fincas, entregas y rendimientos en un único lugar.',
        start_url: '/',
        display: 'standalone',
        background_color: '#f4f1e6',
        theme_color: '#2e3a22',
        categories: ['productivity', 'utilities'],
        lang: 'es-ES',
        icons: [
          {
            src: '/brand/magina-olivo-mark.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//, /^\/health\//],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/health': 'http://localhost:3001',
    },
  },
});
