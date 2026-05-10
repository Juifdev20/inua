import axios from "axios";

// Détection automatique de l'environnement
const isLocalhost = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' || 
                   window.location.hostname.includes('local');

// URL API avec détection automatique localhost/production
const getApiBaseUrl = () => {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 
                  import.meta.env.VITE_API_URL || 
                  import.meta.env.VITE_API_BASE_URL || 
                  (isLocalhost ? 'http://localhost:8080' : 'https://inuaafia.onrender.com');
  // Supprime le slash final s'il existe
  return baseUrl.replace(/\/$/, '');
};

const API_URL = `${getApiBaseUrl()}/api`;  // Ajoute /api ici, pas dans la variable d'env

// 1. Configuration de base d'Axios
const api = axios.create({
  baseURL: API_URL,
  // CONSEIL : On ne fixe pas le Content-Type globalement ici 
  // pour laisser Axios le detecter automatiquement lors de l'envoi de FormData.
});

// --- FONCTIONS DE VALIDATION D'ID ---

/**
 * Validation stricte d'un ID avant appel API
 * @param {any} id - L'ID à valider
 * @param {string} context - Contexte pour le message d'erreur (optionnel)
 * @returns {number} L'ID converti en nombre
 * @throws {Error} Si l'ID est invalide
 */
const validateId = (id, context = '') => {
  // console.log(`🔍 Validation ID${context ? ` (${context})` : ''}:`, id, typeof id);
  
  if (id === undefined || id === null || id === '') {
    const error = new Error(`ID${context ? ` (${context})` : ''} manquant ou null: ${id}`);
    console.error('❌ Erreur validation ID:', error.message);
    throw error;
  }
  
  // Si c'est déjà un nombre valide
  if (typeof id === 'number' && !isNaN(id) && isFinite(id)) {
    return id;
  }
  
  // Si c'est une chaîne
  const parsedId = String(id).trim();
  
  if (parsedId === 'undefined' || parsedId === 'null' || parsedId === '') {
    const error = new Error(`ID${context ? ` (${context})` : ''} est "undefined" ou "null" en string`);
    console.error('❌ Erreur validation ID:', error.message);
    throw error;
  }
  
  const numId = parseInt(parsedId, 10);
  
  if (isNaN(numId) || !isFinite(numId) || numId <= 0) {
    const error = new Error(`ID${context ? ` (${context})` : ''} invalide: "${id}" (parseInt donne: ${numId})`);
    console.error('❌ Erreur validation ID:', error.message);
    throw error;
  }
  
  return numId;
};

/**
 * Wrapper pour les méthodes API qui ajoute automatiquement la validation d'ID
 */
const createValidatedEndpoint = (method, urlPattern) => {
  return (id, ...args) => {
    const validatedId = validateId(id, urlPattern);
    const url = urlPattern.replace('{id}', validatedId);
    return api[method](url, ...args);
  };
};

// 2. Intercepteur pour ajouter le token automatiquement avec validation du format JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    
    // ✅ CORRECTION: Vérifier que le token existe, n'est pas vide, et contient 2 points (format JWT valide)
    if (token && typeof token === 'string' && token.trim().length > 0) {
      // Vérifier le format JWT: doit contenir au moins 2 points (xxx.yyy.zzz)
      const dotCount = (token.match(/\./g) || []).length;
      
      if (dotCount >= 2) {
        // Token valide, on l'ajoute
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        // Token invalide (pas assez de points) - Bloquer la requête
        console.warn("⚠️ [JWT] Token invalide (format incorrect, pas de points):", token.substring(0, 20) + "...");
        
        // Optionnel: Rejeter la requête si le token est invalide
        // return Promise.reject(new Error("Token JWT invalide"));
      }
    } else {
      // Token null, undefined ou vide - Ne pas envoyer de header Authorization
      console.debug("⏳ [JWT] Token non disponible, requête envoyée sans authentification");
    }

    // ✅ CORRECTION : Si les données sont un FormData, on laisse le navigateur 
    // gérer le Content-Type. Sinon, on met application/json par défaut.
    if (!(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3. Intercepteur pour gérer les erreurs globales
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // ✅ Logging détaillé pour les erreurs d'ID undefined
    if (error.response) {
      const url = error.config?.url || 'URL inconnue';
      const status = error.response.status;
      
      // Détecter les erreurs liées aux IDs
      if (status === 400 || status === 404 || status === 500) {
        const responseData = error.response.data;
        console.error(`❌ Erreur API ${status} sur ${url}:`, responseData);
        
        // Si l'erreur contient "undefined" ou type mismatch
        if (responseData && typeof responseData === 'string') {
          if (responseData.includes('undefined') || responseData.includes('MethodArgumentTypeMismatch')) {
            console.error('🚨 PROBLÈME DÉTECTÉ: ID undefined détecté dans la requête vers:', url);
          }
        }
      }
      
      if (error.response.status === 401 || error.response.status === 403) {
        console.warn("Session expirée ou accès refusé");
      }
    } else if (error.request) {
      console.error('❌ Pas de réponse du serveur:', error.request);
    }
    return Promise.reject(error);
  }
);

// 4. Définition et export de authAPI
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
};

// --- EXPORT DES FONCTIONS DE VALIDATION ---
export { validateId, createValidatedEndpoint };

// 5. Export par défaut de l'instance api
export default api;
