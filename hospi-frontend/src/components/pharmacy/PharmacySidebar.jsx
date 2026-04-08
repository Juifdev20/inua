import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Pill,
  Package,
  DollarSign,
  Settings,
  UserCheck,
  LogOut,
  ChevronLeft,
  Bell,
  CheckCircle2,
  HeartPulse,
  SlidersHorizontal,
  Users,
  TrendingUp,
  AlertTriangle,
  Menu,
  History
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useNotifications } from '../../context/NotificationContext';
import { usePharmacy } from '../../context/PharmacyContext'; // ✅ CONTEXT HOOK
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '../ui/popover';
import { toast } from 'sonner';

const PharmacySidebar = () => {
  const { 
    sidebarCollapsed, 
    toggleSidebar,           // ✅ CORRIGÉ
    mobileSidebarOpen, 
    toggleMobileSidebar 
  } = usePharmacy();

  const { config } = useConfig();

  const notificationCtx = useNotifications();
  const unreadCount = notificationCtx?.unreadCount || 0;
  const notifications = notificationCtx?.notifications || [];
  const markAllAsRead = notificationCtx?.markAllAsRead || (() => {});

  const getTimeAgo = (date) => {
    if (!date) return 'Récemment';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return "À l'instant";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `Il y a ${hours}h`;
  };

  const navigate = useNavigate();
  const [showLogoutDialog, setShowLogoutDialog] = React.useState(false);

  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

  const navigationItems = [
    { name: 'Tableau de bord',     path: '/pharmacy/dashboard',          icon: LayoutDashboard, color: 'text-secondary' },
    { name: 'Prescriptions',       path: '/pharmacy/prescriptions',      icon: FileText,        color: 'text-primary' },
    { name: 'Ventes / POS',        path: '/pharmacy/sales',              icon: DollarSign,      color: 'text-accent' },
    { name: 'Historique Ventes',   path: '/pharmacy/sales/history',      icon: History,         color: 'text-primary' },
    { name: 'Stock & Inventaire',  path: '/pharmacy/inventory',          icon: Package,         color: 'text-primary' },
    { name: 'Alertes Stock',       path: '/pharmacy/alerts',             icon: AlertTriangle,   color: 'text-warning' },
    { name: 'Rapports',            path: '/pharmacy/reports',            icon: TrendingUp,      color: 'text-primary' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('À bientôt!', { description: 'Déconnexion réussie' });
    navigate('/login');
  };

  const DynamicLogo = ({ className }) => {
    const [imgError, setImgError] = React.useState(false);
    if (config?.logoUrl && !imgError) {
      let finalUrl = config.logoUrl;
      if (!finalUrl.startsWith('http')) {
        const cleanPath = finalUrl.startsWith('/') ? finalUrl : `/${finalUrl}`;
        finalUrl = `${API_BASE_URL}${cleanPath}`;
      }
      return (
        <img src={finalUrl} alt="Logo" className={cn('object-cover w-full h-full', className)} onError={() => setImgError(true)} />
      );
    }
    return <Pill className={cn('text-white w-6 h-6', className)} strokeWidth={2.5} />;
  };

  const BottomNav = ({ isMobile = false }) => (
    <div className={cn('p-3 border-t border-border', isMobile && 'pb-6')}>
      <Separator className="mb-3" />
      
      {/* Notifications */}
      <Popover onOpenChange={(open) => open && markAllAsRead()}>
        <PopoverTrigger asChild>
          <div className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-1 cursor-pointer group',
            'text-muted-foreground hover:bg-muted hover:text-foreground',
            sidebarCollapsed && !isMobile && 'justify-center'
          )}>
            <div className="relative">
              <Bell className="w-5 h-5 flex-shrink-0 group-hover:text-primary transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white font-bold animate-bounce shadow-sm">
                  {unreadCount}
                </span>
              )}
            </div>
            {(!sidebarCollapsed || isMobile) && <span className="flex-1">Notifications</span>}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0 ml-4 shadow-xl border-primary/10" side={sidebarCollapsed && !isMobile ? 'right' : 'top'} align="start">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground">Flux Pharmacie</h3>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Tout marquer lu
                </button>
              )}
            </div>
          </div>
          <ScrollArea className="max-h-72">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Aucune notification</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {notifications.slice(0, 8).map((notif) => {
                  const isUnread = !notif.read && !notif.isRead;
                  return (
                    <div key={notif.id} onClick={() => navigate('/pharmacy/notifications')} className={cn(
                      'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                      isUnread ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted'
                    )}>
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', isUnread ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-xs font-bold truncate', isUnread ? 'text-foreground' : 'text-muted-foreground')}>{notif.title}</p>
                        {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />}
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{notif.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">{getTimeAgo(notif.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          <div className="p-3 border-t border-border">
            <Button variant="ghost" size="sm" className="w-full rounded-lg text-xs font-bold text-primary hover:bg-primary/5" onClick={() => navigate('/pharmacy/notifications')}>
              Voir toutes les notifications
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Paramètres */}
      <NavLink to="/pharmacy/settings" onClick={isMobile ? toggleMobileSidebar : undefined} className={({ isActive }) => cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-1',
        isActive ? 'bg-foreground/5 text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        sidebarCollapsed && !isMobile && 'justify-center'
      )}>
        <SlidersHorizontal className="w-5 h-5 flex-shrink-0" />
        {(!sidebarCollapsed || isMobile) && <span>Paramètres</span>}
      </NavLink>

      {/* Déconnexion */}
      <Button variant="ghost" onClick={() => setShowLogoutDialog(true)} className={cn(
        'w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10',
        sidebarCollapsed && !isMobile && 'justify-center px-2'
      )}>
        <LogOut className="w-5 h-5 flex-shrink-0" />
        {(!sidebarCollapsed || isMobile) && <span className="ml-3">Déconnexion</span>}
      </Button>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn('hidden lg:flex flex-col bg-card border-r border-border transition-all duration-300 relative z-30 shrink-0 shadow-lg', sidebarCollapsed ? 'w-20' : 'w-72')}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3 animate-slideInFromLeft w-full overflow-hidden">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shadow-lg overflow-hidden shrink-0', !config?.logoUrl ? 'bg-gradient-medical' : 'bg-transparent')}>
                <DynamicLogo />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-lg font-space-grotesk font-bold text-primary tracking-tight truncate">{config?.appName || 'INUA AFIA'}</h1>
                <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest">Pharmacie Panel</p>
              </div>
            </div>
          ) : (
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shadow-lg mx-auto overflow-hidden shrink-0', !config?.logoUrl ? 'bg-gradient-medical' : 'bg-transparent')}>
              <DynamicLogo />
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className={cn('absolute -right-3 top-5 w-6 h-6 rounded-full border-2 border-border bg-card shadow-md', sidebarCollapsed && 'rotate-180')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {navigationItems.map((item) => (
              <NavLink key={item.path} to={item.path} className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                isActive ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted',
                sidebarCollapsed && 'justify-center'
              )}>
                <item.icon className={cn('w-5 h-5 flex-shrink-0', item.color)} />
                {!sidebarCollapsed && <span className="flex-1">{item.name}</span>}
              </NavLink>
            ))}
          </nav>
        </ScrollArea>
        <BottomNav />
      </aside>

      {/* Mobile Sidebar */}
      {mobileSidebarOpen && (
        <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border lg:hidden shadow-2xl flex flex-col">
          <div className="h-16 flex items-center justify-between px-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-medical rounded-lg flex items-center justify-center overflow-hidden">
                <DynamicLogo />
              </div>
              <h1 className="text-lg font-bold text-primary">{config?.appName || 'INUA AFIA'}</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={toggleMobileSidebar}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {navigationItems.map((item) => (
                <NavLink key={item.path} to={item.path} onClick={toggleMobileSidebar} className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                  isActive ? 'bg-primary/10 text-primary shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-accent/30'
                )}>
                  <item.icon className={cn('w-5 h-5 flex-shrink-0', item.color)} />
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </nav>
          </ScrollArea>
          <BottomNav isMobile />
        </aside>
      )}

      {/* Logout dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la déconnexion</AlertDialogTitle>
            <AlertDialogDescription>Êtes-vous sûr de vouloir vous déconnecter ?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">Se déconnecter</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile Toggle Button */}
      <button onClick={toggleMobileSidebar} className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-card border border-border shadow-lg">
        <Menu className="w-5 h-5" />
      </button>
    </>
  );
};

export default PharmacySidebar;