import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
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
      // ajoutez d'autres routes si necessaire
    },
  },
})