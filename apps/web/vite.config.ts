import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_');
  const requestedBase = env.VITE_BASE_PATH || '/';
  const base = requestedBase.endsWith('/') ? requestedBase : `${requestedBase}/`;

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        manifest: {
          name: 'Mágina Olivo',
          short_name: 'Mágina Olivo',
          description: 'Tu olivar, campaña tras campaña: fincas, entregas y rendimientos en un único lugar.',
          start_url: base,
          scope: base,
          display: 'standalone',
          background_color: '#f4f1e6',
          theme_color: '#2e3a22',
          categories: ['productivity', 'utilities'],
          lang: 'es-ES',
          icons: [
            {
              src: `${base}brand/magina-olivo-mark.svg`,
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          importScripts: ['push-sw.js'],
          navigateFallbackDenylist: [/^\/api\//, /^\/health\//],
          runtimeCaching: [
            {
              urlPattern: /\/api\/v1\/public\//,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'magina-public-api-v1',
                networkTimeoutSeconds: 3,
                cacheableResponse: {
                  statuses: [0, 200],
                },
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 24 * 60 * 60,
                },
              },
            },
          ],
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
  };
});
