// ============================================
// SYSTÈME DE CONFIGURATION ENVIRONNEMENTALE
// ============================================
// Ce fichier gère automatiquement la configuration
// pour localhost et production

// Détection automatique de l'environnement
const isProduction = import.meta.env.PROD;
const isLocalhost = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' || 
                   window.location.hostname.includes('local');

// URL du backend - détection automatique
export const BACKEND_URL = isProduction 
  ? import.meta.env.VITE_BACKEND_URL || 'https://inuaafia.onrender.com'
  : import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

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

// Logs de configuration (uniquement en développement)
if (!isProduction) {
  console.log('=== CONFIGURATION ENVIRONNEMENTALE ===');
  console.log('Mode:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
  console.log('Localhost:', isLocalhost);
  console.log('Backend URL:', BACKEND_URL);
  console.log('WebSocket URL:', WEBSOCKET_URL);
  console.log('=====================================');
}

// Fonctions utilitaires
export const getApiUrl = (endpoint) => `${API_BASE_URL}${endpoint}`;
export const getUploadUrl = (filename) => `${UPLOADS_URL}/${filename}`;
export const getProfileUrl = (filename) => `${PROFILES_URL}/${filename}`;

export default DEV_CONFIG;
