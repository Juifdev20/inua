import axios from "axios";
import { BACKEND_URL } from '../config/environment.js';

const BASE_URL = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔄 État du refresh token
let isRefreshing = false;
let refreshSubscribers = [];

// Fonction pour notifier les requêtes en attente
const onRefreshed = (token) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

// Fonction pour ajouter une requête en attente
const addRefreshSubscriber = (callback) => {
  refreshSubscribers.push(callback);
};

// 🔐 Fonction de refresh du token
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) {
    throw new Error("Pas de refresh token disponible");
  }

  const response = await axios.post(`${BASE_URL}/auth/refresh`, null, {
    params: { refreshToken },
    headers: { "Content-Type": "application/json" },
  });

  const responseData = response.data?.data || response.data;
  const newToken = responseData.accessToken || responseData.token;
  const newRefreshToken = responseData.refreshToken;

  // Mettre à jour le localStorage
  localStorage.setItem("token", newToken);
  if (newRefreshToken) {
    localStorage.setItem("refreshToken", newRefreshToken);
  }

  return newToken;
};

// Intercepteur pour ajouter le token automatiquement à chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 🔄 Intercepteur de réponse pour gérer le 401 et rafraîchir automatiquement
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si ce n'est pas une erreur 401 ou si c'est déjà une tentative de refresh
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Ne pas traiter les erreurs 401 sur les endpoints d'auth (éviter boucle infinie)
    if (originalRequest.url?.includes("/auth/refresh") ||
        originalRequest.url?.includes("/auth/login") ||
        originalRequest.url?.includes("/auth/register")) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      // Attendre que le refresh soit terminé
      return new Promise((resolve) => {
        addRefreshSubscriber((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalRequest));
        });
      });
    }

    isRefreshing = true;

    try {
      const newToken = await refreshAccessToken();
      onRefreshed(newToken);

      // Réessayer la requête originale avec le nouveau token
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh échoué → déconnexion
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// REGISTER & LOGIN
const register = async (data) => {
  const response = await api.post("/auth/register", data);
  return response; // On retourne toute la réponse
};

const login = async (data) => {
  const response = await api.post("/auth/login", data);
  return response;
};

// MISE À JOUR DU PROFIL (La fonction qui manquait)
const updateProfile = async (id, data) => {
  // Appelle http://localhost:8080/api/admin/update-profile/{id}
  const response = await api.put(`/admin/update-profile/${id}`, data);
  return response;
};

// ========== NOUVELLES FONCTIONS POUR LA RÉCEPTION ==========

// Changement de mot de passe (Réception)
const changePassword = async (ancienPassword, nouveauPassword) => {
  const response = await api.put("/v1/reception/profile/password", {
    ancienPassword,
    nouveauPassword
  });
  return response;
};

// Upload d'avatar (Réception) - Legacy endpoint
const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  
  const response = await api.post("/v1/reception/profile/avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response;
};

// Upload photo de profil (Generic - pour tous les rôles: admin, finance, etc.)
const uploadProfilePhoto = async (file) => {
  const formData = new FormData();
  formData.append("photo", file);
  
  const response = await api.put("/users/me/photo", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response;
};

// Mise à jour du profil (Réception)
const updateReceptionProfile = async (data) => {
  const response = await api.put("/v1/reception/profile/update", data);
  return response;
};

// ✅ NOUVELLE FONCTION: Mise à jour des préférences de notifications
const updatePreferences = async (notificationEnabled, soundEnabled, preferredLanguage) => {
  const response = await api.patch("/v1/reception/settings/preferences", {
    notificationEnabled,
    soundEnabled,
    preferredLanguage
  });
  return response;
};

// ✅ NOUVELLE FONCTION: Récupérer les préférences
const getPreferences = async () => {
  const response = await api.get("/v1/reception/settings/preferences");
  return response;
};

// ✅ NOUVELLE FONCTION: Mot de passe oublié
const forgotPassword = async (email) => {
  const response = await api.post("/auth/forgot-password", { email });
  return response;
};

export default {
  register,
  login,
  updateProfile,
  changePassword,
  uploadAvatar,
  uploadProfilePhoto,
  updateReceptionProfile,
  updatePreferences,
  getPreferences,
  forgotPassword,
  api, // On exporte l'instance axios pour Profile.js
};
