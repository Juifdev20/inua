import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Bell, ChevronDown, Moon, Sun, Menu, User, LogOut,
  FileText, Info, Settings, Loader2, DollarSign, Receipt, Calendar,
  Check, Globe
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import axios from 'axios';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

/* ── Drapeaux SVG inline (légers, pas de dépendance externe) ── */
const FlagFR = ({ className }) => (
  <svg viewBox="0 0 640 480" className={className}>
    <rect width="213.3" height="480" fill="#002654" />
    <rect x="213.3" width="213.4" height="480" fill="#fff" />
    <rect x="426.7" width="213.3" height="480" fill="#CE1126" />
  </svg>
);

const FlagGB = ({ className }) => (
  <svg viewBox="0 0 640 480" className={className}>
    <path fill="#012169" d="M0 0h640v480H0z" />
    <path fill="#FFF" d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0h75z" />
    <path fill="#C8102E" d="m424 281 216 159v40L369 281h55zm-184 20 6 35L54 480H0l240-179zM640 0v3L391 191l2-44L590 0h50zM0 0l239 176h-60L0 42V0z" />
    <path fill="#FFF" d="M241 0v480h160V0H241zM0 160v160h640V160H0z" />
    <path fill="#C8102E" d="M0 193v96h640v-96H0zM273 0v480h96V0h-96z" />
  </svg>
);

const LANGUAGES = [
  { code: 'fr', label: 'Français', shortLabel: 'FR', Flag: FlagFR },
  { code: 'en', label: 'English',  shortLabel: 'EN', Flag: FlagGB },
];

