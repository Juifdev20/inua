/**
 * ★ API POUR AUTHENTIFICATION PAR CODE TEMPORAIRE (OTP / MAGIC CODE)
 * Connexion sans mot de passe via code à 6 chiffres envoyé par email
 */

import api from '../api/axios.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * Demande un code de connexion temporaire (Magic Code)
 * @param {string} email - L'adresse email de l'utilisateur
 * @returns {Promise} - Réponse du serveur
 */
export const requestOtpCode = async (email) => {
  try {
    const response = await api.post(`/api/auth/request-otp`, { email });
    return response.data;
  } catch (error) {
    console.error('❌ [OTP] Erreur lors de la demande de code:', error);
    throw error.response?.data || { message: 'Erreur lors de la demande de code' };
  }
};

/**
 * Vérifie le code OTP et récupère le token JWT
 * @param {string} email - L'adresse email
 * @param {string} code - Le code à 6 chiffres
 * @returns {Promise} - Réponse avec tokens JWT
 */
export const verifyOtpCode = async (email, code) => {
  try {
    const response = await api.post(`/api/auth/verify-otp`, { email, code });
    return response.data;
  } catch (error) {
    console.error('❌ [OTP] Erreur lors de la vérification du code:', error);
    throw error.response?.data || { message: 'Code invalide ou expiré' };
  }
};

/**
 * Vérifie le statut OAuth2 d'un email
 * @param {string} email - L'adresse email
 * @returns {Promise} - Statut du compte
 */
export const checkOauthStatus = async (email) => {
  try {
    const response = await api.get(`/api/auth/oauth-status?email=${encodeURIComponent(email)}`);
    return response.data;
  } catch (error) {
    console.error('❌ [OAuth] Erreur lors de la vérification du statut:', error);
    throw error.response?.data || { message: 'Erreur lors de la vérification' };
  }
};

/**
 * ★ Connexion via OAuth2 - Redirection vers le provider
 * @param {string} provider - 'google' ou 'facebook'
 */
export const initiateOAuthLogin = (provider) => {
  // Redirection vers l'endpoint OAuth2 du backend
  window.location.href = `${API_URL}/oauth2/authorization/${provider}`;
};

/**
 * Vérifie si un token de setup OAuth2 est présent dans l'URL
 * @returns {Object|null} - Les paramètres du token ou null
 */
export const checkOAuthSetupParams = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const email = urlParams.get('email');
  const provider = urlParams.get('provider');

  if (token && email) {
    return { token, email, provider };
  }
  return null;
};

/**
 * Vérifie si des tokens OAuth2 sont présents dans l'URL (callback)
 * @returns {Object|null} - Les tokens ou null
 */
export const checkOAuthCallbackParams = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const accessToken = urlParams.get('accessToken');
  const refreshToken = urlParams.get('refreshToken');
  const provider = urlParams.get('provider');

  if (accessToken && refreshToken) {
    return { accessToken, refreshToken, provider };
  }
  return null;
};

/**
 * Complète la configuration du compte OAuth2 avec un mot de passe
 * @param {string} token - Token temporaire de setup
 * @param {string} password - Nouveau mot de passe
 * @param {string} confirmPassword - Confirmation du mot de passe
 * @returns {Promise} - Réponse avec tokens JWT
 */
export const completeOAuthSetup = async (token, password, confirmPassword) => {
  try {
    const response = await api.post(
      `/api/auth/complete-oauth-setup`,
      { password, confirmPassword },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('❌ [OAuth] Erreur lors de la configuration du compte:', error);
    throw error.response?.data || { message: 'Erreur lors de la configuration' };
  }
};

export default {
  requestOtpCode,
  verifyOtpCode,
  checkOauthStatus,
  initiateOAuthLogin,
  checkOAuthSetupParams,
  checkOAuthCallbackParams,
  completeOAuthSetup,
};
