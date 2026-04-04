import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  ClipboardList,
  GitBranch,
  History,
  AlertTriangle,
  SlidersHorizontal,
  LogOut,
  ChevronLeft,
  Bell,
  CheckCircle2,
  HeartPulse, // Maintenant utilisé comme fallback principal
  TestTubes, // Importé au cas où
} from 'lucide-react';
import { useLaboratory } from '../../context/LaboratoryContext';
import { useConfig } from '../../context/ConfigContext';
import { useNotifications } from '../../context/NotificationContext';
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

/* ─────────────────────────────────────────────
   Liens de navigation spécifiques LABORATOIRE (Couleurs adaptées au thème Finance/Primary)
───────────────────────────────────────────── */
const navigationItems = [
  {
    name: 'Tableau de bord',
    path: '/labo/dashboard',
    icon: LayoutDashboard,
    color: 'text-secondary', // Finance utilise text-secondary pour certaines icônes
  },
  {
    name: 'File d\'attente',
    path: '/labo/queue',
    icon: Clock,
    color: 'text-primary', // Finance utilise text-primary pour d'autres
  },
  {
    name: 'Saisie des Résultats',
    path: '/labo/results',
    icon: ClipboardList,
    color: 'text-accent', // Finance utilise text-accent
  },
  {
    name: 'Workflow Examens',
    path: '/labo/workflow',
    icon: GitBranch,
    color: 'text-primary',
  },
  {
    name: 'Historique Patient',
    path: '/labo/history',
    icon: History,
    color: 'text-secondary',
  },
  {
    name: 'Alertes',
    path: '/labo/alerts',
    icon: AlertTriangle,
    color: 'text-amber-500', // Gardé pour l'alerte jaune
    hasBadge: true,
  },
];

