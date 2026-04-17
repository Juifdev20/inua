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

  toast.error(
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <div>
        <div style={{ fontWeight: '700', fontSize: '14px', color: color, marginBottom: '4px' }}>
          {title}
        </div>
        <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.4' }}>
          {message}
        </div>
      </div>
    </div>,
    {
      duration: isBusinessError ? 4000 : 6000,
      style: {
        background: '#ffffff',
        border: `2px solid ${color}`,
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        maxWidth: '400px',
      },
    }
  );
};

// 🔄 Intercepteur de réponse pour gérer les erreurs globalement
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // Gérer les erreurs 401 (token expiré)
    if (status === 401) {
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