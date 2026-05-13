import React, { useState, useEffect, useRef } from 'react';
import { Menu, Bell, Moon, Sun, Search, Globe, ChevronDown, Check, LogOut, Settings, User, ArrowLeft, RotateCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext'; 
import { useTranslation } from 'react-i18next';
import '../../styles/pwa-titlebar.css';

/* ── Drapeaux SVG inline ── */
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
  { code: 'en', label: 'English', shortLabel: 'EN', Flag: FlagGB },
];

const Topbar = () => {
  const { toggleMobileSidebar, theme, toggleTheme } = useAdmin();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('fr') ? 'fr' : 'en';
  const activeLang = LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0];
  const ActiveFlag = activeLang.Flag;
  
  // 🔔 Notifications
  const notificationCtx = useNotifications();
  const notifications = notificationCtx?.notifications || [];
  const unreadCount = notificationCtx?.unreadCount || 0;
  const markAllAsRead = notificationCtx?.markAllAsRead || (() => {});
  
  // UI State
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const langRef = useRef(null);

  // --- DÉTECTION MODE PWA DESKTOP ---
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Détecte si l'app est en mode standalone (PWA installée)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsPWA(isStandalone);
  }, []);

  // 🛡️ SÉCURITÉ LOCALE : Évite l'écran noir si getTimeAgo n'est pas encore prêt
  const getTimeAgo = notificationCtx?.getTimeAgo || ((date) => {
    if (!date) return "À l'instant";
    try {
      const seconds = Math.floor((new Date() - new Date(date)) / 1000);
      if (seconds < 60) return "À l'instant";
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `Il y a ${minutes} min`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `Il y a ${hours} h`;
      return new Date(date).toLocaleDateString();
    } catch (e) {
      return "Récemment";
    }
  });

  // ✅ Utilitaire pour afficher le rôle sans crasher React
  const renderRoleName = (role) => {
    if (!role) return 'ADMIN';
    if (typeof role === 'object') return role.nom || 'ADMIN';
    return role;
  };

  // 🖼️ URL de la photo de profil (Backend)
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  const photoUrl = user?.photoUrl 
    ? `${BACKEND_URL}/uploads/profiles/${user.photoUrl}?t=${new Date().getTime()}` 
    : null;
  
  const displayName = `${user?.firstName || user?.prenom || ''} ${user?.lastName || user?.nom || ''}`.trim() || 'Admin';
  
  // ── LANGUE ──
  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('preferredLanguage', langCode);
    setShowLangMenu(false);
  };
  
  // Fermer tous les dropdowns au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;
      // Don't close if clicking on a button that opens a dropdown
      if (target.closest('button')) return;
      
      setShowLangMenu(false);
      setShowNotifications(false);
      setShowProfile(false);
    };
    
    if (showLangMenu || showNotifications || showProfile) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showLangMenu, showNotifications, showProfile]);

  return (
    <header className="h-16 bg-card border-b border-border sticky top-0 z-20 transition-colors duration-300">
      <div className="flex items-center justify-between px-4 md:px-8 h-full gap-4">
        {/* ★ PWA DESKTOP NAVIGATION BUTTONS (si mode standalone) ★ */}
        {isPWA && (
          <div className="flex items-center gap-1 mr-2 titlebar-no-drag">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-muted/50 text-muted-foreground transition-colors titlebar-no-drag"
              title="Retour"
            >
              <ArrowLeft width="18" height="18" strokeWidth={2.5} />
            </button>
            <button
              onClick={() => window.location.reload()}
              className="p-2 rounded-full hover:bg-muted/50 text-muted-foreground transition-colors titlebar-no-drag"
              title="Actualiser"
            >
              <RotateCw width="18" height="18" strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* ── GAUCHE : Menu + Recherche ── */}
        <div className="flex items-center gap-4 flex-1 max-w-2xl">
          <button
            onClick={toggleMobileSidebar}
            className="lg:hidden p-2 rounded-xl hover:bg-muted text-muted-foreground transition-all"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="relative flex-1 hidden sm:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              <input
                type="text"
                placeholder={t('header.searchPlaceholder') || 'Rechercher...'}
                className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-xl focus:outline-none focus:border-emerald-500 transition-all text-foreground text-sm"
              />
            </div>
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
                  <h3 className="font-bold text-foreground">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-emerald-500 text-white px-2 py-1 rounded-full font-bold">
                      {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      <Bell className="w-12 h-12 mx-auto mb-3 text-emerald-500/50" />
                      <p>Aucune notification</p>
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => markAllAsRead()}
                        className={`p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer flex gap-3 ${
                          notif.unread ? 'bg-emerald-500/5' : ''
                        }`}
                      >
                        <div className="flex-1">
                          <p className={`text-sm ${notif.unread ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                            {notif.message || notif.content}
                          </p>
                          <p className="text-[10px] text-emerald-500 mt-1 font-medium">
                            {notif.timestamp ? new Date(notif.timestamp).toLocaleTimeString() : 'À l\'instant'}
                          </p>
                        </div>
                        {notif.unread && (
                          <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 shrink-0" />
                        )}
                      </div>
                    ))
                  )}
                </div>
                <div
                  onClick={() => {
                    navigate('/admin/notifications');
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
                  src={photoUrl || `https://ui-avatars.com/api/?name=${user?.firstName || 'A'}+${user?.lastName || 'D'}&background=10b981&color=fff`}
                  alt="Admin"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${user?.firstName || 'A'}+${user?.lastName || 'D'}&background=10b981&color=fff`;
                  }}
                />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-bold text-foreground leading-none">
                  {displayName}
                </p>
                <p className="text-[10px] text-emerald-500 mt-1 uppercase font-bold tracking-widest leading-none">
                  {renderRoleName(user?.role)}
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showProfile ? 'rotate-180' : ''}`} />
            </button>

            {showProfile && (
              <div className="absolute right-0 top-full mt-3 w-64 bg-card rounded-2xl shadow-xl border border-border overflow-hidden py-2 animate-in slide-in-from-top-2 z-50">
                <div className="px-4 py-3 border-b border-border mb-1">
                  <p className="text-xs text-muted-foreground">Session Admin</p>
                  <p className="text-sm font-bold truncate text-foreground">
                    {user?.email || 'admin@inuaafia.com'}
                  </p>
                </div>
                <Link
                  to="/admin/profil"
                  onClick={() => setShowProfile(false)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-sm text-foreground transition-colors"
                >
                  <User className="w-4 h-4" /> Mon Profil
                </Link>
                <Link
                  to="/admin/parametres"
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
    </header>
  );
};

export default Topbar;