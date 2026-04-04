import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

class NotificationService {
    constructor() {
        this.stompClient = null;
    }

    connect(onNotificationReceived) {
        // Connexion au point d'entrée défini dans le Backend
        const socket = new SockJS('http://localhost:8080/ws-hospital');
        this.stompClient = Stomp.over(socket);
        
        // Désactiver les logs de debug dans la console (optionnel)
        this.stompClient.debug = null;

        this.stompClient.connect({}, (frame) => {
            console.log('Connecté au WebSocket');
            
            // On s'abonne au canal des notifications
            this.stompClient.subscribe('/topic/notifications', (message) => {
                if (message.body) {
                    onNotificationReceived(JSON.parse(message.body));
                }
            });
        }, (error) => {
            console.error('Erreur WebSocket:', error);
            // Tentative de reconnexion après 5 secondes
            setTimeout(() => this.connect(onNotificationReceived), 5000);
        });
    }

    disconnect() {
        if (this.stompClient !== null) {
            this.stompClient.disconnect();
        }
    }
}

export default new NotificationService();