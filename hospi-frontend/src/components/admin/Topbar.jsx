import React from 'react';
import { Menu, Bell, Moon, Sun, Search } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useNotifications } from '../../context/NotificationContext'; 
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '../ui/scroll-area';

const Topbar = () => {
  const { toggleMobileSidebar, adminUser, theme, toggleTheme } = useAdmin();
  const navigate = useNavigate();
  
  // 🔔 Récupération sécurisée du contexte de notifications
  const notificationCtx = useNotifications();
  const notifications = notificationCtx?.notifications || [];
  const unreadCount = notificationCtx?.unreadCount || 0;
  const markAllAsRead = notificationCtx?.markAllAsRead || (() => {});
  
  // 🛡️ SÉCURITÉ LOCALE : Évite l'écran noir si getTimeAgo n'est pas encore prêt
  const getTimeAgo = notificationCtx?.getTimeAgo || ((date) => {
    if (!date) return "À l'instant";
    try {
      const seconds = Math.floor((new Date() - new Date(date)) / 1000);
      if (seconds < 60) return "À l'instant";
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `Il y a ${minutes} min`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `Il y a ${hours} h`;
      return new Date(date).toLocaleDateString();
    } catch (e) {
      return "Récemment";
    }
  });

  // ✅ Utilitaire pour afficher le rôle sans crasher React
  const renderRoleName = (role) => {
    if (!role) return 'ADMIN';
    if (typeof role === 'object') return role.nom || 'ADMIN';
    return role;
  };

  // 🖼️ URL de la photo de profil (Backend)
  const photoUrl = adminUser?.photoUrl 
    ? `${import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/uploads/profiles/${adminUser.photoUrl}` 
    : null;

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-sm">
      {/* Left section */}
      <div className="flex items-center gap-4 flex-1">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={toggleMobileSidebar}
        >
          <Menu className="w-5 h-5" />
        </Button>

        <div className="hidden md:flex items-center flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Rechercher..."
              className="pl-10 bg-muted/50 border-muted focus:bg-background transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground"
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </Button>

        {/* Notifications */}
        <DropdownMenu onOpenChange={(open) => open && markAllAsRead()}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs animate-bounce"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                </Badge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="h-72">
              {notifications.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center gap-2">
                  <Bell className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">Aucune notification pour le moment</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <DropdownMenuItem key={notif.id} className="flex flex-col items-start py-3 cursor-pointer border-b border-border/50 last:border-0 focus:bg-muted/50">
                    <div className="flex items-start w-full gap-2">
                      <div className="flex-1">
                        <p className={`text-sm leading-snug ${notif.unread ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-primary/70 mt-1 font-medium">
                          {getTimeAgo(notif.timestamp)}
                        </p>
                      </div>
                      {notif.unread && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </ScrollArea>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => navigate('/admin/notifications')}
              className="text-center text-sm text-primary cursor-pointer justify-center font-medium py-2"
            >
              Voir tout l'historique
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu avec Photo de profil */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 hover:bg-muted p-1 pr-2 h-auto">
              <Avatar className="w-8 h-8 border border-primary/10 overflow-hidden">
                {photoUrl ? (
                  <img 
                    src={photoUrl} 
                    alt="Profile" 
                    className="h-full w-full object-cover"
                    onError={(e) => { e.target.src = ""; }} // Sécurité si l'image ne charge pas
                  />
                ) : (
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold uppercase">
                    {adminUser?.prenom?.[0]}{adminUser?.nom?.[0]}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium leading-none">{adminUser?.prenom} {adminUser?.nom}</p>
                <p className="text-[10px] text-muted-foreground uppercase mt-1 tracking-tighter">
                  {renderRoleName(adminUser?.role)}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{adminUser?.prenom} {adminUser?.nom}</p>
                <p className="text-xs leading-none text-muted-foreground">{adminUser?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/admin/profil')} className="cursor-pointer">
              Mon Profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/admin/parametres')} className="cursor-pointer">
              Paramètres
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive cursor-pointer focus:bg-destructive/10 focus:text-destructive">
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Topbar;