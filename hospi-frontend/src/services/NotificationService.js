import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

// Configuration dynamique pour supporter HTTP (dev) et HTTPS (prod)
const getWebSocketUrl = () => {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  
  // Securite : transformer http:// en https:// si la page est chargee en HTTPS
  let socketUrl = baseUrl;
  if (baseUrl.startsWith('http://') && window.location.protocol === 'https:') {
    socketUrl = baseUrl.replace('http://', 'https://');
    console.log('Conversion auto HTTP → HTTPS pour Notification WebSocket');
  }
  
  return `${socketUrl}/ws-hospital`;
};

class NotificationService {
    constructor() {
        this.stompClient = null;
        this.connected = false;
    }

    connect(onNotificationReceived) {
        try {
            const wsUrl = getWebSocketUrl();
            console.log('Connexion Notification WebSocket a:', wsUrl);
            
            // Connexion au point d'entree defini dans le Backend
            const socket = new SockJS(wsUrl);
            this.stompClient = Stomp.over(socket);
        
        // Désactiver les logs de debug dans la console (optionnel)
        this.stompClient.debug = null;

        this.stompClient.connect({}, (frame) => {
            console.log('Connecte au WebSocket');
            this.connected = true;
            
            // On s'abonne au canal des notifications
            this.stompClient.subscribe('/topic/notifications', (message) => {
                if (message.body) {
                    try {
                        onNotificationReceived(JSON.parse(message.body));
                    } catch (error) {
                        console.error('Erreur parsing notification:', error);
                    }
                }
            });
        }, (error) => {
            console.error('Erreur WebSocket:', error);
            this.connected = false;
            // Tentative de reconnexion apres 5 secondes
            setTimeout(() => this.connect(onNotificationReceived), 5000);
        });
        } catch (error) {
            console.error('Erreur initialisation Notification WebSocket:', error);
            this.connected = false;
            // L'application continue sans notifications temps reel
        }
    }

    disconnect() {
        if (this.stompClient !== null) {
            try {
                this.stompClient.disconnect();
                this.connected = false;
            } catch (error) {
                console.error('Erreur deconnexion:', error);
            }
        }
    }

    isConnected() {
        return this.connected;
    }
}

export default new NotificationService();