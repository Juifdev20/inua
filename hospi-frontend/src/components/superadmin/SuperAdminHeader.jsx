import React, { useState, useEffect, useRef } from 'react';
import { Menu, Moon, Sun, LogOut, User, ChevronDown, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { useAuth } from '../../context/AuthContext';
import { BACKEND_URL } from '../../config/environment.js';
import { cn } from '../../lib/utils';

const SuperAdminHeader = () => {
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();
  const profileRef = useRef(null);

  const { user, logout } = useAuth();
  const { theme, toggleTheme, toggleMobileSidebar } = useAdmin();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getAvatarUrl = () => {
    if (user?.photoUrl) {
      return user.photoUrl.startsWith('http') ? user.photoUrl : `${BACKEND_URL}${user.photoUrl}`;
    }
    return `https://ui-avatars.com/api/?name=${user?.firstName || 'S'}+${user?.lastName || 'A'}&background=10b981&color=fff`;
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-border bg-card/80 backdrop-blur-md shrink-0 z-20">
      {/* LEFT: Mobile toggle + Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleMobileSidebar}
          className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>

        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary hidden sm:block" />
          <h1 className="text-lg font-bold text-foreground hidden sm:block">Gouvernance & Sécurité</h1>
        </div>
      </div>

      {/* RIGHT: Actions */}
      <div className="flex items-center gap-2">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-500" />
          ) : (
            <Moon className="w-5 h-5 text-slate-500" />
          )}
        </button>

        {/* PROFIL SECTION */}
        <div className="relative flex items-center pl-2 md:pl-4 border-l border-border" ref={profileRef}>
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-3 p-1 rounded-xl hover:bg-muted transition-all"
          >
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-border bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold shadow-sm">
              <img
                src={getAvatarUrl()}
                alt="Profil"
                className="w-full h-full object-cover animate-in fade-in duration-500"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${user?.firstName || 'S'}+${user?.lastName || 'A'}&background=10b981&color=fff`;
                }}
              />
            </div>

            <div className="hidden md:block text-left">
              <p className="text-sm font-bold text-foreground leading-none">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[10px] text-primary mt-1 uppercase font-bold tracking-widest">
                {user?.role}
              </p>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", showProfile ? 'rotate-180' : '')} />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full mt-3 w-60 bg-card rounded-2xl shadow-xl border border-border overflow-hidden py-2 animate-in slide-in-from-top-2 z-50">
              <div className="px-4 py-3 border-b border-border mb-1">
                <p className="text-xs text-muted-foreground">Connecté en tant que</p>
                <p className="text-sm font-bold truncate text-foreground">{user?.email}</p>
              </div>
              <Link
                to="/superadmin"
                onClick={() => setShowProfile(false)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-sm text-foreground transition-colors"
              >
                <Shield className="w-4 h-4" /> Tableau de bord
              </Link>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-500 hover:bg-rose-500/10 font-bold transition-colors">
                <LogOut className="w-4 h-4" /> Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default SuperAdminHeader;
