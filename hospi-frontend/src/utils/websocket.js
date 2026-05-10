import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

/**
 * Utilitaire WebSocket securise pour l'application
 * Gere automatiquement la conversion HTTP → HTTPS
 */

// URL de base dynamique - evite les double slashes
export const getBaseUrl = () => {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 
                  import.meta.env.VITE_API_BASE_URL ||
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
 * Cree une connexion SockJS/STOMP securisee avec options de transport et authentification JWT
 * @param {string} endpoint - Endpoint WebSocket (ex: /ws-hospital, /ws-notifications)
 * @param {function} onConnect - Callback de connexion reussie
 * @param {function} onError - Callback d'erreur
 * @returns {Object} stompClient
 */
export const createSecureSocket = (endpoint, onConnect, onError) => {
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const reconnectDelay = 5000; // 5s
  
  const connect = () => {
    try {
      const wsUrl = getWebSocketUrl(endpoint);
      console.log('Tentative de connexion WebSocket:', wsUrl);
      
      // Options de transport pour compatibilite avec Render et SockJS
      const socket = new SockJS(wsUrl, null, {
      transports: ['websocket', 'xhr-streaming', 'xhr-polling']
    });
    
    const stompClient = Stomp.over(socket);
    stompClient.debug = null;

    // Recuperer le token JWT pour l'authentification
    const token = localStorage.getItem('token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    stompClient.connect(headers, 
      () => {
        console.log('✅ WebSocket connecté');
        reconnectAttempts = 0;
        if (onConnect) onConnect(stompClient);
      }, 
      (error) => {
        console.error('❌ WebSocket error:', error);
        if (onError) onError(error);
        
        // Tentative de reconnexion automatique
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          console.log(`🔄 Tentative de reconnexion ${reconnectAttempts}/${maxReconnectAttempts} dans ${reconnectDelay}ms`);
          setTimeout(connect, reconnectDelay);
        } else {
          console.error('🚫 Nombre maximal de tentatives de reconnexion atteint');
        }
      }
    );

    return stompClient;
  } catch (error) {
    console.error('Erreur creation WebSocket:', error);
    if (onError) onError(error);
    return null;
  }
  };
  
  // Démarrer la connexion
  return connect();
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
