import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import { getBaseUrl } from '../utils/websocket';
import { BACKEND_URL } from '../config/environment.js';

const NotificationContext = createContext();

// Récupère l'id de l'utilisateur connecté depuis le stockage local.
const getUserId = () => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    return u?.id || u?.userId || null;
  } catch (e) { return null; }
};

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const API_BASE_URL = getBaseUrl();
  const pollRef = useRef(null);

  const getTimeAgo = (date) => {
    if (!date) return "À l'instant";
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now - past) / 1000);
    if (diffInSeconds < 60) return "À l'instant";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Il y a ${diffInHours} h`;
    return past.toLocaleDateString();
  };

  // 🔄 SOURCE DE VÉRITÉ = la base de données (REST). Fonctionne quelle que soit
  // l'instance backend qui a généré la notif (indispensable en multi-instance) :
  // même instance → rafraîchi instantanément par le WebSocket ; instance différente
  // → rattrapé par le polling. Aucune notif perdue.
  const fetchNotifications = useCallback(async () => {
    const userId = getUserId();
    const token = localStorage.getItem('token');
    if (!userId || !token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/notifications/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const payload = await res.json();
      const list = Array.isArray(payload) ? payload : (payload?.data || []);
      const mapped = list.map((n) => ({
        id: n.id,
        title: n.title || n.titre,
        message: n.message || n.content || n.contenu,
        timestamp: n.createdAt || n.timestamp || n.date,
        unread: (n.read === false || n.isRead === false || n.lu === false || n.unread === true),
        type: n.type,
      }));
      setNotifications(mapped);
      setUnreadCount(mapped.filter((n) => n.unread).length);
    } catch (e) {
      // silencieux : le WebSocket ou le prochain poll prendra le relais
    }
  }, []);

  // Chargement initial + polling de secours (30 s)
  useEffect(() => {
    fetchNotifications();
    pollRef.current = setInterval(fetchNotifications, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchNotifications]);

  // WebSocket : livraison instantanée quand l'utilisateur est sur la même instance.
  // À réception, on refetch depuis la base (cohérence + dédoublonnage garantis).
  useEffect(() => {
    let stompClient = null;
    try {
      const wsUrl = `${API_BASE_URL}/ws-hospital`;
      const socket = new SockJS(wsUrl, null, {
        transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
      });
      stompClient = Stomp.over(socket);
      stompClient.debug = null;
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      stompClient.connect(headers, () => {
        stompClient.subscribe('/topic/notifications', () => fetchNotifications());
        stompClient.subscribe('/user/queue/notifications', (message) => {
          fetchNotifications();
          // Cas spécial : statut d'hôpital (activation/désactivation) → événement immédiat
          try {
            const data = JSON.parse(message.body || '{}');
            if (data.type === 'HOSPITAL_STATUS') {
              window.dispatchEvent(new CustomEvent('hospital-status', { detail: data }));
            }
          } catch (e) { /* no-op */ }
        });
      }, () => { /* erreur WS : le polling prend le relais */ });
    } catch (error) {
      // WS indisponible : le polling assure la livraison
    }
    return () => {
      if (stompClient && stompClient.connected) {
        try { stompClient.disconnect(); } catch (e) { /* no-op */ }
      }
    };
  }, [API_BASE_URL, fetchNotifications]);

  const markAllAsRead = async () => {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    const userId = getUserId();
    const token = localStorage.getItem('token');
    if (userId && token) {
      try {
        await fetch(`${BACKEND_URL}/api/notifications/user/${userId}/mark-all-read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) { /* no-op */ }
    }
  };

  return (
    <NotificationContext.Provider value={{
      unreadCount,
      notifications,
      markAllAsRead,
      getTimeAgo,
      refreshNotifications: fetchNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
