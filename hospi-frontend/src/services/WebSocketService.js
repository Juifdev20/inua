import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

// Configuration dynamique pour supporter HTTP (dev) et HTTPS (prod)
const getWebSocketUrl = () => {
  // Utiliser la variable d'environnement Vite
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
  
  // Securite : transformer http:// en https:// si la page est chargee en HTTPS
  let socketUrl = baseUrl;
  if (baseUrl.startsWith('http://') && window.location.protocol === 'https:') {
    socketUrl = baseUrl.replace('http://', 'https://');
    console.log('Conversion auto HTTP → HTTPS pour WebSocket');
  }
  
  return `${socketUrl}/ws-hospital`;
};

class WebSocketService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.subscriptions = [];
    this.messageHandlers = [];
  }

  connect(onMessageCallback) {
    if (this.connected) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const wsUrl = getWebSocketUrl();
      
      console.log('Connexion WebSocket a:', wsUrl);
      
      this.client = new Client({
        webSocketFactory: () => new SockJS(wsUrl),
        connectHeaders: {
          Authorization: `Bearer ${token}`
        },
        debug: (str) => {
          if (import.meta.env.DEV) {
            console.log('STOMP Debug:', str);
          }
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: () => {
          console.log('WebSocket connected');
          this.connected = true;
          this.subscribe(onMessageCallback);
        },
        onStompError: (frame) => {
          console.error('STOMP error:', frame);
          this.connected = false;
        },
        onWebSocketClose: () => {
          console.log('WebSocket connection closed');
          this.connected = false;
        },
        onWebSocketError: (error) => {
          console.error('WebSocket error:', error);
          this.connected = false;
        }
      });

      this.client.activate();
    } catch (error) {
      console.error('Erreur initialisation WebSocket:', error);
    }
  }

  subscribe(onMessageCallback) {
    if (!this.client || !this.connected) {
      console.warn('WebSocket non connecte - notifications temps reel indisponibles');
      return;
    }

    try {
      const subscription = this.client.subscribe('/topic/notifications', (message) => {
        try {
          const notification = JSON.parse(message.body);
          console.log('Notification received:', notification);
          if (onMessageCallback) {
            onMessageCallback(notification);
          }
        } catch (error) {
          console.error('Error parsing notification:', error);
        }
      });

      this.subscriptions.push(subscription);
    } catch (error) {
      console.error('Erreur subscription:', error);
    }
  }

  sendMessage(destination, body) {
    if (!this.client || !this.connected) {
      console.warn('WebSocket non connecte - message non envoye');
      return;
    }

    try {
      this.client.publish({
        destination: `/app${destination}`,
        body: JSON.stringify(body)
      });
    } catch (error) {
      console.error('Erreur envoi message:', error);
    }
  }

  disconnect() {
    if (this.client) {
      try {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
        this.subscriptions = [];
        this.client.deactivate();
        this.connected = false;
        console.log('WebSocket disconnected');
      } catch (error) {
        console.error('Erreur deconnexion:', error);
      }
    }
  }

  isConnected() {
    return this.connected;
  }
}

export const websocketService = new WebSocketService();
export default websocketService;
