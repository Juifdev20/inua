import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Calendar, 
  CreditCard, 
  Settings, 
  LogOut, 
  User, 
  ChevronLeft, 
  HeartPulse,
  LayoutDashboard,
  FileText,
  MessageCircle // Ajout de l'icône pour la messagerie
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext'; 
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, toggleMobileSidebar } = useAdmin();

  // Mise à jour de la liste des menus avec "Messagerie"
  const menuItems = [
    { 
      path: '/patient/dashboard', 
      label: 'Tableau de bord', 
      icon: LayoutDashboard, 
      color: 'text-primary' 
    },
    { 
      path: '/patient/notifications', 
      label: 'Notifications', 
      icon: Bell, 
      color: 'text-blue-500' 
    },
    { 
      path: '/patient/messages', // Nouvelle route pour le chat
      label: 'Messagerie', 
      icon: MessageCircle, 
      color: 'text-emerald-500' 
    },
    { 
      path: '/patient/profile', 
      label: 'Mon Profil', 
      icon: User, 
      color: 'text-secondary' 
    },
    { 
      path: '/patient/appointments', 
      label: 'Mes Rendez-vous', 
      icon: Calendar, 
      color: 'text-emerald-500' 
    },
    { 
      path: '/patient/documents', 
      label: 'Mes Documents', 
      icon: FileText, 
      color: 'text-emerald-500' 
    },
    { 
      path: '/patient/billing', 
      label: 'Facture et Paiement', 
      icon: CreditCard, 
      color: 'text-amber-500' 
    },
    { 
      path: '/patient/settings', 
      label: 'Paramètre du Compte', 
      icon: Settings, 
      color: 'text-muted-foreground' 
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem('patient_token');
    localStorage.removeItem('token'); 
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* SIDEBAR DESKTOP */}
      <aside className={cn(
          "hidden lg:flex flex-col bg-card border-r border-border transition-all duration-300 relative",
          sidebarCollapsed ? "w-20" : "w-72"
        )}>
        
        {/* Logo Section */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3 animate-slideInFromLeft overflow-hidden">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shrink-0">
                <HeartPulse className="text-white w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-lg font-bold text-foreground tracking-tight truncate">INUA AFIA</h1>
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Espace Patient</p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg mx-auto shrink-0">
               <HeartPulse className="text-white w-5 h-5" />
            </div>
          )}
          
          <Button
            variant="ghost" size="icon" onClick={toggleSidebar}
            className={cn(
              "absolute -right-3 top-5 w-6 h-6 rounded-full border-2 border-border bg-card shadow-md z-10",
              sidebarCollapsed && "rotate-180"
            )}
          >
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                    active 
                      ? "bg-primary/10 text-primary shadow-sm" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    sidebarCollapsed && "justify-center"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 flex-shrink-0 transition-colors", 
                    active ? "text-primary" : item.color,
                    !active && "group-hover:text-foreground"
                  )} />
                  {!sidebarCollapsed && <span className="flex-1 tracking-tight">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer (Déconnexion) */}
        <div className="p-3 border-t border-border">
          <Separator className="mb-3 opacity-50" />
          <Button
            variant="ghost" 
            onClick={handleLogout}
            className={cn(
              "w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
              sidebarCollapsed && "justify-center px-2"
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="ml-3 font-bold uppercase text-[11px] tracking-wider">Déconnexion</span>}
          </Button>
        </div>
      </aside>

      {/* MOBILE SIDEBAR */}
      <aside className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border transform transition-transform duration-300 lg:hidden",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
        <div className="h-16 flex items-center px-6 border-b border-border">
            <h1 className="text-lg font-bold text-foreground">INUA AFIA</h1>
        </div>
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={toggleMobileSidebar}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                  isActive(item.path) ? "bg-primary/10 text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive(item.path) ? "text-primary" : item.color)} />
                {item.label}
              </Link>
            ))}
          </nav>
        </ScrollArea>
      </aside>
    </>
  );
};

export default Sidebar;