/* ─────────────────────────────────────────────
   COMPOSANT PRINCIPAL
───────────────────────────────────────────── */
const LabSidebar = () => {
  const {
    sidebarCollapsed,
    toggleSidebar,
    mobileSidebarOpen,
    toggleMobileSidebar,
  } = useLaboratory();

  const { config } = useConfig();

  const notificationCtx = useNotifications();
  const unreadCount     = notificationCtx?.unreadCount  || 0;
  const notifications   = notificationCtx?.notifications || [];
  const markAllAsRead   = notificationCtx?.markAllAsRead || (() => {});

  const navigate = useNavigate();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const API_BASE_URL = 'http://localhost:8080';

  /* ── Helpers ── */
  const getTimeAgo = (date) => {
    if (!date) return 'Récemment';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60)  return "À l'instant";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `Il y a ${hours}h`;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    toast.success('À bientôt !', { description: 'Déconnexion réussie' });
    navigate('/login');
  };

  /* ── Logo dynamique (Logique Finance) ── */
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
          className={cn('object-cover w-full h-full', className)}
          onError={() => setImgError(true)}
        />
      );
    }
    // Fallback : Icône HeartPulse (comme FinanceSidebar)
    return <HeartPulse className={cn('text-white w-6 h-6', className)} strokeWidth={2.5} />;
  };

  /* ── Bloc bas sidebar (Notifications + Paramètres + Déconnexion) ── */
  const BottomNav = ({ isMobile = false }) => (
    <div className={cn('p-3 border-t border-border', isMobile && 'pb-6')}>
      <Separator className="mb-3" />

      {/* Notifications */}
      <Popover onOpenChange={(open) => open && markAllAsRead()}>
        <PopoverTrigger asChild>
          <div className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-1 cursor-pointer group',
            'text-muted-foreground hover:bg-muted hover:text-foreground',
            sidebarCollapsed && !isMobile && 'justify-center',
          )}>
            <div className="relative">
              <Bell className="w-5 h-5 flex-shrink-0 group-hover:text-primary transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white font-bold animate-bounce shadow-sm">
                  {unreadCount}
                </span>
              )}
            </div>
            {(!sidebarCollapsed || isMobile) && (
              <span className="flex-1">Notifications</span>
            )}
          </div>
        </PopoverTrigger>

        <PopoverContent
          className="w-80 p-0 ml-4 shadow-xl border-primary/10"
          side={sidebarCollapsed && !isMobile ? 'right' : 'top'}
          align="start"
        >
          {/* Header Popover */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TestTubes className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-bold text-sm text-foreground">Alertes Labo</h3>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3" /> Tout marquer lu
                </button>
              )}
            </div>
          </div>

          {/* Liste notifications */}
          <ScrollArea className="max-h-72">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Aucune alerte laboratoire</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {notifications.slice(0, 8).map((notif) => {
                  const isUnread = !notif.read && !notif.isRead;

                  const getLabIcon = (type) => {
                    switch (type) {
                      case 'RESULT_READY': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
                      case 'SAMPLE_MISSING': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
                      case 'VALIDATION': return <ClipboardList className="w-4 h-4 text-accent" />; // Utilisation de accent comme Finance
                      default: return <Bell className="w-4 h-4 text-primary" />;
                    }
                  };

                  return (
                    <div
                      key={notif.id}
                      onClick={() => navigate('/labo/alerts')}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                        isUnread ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted',
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                        isUnread ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                      )}>
                        {getLabIcon(notif.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn('text-xs font-bold truncate', isUnread ? 'text-foreground' : 'text-muted-foreground')}>
                            {notif.title}
                          </p>
                          {isUnread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
                          )}
                        </div>
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
            <Button
              variant="ghost"
              size="sm"
              className="w-full rounded-lg text-xs font-bold text-primary hover:bg-primary/5"
              onClick={() => navigate('/labo/alerts')}
            >
              Voir toutes les notifications
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Paramètres */}
      <NavLink
        to="/labo/settings"
        onClick={isMobile ? toggleMobileSidebar : undefined}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-1',
            isActive
              ? 'bg-foreground/5 text-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            sidebarCollapsed && !isMobile && 'justify-center'
          )
        }
      >
        <SlidersHorizontal className="w-5 h-5 flex-shrink-0" />
        {(!sidebarCollapsed || isMobile) && <span>Paramètres</span>}
      </NavLink>

      {/* Déconnexion */}
      <Button
        variant="ghost"
        onClick={() => setShowLogoutDialog(true)}
        className={cn(
          'w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10',
          sidebarCollapsed && !isMobile && 'justify-center px-2'
        )}
      >
        <LogOut className="w-5 h-5 flex-shrink-0" />
        {(!sidebarCollapsed || isMobile) && <span className="ml-3">Déconnexion</span>}
      </Button>
    </div>
  );

  /* ── Rendu principal ── */
  return (
    <>
      {/* ═══════════════════════════════════
           DESKTOP SIDEBAR
      ═══════════════════════════════════ */}
      <aside className={cn(
        'hidden lg:flex flex-col bg-card border-r border-border transition-all duration-300 relative z-30 shrink-0 shadow-lg',
        sidebarCollapsed ? 'w-20' : 'w-72'
      )}>
        {/* Header Sidebar */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5"> {/* Utilisation du gradient Finance */}
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3 w-full overflow-hidden">
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center shadow-lg overflow-hidden shrink-0',
                !config?.logoUrl ? 'bg-gradient-medical' : 'bg-transparent' // Garde le style par défaut de finance
              )}>
                <DynamicLogo />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-lg font-space-grotesk font-bold text-primary tracking-tight truncate">
                  {config?.appName || 'INUA AFIA'}
                </h1>
                <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest">
                  Laboratoire
                </p>
              </div>
            </div>
          ) : (
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center shadow-lg mx-auto overflow-hidden shrink-0',
              !config?.logoUrl ? 'bg-gradient-medical' : 'bg-transparent'
            )}>
              <DynamicLogo />
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn(
              'absolute -right-3 top-5 w-6 h-6 rounded-full border-2 border-border bg-card shadow-md',
              sidebarCollapsed && 'rotate-180'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation links */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {navigationItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative',
                    // STYLE ACTIF : Basé sur Finance (bg-primary/10 text-primary)
                    isActive
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-muted-foreground hover:bg-muted',
                    sidebarCollapsed && 'justify-center'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Icône : utilise sa couleur spécifique OU text-primary si actif (comme Finance) */}
                    <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-primary' : item.color)} />
                    {!sidebarCollapsed && <span className="flex-1">{item.name}</span>}
                    
                    {item.hasBadge && unreadCount > 0 && (
                      <span className={cn('flex items-center justify-center rounded-full bg-destructive text-white text-[10px] font-bold', sidebarCollapsed ? 'absolute -top-1 -right-1 w-4 h-4' : 'w-5 h-5')}>
                        {unreadCount}
                      </span>
                    )}

                    {/* Indicateur actif à gauche */}
                    {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </ScrollArea>

        {/* Bottom */}
        <BottomNav />
      </aside>

      {/* ═══════════════════════════════════
           MOBILE SIDEBAR
      ═══════════════════════════════════ */}
      {mobileSidebarOpen && (
        <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border lg:hidden shadow-2xl flex flex-col">
          <div className="h-16 flex items-center justify-between px-4 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden shrink-0 bg-transparent">
                <DynamicLogo />
              </div>
              <h1 className="text-lg font-bold text-primary">
                {config?.appName || 'INUA AFIA'}
              </h1>
            </div>
            <Button variant="ghost" size="icon" onClick={toggleMobileSidebar}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {navigationItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={toggleMobileSidebar}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium relative',
                      isActive
                        ? 'bg-primary/10 text-primary shadow-md'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )
                  }
                >
                   {({ isActive }) => (
                    <>
                      <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-primary' : item.color)} />
                      <span>{item.name}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </ScrollArea>
          <BottomNav isMobile />
        </aside>
      )}

      {/* Overlay mobile */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={toggleMobileSidebar}
        />
      )}

      {/* Logout dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la déconnexion</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir vous déconnecter ?
            </AlertDialogDescription>
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

export default LabSidebar;