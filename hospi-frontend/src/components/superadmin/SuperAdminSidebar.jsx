import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  Shield,
  Users,
  LogOut,
  Wrench,
  Eye,
  Crown,
  ChevronLeft,
  Smartphone,
  Building2,
  BarChart3,
  Mail,
  HardDrive,
  CreditCard
} from 'lucide-react';
import LogoInuaAfya from '../LogoInuaAfya';
import { useAdmin } from '../../context/AdminContext';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

const SuperAdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, toggleMobileSidebar } = useAdmin();
  const { user, logout } = useAuth();
  const { config } = useConfig();

  const menuItems = [
    { path: '/superadmin', label: "Vue d'ensemble", icon: Activity, exact: true },
    { path: '/superadmin/alerts', label: 'Alertes', icon: Shield },
    { path: '/superadmin/users', label: 'Utilisateurs', icon: Users },
    { path: '/superadmin/sessions', label: 'Sessions', icon: LogOut },
    { path: '/superadmin/devices', label: 'Appareils', icon: Smartphone },
    { path: '/superadmin/system', label: 'Système', icon: Wrench },
    { path: '/superadmin/devs', label: 'Développeurs', icon: Crown },
    { path: '/superadmin/logs', label: 'Logs', icon: Eye },
    { path: '/superadmin/hospitals', label: 'Hopitaux', icon: Building2 },
    { path: '/superadmin/subscriptions', label: 'Abonnements', icon: CreditCard },
    { path: '/superadmin/performance', label: 'Performance', icon: BarChart3 },
    { path: '/superadmin/emails', label: 'Emails', icon: Mail },
    { path: '/superadmin/backup', label: 'Backup', icon: HardDrive },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* SIDEBAR DESKTOP */}
      <aside className={cn(
        "hidden lg:flex flex-col bg-card border-r border-border transition-all duration-300 relative z-30",
        sidebarCollapsed ? "w-20" : "w-72"
      )}>
        {/* Logo Section */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3 animate-slideInFromLeft overflow-hidden">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-lg overflow-hidden shrink-0">
                <LogoInuaAfya size={40} />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-lg font-bold text-foreground tracking-tight truncate">{config?.appName || 'INUA AFYA'}</h1>
                <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Super Admin</p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-lg mx-auto overflow-hidden shrink-0">
              <LogoInuaAfya size={40} />
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
              const active = isActive(item.path, item.exact);
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
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  {!sidebarCollapsed && (
                    <span className="flex-1 tracking-tight">{item.label}</span>
                  )}
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
          <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
            <LogoInuaAfya size={40} />
          </div>
          <div className="ml-3 overflow-hidden">
            <h1 className="text-lg font-bold text-foreground truncate">{config?.appName || 'INUA AFYA'}</h1>
            <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Super Admin</p>
          </div>
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
                  isActive(item.path, item.exact) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive(item.path, item.exact) ? "text-primary" : "text-muted-foreground")} />
                <span>{item.label}</span>
              </Link>
            ))}
            <div className="pt-4 border-t border-border">
              <button
                onClick={() => { toggleMobileSidebar(); handleLogout(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Déconnexion
              </button>
            </div>
          </nav>
        </ScrollArea>
      </aside>
    </>
  );
};

export default SuperAdminSidebar;