const FinanceHeader = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const { t, i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('fr') ? 'fr' : 'en';

  // Thème local
  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  // Recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef(null);
  const langRef = useRef(null);

  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toggleMobileSidebar } = useFinance();

  // Notifications
  const notificationCtx = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  const API_BASE_URL = `${BACKEND_URL}/api/notifications`;

  // ═══════════════════════════════════
  //  THÈME
  // ═══════════════════════════════════
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('theme', newTheme);
  };

  // ═══════════════════════════════════
  //  LANGUE
  // ═══════════════════════════════════
  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('preferredLanguage', langCode);
    setShowLangMenu(false);
  };

  // Fermer menu langue au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langRef.current && !langRef.current.contains(event.target)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ═══════════════════════════════════
  //  RECHERCHE FACTURES / PATIENTS
  // ═══════════════════════════════════
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const token = localStorage.getItem('token');
          const res = await axios.get(
            `${BACKEND_URL}/api/patients/search?query=${encodeURIComponent(searchQuery)}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setSearchResults(res.data || []);
          setShowSearchResults(true);
        } catch (err) {
          console.error("Erreur recherche:", err);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ═══════════════════════════════════
  //  NOTIFICATIONS (API + WEBSOCKET)
  // ═══════════════════════════════════
  const fetchNotificationData = useCallback(async () => {
    if (!user?.id) return;
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      const [notifRes, countRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/user/${user.id}`, config),
        axios.get(`${API_BASE_URL}/user/${user.id}/unread-count`, config),
      ]);
      const normalized = notifRes.data.map((n) => ({
        ...n,
        read: n.isRead !== undefined ? n.isRead : n.read,
      }));
      setNotifications(normalized);
      setUnreadCount(countRes.data);
    } catch (err) {
      setNotifications(notificationCtx?.notifications || []);
      setUnreadCount(notificationCtx?.unreadCount || 0);
    }
  }, [user?.id, notificationCtx]);

  useEffect(() => {
    fetchNotificationData();
    const handler = () => fetchNotificationData();
    window.addEventListener('notificationsUpdated', handler);
    return () => window.removeEventListener('notificationsUpdated', handler);
  }, [fetchNotificationData]);

  useEffect(() => {
    if (!user?.id) return;
    const socket = new SockJS(`${BACKEND_URL}/ws-notifications`);
    const stompClient = Stomp.over(socket);
    stompClient.debug = null;

    stompClient.connect({}, () => {
      stompClient.subscribe(`/topic/notifications/${user.id}`, (message) => {
        const newNotif = JSON.parse(message.body);
        setNotifications((prev) => [{ ...newNotif, read: false }, ...prev]);
        setUnreadCount((prev) => prev + 1);

        if (user.soundEnabled !== false) {
          try {
            const audio = new Audio('/assets/sounds/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch (_) {}
        }

        if (user.notificationEnabled !== false && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(newNotif.title || 'Nouvelle notification', {
            body: newNotif.message || 'Vous avez une nouvelle notification',
            icon: '/assets/images/logo.png',
          });
        }
      });
    });

    return () => {
      if (stompClient?.connected) stompClient.disconnect();
    };
  }, [user?.id]);

  // ═══════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════
  const handleMarkAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE_URL}/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchNotificationData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/user/${user.id}/mark-all-read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchNotificationData();
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'PAIEMENT': return <DollarSign className="w-4 h-4 text-emerald-500" />;
      case 'FACTURE': return <Receipt className="w-4 h-4 text-blue-500" />;
      case 'RENDEZ_VOUS': return <Calendar className="w-4 h-4 text-blue-500" />;
      default: return <Info className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTimeAgo = (date) => {
    if (!date) return "Récemment";
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return "À l'instant";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    return new Date(date).toLocaleDateString();
  };

  const getAvatarUrl = () => {
    const timestamp = `?t=${new Date().getTime()}`;
    const firstName = user?.firstName || user?.prenom || '';
    const lastName = user?.lastName || user?.nom || '';

    if (!user?.photoUrl)
      return `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=10b981&color=fff`;

    if (user.photoUrl.startsWith('data:') || user.photoUrl.startsWith('http'))
      return user.photoUrl;

    if (user.photoUrl.startsWith('/uploads'))
      return `${BACKEND_URL}${user.photoUrl}${timestamp}`;

    return `${BACKEND_URL}/uploads/avatars/${user.photoUrl}${timestamp}`;
  };

  const displayName = `${user?.firstName || user?.prenom || ''} ${user?.lastName || user?.nom || ''}`.trim() || 'Finance Manager';

  const activeLang = LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0];
  const ActiveFlag = activeLang.Flag;

  // ═══════════════════════════════════
  //  RENDU
  // ═══════════════════════════════════
  return (
    <header className="h-16 bg-card border-b border-border sticky top-0 z-20 transition-colors duration-300">
      <div className="flex items-center justify-between px-4 md:px-8 h-full gap-4">

        {/* ── GAUCHE : Menu + Recherche ── */}
        <div className="flex items-center gap-4 flex-1 max-w-2xl">
          <button
            onClick={toggleMobileSidebar}
            className="lg:hidden p-2 rounded-xl hover:bg-muted text-muted-foreground transition-all"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="relative flex-1 hidden sm:block" ref={searchRef}>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
                strokeWidth={1.5}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('header.searchPlaceholder') || 'Rechercher facture, patient, transaction...'}
                className="w-full pl-10 pr-10 py-2 bg-muted/50 border border-border rounded-xl focus:outline-none focus:border-emerald-500 transition-all text-foreground text-sm"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-emerald-500" />
              )}
            </div>

            {showSearchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1">
                <div className="p-2 max-h-[400px] overflow-y-auto">
                  {searchResults.length > 0 ? (
                    searchResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          navigate(`/finance/patients/${p.id}`);
                          setShowSearchResults(false);
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-muted rounded-xl transition-colors text-left"
                      >
                        <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 rounded-lg flex items-center justify-center font-bold">
                          {(p.firstName || p.prenom || '?')[0]}
                          {(p.lastName || p.nom || '?')[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {p.firstName || p.prenom} {p.lastName || p.nom}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.patientCode || `Dossier #${p.id}`}
                          </p>
                        </div>
                        <FileText className="w-4 h-4 ml-auto text-muted-foreground/50" />
                      </button>
                    ))
                  ) : (
                    <div className="p-6 text-center text-muted-foreground text-sm italic">
                      Aucun résultat pour "{searchQuery}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── DROITE : Langue + Thème + Notifs + Profil ── */}
        <div className="flex items-center gap-1.5 md:gap-2.5 shrink-0">

          {/* ★ SÉLECTEUR DE LANGUE ★ */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => {
                setShowLangMenu(!showLangMenu);
                setShowNotifications(false);
                setShowProfile(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-muted/50 hover:bg-muted border border-transparent hover:border-border transition-all group"
              title={activeLang.label}
            >
              <div className="w-5 h-3.5 rounded-[3px] overflow-hidden shadow-sm ring-1 ring-black/10">
                <ActiveFlag className="w-full h-full" />
              </div>
              <span className="text-[11px] font-bold text-muted-foreground group-hover:text-foreground hidden md:block">
                {activeLang.shortLabel}
              </span>
              <ChevronDown className={`w-3 h-3 text-muted-foreground/60 transition-transform hidden md:block ${showLangMenu ? 'rotate-180' : ''}`} />
            </button>

            {showLangMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-card rounded-xl shadow-xl border border-border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                <div className="px-3 py-2.5 border-b border-border bg-muted/30">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Globe className="w-3 h-3" />
                    {t('settings.language') || 'Langue'}
                  </p>
                </div>
                {LANGUAGES.map((lang) => {
                  const LangFlag = lang.Flag;
                  const isActive = currentLang === lang.code;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                        isActive
                          ? 'bg-emerald-500/5 text-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <div className="w-6 h-4 rounded-[3px] overflow-hidden shadow-sm ring-1 ring-black/10 shrink-0">
                        <LangFlag className="w-full h-full" />
                      </div>
                      <span className="font-bold text-xs flex-1 text-left">{lang.label}</span>
                      {isActive && (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Toggle Thème */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-muted/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-muted-foreground transition-all"
            title={theme === 'light' ? 'Mode sombre' : 'Mode clair'}
          >
            {theme === 'light'
              ? <Moon className="w-5 h-5" />
              : <Sun className="w-5 h-5 text-amber-400" />}
          </button>

          {/* ── Notifications ── */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfile(false);
                setShowLangMenu(false);
              }}
              className="relative p-2.5 bg-muted/50 rounded-xl text-muted-foreground hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
            >
              <Bell className="w-5 h-5" strokeWidth={1.5} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold border-2 border-card animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-card rounded-2xl shadow-xl border border-border overflow-hidden ring-1 ring-black/5 animate-in slide-in-from-top-2 z-50">
                <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                  <h3 className="font-bold text-foreground">Flux Finance</h3>
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
                    notifications.slice(0, 8).map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => !notif.read && handleMarkAsRead(notif.id)}
                        className={`p-4 border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer flex gap-3 ${
                          !notif.read ? 'bg-emerald-500/5' : ''
                        }`}
                      >
                        <div className="mt-1">{getIcon(notif.type)}</div>
                        <div className="flex-1 text-left">
                          <p className={`text-sm ${!notif.read ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                            {notif.title || notif.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-emerald-500 mt-1 font-medium">
                            {getTimeAgo(notif.timestamp || notif.createdAt)}
                          </p>
                        </div>
                        {!notif.read && (
                          <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 shrink-0" />
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      Aucune activité récente
                    </div>
                  )}
                </div>
                <div
                  onClick={() => {
                    navigate('/finance/notifications');
                    setShowNotifications(false);
                  }}
                  className="p-3 text-center border-t border-border bg-muted/10 cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <span className="text-xs font-semibold text-emerald-600">
                    Voir tout l'historique →
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── PROFIL ── */}
          <div className="relative flex items-center pl-2 md:pl-4 border-l border-border">
            <button
              onClick={() => {
                setShowProfile(!showProfile);
                setShowNotifications(false);
                setShowLangMenu(false);
              }}
              className="flex items-center gap-3 p-1 rounded-xl hover:bg-muted transition-all"
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-emerald-500/20 bg-muted flex items-center justify-center shadow-sm">
                <img
                  src={getAvatarUrl()}
                  alt="Finance"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    const fn = user?.firstName || user?.prenom || 'F';
                    const ln = user?.lastName || user?.nom || 'N';
                    e.target.src = `https://ui-avatars.com/api/?name=${fn}+${ln}&background=10b981&color=fff`;
                  }}
                />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-bold text-foreground leading-none">
                  {displayName}
                </p>
                <p className="text-[10px] text-emerald-500 mt-1 uppercase font-bold tracking-widest leading-none">
                  Département Finance
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showProfile ? 'rotate-180' : ''}`} />
            </button>

            {showProfile && (
              <div className="absolute right-0 top-full mt-3 w-64 bg-card rounded-2xl shadow-xl border border-border overflow-hidden py-2 animate-in slide-in-from-top-2 z-50">
                <div className="px-4 py-3 border-b border-border mb-1">
                  <p className="text-xs text-muted-foreground">Session Finance</p>
                  <p className="text-sm font-bold truncate text-foreground">
                    {user?.email || 'finance@hospital.com'}
                  </p>
                </div>
                <Link
                  to="/finance/settings"
                  onClick={() => setShowProfile(false)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-sm text-foreground transition-colors"
                >
                  <Settings className="w-4 h-4" /> {t('nav.settings') || 'Paramètres'}
                </Link>
                <div className="h-px bg-border my-1" />
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-500 hover:bg-rose-500/10 font-bold transition-colors"
                >
                  <LogOut className="w-4 h-4" /> {t('nav.logout') || 'Déconnexion'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fermer tous les dropdowns au clic extérieur */}
      {(showNotifications || showProfile || showLangMenu) && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => {
            setShowNotifications(false);
            setShowProfile(false);
            setShowLangMenu(false);
          }}
        />
      )}
    </header>
  );
};

export default FinanceHeader;