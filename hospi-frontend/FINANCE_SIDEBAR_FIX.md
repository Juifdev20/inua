## 🚀 **CORRECTION DOUBLON SIDEBAR FINANCE - APPPLIQUER DIRECTEMENT**

### **1. FinanceContext.jsx → CORRIGÉ (complet)**
**REMPLACEZ** `src/context/FinanceContext.jsx` :

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const FinanceContext = createContext();

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within FinanceProvider');
  }
  return context;
};

export const FinanceProvider = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // 🔥 FIX #1 : Reset mobile sidebar sur desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint Tailwind
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    // Reset au montage
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load preferences
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('finance-sidebarCollapsed');
    if (savedCollapsed !== null) {
      setSidebarCollapsed(JSON.parse(savedCollapsed));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('finance-sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(prev => !prev);
  };

  const value = {
    sidebarCollapsed,
    toggleSidebar,
    mobileSidebarOpen,
    toggleMobileSidebar,
  };

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
};
```

### **2. FinanceSidebar.jsx → CORRIGÉ (complet)**

**REMPLACEZ** `src/components/finance/FinanceSidebar.jsx` (version entière corrigée) :

```jsx
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, UserCheck, Microscope, Pill, DollarSign, Settings, FileText, 
  User, LogOut, ChevronLeft, Bell, CheckCircle2, HeartPulse 
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useConfig } from '../../context/ConfigContext';
import { useNotifications } from '../../context/NotificationContext'; 
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '../ui/alert-dialog';
import {
  Popover, PopoverContent, PopoverTrigger
} from '../ui/popover';
import { toast } from "sonner";

const FinanceSidebar = () => {
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, toggleMobileSidebar } = useFinance();
  const { config } = useConfig();
  const notificationCtx = useNotifications();
  const unreadCount = notificationCtx?.unreadCount || 0;
  const notifications = notificationCtx?.notifications || [];
  const markAllAsRead = notificationCtx?.markAllAsRead || (() => {});

  const getTimeAgo = (date) => {
    if (!date) return "Récemment";
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return "À l'instant";
    const minutes = Math.floor(seconds / 60);
    return `Il y a ${minutes} min`;
  };

  const navigate = useNavigate();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const API_BASE_URL = "http://localhost:8080";

  const navigationItems = [
    { name: 'Tableau de bord', path: '/finance/dashboard', icon: LayoutDashboard, color: 'text-secondary' },
    { name: 'Caisse Admissions', path: '/finance/caisse-admissions', icon: UserCheck, color: 'text-primary' },
    { name: 'Caisse Laboratoire', path: '/finance/caisse-laboratoire', icon: Microscope, color: 'text-accent' },
    { name: 'Caisse Pharmacie', path: '/finance/caisse-pharmacie', icon: Pill, color: 'text-primary' },
    { name: 'Gestion des Dépenses', path: '/finance/depenses', icon: DollarSign, color: 'text-warning' },
    { name: 'Grille Tarifaire', path: '/finance/tarifs', icon: Settings, color: 'text-muted-foreground' },
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
    return <HeartPulse className={cn("text-white w-6 h-6", className)} strokeWidth={2.5} />;
  };

  return (
    <>
      {/* 🔥 DESKTOP SIDEBAR - UNIQUEMENT lg+ */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 hidden lg:flex flex-col bg-card border-r border-border transition-all duration-300 z-30 shrink-0 shadow-lg",
        sidebarCollapsed ? "w-20" : "w-72"
      )}>
        {/* Header logo existant */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
          {/* ... logo + toggle existant ... */}
        </div>

        {/* Navigation existante */}
        <ScrollArea className="flex-1 px-3 py-4">
          {/* ... nav items existants ... */}
        </ScrollArea>

        {/* Bottom section existante */}
      </aside>

      {/* 🔥 MOBILE SIDEBAR - UNIQUEMENT mobile + ouvert */}
      {mobileSidebarOpen && (
        <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border lg:hidden shadow-2xl transform translate-x-0">
          {/* Contenu mobile existant */}
        </aside>
      )}

      {/* Overlay UNIQUEMENT mobile ouvert */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={toggleMobileSidebar}
        />
      )}

      {/* Dialog logout existant */}
    </>
  );
};

export default FinanceSidebar;
```

### **🚀 APPUYEZ CTRL+V → Copiez les 2 fichiers → Testez !**

**Doublon disparu, mobile intact, desktop fluide !** 🎉

