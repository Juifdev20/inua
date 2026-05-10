import React, { useEffect, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/context/NotificationContext';
import { cn } from '@/lib/utils';
import { CheckCheck, X, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const NotificationDropdown = ({ onClose }) => {
  useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={dropdownRef}
      className={cn(
        'absolute right-0 top-full mt-2 w-96 rounded-xl shadow-2xl overflow-hidden animate-slide-in z-50 bg-card border-2 border-border'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className={cn('font-bold text-lg text-foreground')}>
            Notifications
          </h3>
          {unreadCount > 0 && (
            <p className="text-sm text-medical-green">
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {notifications.length > 0 && (
            <>
              <button onClick={markAllAsRead} className="p-2 rounded-lg transition-colors hover:bg-muted" title="Tout marquer comme lu">
                <CheckCheck className="w-4 h-4 text-medical-green" />
              </button>
              <button onClick={clearNotifications} className="p-2 rounded-lg transition-colors hover:bg-muted" title="Effacer tout">
                <X className="w-4 h-4 text-red-500" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className={cn('w-12 h-12 mx-auto mb-3 text-muted-foreground')} />
            <p className="text-sm">Aucune notification</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => !notif.read && markAsRead(notif.id)}
              className={cn(
                'p-4 border-b cursor-pointer transition-colors hover:bg-muted',
                !notif.read && 'bg-medical-green/5'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p
                    className={cn(
                      'text-sm font-semibold mb-1 text-foreground'
                    )}
                  >
                    {notif.title || 'Notification'}
                  </p>
                  <p
                    className={cn(
                      'text-sm mb-2 text-muted-foreground'
                    )}
                  >
                    {notif.message || notif.body}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3 h-3 text-medical-green" />
                    <span className="text-xs text-medical-green">
                      {format(notif.timestamp, 'PPp', { locale: fr })}
                    </span>
                  </div>
                </div>
                {!notif.read && (
                  <div className="w-2 h-2 rounded-full bg-medical-green mt-1" />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
