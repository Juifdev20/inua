// ============================================
// SYSTÈME DE CONFIGURATION ENVIRONNEMENTALE
// ============================================
// Ce fichier gère automatiquement la configuration
// pour localhost et production

// Détection automatique de l'environnement
const isLocalhost = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' || 
                   window.location.hostname.includes('local');

// Détection production basée sur le hostname ou la variable d'environnement Vite
const isProduction = import.meta.env.PROD || !isLocalhost;

// URL du backend - détection automatique
// Priorité: 1) Variable d'environnement, 2) Détection auto localhost/prod, 3) Valeurs par défaut
export const BACKEND_URL = isLocalhost 
  ? (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080')
  : (import.meta.env.VITE_BACKEND_URL || 'https://inuaafia.onrender.com');

// URLs des API
export const API_BASE_URL = BACKEND_URL;
export const API_URL = BACKEND_URL;

// URLs des services spécifiques
export const WEBSOCKET_URL = `${BACKEND_URL.replace('http', 'ws')}/ws-hospital`;
export const WEBSOCKET_NOTIFICATIONS_URL = `${BACKEND_URL.replace('http', 'ws')}/ws-notifications`;

// URLs des ressources statiques
export const UPLOADS_URL = `${BACKEND_URL}/uploads`;
export const PROFILES_URL = `${BACKEND_URL}/uploads/profiles`;

// Configuration du développement
export const DEV_CONFIG = {
  isLocalhost,
  isProduction,
  backendUrl: BACKEND_URL,
  apiBaseUrl: API_BASE_URL,
  websocketUrl: WEBSOCKET_URL,
  uploadsUrl: UPLOADS_URL,
  profilesUrl: PROFILES_URL,
};

// Logs de configuration (en développement et production pour debug)
console.log('=== CONFIGURATION ENVIRONNEMENTALE ===');
console.log('Mode:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
console.log('Localhost:', isLocalhost);
console.log('Backend URL:', BACKEND_URL);
console.log('WebSocket URL:', WEBSOCKET_URL);
console.log('=====================================');

// Fonctions utilitaires
export const getApiUrl = (endpoint) => `${API_BASE_URL}${endpoint}`;
export const getUploadUrl = (filename) => `${UPLOADS_URL}/${filename}`;
export const getProfileUrl = (filename) => `${PROFILES_URL}/${filename}`;

export default DEV_CONFIG;
