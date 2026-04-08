import axios from 'axios';
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