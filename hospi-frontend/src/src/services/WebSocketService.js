import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const WS_ENDPOINT = `${BACKEND_URL}/ws-hospital`;

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

    const token = localStorage.getItem('token');
    
    this.client = new Client({
      webSocketFactory: () => new SockJS(WS_ENDPOINT),
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: (str) => {
        console.log('STOMP Debug:', str);
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
      }
    });

    this.client.activate();
  }

  subscribe(onMessageCallback) {
    if (!this.client || !this.connected) {
      console.error('Cannot subscribe: client not connected');
      return;
    }

    // S'abonner au topic des notifications
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
  }

  sendMessage(destination, body) {
    if (!this.client || !this.connected) {
      console.error('Cannot send message: client not connected');
      return;
    }

    this.client.publish({
      destination: `/app${destination}`,
      body: JSON.stringify(body)
    });
  }

  disconnect() {
    if (this.client) {
      this.subscriptions.forEach((sub) => sub.unsubscribe());
      this.subscriptions = [];
      this.client.deactivate();
      this.connected = false;
      console.log('WebSocket disconnected');
    }
  }

  isConnected() {
    return this.connected;
  }
}

export const websocketService = new WebSocketService();
