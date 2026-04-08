import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ✅ IMPORTATION CRITIQUE : Initialise i18next avant le rendu de l'app
import './i18n/config'

// 🐛 DEBUG MOBILE : Outils de debug pour téléphone
import './utils/mobileDebug' 

// On importe le diffuseur de données (Provider)
import { AppProvider } from './context/AppContext'

// ✅ PWA: Import du service worker
import * as serviceWorkerRegistration from './serviceWorkerRegistration' 

// ✅ Gestion des erreurs critiques pour mobile
window.addEventListener('error', (e) => {
  console.error('Erreur critique:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Promesse rejetée:', e.reason);
});

// ✅ Timeout de chargement pour mobile
const loadingTimeout = setTimeout(() => {
  const root = document.getElementById('root');
  if (root && root.innerHTML === '') {
    root.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        font-family: system-ui, -apple-system, sans-serif;
        background: #f8fafc;
        color: #334155;
        text-align: center;
        padding: 20px;
      ">
        <div style="font-size: 24px; margin-bottom: 16px;">⚠️</div>
        <h2 style="margin: 0 0 16px 0; font-size: 18px;">Chargement en cours...</h2>
        <p style="margin: 0; font-size: 14px; opacity: 0.7;">Si l'application ne se charge pas, veuillez rafraîchir la page.</p>
        <button onclick="window.location.reload()" style="
          margin-top: 20px;
          padding: 12px 24px;
          background: #0f172a;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
        ">Rafraîchir</button>
      </div>
    `;
  }
}, 5000);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* On enveloppe App pour que tout le projet ait accès aux réglages */}
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
)

// ✅ Nettoyer le timeout une fois l'app chargée
clearTimeout(loadingTimeout);

// ✅ PWA: Enregistrer le service worker
serviceWorkerRegistration.register({
  onUpdate: (registration) => {
    console.log('Nouvelle version disponible!');
    // Optionnel: afficher une notification à l'utilisateur
  },
  onSuccess: (registration) => {
    console.log('Service Worker activé avec succès!');
  }
});