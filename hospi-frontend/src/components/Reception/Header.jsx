import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Bell, ChevronDown, Moon, Sun, Menu, User, LogOut, Calendar, FileText, Info, Settings, UserPlus, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext'; 
import { useAuth } from '../../context/AuthContext';
import { admissionService } from '../../services/admissionService'; // ✅ Import du service
import axios from 'axios';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

const ReceptionHeader = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState([]); 
  const [unreadCount, setUnreadCount] = useState(0);      
  
  // --- NOUVEAUX ETATS POUR LA RECHERCHE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef(null);

  const navigate = useNavigate();
  const { user, logout } = useAuth(); 
  const { theme, toggleTheme, toggleMobileSidebar } = useAdmin();

  const API_BASE_URL = "http://localhost:8080/api/notifications";
  const BACKEND_URL = "http://localhost:8080";

  // --- LOGIQUE DE RECHERCHE PATIENT ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const results = await admissionService.searchPatients(searchQuery);
          setSearchResults(results);
          setShowSearchResults(true);
        } catch (err) {
          console.error("Erreur recherche:", err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300); // Délai pour ne pas saturer l'API

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Fermer la recherche si on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- LOGIQUE NOTIFICATIONS ---
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
    const handleGlobalUpdate = () => fetchNotificationData();
    window.addEventListener('notificationsUpdated', handleGlobalUpdate);
    return () => window.removeEventListener('notificationsUpdated', handleGlobalUpdate);
  }, [fetchNotificationData]);

  // --- WEBSOCKET avec Son et Desktop Notification ---
  useEffect(() => {
    if (!user?.id) return;
    const socket = new SockJS('http://localhost:8080/ws-notifications');
    const stompClient = Stomp.over(socket);
    stompClient.debug = null; 

    stompClient.connect({}, () => {
      stompClient.subscribe(`/topic/notifications/${user.id}`, (message) => {
        const newNotif = JSON.parse(message.body);
        
        // Ajouter la notification à la liste
        setNotifications(prev => [{...newNotif, read: false}, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Jouer le son si soundEnabled est vrai
        if (user.soundEnabled !== false) {
          try {
            const audio = new Audio('/assets/sounds/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(err => console.log('Audio play failed:', err));
          } catch (err) {
            console.log('Audio error:', err);
          }
        }

        // Afficher notification desktop si notificationEnabled est vrai
        if (user.notificationEnabled !== false) {
          if (document.visibilityState === 'hidden' || user.notificationEnabled) {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(newNotif.title || 'Nouvelle notification', {
                body: newNotif.message || 'Vous avez une nouvelle notification',
                icon: '/assets/images/logo.png',
                badge: '/assets/images/logo.png',
                tag: 'reception-notification',
                requireInteraction: false
              });
            }
          }
        }
      });
    });

    return () => {
      if (stompClient && stompClient.connected) stompClient.disconnect();
    };
  }, [user?.id, user?.soundEnabled, user?.notificationEnabled]);

  const handleMarkAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE_URL}/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotificationData();
    } catch (err) { console.error(err); }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/user/${user.id}/mark-all-read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotificationData();
    } catch (err) { console.error(err); }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'RENDEZ_VOUS': return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'PATIENT': return <UserPlus className="w-4 h-4 text-emerald-500" />;
      default: return <Info className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getAvatarUrl = () => {
    const timestamp = `?t=${new Date().getTime()}`;
    
    if (!user?.photoUrl) return `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=10b981&color=fff`;
    
    // Si c'est déjà une URL complète (data ou http)
    if (user.photoUrl.startsWith('data:') || user.photoUrl.startsWith('http')) return user.photoUrl;
    
    // Si le chemin commence déjà par /uploads, on utilise tel quel
    if (user.photoUrl.startsWith('/uploads')) {
      return `${BACKEND_URL}${user.photoUrl}${timestamp}`;
    }
    
    // Sinon, on ajoute le chemin complet /uploads/avatars/
    return `${BACKEND_URL}/uploads/avatars/${user.photoUrl}${timestamp}`;
  };

  return (
    <header className="h-16 bg-card border-b border-border sticky top-0 z-20 transition-colors duration-300">
      <div className="flex items-center justify-between px-4 md:px-8 h-full gap-4">
        
        {/* GAUCHE : Menu & Search */}
        <div className="flex items-center gap-4 flex-1 max-w-2xl">
          <button onClick={toggleMobileSidebar} className="lg:hidden p-2 rounded-xl hover:bg-muted text-muted-foreground transition-all">
            <Menu className="w-6 h-6" />
          </button>

          <div className="relative flex-1 hidden sm:block" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un patient ou un dossier..."
                className="w-full pl-10 pr-10 py-2 bg-muted/50 border border-border rounded-xl focus:outline-none focus:border-emerald-500 transition-all text-foreground text-sm"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-emerald-500" />
              )}
            </div>

            {/* --- RÉSULTATS DE RECHERCHE --- */}
            {showSearchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1">
                <div className="p-2 max-h-[400px] overflow-y-auto">
                  {searchResults.length > 0 ? (
                    searchResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          navigate(`/reception/patients/${p.id}`);
                          setShowSearchResults(false);
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-muted rounded-xl transition-colors text-left"
                      >
                        <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 rounded-lg flex items-center justify-center font-bold">
                          {p.firstName[0]}{p.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{p.firstName} {p.lastName}</p>
                          <p className="text-xs text-muted-foreground">{p.patientCode || 'Dossier #' + p.id}</p>
                        </div>
                        <FileText className="w-4 h-4 ml-auto text-muted-foreground/50" />
                      </button>
                    ))
                  ) : (
                    <div className="p-6 text-center text-muted-foreground text-sm italic">
                      Aucun patient trouvé pour "{searchQuery}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* DROITE : Actions & Profil */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          
          <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-muted/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-muted-foreground transition-all">
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-400" />}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
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
                  <h3 className="font-bold text-foreground">Flux Réception</h3>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-[10px] text-emerald-600 font-bold uppercase hover:underline">
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
                    <div className="p-8 text-center text-muted-foreground text-sm">Aucune activité récente</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* PROFIL SECTION */}
          <div className="relative flex items-center pl-2 md:pl-4 border-l border-border">
            <button
              onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
              className="flex items-center gap-3 p-1 rounded-xl hover:bg-muted transition-all"
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-emerald-500/20 bg-muted flex items-center justify-center shadow-sm">
                <img 
                  src={getAvatarUrl()} 
                  alt="Receptionist" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null; 
                    e.target.src = `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=10b981&color=fff`;
                  }}
                />
              </div>
              
              <div className="hidden md:block text-left">
                <p className="text-sm font-bold text-foreground leading-none">
                  {user?.firstName} {user?.lastName || 'Réception'}
                </p>
                <p className="text-[10px] text-emerald-500 mt-1 uppercase font-bold tracking-widest leading-none">
                  Personnel d'accueil
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showProfile ? 'rotate-180' : ''}`} />
            </button>

            {showProfile && (
              <div className="absolute right-0 top-full mt-3 w-64 bg-card rounded-2xl shadow-xl border border-border overflow-hidden py-2 animate-in slide-in-from-top-2">
                <div className="px-4 py-3 border-b border-border mb-1">
                  <p className="text-xs text-muted-foreground">Session Réception</p>
                  <p className="text-sm font-bold truncate text-foreground">{user?.email}</p>
                </div>
                <Link to="/reception/settings" onClick={() => setShowProfile(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-sm text-foreground transition-colors">
                  <Settings className="w-4 h-4" /> Paramètres Compte
                </Link>
                <Link to="/reception/settings" onClick={() => setShowProfile(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-sm text-foreground transition-colors">
                  <User className="w-4 h-4" /> Mon Profil
                </Link>
                <div className="h-px bg-border my-1" />
                <button onClick={() => { logout(); navigate('/login'); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-500 hover:bg-rose-500/10 font-bold transition-colors">
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

export default ReceptionHeader;