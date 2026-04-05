import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

/**
 * Utilitaire WebSocket securise pour l'application
 * Gere automatiquement la conversion HTTP → HTTPS
 */

// URL de base dynamique - evite les double slashes
export const getBaseUrl = () => {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 
                  import.meta.env.VITE_API_URL ||
                  'http://localhost:8080';
  
  // Supprime le slash final pour eviter les double slashes
  const cleanBase = baseUrl.replace(/\/$/, '');
  
  // Conversion auto HTTP → HTTPS si la page est en HTTPS
  if (cleanBase.startsWith('http://') && window.location.protocol === 'https:') {
    return cleanBase.replace('http://', 'https://');
  }
  return cleanBase;
};

// URL pour les appels API REST
export const getApiUrl = (path = '') => {
  const base = getBaseUrl();
  return path ? `${base}${path}` : base;
};

// URL WebSocket securisee
export const getWebSocketUrl = (endpoint = '/ws-hospital') => {
  const base = getBaseUrl();
  return `${base}${endpoint}`;
};

/**
 * Cree une connexion SockJS/STOMP securisee
 * @param {string} endpoint - Endpoint WebSocket (ex: /ws-hospital, /ws-notifications)
 * @param {function} onConnect - Callback de connexion reussie
 * @param {function} onError - Callback d'erreur
 * @returns {Object} stompClient
 */
export const createSecureSocket = (endpoint, onConnect, onError) => {
  try {
    const wsUrl = getWebSocketUrl(endpoint);
    console.log('🔌 Connexion WebSocket securisee:', wsUrl);
    
    const socket = new SockJS(wsUrl);
    const stompClient = Stomp.over(socket);
    stompClient.debug = null;

    stompClient.connect({}, onConnect, (error) => {
      console.error('❌ WebSocket error:', error);
      if (onError) onError(error);
    });

    return stompClient;
  } catch (error) {
    console.error('❌ Erreur creation WebSocket:', error);
    if (onError) onError(error);
    return null;
  }
};

/**
 * S'abonne a un topic WebSocket
 * @param {Object} stompClient - Client STOMP connecte
 * @param {string} topic - Topic a souscrire (ex: /topic/notifications)
 * @param {function} callback - Callback reception message
 */
export const subscribeToTopic = (stompClient, topic, callback) => {
  if (!stompClient || !stompClient.connected) {
    console.warn('WebSocket non connecte - subscription impossible');
    return null;
  }
  
  try {
    return stompClient.subscribe(topic, (message) => {
      try {
        const data = JSON.parse(message.body);
        callback(data);
      } catch (error) {
        console.error('Erreur parsing message WebSocket:', error);
      }
    });
  } catch (error) {
    console.error('Erreur subscription:', error);
    return null;
  }
};

/**
 * Deconnexion securisee
 * @param {Object} stompClient - Client a deconnecter
 */
export const disconnectSocket = (stompClient) => {
  if (stompClient && stompClient.connected) {
    try {
      stompClient.disconnect();
      console.log('🔌 WebSocket deconnecte');
    } catch (error) {
      console.error('Erreur deconnexion:', error);
    }
  }
};

export default {
  getBaseUrl,
  getApiUrl,
  getWebSocketUrl,
  createSecureSocket,
  subscribeToTopic,
  disconnectSocket
};
