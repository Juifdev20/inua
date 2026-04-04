import axios from "axios";

// On définit une URL de base plus générale
const BASE_URL = "http://localhost:8080/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  }, 
});

// Intercepteur pour ajouter le token automatiquement à chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

// Upload d'avatar (Réception)
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

export default {
  register,
  login,
  updateProfile,
  changePassword,
  uploadAvatar,
  updateReceptionProfile,
  updatePreferences,
  getPreferences,
  api, // On exporte l'instance axios pour Profile.js
};
