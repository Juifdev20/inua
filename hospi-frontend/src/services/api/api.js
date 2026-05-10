import axios from 'axios';

// Détection automatique de l'environnement
const isLocalhost = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' || 
                   window.location.hostname.includes('local');

const BACKEND_URL = isLocalhost 
  ? (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080')
  : (import.meta.env.VITE_BACKEND_URL || 'https://inuaafia.onrender.com');

const api = axios.create({
  baseURL: `${BACKEND_URL.replace(/\/$/, '')}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour gérer les erreurs 401/403
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';
    
    if (status === 401 || status === 403) {
      // 🔓 NE PAS rediriger pour la vérification du mot de passe de la fiche médicale
      const isPasswordVerification = requestUrl.includes('/consultations/') && 
                                     (requestUrl.includes('/verify') || requestUrl.includes('/check-access'));
      
      if (isPasswordVerification) {
        console.log('🔐 [API] Mot de passe incorrect pour la fiche médicale - pas de redirection');
        return Promise.reject(error);
      }
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
