import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  UserCheck,
  Microscope,
  Pill,
  DollarSign,
  Settings,
  FileText,
  User,
  LogOut,
  ChevronLeft,
  Bell,
  CheckCircle2,
  SlidersHorizontal,
  TrendingUp,
  BookOpen,
  ClockAlert
} from 'lucide-react';
import LogoInuaAfya from '../LogoInuaAfya';
import { useFinance } from '../../context/FinanceContext';
import { useConfig } from '../../context/ConfigContext';
import { useNotifications } from '../../context/NotificationContext';
import { getPendingPaymentsForFinance } from '../../services/pharmacyApi/pharmacyApi.js';
import financeApi from '../../services/financeApi/financeApi.js';
import { pharmacieFinanceApi } from '../../services/pharmacieFinanceApi.js';
import { admissionService } from '../../services/admissionService.js';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
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

const FinanceSidebar = () => {
  const { t } = useTranslation();
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, toggleMobileSidebar } = useFinance();
  const { config } = useConfig();

  const notificationCtx = useNotifications();
  const unreadCount = notificationCtx?.unreadCount || 0;
  const notifications = notificationCtx?.notifications || [];
  const markAllAsRead = notificationCtx?.markAllAsRead || (() => {});

  // 💰 NOUVEAU: Nombre de commandes pharmacie en attente de paiement
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  // 🏥 NOUVEAU: Nombre d'admissions en attente de paiement
  const [pendingAdmissionsCount, setPendingAdmissionsCount] = useState(0);
  // 🔬 NOUVEAU: Nombre de laboratoires en attente
  const [pendingLabCount, setPendingLabCount] = useState(0);
  // 💊 NOUVEAU: Nombre de factures pharmacie en attente (ancien système)
  const [pendingPharmacyCount, setPendingPharmacyCount] = useState(0);
  // 💸 NOUVEAU: Nombre de dépenses en attente de validation
  const [pendingExpensesCount, setPendingExpensesCount] = useState(0);

  // Charger le nombre de commandes en attente
  const loadPendingPaymentsCount = useCallback(async () => {
    try {
      const response = await getPendingPaymentsForFinance(0, 1);
      const data = response.data;
      if (data && data.totalElements !== undefined) {
        setPendingPaymentsCount(data.totalElements);
      } else if (data && data.content) {
        setPendingPaymentsCount(data.content.length);
      }
    } catch (error) {
      console.log('💰 [SIDEBAR] Impossible de charger le nombre de paiements en attente');
    }
  }, []);

  // Charger les admissions en attente (filtrer par date du jour comme la page)
  const loadPendingAdmissionsCount = useCallback(async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const result = await financeApi.getAdmissionsQueue({ date: today });
      if (result && result.count !== undefined) {
        setPendingAdmissionsCount(result.count);
      } else if (result && result.data && Array.isArray(result.data)) {
        setPendingAdmissionsCount(result.data.length);
      }
    } catch (error) {
      console.log('🏥 [SIDEBAR] Impossible de charger les admissions en attente');
    }
  }, []);

  // Charger les laboratoires en attente
  const loadPendingLabCount = useCallback(async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const result = await financeApi.getAllLabPayments(today);
      if (result && Array.isArray(result)) {
        // Compter les examens avec remainingAmount > 0 (non payés)
        const pendingCount = result.filter(item => 
          item.remainingAmount > 0 || item.examAmountPaid < item.examTotalAmount
        ).length;
        setPendingLabCount(pendingCount);
      } else if (result && result.content && Array.isArray(result.content)) {
        const pendingCount = result.content.filter(item => 
          item.remainingAmount > 0 || item.examAmountPaid < item.examTotalAmount
        ).length;
        setPendingLabCount(pendingCount);
      }
    } catch (error) {
      console.log('🔬 [SIDEBAR] Impossible de charger les labos en attente');
    }
  }, []);

  // Charger les dépenses en attente (utiliser pharmacieFinanceApi comme la page)
  const loadPendingExpensesCount = useCallback(async () => {
    try {
      const response = await pharmacieFinanceApi.getDepensesEnAttente();
      const result = response.data;
      if (Array.isArray(result)) {
        setPendingExpensesCount(result.length);
      } else if (result && result.content) {
        setPendingExpensesCount(result.content.length);
      }
    } catch (error) {
      console.log('💸 [SIDEBAR] Impossible de charger les dépenses en attente');
    }
  }, []);

  // Charger les prescriptions pharmacie en attente (ancien système)
  const loadPendingPharmacyCount = useCallback(async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const result = await financeApi.getPharmacyQueue();
      if (result && Array.isArray(result)) {
        // Filtrer les prescriptions non payées du jour
        const todayPrescriptions = result.filter(item => {
          const itemDate = item.createdAt || item.created_at;
          return itemDate && itemDate.startsWith(today);
        });
        setPendingPharmacyCount(todayPrescriptions.length);
      } else if (result && result.content && Array.isArray(result.content)) {
        const todayPrescriptions = result.content.filter(item => {
          const itemDate = item.createdAt || item.created_at;
          return itemDate && itemDate.startsWith(today);
        });
        setPendingPharmacyCount(todayPrescriptions.length);
      }
    } catch (error) {
      console.log('💊 [SIDEBAR] Impossible de charger les prescriptions en attente');
    }
  }, []);

  // Charger toutes les données au montage et rafraîchir toutes les 30 secondes
  useEffect(() => {
    const loadAllCounts = () => {
      loadPendingPaymentsCount();
      loadPendingAdmissionsCount();
      loadPendingLabCount();
      loadPendingPharmacyCount();
      loadPendingExpensesCount();
    };
    
    loadAllCounts();
    const interval = setInterval(loadAllCounts, 30000);
    return () => clearInterval(interval);
  }, [loadPendingPaymentsCount, loadPendingAdmissionsCount, loadPendingLabCount, loadPendingPharmacyCount, loadPendingExpensesCount]);

  const getTimeAgo = (date) => {
    if (!date) return t('common.recently') || 'Recemment';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return t('common.justNow') || "À l'instant";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${t('common.minutesAgo', { count: minutes })}` || `Il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `${t('common.hoursAgo', { count: hours })}` || `Il y a ${hours}h`;
  };

  const navigate = useNavigate();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

  const navigationItems = [
    { nameKey: 'finance.dashboard',        path: '/finance/dashboard',          icon: LayoutDashboard, color: 'text-secondary' },
    { nameKey: 'finance.admissions',       path: '/finance/caisse-admissions',  icon: UserCheck,       color: 'text-primary', badge: pendingAdmissionsCount > 0 ? pendingAdmissionsCount : null },
    { nameKey: 'finance.laboratory',       path: '/finance/caisse-laboratoire', icon: Microscope,      color: 'text-accent', badge: pendingLabCount > 0 ? pendingLabCount : null },
    { nameKey: 'finance.pharmacy',         path: '/finance/caisse-pharmacie',   icon: Pill,            color: 'text-primary', badge: pendingPharmacyCount > 0 ? pendingPharmacyCount : null },
    { nameKey: 'finance.pharmacyQueue',    path: '/finance/caisse-pharmacy-queue', icon: Pill,           color: 'text-emerald-600', badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : null },
    { nameKey: 'finance.expensesToValidate', path: '/finance/depenses-en-attente', icon: ClockAlert, color: 'text-yellow-600', badge: pendingExpensesCount > 0 ? pendingExpensesCount : null },
    { nameKey: 'finance.expenseManagement', path: '/finance/depenses',         icon: DollarSign,      color: 'text-warning' },
    { nameKey: 'finance.entryManagement',  path: '/finance/entrees',            icon: TrendingUp,      color: 'text-emerald-500' },
    { nameKey: 'finance.cashbook',         path: '/finance/livre-caisse',       icon: BookOpen,        color: 'text-blue-600' },
    { nameKey: 'finance.priceGrid',        path: '/finance/tarifs',             icon: Settings,        color: 'text-muted-foreground' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    toast.success(t('logoutSuccess') || 'À bientôt!', { description: t('logoutSuccessDesc') || 'Déconnexion réussie' });
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
          src={finalUrl} alt="Logo"
          className={cn('object-cover w-full h-full', className)}
          onError={() => setImgError(true)}
        />
      );
    }
    return <LogoInuaAfya size={40} className={className} />;
  };

  /* â”€â”€ Lien bottom (Notifications, ParamÃ¨tres, DÃ©connexion) â”€â”€ */
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
            {(!sidebarCollapsed || isMobile) && <span className="flex-1">{t('Notifications')}</span>}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-0 ml-4 shadow-xl border-primary/10"
          side={sidebarCollapsed && !isMobile ? 'right' : 'top'}
          align="start"
        >
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground">{t('Notifications')}</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3" /> {t('markAllAsRead') || 'Tout marquer lu'}
                </button>
              )}
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
                    <div
                      key={notif.id}
                      onClick={() => {
                        if (notif.type === 'RENDEZ_VOUS') navigate('/finance/notifications');
                        else if (notif.type === 'DOCUMENT') navigate('/finance/notifications');
                        else navigate('/finance/notifications');
                      }}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                        isUnread ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted'
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                        isUnread ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      )}>
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn(
                            'text-xs font-bold truncate',
                            isUnread ? 'text-foreground' : 'text-muted-foreground'
                          )}>
                            {notif.title}
                          </p>
                          {isUnread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {getTimeAgo(notif.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          <div className="p-3 border-t border-border">
            <Button
              variant="ghost" size="sm"
              className="w-full rounded-lg text-xs font-bold text-primary hover:bg-primary/5"
              onClick={() => navigate('/finance/notifications')}
            >
              {t('viewAllNotifications') || 'Voir toutes les notifications'}
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* â˜… PARAMÃˆTRES â€” remplace "Mon Profil" â˜… */}
      <NavLink
        to="/finance/settings"
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
        {(!sidebarCollapsed || isMobile) && <span>{t('common.settings')}</span>}
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
        {(!sidebarCollapsed || isMobile) && <span className="ml-3">{t('common.logout')}</span>}
      </Button>
    </div>
  );

  return (
    <>
      {/* â•â•â• DESKTOP SIDEBAR â•â•â• */}
      <aside className={cn(
        'hidden lg:flex flex-col bg-card border-r border-border transition-all duration-300 relative z-30 shrink-0 shadow-lg',
        sidebarCollapsed ? 'w-20' : 'w-72'
      )}>
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3 animate-slideInFromLeft w-full overflow-hidden">
              <DynamicLogo />
              <div className="overflow-hidden">
                <h1 className="text-lg font-space-grotesk font-bold text-primary tracking-tight truncate">
                  {config?.appName || 'INUA AFYA'}
                </h1>
                <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest">
                  {t('finance.title')}
                </p>
              </div>
            </div>
          ) : (
            <DynamicLogo />
          )}

          <Button
            variant="ghost" size="icon" onClick={toggleSidebar}
            className={cn(
              'absolute -right-3 top-5 w-6 h-6 rounded-full border-2 border-border bg-card shadow-md',
              sidebarCollapsed && 'rotate-180'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {navigationItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                    isActive
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-muted-foreground hover:bg-muted',
                    sidebarCollapsed && 'justify-center'
                  )
                }
              >
                <item.icon className={cn('w-5 h-5 flex-shrink-0', item.color)} />
                {!sidebarCollapsed && (
                  <span className="flex-1 flex items-center gap-2">
                    {t(item.nameKey)}
                    {item.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </ScrollArea>

        {/* Bottom */}
        <BottomNav />
      </aside>

      {/* â•â•â• MOBILE SIDEBAR â•â•â• */}
      {mobileSidebarOpen && (
        <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border lg:hidden shadow-2xl flex flex-col">
          <div className="h-16 flex items-center justify-between px-4 border-b border-border">
            <div className="flex items-center gap-3">
              <DynamicLogo />
              <h1 className="text-lg font-bold text-primary">
                {config?.appName || 'INUA AFYA'}
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
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                      isActive
                        ? 'bg-primary/10 text-primary shadow-md'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/30'
                    )
                  }
                >
                  <item.icon className={cn('w-5 h-5 flex-shrink-0', item.color)} />
                  <span className="flex items-center gap-2">
                    {t(item.nameKey)}
                    {item.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </span>
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
            <AlertDialogTitle>{t('common.logout')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmLogout') || 'Êtes-vous sûr de vouloir vous déconnecter ?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || 'Annuler'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
              {t('common.logout')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default FinanceSidebar;
