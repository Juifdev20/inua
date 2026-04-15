import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  FileText, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  HeartPulse,
  X,
  FolderSearch // Ajout de cette icône pour illustrer le dossier patient
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext'; 
import { useAuth } from '../../context/AuthContext';
import { useAdmin } from '../../context/AdminContext'; // Import du contexte pour gérer le mobile
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

const Sidebar = ({ sidebarCollapsed: controlledCollapsed, setSidebarCollapsed: setControlledCollapsed, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  useTheme();
  const { logout } = useAuth();
  
  // Utilisation du contexte Admin pour le comportement mobile (identique au docteur)
  const { mobileSidebarOpen, toggleMobileSidebar } = useAdmin();
  
  // Support controlled (via props) or uncontrolled (local state) pour le desktop
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const sidebarCollapsed = typeof controlledCollapsed === 'boolean' ? controlledCollapsed : localCollapsed;
  const setSidebarCollapsed = setControlledCollapsed ?? setLocalCollapsed;

  const handleToggle = () => {
    if (typeof onToggle === 'function') return onToggle();
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const menuItems = [
    { 
      path: '/reception/dashboard', 
      label: 'Tableau de bord', 
      icon: LayoutDashboard, 
      color: 'text-blue-500' 
    },
    { 
      path: '/reception/patients', // Lien vers la liste PatientList.jsx
      label: 'Dossiers Patients', 
      icon: Users, 
      color: 'text-emerald-500' 
    },
    { 
      path: '/reception/admissions', 
      label: 'Fiches / Admissions', 
      icon: ClipboardList, 
      color: 'text-amber-500' 
    },
    { 
      path: '/reception/documents', 
      label: 'Documents', 
      icon: FileText, 
      color: 'text-purple-500' 
    },
    { 
      path: '/reception/settings', 
      label: 'Paramètres', 
      icon: Settings, 
      color: 'text-slate-400' 
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Correction pour que l'onglet "Dossiers Patients" reste actif même quand on est dans un sous-dossier (/reception/patients/:id)
  const isActive = (path) => {
    if (path === '/reception/patients') {
      return location.pathname.startsWith('/reception/patients');
    }
    return location.pathname === path;
  };

  return (
    <>
      {/* 🖥️ SIDEBAR DESKTOP (Affichée seulement sur lg) */}
      <aside className={cn(
          "hidden lg:flex fixed left-0 top-0 h-screen flex-col transition-all duration-300 z-[60] bg-card border-r border-border",
          sidebarCollapsed ? "w-20" : "w-72"
        )}>
        
        {/* Logo Section Desktop */}
        <div className={cn(
          "h-20 flex items-center px-4 mb-2 transition-colors duration-300 bg-gradient-to-r from-emerald-500/5 to-transparent relative border-b border-border/50"
        )}>
          <div className={cn(
            "flex items-center gap-3 transition-all duration-300",
            sidebarCollapsed ? "mx-auto" : "px-2"
          )}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shrink-0">
              <HeartPulse className="text-white w-6 h-6" />
            </div>
            {!sidebarCollapsed && (
              <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                <h1 className="text-lg font-black tracking-tight text-foreground">INUA AFIA</h1>
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Réception</p>
              </div>
            )}
          </div>

          <Button
            variant="ghost" 
            size="icon" 
            onClick={handleToggle}
            className={cn(
              "absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 shadow-sm z-50 bg-card border-border text-foreground transition-transform duration-300",
              sidebarCollapsed && "rotate-180"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 px-3">
          <nav className="space-y-1 py-4">
            {menuItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative",
                    active 
                      ? "bg-emerald-500/10 text-emerald-500 shadow-sm" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    sidebarCollapsed && "justify-center px-0"
                  )}
                >
                  {active && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-500 rounded-r-full" />
                  )}
                  <item.icon className={cn(
                    "w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110", 
                    active ? "text-emerald-500" : item.color,
                  )} />
                  {!sidebarCollapsed && <span className="flex-1 tracking-tight truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="p-4 mt-auto">
          <Separator className="mb-4 bg-border" />
          
          <Button
            variant="ghost" 
            onClick={handleLogout}
            className={cn(
              "w-full justify-start rounded-xl transition-all duration-200 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10",
              sidebarCollapsed && "justify-center p-0"
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="ml-3 font-bold text-xs uppercase tracking-widest">Quitter</span>}
          </Button>
        </div>
      </aside>

      {/* 📱 MOBILE SIDEBAR */}
      <aside className={cn(
          "fixed inset-y-0 left-0 z-[70] w-72 bg-card border-r border-border transform transition-transform duration-300 lg:hidden",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
        
        <div className="h-20 flex items-center justify-between px-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <HeartPulse className="text-white w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-foreground">INUA AFIA</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleMobileSidebar}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-5rem)]">
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={toggleMobileSidebar}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                    active ? "bg-emerald-500/10 text-emerald-500 shadow-sm" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", active ? "text-emerald-500" : item.color)} />
                  {item.label}
                </Link>
              );
            })}
            
            <Separator className="my-4 opacity-50" />
            
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-500/10 transition-all uppercase tracking-wider"
            >
              <LogOut className="w-5 h-5" />
              Quitter la session
            </button>
          </nav>
        </ScrollArea>
      </aside>

      {/* 🌫️ OVERLAY MOBILE (Backdrop-blur identique au docteur) */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-[65] bg-black/40 backdrop-blur-md lg:hidden animate-in fade-in duration-300 transition-all"
          onClick={toggleMobileSidebar}
        />
      )}
    </>
  );
};

export default Sidebar;