import React, { useState, useEffect, useCallback } from 'react';
import { Search, Bell, ChevronDown, Moon, Sun, Menu, User, LogOut, Calendar, FileText, Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext'; 
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

const Header = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState([]); 
  const [unreadCount, setUnreadCount] = useState(0);      
  const navigate = useNavigate();
  
  const { user, logout } = useAuth();
  const { theme, toggleTheme, toggleMobileSidebar } = useAdmin();

  const API_BASE_URL = "http://localhost:8080/api/notifications";
  // ✅ Ajout de l'URL de base pour les images
  const IMAGE_BASE_URL = "http://localhost:8080/uploads/profiles/";

  // --- FONCTION DE CHARGEMENT DES DONNÉES ---
  const fetchNotificationData = useCallback(async () => {
    if (!user?.id) return;
    const token = localStorage.getItem('token'); 
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      const [notifRes, countRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/user/${user.id}`, config),
        axios.get(`${API_BASE_URL}/user/${user.id}/unread-count`, config)
      ]);
      
      const normalized = notifRes.data.map(n => ({
        ...n,
        read: n.isRead !== undefined ? n.isRead : n.read
      }));

      setNotifications(normalized);
      setUnreadCount(countRes.data);
    } catch (err) {
      console.error("Erreur API Header Notifications:", err);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotificationData();

    const handleGlobalUpdate = () => {
      fetchNotificationData();
    };

    window.addEventListener('notificationsUpdated', handleGlobalUpdate);
    return () => window.removeEventListener('notificationsUpdated', handleGlobalUpdate);
  }, [fetchNotificationData]);

  // --- LOGIQUE WEBSOCKET ---
  useEffect(() => {
    if (!user?.id) return;

    const socket = new SockJS('http://localhost:8080/ws-notifications');
    const stompClient = Stomp.over(socket);
    stompClient.debug = null; 

    stompClient.connect({}, () => {
      stompClient.subscribe(`/topic/notifications/${user.id}`, (message) => {
        const newNotif = JSON.parse(message.body);
        setNotifications(prev => [{...newNotif, read: false}, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        if (Notification.permission === "granted") {
          new Notification(newNotif.title, { body: newNotif.message });
        }
      });
    });

    return () => {
      if (stompClient && stompClient.connected) stompClient.disconnect();
    };
  }, [user?.id]);

  // --- ACTIONS ---
  const handleMarkAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE_URL}/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotificationData();
    } catch (err) {
      console.error("Erreur marquage lecture", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/user/${user.id}/mark-all-read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotificationData();
      window.dispatchEvent(new Event('notificationsUpdated'));
    } catch (err) {
      console.error("Erreur tout marquer lu", err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'RENDEZ_VOUS': return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'DOCUMENT': return <FileText className="w-4 h-4 text-emerald-500" />;
      default: return <Info className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ✅ Logique pour construire l'URL de l'image de profil
  const getAvatarUrl = () => {
    if (!user?.photoUrl) return `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=10b981&color=fff`;
    if (user.photoUrl.startsWith('data:') || user.photoUrl.startsWith('http')) return user.photoUrl;
    return `${IMAGE_BASE_URL}${user.photoUrl}`;
  };

  return (
    <header className="h-16 bg-card border-b border-border sticky top-0 z-20 transition-colors duration-300">
      <div className="flex items-center justify-between px-4 md:px-8 h-full gap-4">
        
        {/* GAUCHE : Menu & Search */}
        <div className="flex items-center gap-4 flex-1 max-w-2xl">
          <button onClick={toggleMobileSidebar} className="lg:hidden p-2 rounded-xl hover:bg-muted text-muted-foreground transition-all">
            <Menu className="w-6 h-6" />
          </button>

          <div className="relative flex-1 hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-xl focus:outline-none focus:border-emerald-500 transition-all text-foreground"
            />
          </div>
        </div>

        {/* DROITE : Actions & Profil */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          
          <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-muted/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-muted-foreground transition-all">
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-400" />}
          </button>

          {/* Notifications Cloche */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfile(false);
              }}
              className="relative p-2.5 bg-muted/50 rounded-xl text-muted-foreground hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
            >
              <Bell className="w-5 h-5" strokeWidth={1.5} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold border-2 border-card animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-card rounded-2xl shadow-xl border border-border overflow-hidden ring-1 ring-black/5 animate-in slide-in-from-top-2">
                <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                  <h3 className="font-bold text-foreground">Notifications</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleMarkAllRead}
                      className="text-[10px] text-emerald-600 font-bold uppercase hover:underline"
                    >
                      Tout marquer lu
                    </button>
                  )}
                </div>
                
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        onClick={() => !notif.read && handleMarkAsRead(notif.id)}
                        className={`p-4 border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer flex gap-3 ${!notif.read ? 'bg-emerald-500/5' : ''}`}
                      >
                        <div className="mt-1">{getIcon(notif.type)}</div>
                        <div className="flex-1 text-left">
                            <p className={`text-sm ${!notif.read ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>{notif.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                        </div>
                        {!notif.read && <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 shrink-0" />}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-muted-foreground text-sm">Aucune notification</div>
                  )}
                </div>
                <Link 
                  to="/patient/notifications" 
                  onClick={() => setShowNotifications(false)} 
                  className="block p-3 text-center text-xs text-muted-foreground hover:bg-muted/50 border-t border-border transition-colors font-medium"
                >
                  Voir tout l'historique
                </Link>
              </div>
            )}
          </div>

          {/* PROFIL SECTION */}
          <div className="relative flex items-center pl-2 md:pl-4 border-l border-border">
            <button
              onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
              className="flex items-center gap-3 p-1 rounded-xl hover:bg-muted transition-all"
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-border bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-sm">
                <img 
                  src={getAvatarUrl()} 
                  alt="Profil" 
                  key={user?.photoUrl} // Force le re-chargement lors du changement d'URL
                  className="w-full h-full object-cover animate-in fade-in duration-500"
                  onError={(e) => {
                    e.target.onerror = null; 
                    e.target.src = `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=10b981&color=fff`;
                  }}
                />
              </div>
              
              <div className="hidden md:block text-left">
                <p className="text-sm font-bold text-foreground leading-none">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[10px] text-emerald-500 mt-1 uppercase font-bold tracking-widest">
                  {user?.role}
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showProfile ? 'rotate-180' : ''}`} />
            </button>

            {showProfile && (
              <div className="absolute right-0 top-full mt-3 w-60 bg-card rounded-2xl shadow-xl border border-border overflow-hidden py-2 animate-in slide-in-from-top-2">
                <div className="px-4 py-3 border-b border-border mb-1">
                  <p className="text-xs text-muted-foreground">Connecté en tant que</p>
                  <p className="text-sm font-bold truncate text-foreground">{user?.email}</p>
                </div>
                <Link 
                  to="/patient/profile" 
                  onClick={() => setShowProfile(false)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-sm text-foreground"
                >
                  <User className="w-4 h-4" /> Mon Profil
                </Link>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-500 hover:bg-rose-500/10 font-bold transition-colors">
                  <LogOut className="w-4 h-4" /> Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;