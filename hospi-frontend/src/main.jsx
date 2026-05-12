import React from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ✅ IMPORTATION CRITIQUE : Initialise i18next avant le rendu de l'app
import './i18n/config'

// 🔧 Configuration environnementale automatique
import { logEnvironmentInfo } from './utils/environmentHelper.js'

// 📊 Afficher les infos d'environnement (uniquement en dev)
logEnvironmentInfo() 

// On importe le diffuseur de données (Provider)
import { AppProvider } from './context/AppContext'

// 🎨 Import du SplashScreen pour le chargement initial
import SplashScreen from './components/SplashScreen'

// ✅ PWA: Import du service worker
import * as serviceWorkerRegistration from './serviceWorkerRegistration'

// 🔐 PWA: Persistance du stockage (empêche l'effacement sur mobile)
import { initStoragePersistence } from './utils/storagePersistence.js' 

// État pour contrôler le SplashScreen
const AppWithSplash = () => {
  const [showSplash, setShowSplash] = React.useState(true);

  React.useEffect(() => {
    // Cacher le SplashScreen après 2 secondes
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {showSplash && <SplashScreen />}
      <App />
    </>
  );
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* On enveloppe App pour que tout le projet ait accès aux réglages */}
    <AppProvider>
      <AppWithSplash />
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
    // 🔥 Forcer le contrôle immédiat pour WebAPK
    if (registration && registration.active) {
      registration.active.postMessage({ type: 'SKIP_WAITING' });
    }
  }
});

// 🔥 S'assurer que le SW contrôle la page pour l'installation PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(registration => {
    console.log('✅ SW contrôle la page:', registration.scope);
  });
}

// 🔐 PWA: Initialiser la persistance du stockage (important pour mobile)
initStoragePersistence().then(() => {
  console.log('[App] Persistance du stockage initialisée');
}).catch((error) => {
  console.error('[App] Erreur persistance:', error);
});