import React, { createContext, useContext, useState, useEffect } from 'react';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import { getBaseUrl } from '../utils/websocket';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const API_BASE_URL = getBaseUrl();

  const getTimeAgo = (date) => {
    if (!date) return "À l'instant";
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return "À l'instant";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (hours < 24) return `Il y a ${diffInHours} h`;
    return past.toLocaleDateString();
  };

  useEffect(() => {
    try {
      const wsUrl = `${API_BASE_URL}/ws-hospital`;
      console.log('NotificationContext - Connexion a:', wsUrl);
      
      const socket = new SockJS(wsUrl);
      const stompClient = Stomp.over(socket);
      stompClient.debug = null;

    stompClient.connect({}, () => {
      console.log('NotificationContext - WebSocket connecte');
      stompClient.subscribe('/topic/notifications', (message) => {
        if (message.body) {
          try {
            const data = JSON.parse(message.body);
            
            // On utilise une seule mise a jour d'etat pour eviter les desynchronisations
            setNotifications(prev => {
              // FILTRE ANTI-DOUBLON STRICT
              const isDuplicate = prev.some(n => 
                n.message === data.content && 
                (new Date() - new Date(n.timestamp)) < 3000
              );

              if (isDuplicate) {
                return prev; 
              }

              // Si ce n'est pas un doublon, on cree la notif
              const newNotif = {
                id: `${Date.now()}-${Math.random()}`, 
                message: data.content,
                timestamp: new Date().toISOString(),
                unread: true
              };

              // ON MET A JOUR LE COMPTEUR ICI SEULEMENT
              setUnreadCount(count => count + 1);

              return [newNotif, ...prev];
            });
          } catch (error) {
            console.error('Erreur parsing notification:', error);
          }
        }
      });
    }, (error) => {
      console.error('NotificationContext - Erreur WebSocket:', error);
    });

    return () => {
      if (stompClient && stompClient.connected) {
        try {
          stompClient.disconnect();
        } catch (error) {
          console.error('Erreur deconnexion:', error);
        }
      }
    };
    } catch (error) {
      console.error('Erreur initialisation WebSocket:', error);
    }
  }, []);

  const markAllAsRead = () => {
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  return (
    <NotificationContext.Provider value={{ 
      unreadCount, 
      notifications, 
      markAllAsRead, 
      getTimeAgo 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);