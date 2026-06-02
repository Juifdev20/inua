import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { toast } from 'sonner';

const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
      toast.success('Connexion rétablie');
      // Mettre à jour la dernière synchronisation
      localStorage.setItem('lastSync', new Date().toISOString());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
      toast.error('Connexion perdue - Mode hors ligne activé');
    };

    const handleConnectionChange = () => {
      setIsOnline(navigator.onLine);
      if (!navigator.onLine) {
        setShowOfflineMessage(true);
      } else {
        setShowOfflineMessage(false);
      }
    };

    // Écouter les changements de connexion
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('connectionchange', handleConnectionChange);

    // Vérifier l'état initial
    if (!navigator.onLine) {
      setShowOfflineMessage(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('connectionchange', handleConnectionChange);
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  const handleSyncData = async () => {
    try {
      // Simuler une synchronisation des données locales
      const cachedData = localStorage.getItem('cachedAppointments');
      const cachedProfile = localStorage.getItem('cachedProfile');
      
      if (cachedData || cachedProfile) {
        toast.success('Données locales synchronisées');
        localStorage.setItem('lastSync', new Date().toISOString());
      } else {
        toast.info('Aucune donnée locale à synchroniser');
      }
    } catch (error) {
      toast.error('Erreur lors de la synchronisation');
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  const handleShowAgain = () => {
    setIsDismissed(false);
  };

  // Ne pas afficher si connecté et pas de message offline, ou si dismissé
  if ((isOnline && !showOfflineMessage) || isDismissed) {
    // Si hors ligne mais dismissé, montrer juste une petite icône cliquable
    if (!isOnline && isDismissed) {
      return (
        <button
          onClick={handleShowAgain}
          className="fixed bottom-4 right-4 z-50 p-2 bg-amber-500 text-white rounded-full shadow-lg hover:bg-amber-600 transition-all animate-pulse"
          title="Mode hors ligne - Cliquez pour voir les options"
        >
          <WifiOff className="w-5 h-5" />
        </button>
      );
    }
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs">
      <Card className={`${
        isOnline 
          ? 'bg-green-50 border-green-200 text-green-800' 
          : 'bg-amber-50 border-amber-200 text-amber-800'
      } shadow-lg`}>
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-600" />
              ) : (
                <WifiOff className="w-4 h-4 text-amber-600" />
              )}
              <div>
                <p className="font-semibold text-xs">
                  {isOnline ? 'En ligne' : 'Hors ligne'}
                </p>
                <p className="text-[10px] opacity-75">
                  {isOnline 
                    ? 'Connexion active' 
                    : 'Données locales'
                  }
                </p>
              </div>
            </div>
            
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 p-1"
              title="Masquer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          
          {!isOnline && (
            <div className="mt-2 flex items-center space-x-1">
              <Button
                onClick={handleRetry}
                size="sm"
                className="h-6 px-2 text-[10px] bg-amber-600 hover:bg-amber-700"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Réessayer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OfflineIndicator;
