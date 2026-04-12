import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell, CheckCircle, Calendar, FileText, CreditCard,
  Loader2, ArrowRight, Search, X, BellOff, Filter,
  Clock, ChevronDown, Inbox
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { cn } from '../../lib/utils';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

// Détection automatique de l'environnement
const isLocalhost = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' || 
                   window.location.hostname.includes('local');
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 
                    (isLocalhost ? 'http://localhost:8080' : 'https://inuaafia.onrender.com');
const API_BASE_URL = `${BACKEND_URL}/api/notifications`;

const Notifications = () => {
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  /* ═══ 1. CHARGEMENT INITIAL ═══ */
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/user/${user.id}`, config);
        const normalizedData = (response.data || []).map((n) => ({
          ...n,
          read: n.isRead !== undefined ? n.isRead : n.read,
        }));
        setNotifications(normalizedData);
      } catch (error) {
        console.error('Erreur chargement notifications:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [user?.id]);

  /* ═══ 2. WEBSOCKET TEMPS RÉEL ═══ */
  useEffect(() => {
    if (!user?.id) return;

    const socket = new SockJS(`${BACKEND_URL}/ws-notifications`);
    const stompClient = Stomp.over(socket);
    stompClient.debug = null;

    stompClient.connect({}, () => {
      stompClient.subscribe(`/topic/notifications/${user.id}`, (message) => {
        const newNotif = JSON.parse(message.body);
        const normalized = {
          ...newNotif,
          read: newNotif.isRead !== undefined ? newNotif.isRead : false,
        };
        setNotifications((prev) => [normalized, ...prev]);
        window.dispatchEvent(new Event('notificationsUpdated'));
      });
    });

    return () => {
      if (stompClient?.connected) stompClient.disconnect();
    };
  }, [user?.id]);

  /* ═══ 3. ACTIONS ═══ */
  const handleNotificationAction = async (notification) => {
    const isUnread = !notification.read && !notification.isRead;
    if (isUnread) await markAsRead(notification.id);

    if (notification.type === 'RENDEZ_VOUS') {
      const targetId = notification.referenceId || notification.consultationId;
      navigate(targetId ? `/patient/appointments/${targetId}` : '/patient/appointments');
    } else if (notification.type === 'DOCUMENT') {
      navigate('/patient/documents');
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.patch(`${API_BASE_URL}/${id}/read`, {}, config);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, isRead: true } : n))
      );
      window.dispatchEvent(new Event('notificationsUpdated'));
    } catch (error) {
      console.error('Erreur marquage lecture:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.post(`${API_BASE_URL}/user/${user.id}/mark-all-read`, {}, config);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })));
      window.dispatchEvent(new Event('notificationsUpdated'));
    } catch (error) {
      console.error('Erreur markAllAsRead:', error);
    }
  };

  /* ═══ 4. HELPERS ═══ */
  const typeConfig = {
    RENDEZ_VOUS: { label: 'Rendez-vous', color: '#3B82F6', icon: Calendar },
    DOCUMENT:    { label: 'Document',     color: '#10B981', icon: FileText },
    PAIEMENT:    { label: 'Paiement',     color: '#8B5CF6', icon: CreditCard },
    SYSTEME:     { label: 'Système',      color: '#F59E0B', icon: Bell },
  };

  const getTypeConfig = (type) =>
    typeConfig[type] || { label: type || 'Notification', color: '#6B7280', icon: Bell };

  const formatTimeAgo = (date) => {
    if (!date) return '';
    try {
      const d = new Date(date);
      const now = new Date();
      const diffMs = now - d;
      const diffMin = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);

      if (diffMin < 1) return "À l'instant";
      if (diffMin < 60) return `Il y a ${diffMin} min`;
      if (diffHours < 24) return `Il y a ${diffHours}h`;
      return format(d, 'dd MMM à HH:mm', { locale: fr });
    } catch {
      return '';
    }
  };

  const getDateGroup = (date) => {
    if (!date) return 'Autres';
    try {
      const d = new Date(date);
      if (isToday(d)) return "Aujourd'hui";
      if (isYesterday(d)) return 'Hier';
      return format(d, 'EEEE dd MMMM', { locale: fr });
    } catch {
      return 'Autres';
    }
  };

  /* ═══ 5. FILTRAGE ═══ */
  const unreadCount = notifications.filter((n) => !n.read && !n.isRead).length;

  const filteredNotifications = useMemo(() => {
    let result = [...notifications];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (n) =>
          (n.title || '').toLowerCase().includes(q) ||
          (n.message || '').toLowerCase().includes(q)
      );
    }

    if (filter === 'unread') {
      result = result.filter((n) => !n.read && !n.isRead);
    } else if (filter !== 'all') {
      result = result.filter((n) => n.type === filter);
    }

    return result;
  }, [notifications, filter, searchTerm]);

  /* ── Grouper par date ── */
  const groupedNotifications = useMemo(() => {
    const groups = {};
    filteredNotifications.forEach((notif) => {
      const group = getDateGroup(notif.createdAt);
      if (!groups[group]) groups[group] = [];
      groups[group].push(notif);
    });
    return groups;
  }, [filteredNotifications]);

  /* ═══ RENDU ═══ */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-in fade-in duration-500">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">
          Chargement des notifications...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/10 relative">
              <Bell className="w-7 h-7 text-emerald-600" strokeWidth={2.5} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                Notifications
              </h1>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                {unreadCount > 0 ? (
                  <>
                    <span className="text-emerald-500 font-black">{unreadCount}</span> notification{unreadCount > 1 ? 's' : ''} non lue{unreadCount > 1 ? 's' : ''}
                  </>
                ) : (
                  'Tout est à jour'
                )}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              onClick={markAllAsRead}
              size="sm"
              className="rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white gap-2 shadow-lg shadow-emerald-500/20"
            >
              <CheckCircle className="w-4 h-4" />
              Tout marquer comme lu
            </Button>
          )}
        </div>

        {/* Barre de recherche + Filtres */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher dans les notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl border-muted bg-card focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 overflow-x-auto no-scrollbar w-full sm:w-auto">
            {[
              { id: 'all', label: 'Toutes' },
              { id: 'unread', label: 'Non lues', count: unreadCount },
              { id: 'RENDEZ_VOUS', label: 'RDV' },
              { id: 'DOCUMENT', label: 'Documents' },
              { id: 'PAIEMENT', label: 'Paiements' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilter(btn.id)}
                className={cn(
                  'px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5',
                  filter === btn.id
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-card text-muted-foreground border border-border hover:border-emerald-500/30 hover:bg-muted/50'
                )}
              >
                {btn.label}
                {btn.count != null && btn.count > 0 && (
                  <span className={cn(
                    'px-1.5 py-0.5 rounded-md text-[9px] font-black',
                    filter === btn.id
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-500/10 text-emerald-600'
                  )}>
                    {btn.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ FEED NOTIFICATIONS — Groupé par date ═══ */}
      {filteredNotifications.length === 0 ? (
        <Card className="border-none shadow-sm bg-card rounded-2xl">
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/5 flex items-center justify-center mb-6">
              {filter === 'unread' ? (
                <CheckCircle className="w-10 h-10 text-emerald-500/30" />
              ) : (
                <Inbox className="w-10 h-10 text-muted-foreground/30" />
              )}
            </div>
            <h3 className="text-lg font-black text-foreground mb-2">
              {filter === 'unread' ? 'Tout est lu !' : 'Aucune notification'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              {filter === 'unread'
                ? 'Vous avez lu toutes vos notifications. Revenez plus tard !'
                : searchTerm
                  ? `Aucun résultat pour "${searchTerm}"`
                  : "Vous n'avez aucune notification pour le moment."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedNotifications).map(([dateGroup, notifs]) => (
            <div key={dateGroup}>
              {/* Séparateur de groupe */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  {dateGroup}
                </span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] font-bold text-muted-foreground/60">
                  {notifs.length} notif{notifs.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Cartes notifications */}
              <div className="space-y-3">
                {notifs.map((notification) => {
                  const cfg = getTypeConfig(notification.type);
                  const Icon = cfg.icon;
                  const isUnread = !notification.read && !notification.isRead;

                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationAction(notification)}
                      className={cn(
                        'relative bg-card rounded-2xl border transition-all cursor-pointer group overflow-hidden',
                        'hover:shadow-md hover:border-emerald-500/20',
                        isUnread
                          ? 'border-emerald-500/30 shadow-sm'
                          : 'border-border/50 opacity-75 hover:opacity-100'
                      )}
                    >
                      {/* Bande latérale */}
                      <div className={cn(
                        'absolute top-0 left-0 w-1 h-full transition-all',
                        isUnread ? 'bg-emerald-500' : 'bg-transparent group-hover:bg-border'
                      )} />

                      <div className="flex items-start gap-4 p-5 pl-6">
                        {/* Icône */}
                        <div
                          className={cn(
                            'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
                          )}
                          style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>

                        {/* Contenu */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <h3 className={cn(
                                'font-bold text-sm truncate',
                                isUnread ? 'text-foreground' : 'text-muted-foreground'
                              )}>
                                {notification.title}
                              </h3>
                              {isUnread && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                              )}
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground/60 whitespace-nowrap shrink-0">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                          </div>

                          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between">
                            {/* Badge type */}
                            <span
                              className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider"
                              style={{ backgroundColor: `${cfg.color}10`, color: cfg.color }}
                            >
                              {cfg.label}
                            </span>

                            <div className="flex items-center gap-2">
                              {/* Lien "Voir détails" */}
                              <span className="text-[10px] font-black uppercase text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                Voir détails <ArrowRight className="w-3 h-3" />
                              </span>

                              {/* Bouton marquer comme lu */}
                              {isUnread && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                  className="text-emerald-500 hover:text-emerald-600 font-black uppercase text-[9px] bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg transition-colors"
                                >
                                  Lu
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
            </div>
          ))}
        </div>
      )}

      {/* ═══ FOOTER STATS ═══ */}
      {notifications.length > 0 && (
        <div className="flex items-center justify-center gap-6 py-6 text-xs text-muted-foreground/60">
          <span className="flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" />
            {notifications.length} total
          </span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500/50" />
            {notifications.length - unreadCount} lue{notifications.length - unreadCount > 1 ? 's' : ''}
          </span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-500/50" />
            {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
};

export default Notifications;