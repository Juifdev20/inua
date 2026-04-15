/**
 * 🏥 AuthService - Gestion de la persistance d'authentification
 * 
 * Ce service fournit une interface unifiée pour le stockage des données d'authentification
 * - Web: localStorage
 * - Mobile (React Native): AsyncStorage (à implémenter dans le projet mobile)
 * 
 * @author InuaAfya Team
 * @version 1.0.0
 */

import { safeLocalStorageSet, safeLocalStorageGet } from "../utils/storagePersistence.js";

// 🔑 Clés de stockage
const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  REMEMBER_ME: 'rememberMe',
  BIOMETRIC_ENABLED: 'biometricEnabled',
  LAST_LOGIN_TIME: 'lastLoginTime',
};

/**
 * ✅ Sauvegarde les données de session après connexion réussie
 * @param {string} token - JWT token
 * @param {Object} user - Données utilisateur (id, role, username, etc.)
 * @param {boolean} rememberMe - Option "Se souvenir de moi"
 */
export const saveAuthData = (token, user, rememberMe = true) => {
  try {
    // Stockage du token
    safeLocalStorageSet(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    
    // Stockage des données utilisateur
    const userData = {
      id: user.id,
      role: user.role,
      username: user.username,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      photoUrl: user.photoUrl || '',
      // Ne pas stocker de données sensibles
    };
    
    safeLocalStorageSet(STORAGE_KEYS.USER, JSON.stringify(userData));
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    
    // Option "Se souvenir de moi"
    localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, JSON.stringify(rememberMe));
    
    // Timestamp de dernière connexion
    localStorage.setItem(STORAGE_KEYS.LAST_LOGIN_TIME, Date.now().toString());
    
    console.log('[AuthService] ✅ Données de session sauvegardées');
    return true;
  } catch (error) {
    console.error('[AuthService] ❌ Erreur sauvegarde:', error);
    return false;
  }
};

/**
 * 🔍 Récupère les données de session stockées
 * @returns {Object|null} - { token, user } ou null si aucune session
 */
export const getAuthData = () => {
  try {
    const token = safeLocalStorageGet(STORAGE_KEYS.TOKEN) || localStorage.getItem(STORAGE_KEYS.TOKEN);
    const userStr = safeLocalStorageGet(STORAGE_KEYS.USER) || localStorage.getItem(STORAGE_KEYS.USER);
    
    if (!token || !userStr || userStr === 'undefined' || userStr === 'null') {
      return null;
    }
    
    const user = JSON.parse(userStr);
    
    // Validation minimale
    if (!user || !user.id || !user.role) {
      console.warn('[AuthService] ⚠️ Données utilisateur invalides');
      return null;
    }
    
    return { token, user };
  } catch (error) {
    console.error('[AuthService] ❌ Erreur récupération:', error);
    return null;
  }
};

/**
 * 🧹 Efface toutes les données d'authentification (logout)
 */
export const clearAuthData = () => {
  try {
    safeLocalStorageSet(STORAGE_KEYS.TOKEN, '');
    safeLocalStorageSet(STORAGE_KEYS.USER, '');
    
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
    localStorage.removeItem(STORAGE_KEYS.LAST_LOGIN_TIME);
    
    console.log('[AuthService] 🧹 Session nettoyée (logout)');
    return true;
  } catch (error) {
    console.error('[AuthService] ❌ Erreur nettoyage:', error);
    return false;
  }
};

/**
 * 🔐 Active/désactive l'authentification biométrique
 * @param {boolean} enabled
 */
export const setBiometricEnabled = (enabled) => {
  try {
    localStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, JSON.stringify(enabled));
    return true;
  } catch (error) {
    console.error('[AuthService] ❌ Erreur paramètre biométrique:', error);
    return false;
  }
};

/**
 * 🔐 Vérifie si la biométrie est activée
 * @returns {boolean}
 */
export const isBiometricEnabled = () => {
  try {
    const value = localStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
    return value ? JSON.parse(value) : false;
  } catch (error) {
    return false;
  }
};

/**
 * ⏱️ Vérifie si la session est expirée (optionnel - durée max sans activité)
 * @param {number} maxAgeHours - Durée maximale en heures (défaut: 168 = 7 jours)
 * @returns {boolean}
 */
export const isSessionExpired = (maxAgeHours = 168) => {
  try {
    const lastLogin = localStorage.getItem(STORAGE_KEYS.LAST_LOGIN_TIME);
    if (!lastLogin) return true;
    
    const lastLoginTime = parseInt(lastLogin, 10);
    const now = Date.now();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    
    return (now - lastLoginTime) > maxAgeMs;
  } catch (error) {
    return true;
  }
};

/**
 * 📱 Vérifie si l'appareil supporte l'authentification biométrique (Web API)
 * @returns {Promise<boolean>}
 */
export const checkBiometricSupport = async () => {
  // Web Authentication API (WebAuthn) - pour les appareils modernes
  if (window.PublicKeyCredential) {
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch (error) {
      return false;
    }
  }
  return false;
};

/**
 * 🚀 Détermine le chemin de redirection selon le rôle utilisateur
 * @param {string} role - Rôle de l'utilisateur
 * @returns {string} - Chemin de redirection
 */
export const getRedirectPathByRole = (role) => {
  const userRole = String(role || '').toUpperCase().replace('ROLE_', '').trim();

  const redirectMap = {
    ADMIN: '/admin/dashboard',
    RECEPTION: '/reception/dashboard',
    DOCTOR: '/doctor/dashboard',
    DOCTEUR: '/doctor/dashboard',
    FINANCE: '/finance/dashboard',
    CAISSIER: '/finance/dashboard',
    LABORATOIRE: '/laboratory/dashboard',
    LABO: '/laboratory/dashboard',
    PHARMACY: '/pharmacy/dashboard',
    PHARMACIE: '/pharmacy/dashboard',
    PATIENT: '/patient/dashboard',
  };

  return redirectMap[userRole] || '/patient/dashboard';
};

/**
 * 🩺 Métadonnées de l'utilisateur pour affichage
 * @param {Object} user
 * @returns {Object}
 */
export const getUserDisplayInfo = (user) => {
  if (!user) return null;
  
  return {
    id: user.id,
    username: user.username,
    fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
    role: user.role,
    email: user.email,
    photoUrl: user.photoUrl,
  };
};

// Export par défaut
const AuthService = {
  saveAuthData,
  getAuthData,
  clearAuthData,
  setBiometricEnabled,
  isBiometricEnabled,
  isSessionExpired,
  checkBiometricSupport,
  getRedirectPathByRole,
  getUserDisplayInfo,
  STORAGE_KEYS,
};

export default AuthService;
