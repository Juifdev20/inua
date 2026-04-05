import axios from 'axios';

// URL API depuis les variables d'environnement Vite
const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
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

// 🔄 Optionnel : Gérer les erreurs 401 (token expiré) globalement
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Rediriger vers login ou rafraîchir le token
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;