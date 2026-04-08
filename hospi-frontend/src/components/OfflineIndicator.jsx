import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { toast } from 'sonner';

const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

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

  // Ne pas afficher si connecté et pas de message offline
  if (isOnline && !showOfflineMessage) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50">
      <Card className={`${
        isOnline 
          ? 'bg-green-50 border-green-200 text-green-800' 
          : 'bg-amber-50 border-amber-200 text-amber-800'
      } shadow-lg`}>
        <CardContent className="p-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <Wifi className="w-5 h-5 text-green-600" />
              ) : (
                <WifiOff className="w-5 h-5 text-amber-600" />
              )}
              <div>
                <p className="font-semibold text-sm">
                  {isOnline ? 'En ligne' : 'Mode hors ligne'}
                </p>
                <p className="text-xs opacity-75">
                  {isOnline 
                    ? 'Connexion internet active' 
                    : 'Application fonctionnant localement'
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {!isOnline && (
                <>
                  <Button
                    onClick={handleSyncData}
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-xs"
                  >
                    📱 Sync données
                  </Button>
                  <Button
                    onClick={handleRetry}
                    size="sm"
                    className="h-8 px-3 text-xs bg-amber-600 hover:bg-amber-700"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Réessayer
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {!isOnline && (
            <div className="mt-2 pt-2 border-t border-amber-200">
              <p className="text-xs">
                💡 <strong>Conseil :</strong> Vos données sont sauvegardées localement et synchroniseront dès le retour de la connexion.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OfflineIndicator;
