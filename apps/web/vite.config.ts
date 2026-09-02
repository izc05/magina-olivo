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
        description: 'Gestión personal del olivar, campañas, entregas y rendimientos.',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#203d2a',
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
