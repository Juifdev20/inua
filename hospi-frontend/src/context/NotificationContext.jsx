import React, { createContext, useContext, useState, useEffect } from 'react';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const API_BASE_URL = "http://localhost:8080";

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
    const socket = new SockJS(`${API_BASE_URL}/ws-hospital`);
    const stompClient = Stomp.over(socket);
    stompClient.debug = null;

    stompClient.connect({}, () => {
      stompClient.subscribe('/topic/notifications', (message) => {
        if (message.body) {
          const data = JSON.parse(message.body);
          
          // On utilise une seule mise à jour d'état pour éviter les désynchronisations
          setNotifications(prev => {
            // 🛡️ FILTRE ANTI-DOUBLON STRICT
            // On vérifie si le contenu existe déjà (indépendamment du temps)
            // ou s'il est arrivé il y a moins de 3 secondes
            const isDuplicate = prev.some(n => 
              n.message === data.content && 
              (new Date() - new Date(n.timestamp)) < 3000
            );

            if (isDuplicate) {
              return prev; 
            }

            // Si ce n'est pas un doublon, on crée la notif
            const newNotif = {
              id: `${Date.now()}-${Math.random()}`, 
              message: data.content,
              timestamp: new Date().toISOString(),
              unread: true
            };

            // ✅ ON MET À JOUR LE COMPTEUR ICI SEULEMENT
            setUnreadCount(count => count + 1);

            return [newNotif, ...prev];
          });
        }
      });
    });

    return () => {
      if (stompClient && stompClient.connected) {
        stompClient.disconnect();
      }
    };
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