import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: false, // On utilise le manifest.json existant
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB limit
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 an
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 an
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  // Cette section règle les erreurs de compatibilité avec l'ancienne architecture
  define: {
    global: 'window',
    // Ajout de cette ligne pour supporter process.env sans modifier vos fichiers sources
    'process.env': {}
  },
  resolve: {
    alias: {
      // Ceci dit à Vite : quand tu vois "@", va dans le dossier "src"
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    strictPort: false, // Si 5173 est occupe, Vite essaiera 5174, 5175...
    hmr: {
      overlay: true, // Affiche les erreurs en overlay
    },
    watch: {
      usePolling: false, // Désactive le polling pour le hot reload instantané
      interval: 100, // Vérifie les changements toutes les 100ms
    },
    // proxy tous les appels vers le backend pour eviter les problemes de CORS
    proxy: {
      '/patients': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/oauth2/authorization': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      // Note: /login et /oauth2/callback sont des routes React, pas le backend
      // ajoutez d'autres routes si necessaire
    },
  },
})