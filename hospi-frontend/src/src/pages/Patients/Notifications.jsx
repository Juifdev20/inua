import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, Calendar, FileText, CreditCard, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { cn } from '../../lib/utils';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import { useNavigate } from 'react-router-dom';

const Notifications = () => {
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const API_BASE_URL = "http://localhost:8080/api/notifications";
  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  // --- 1. CHARGEMENT INITIAL (API) ---
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/user/${user.id}`, config);
        
        const normalizedData = response.data.map(n => ({
          ...n,
          read: n.isRead !== undefined ? n.isRead : n.read
        }));
        
        setNotifications(normalizedData);
      } catch (error) {
        console.error("Erreur chargement notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user?.id]);

  // --- 2. SYNCHRONISATION TEMPS RÉEL (WEBSOCKET) ---
  useEffect(() => {
    if (!user?.id) return;

    const socket = new SockJS('http://localhost:8080/ws-notifications');
    const stompClient = Stomp.over(socket);
    stompClient.debug = null; 

    stompClient.connect({}, () => {
      stompClient.subscribe(`/topic/notifications/${user.id}`, (message) => {
        const newNotif = JSON.parse(message.body);
        const normalizedNotif = {
          ...newNotif,
          read: newNotif.isRead !== undefined ? newNotif.isRead : false
        };
        setNotifications(prev => [normalizedNotif, ...prev]);
        window.dispatchEvent(new Event('notificationsUpdated'));
      });
    });

    return () => {
      if (stompClient && stompClient.connected) stompClient.disconnect();
    };
  }, [user?.id]);

  // --- 3. ACTIONS ---
  
  // Fonction de clic sur une notification (Marquer comme lu + Redirection)
  const handleNotificationAction = async (notification) => {
    const isUnread = !notification.read && !notification.isRead;
    
    // 1. Marquer comme lu si nécessaire
    if (isUnread) {
      await markAsRead(notification.id);
    }

    // 2. Redirection "Style Facebook" vers la ressource concernée
    if (notification.type === 'RENDEZ_VOUS') {
      // On utilise l'id contenu dans le message ou un champ de référence si disponible
      // Si votre backend envoie l'ID de la consultation dans referenceId :
      const targetId = notification.referenceId || notification.consultationId;
      if (targetId) {
        navigate(`/patient/appointments/${targetId}`);
      } else {
        navigate('/patient/appointments');
      }
    } else if (notification.type === 'DOCUMENT') {
      navigate('/patient/documents');
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.patch(`${API_BASE_URL}/${id}/read`, {}, config);
      setNotifications(prev => 
        prev.map((n) => (n.id === id ? { ...n, read: true, isRead: true } : n))
      );
      window.dispatchEvent(new Event('notificationsUpdated'));
    } catch (error) {
      console.error("Erreur lors du marquage lecture:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.post(`${API_BASE_URL}/user/${user.id}/mark-all-read`, {}, config);
      setNotifications(prev => prev.map((n) => ({ ...n, read: true, isRead: true })));
      window.dispatchEvent(new Event('notificationsUpdated'));
    } catch (error) {
      console.error("Erreur markAllAsRead:", error);
    }
  };

  // --- 4. LOGIQUE D'AFFICHAGE ---
  const filteredNotifications = notifications.filter((notif) => {
    const isUnread = !notif.read && !notif.isRead;
    if (filter === 'all') return true;
    if (filter === 'unread') return isUnread;
    return notif.type === filter;
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'RENDEZ_VOUS': return Calendar;
      case 'DOCUMENT': return FileText;
      case 'PAIEMENT': return CreditCard;
      default: return Bell;
    }
  };

  const getNotificationColor = (type) => {
    const colors = {
      RENDEZ_VOUS: 'bg-blue-500/10 text-blue-500',
      DOCUMENT: 'bg-emerald-500/10 text-emerald-500',
      PAIEMENT: 'bg-purple-500/10 text-purple-500',
      SYSTEME: 'bg-amber-500/10 text-amber-500',
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

  const unreadCount = notifications.filter((n) => !n.read && !n.isRead).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-muted-foreground">Chargement de vos alertes...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fadeIn">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Notifications</h1>
            <p className="text-muted-foreground font-medium">
              Vous avez <span className="text-emerald-500 font-bold">{unreadCount}</span> message(s) non lu(s).
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <CheckCircle className="w-5 h-5" />
              Tout marquer comme lu
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3 mb-8 overflow-x-auto pb-2 no-scrollbar">
        {[
          { id: 'all', label: 'Toutes' },
          { id: 'unread', label: 'Non lues' },
          { id: 'RENDEZ_VOUS', label: 'Rendez-vous' },
          { id: 'DOCUMENT', label: 'Documents' },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => setFilter(btn.id)}
            className={cn(
              "px-6 py-2.5 rounded-full font-bold text-sm border transition-all whitespace-nowrap",
              filter === btn.id ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-card text-muted-foreground border-border hover:border-emerald-500/50'
            )}
          >
            {btn.label} {btn.id === 'unread' && unreadCount > 0 && `(${unreadCount})`}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredNotifications.map((notification) => {
          const Icon = getNotificationIcon(notification.type);
          const isUnread = !notification.read && !notification.isRead;
          
          return (
            <div
              key={notification.id}
              onClick={() => handleNotificationAction(notification)}
              className={cn(
                "bg-card border-l-4 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group border-y border-r border-border relative overflow-hidden",
                isUnread ? 'border-l-emerald-500 bg-emerald-500/[0.03]' : 'border-l-transparent opacity-80'
              )}
            >
              <div className="flex items-start gap-5">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110", getNotificationColor(notification.type))}>
                  <Icon className="w-7 h-7" />
                </div>

                <div className="flex-1 text-left">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className={cn("text-lg font-bold flex items-center gap-2", isUnread ? 'text-foreground' : 'text-muted-foreground')}>
                      {notification.title}
                      {isUnread && <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />}
                    </h3>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{notification.message}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground/60 text-xs flex items-center gap-1.5 font-semibold">
                      <Calendar className="w-4 h-4" />
                      {new Date(notification.createdAt).toLocaleString('fr-FR')}
                    </span>
                    
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            Voir les détails <ArrowRight size={12} />
                        </span>
                        {isUnread && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                            className="text-emerald-500 hover:text-emerald-600 font-extrabold uppercase text-[10px] bg-emerald-500/10 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            Marquer comme lu
                        </button>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredNotifications.length === 0 && (
        <div className="text-center py-20 bg-muted/20 rounded-[2rem] border-2 border-dashed border-border mt-6">
          <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-foreground">Tout est à jour !</h3>
          <p className="text-muted-foreground mt-1">Vous n'avez aucune notification ici.</p>
        </div>
      )}
    </div>
  );
};

export default Notifications;