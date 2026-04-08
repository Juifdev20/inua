import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ✅ IMPORTATION CRITIQUE : Initialise i18next avant le rendu de l'app
import './i18n/config' 

// On importe le diffuseur de données (Provider)
import { AppProvider } from './context/AppContext'

// ✅ PWA: Import du service worker
import * as serviceWorkerRegistration from './serviceWorkerRegistration' 


createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* On enveloppe App pour que tout le projet ait accès aux réglages */}
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
)


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