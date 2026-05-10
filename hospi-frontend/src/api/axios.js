import axios from 'axios';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../config/environment.js';

// URL API depuis la configuration centralisée
const API_URL = API_BASE_URL;

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 secondes timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🚀 L'intercepteur qui injecte le token automatiquement
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Vérifie le nom de ta clé
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 🔔 Fonction pour afficher les erreurs avec un toast personnalisé
const showErrorToast = (error, status) => {
  // Extraire le message d'erreur du backend
  let message = 'Une erreur est survenue';
  let title = 'Erreur';

  if (error.response?.data) {
    const data = error.response.data;
    if (data.message) message = data.message;
    else if (data.error) message = data.error;
    else if (typeof data === 'string') message = data;

    if (data.error && typeof data.error === 'string' && data.error !== message) {
      title = data.error;
    }
  } else if (error.message) {
    message = error.message;
  }

  // Ne pas afficher de toast pour les erreurs 401 (redirection silencieuse)
  if (status === 401) return;

  // Style personnalisé selon le type d'erreur
  const isBusinessError = status === 400 || status === 404 || status === 409;
  const icon = isBusinessError ? '⚠️' : '❌';
  const color = isBusinessError ? '#F59E0B' : '#EF4444';

  // Créer le contenu HTML sans JSX
  const content = `
    <div style="display: flex; align-items: flex-start; gap: 12px;">
      <span style="font-size: 20px;">${icon}</span>
      <div>
        <div style="font-weight: 700; font-size: 14px; color: ${color}; margin-bottom: 4px;">
          ${title}
        </div>
        <div style="font-size: 13px; color: #374151; line-height: 1.4;">
          ${message}
        </div>
      </div>
    </div>
  `;

  toast.error(content, {
    duration: isBusinessError ? 4000 : 6000,
    style: {
      background: '#ffffff',
      border: `2px solid ${color}`,
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
      maxWidth: '400px',
    },
  });
};

// 🔄 Intercepteur de réponse pour gérer les erreurs globalement
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';

    // Gérer les erreurs 401 (token expiré)
    if (status === 401) {
      // 🔓 NE PAS rediriger pour la vérification du mot de passe de la fiche médicale
      const isPasswordVerification = requestUrl.includes('/consultations/') && 
                                     (requestUrl.includes('/verify') || requestUrl.includes('/check-access'));
      
      if (isPasswordVerification) {
        console.log('🔐 [API] Mot de passe incorrect pour la fiche médicale - pas de redirection');
        return Promise.reject(error);
      }
      
      localStorage.removeItem('token');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Afficher une notification toast pour les autres erreurs
    if (status >= 400) {
      showErrorToast(error, status);
    }

    return Promise.reject(error);
  }
);

export default api;