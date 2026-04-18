import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  HeartPulse,
  TestTubes,
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

/* Navigation links - Translated */
const navigationItems = [
  { nameKey: 'laboratory.dashboard', path: '/labo/dashboard', icon: LayoutDashboard, color: 'text-secondary' },
  { nameKey: 'laboratory.queue', path: '/labo/queue', icon: Clock, color: 'text-primary' },
  { nameKey: 'laboratory.results', path: '/labo/results', icon: ClipboardList, color: 'text-accent' },
  { nameKey: 'laboratory.workflow', path: '/labo/workflow', icon: GitBranch, color: 'text-primary' },
  { nameKey: 'laboratory.history', path: '/labo/history', icon: History, color: 'text-secondary' },
  { nameKey: 'laboratory.alerts', path: '/labo/alerts', icon: AlertTriangle, color: 'text-amber-500', hasBadge: true },
];

const LabSidebar = () => {
  const { t } = useTranslation();
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

  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

  const handleLogout = () => {
    localStorage.removeItem('token');
    toast.success(t('logoutSuccess') || 'À bientôt!', { description: t('logoutSuccessDesc') || 'Déconnexion réussie' });
    navigate('/login');
  };

  const DynamicLogo = ({ className }) => {
    const logoUrl = config?.logoUrl;
    if (logoUrl) {
      return <img src={`${API_BASE_URL}${logoUrl}`} alt="Logo" className={cn('h-8 w-auto object-contain', className)} />;
    }
    return <HeartPulse className={cn('h-8 w-8 text-primary', className)} />;
  };

  const renderBottomNav = (isMobile = false) => (
    <div className={cn('p-3 border-t border-border', isMobile && 'pb-6')}>
      <Separator className="mb-3" />

      <Popover onOpenChange={(open) => open && markAllAsRead()}>
        <PopoverTrigger asChild>
          <div className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer mb-1',
            'text-muted-foreground hover:bg-muted hover:text-foreground',
            sidebarCollapsed && !isMobile && 'justify-center px-2'
          )}>
            <div className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            {(!sidebarCollapsed || isMobile) && <span className="flex-1">{t('common.notifications')}</span>}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0 ml-4 shadow-xl border-primary/10" side={sidebarCollapsed && !isMobile ? 'right' : 'top'} align="start">
          <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
            <span className="font-semibold text-sm">{t('common.notifications')}</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {unreadCount} {unreadCount > 1 ? 'non lues' : 'non lue'}
                </span>
              )}
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllAsRead}>
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {t('markAllAsRead') || 'Tout marquer lu'}
              </Button>
            </div>
          </div>
          <ScrollArea className="max-h-72">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">{t('noNotifications') || 'Aucune notification'}</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {notifications.slice(0, 8).map((notif) => {
                  const isUnread = !notif.read && !notif.isRead;
                  return (
                    <div key={notif.id} onClick={() => navigate('/labo/notifications')} className={cn(
                      'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                      isUnread ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted'
                    )}>
                      <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', isUnread ? 'bg-primary' : 'bg-transparent')} />
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm', isUnread ? 'font-medium' : '')}>{notif.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          <div className="p-3 border-t border-border">
            <Button variant="ghost" size="sm" className="w-full rounded-lg text-xs font-bold text-primary hover:bg-primary/5" onClick={() => navigate('/labo/notifications')}>
              {t('viewAllNotifications') || 'Voir toutes les notifications'}
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <NavLink to="/labo/settings" onClick={isMobile ? toggleMobileSidebar : undefined} className={({ isActive }) => cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-1',
        isActive ? 'bg-foreground/5 text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        sidebarCollapsed && !isMobile && 'justify-center'
      )}>
        <SlidersHorizontal className="w-5 h-5" />
        {(!sidebarCollapsed || isMobile) && <span>{t('common.settings')}</span>}
      </NavLink>

      <Button variant="ghost" onClick={() => setShowLogoutDialog(true)} className={cn(
        'w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10',
        sidebarCollapsed && !isMobile && 'justify-center px-2'
      )}>
        <LogOut className="w-5 h-5" />
        {(!sidebarCollapsed || isMobile) && <span className="ml-3">{t('common.logout')}</span>}
      </Button>
    </div>
  );

  return (
    <>
      <aside className={cn(
        'fixed left-0 top-0 z-[70] h-screen bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out',
        sidebarCollapsed ? 'w-[72px]' : 'w-64',
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="flex items-center justify-between p-4 h-16 border-b border-border bg-muted/20">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="bg-primary/10 p-1.5 rounded-lg flex-shrink-0">
                <DynamicLogo />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-lg font-space-grotesk font-bold text-primary tracking-tight truncate">{config?.appName || 'INUA AFIA'}</h1>
                <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest">{t('laboratory.title')}</p>
              </div>
            </div>
          ) : (
            <div className="mx-auto bg-primary/10 p-1.5 rounded-lg">
              <DynamicLogo />
            </div>
          )}

          <Button variant="ghost" size="icon" onClick={toggleSidebar} className={cn('hidden lg:flex h-8 w-8 rounded-full transition-transform duration-300', sidebarCollapsed && 'rotate-180 absolute -right-4 top-5 bg-card border shadow-sm z-50')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 py-3 px-2">
          <nav className="space-y-1">
            {navigationItems.map((item) => (
              <NavLink key={item.path} to={item.path} className={({ isActive }) => cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                sidebarCollapsed && 'justify-center'
              )}>
                <item.icon className={cn('w-5 h-5 flex-shrink-0', item.color)} />
                {!sidebarCollapsed && <span className="flex-1">{t(item.nameKey)}</span>}
                {item.hasBadge && unreadCount > 0 && !sidebarCollapsed && (
                  <span className="bg-destructive text-destructive-foreground text-xs font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </ScrollArea>

        <ScrollArea className="flex-1 py-4 px-3">
          <nav className="space-y-1">
            {navigationItems.map((item) => (
              <NavLink key={item.path} to={item.path} onClick={toggleMobileSidebar} className={({ isActive }) => cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all',
                isActive ? 'bg-primary/10 text-primary shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-accent/30'
              )}>
                <item.icon className={cn('w-5 h-5 flex-shrink-0', item.color)} />
                <span>{t(item.nameKey)}</span>
                {item.hasBadge && unreadCount > 0 && (
                  <span className="ml-auto bg-rose-500 text-white text-xs font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </ScrollArea>

        {renderBottomNav(true)}
      </aside>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-[65] bg-black/40 backdrop-blur-md lg:hidden animate-in fade-in duration-300" onClick={toggleMobileSidebar} />
      )}

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.logout')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmLogout') || 'Êtes-vous sûr de vouloir vous déconnecter ?'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowLogoutDialog(false)}>{t('finance.actions.cancel') || 'Annuler'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('common.logout')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LabSidebar;
