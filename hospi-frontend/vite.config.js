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
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,jpg,jpeg}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 500, maxAgeSeconds: 86400 },
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/uploads/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'uploads-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 604800 },
            },
          },
        ],
      },
      manifest: {
        name: 'Inua Afya - Système Hospitalier',
        short_name: 'InuaAfya',
        description: 'Système de Gestion Hospitalière',
        theme_color: '#059669',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
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