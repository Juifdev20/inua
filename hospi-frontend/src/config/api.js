// ============================================
// CONFIGURATION API CENTRALISÉE
// ============================================
// Importation de la configuration environnementale
import { API_BASE_URL, getApiUrl } from './environment.js';

// Configuration Axios avec détection automatique de l'environnement
const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 secondes timeout
  headers: {
    'Content-Type': 'application/json',
  },
};

// Ajout du token d'authentification automatiquement
apiConfig.transformRequest = [
  (data, headers) => {
    // Ajouter le token depuis localStorage
    const token = localStorage.getItem('token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    // Convertir les données en JSON si nécessaire
    if (data && typeof data === 'object') {
      return JSON.stringify(data);
    }
    return data;
  },
];

// Intercepteur de réponse pour gérer les erreurs
apiConfig.transformResponse = [
  (data) => {
    try {
      return JSON.parse(data);
    } catch (e) {
      return data;
    }
  },
];

// Export de la configuration
export { apiConfig, getApiUrl };
export default apiConfig;
