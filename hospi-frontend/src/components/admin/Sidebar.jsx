import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Shield, 
  Building2, 
  Stethoscope,
  Settings,
  FileText,
  User,
  LogOut,
  ChevronLeft,
  Activity,
  Bell,
  CheckCircle2,
  HeartPulse,
  Cog
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useConfig } from '../../context/ConfigContext';
import { useNotifications } from '../../context/NotificationContext'; 
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { toast } from "sonner";

const Sidebar = () => {
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, toggleMobileSidebar } = useAdmin();
  const { config } = useConfig();
  
  // 🔔 Récupération sécurisée du contexte de notifications
  const notificationCtx = useNotifications();
  const unreadCount = notificationCtx?.unreadCount || 0;
  const notifications = notificationCtx?.notifications || [];
  const markAllAsRead = notificationCtx?.markAllAsRead || (() => {});
  
  // Sécurité pour getTimeAgo : utilise celle du contexte ou une version locale de secours
  const getTimeAgo = notificationCtx?.getTimeAgo || ((date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return "À l'instant";
    const minutes = Math.floor(seconds / 60);
    return `Il y a ${minutes} min`;
  });

  const navigate = useNavigate();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

  // --- AJOUT DE L'ITEM PATIENTS ICI ---
  const navigationItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard, color: 'text-secondary' },
    { name: 'Patients', path: '/admin/patients', icon: Activity, color: 'text-red-500' }, // Nouveau
    { name: 'Utilisateurs', path: '/admin/utilisateurs', icon: Users, color: 'text-primary' },
    { name: 'Rôles', path: '/admin/roles', icon: Shield, color: 'text-accent' },
    { name: 'Services', path: '/admin/services', icon: Stethoscope, color: 'text-primary' },
    { name: 'Départements', path: '/admin/departements', icon: Building2, color: 'text-secondary' },
    { name: 'Configuration', path: '/admin/hospital-settings', icon: Cog, color: 'text-emerald-500' },
    { name: 'Paramètres', path: '/admin/parametres', icon: Settings, color: 'text-muted-foreground' },
    { name: 'Audit & Logs', path: '/admin/audit', icon: FileText, color: 'text-warning' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    toast.success('À bientôt!', { description: 'Déconnexion réussie' });
    navigate('/login');
  };

  const DynamicLogo = ({ className }) => {
    const [imgError, setImgError] = useState(false);
    if (config?.logoUrl && !imgError) {
      let finalUrl = config.logoUrl;
      if (!finalUrl.startsWith('http')) {
        const cleanPath = finalUrl.startsWith('/') ? finalUrl : `/${finalUrl}`;
        finalUrl = `${API_BASE_URL}${cleanPath}`;
      }
      return (
        <img 
          src={finalUrl} 
          alt="Logo" 
          className={cn("object-cover w-full h-full", className)}
          onError={() => setImgError(true)}
        />
      );
    }
    return <Activity className={cn("text-white w-6 h-6", className)} strokeWidth={2.5} />;
  };

  return (
    <>
      <aside className={cn(
          "hidden lg:flex flex-col bg-card border-r border-border transition-all duration-300 relative",
          sidebarCollapsed ? "w-20" : "w-72"
        )}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3 animate-slideInFromLeft w-full overflow-hidden">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center shadow-lg overflow-hidden shrink-0",
                (!config?.logoUrl) ? "bg-gradient-medical" : "bg-transparent"
              )}>
                <DynamicLogo />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-lg font-space-grotesk font-bold text-primary tracking-tight truncate">
                  {config?.appName || 'INUA AFIA'}
                </h1>
                <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest">
                  {config?.appDescription || 'Admin Panel'}
                </p>
              </div>
            </div>
          ) : (
            <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center shadow-lg mx-auto overflow-hidden shrink-0",
                (!config?.logoUrl) ? "bg-gradient-medical" : "bg-transparent"
            )}>
              <DynamicLogo />
            </div>
          )}
          
          <Button
            variant="ghost" size="icon" onClick={toggleSidebar}
            className={cn(
              "absolute -right-3 top-5 w-6 h-6 rounded-full border-2 border-border bg-card shadow-md z-10",
              sidebarCollapsed && "rotate-180"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {navigationItems.map((item) => (
              <NavLink
                key={item.path} to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                    isActive ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:bg-muted",
                    sidebarCollapsed && "justify-center"
                  )
                }
              >
                <item.icon className={cn("w-5 h-5 flex-shrink-0", item.color)} />
                {!sidebarCollapsed && <span className="flex-1">{item.name}</span>}
              </NavLink>
            ))}
          </nav>
        </ScrollArea>

        <div className="p-3 border-t border-border">
          <Separator className="mb-3" />
          
          <Popover onOpenChange={(open) => open && markAllAsRead()}>
            <PopoverTrigger asChild>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-2 cursor-pointer group",
                "text-muted-foreground hover:bg-muted hover:text-foreground",
                sidebarCollapsed && "justify-center"
              )}>
                <div className="relative">
                  <Bell className="w-5 h-5 flex-shrink-0 group-hover:text-primary transition-colors" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white font-bold animate-bounce shadow-sm">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {!sidebarCollapsed && <span className="flex-1">Notifications</span>}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 ml-4 shadow-xl border-primary/10" side={sidebarCollapsed ? "right" : "top"} align="start">
              <div className="p-4 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm">Notifications Récentes</h4>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold uppercase tracking-tighter">
                    Temps réel
                  </span>
                </div>
              </div>
              <ScrollArea className="h-[300px]">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center">
                    <Bell className="w-8 h-8 text-muted/20 mb-2" />
                    <p className="text-xs text-muted-foreground italic">Aucune alerte système</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {notifications.map((notif) => (
                      <div key={notif.id} className={cn(
                        "p-4 transition-colors",
                        notif.unread ? "bg-primary/[0.02]" : "hover:bg-muted/30"
                      )}>
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-secondary" /> SYSTÈME
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {getTimeAgo(notif.timestamp)}
                          </span>
                        </div>
                        <p className={cn(
                          "text-xs leading-relaxed",
                          notif.unread ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>
                          {notif.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <div 
                className="p-2 text-center border-t border-border bg-muted/10 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => navigate('/admin/notifications')}
              >
                <span className="text-[11px] font-semibold text-primary">Voir tout l'historique</span>
              </div>
            </PopoverContent>
          </Popover>

          <NavLink
            to="/admin/profil"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-2",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                sidebarCollapsed && "justify-center"
              )
            }
          >
            <User className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>Mon Profil</span>}
          </NavLink>

          <Button
            variant="ghost" onClick={() => setShowLogoutDialog(true)}
            className={cn(
              "w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10",
              sidebarCollapsed && "justify-center px-2"
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="ml-3">Déconnexion</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <aside className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border transform transition-transform duration-300 lg:hidden",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-medical rounded-lg flex items-center justify-center overflow-hidden">
              <DynamicLogo />
            </div>
            <h1 className="text-lg font-bold text-primary">{config?.appName || 'INUA AFIA'}</h1>
          </div>
        </div>
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {navigationItems.map((item) => (
              <NavLink
                key={item.path} to={item.path} onClick={toggleMobileSidebar}
                className={({ isActive }) =>
                  cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground")
                }
              >
                <item.icon className={cn("w-5 h-5 flex-shrink-0", item.color)} />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </ScrollArea>

        {/* Mobile: Bottom section with Notifications, Profile, Logout */}
        <div className="p-3 border-t border-border bg-card">
          <Separator className="mb-3" />
          
          <div
            onClick={() => { navigate('/admin/notifications'); toggleMobileSidebar(); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-2 cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <div className="relative">
              <Bell className="w-5 h-5 flex-shrink-0" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white font-bold animate-bounce shadow-sm">
                  {unreadCount}
                </span>
              )}
            </div>
            <span>Notifications</span>
          </div>

          <NavLink
            to="/admin/profil"
            onClick={toggleMobileSidebar}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-2",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )
            }
          >
            <User className="w-5 h-5 flex-shrink-0" />
            <span>Mon Profil</span>
          </NavLink>

          <Button
            variant="ghost" onClick={() => setShowLogoutDialog(true)}
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="ml-3">Déconnexion</span>
          </Button>
        </div>
      </aside>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la déconnexion</AlertDialogTitle>
            <AlertDialogDescription>Êtes-vous sûr de vouloir vous déconnecter ?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
              Se déconnecter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Sidebar;