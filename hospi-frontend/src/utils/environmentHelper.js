// ============================================
// UTILITAIRE D'AIDE ENVIRONNEMENTALE
// ============================================
// Fonctions utilitaires pour faciliter le développement
// et le déploiement entre localhost et production

import { BACKEND_URL, WEBSOCKET_URL, UPLOADS_URL, getApiUrl, getUploadUrl, getProfileUrl } from '../config/environment.js';

// Vérification de la connectivité
export const checkConnectivity = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`, {
      method: 'GET',
      timeout: 5000,
    });
    return response.ok;
  } catch (error) {
    console.warn('Connectivité backend:', error.message);
    return false;
  }
};

// Fonction pour obtenir l'URL correcte selon l'environnement
export const getEnvironmentUrl = (type, path = '') => {
  switch (type) {
    case 'api':
      return getApiUrl(path);
    case 'upload':
      return getUploadUrl(path);
    case 'profile':
      return getProfileUrl(path);
    case 'websocket':
      return WEBSOCKET_URL;
    default:
      return BACKEND_URL;
  }
};

// Validation des URLs
export const validateUrls = () => {
  const urls = {
    backend: BACKEND_URL,
    websocket: WEBSOCKET_URL,
    uploads: UPLOADS_URL,
  };

  const issues = [];
  
  Object.entries(urls).forEach(([key, url]) => {
    if (!url || url === 'undefined') {
      issues.push(`${key}: URL non définie`);
    } else if (url.includes('localhost') && window.location.hostname !== 'localhost') {
      issues.push(`${key}: URL localhost en production`);
    }
  });

  return issues;
};

// Logs d'environnement (uniquement en développement)
export const logEnvironmentInfo = () => {
  if (import.meta.env.DEV) {
    console.group('=== INUAAFIA - ENVIRONNEMENT ===');
    console.log('Mode:', import.meta.env.MODE);
    console.log('Production:', import.meta.env.PROD);
    console.log('Backend:', BACKEND_URL);
    console.log('WebSocket:', WEBSOCKET_URL);
    console.log('Uploads:', UPLOADS_URL);
    
    const issues = validateUrls();
    if (issues.length > 0) {
      console.warn('Problèmes détectés:', issues);
    } else {
      console.log('Configuration OK');
    }
    console.groupEnd();
  }
};

// Export des fonctions principales
export {
  BACKEND_URL,
  WEBSOCKET_URL,
  UPLOADS_URL,
  getApiUrl,
  getUploadUrl,
  getProfileUrl,
};
