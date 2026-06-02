/**
 * Bannière qui affiche le statut offline/online et les synchronisations en attente
 */
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { Badge } from './badge';
import { Button } from './button';

export function OfflineBanner() {
  const { isOnline, pendingCount, isSyncing, syncPending } = useOfflineSync();
  const [showBanner, setShowBanner] = useState(true);
  const [lastSyncStatus, setLastSyncStatus] = useState(null);

  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
    }
  }, [isOnline]);

  const handleSyncNow = async () => {
    setLastSyncStatus(null);
    try {
      const result = await syncPending();
      if (result.synced > 0) {
        setLastSyncStatus({ type: 'success', message: `${result.synced} éléments synchronisés` });
      } else if (result.failed > 0) {
        setLastSyncStatus({ type: 'error', message: `${result.failed} échecs` });
      } else {
        setLastSyncStatus({ type: 'info', message: 'Tout est à jour' });
      }
    } catch (err) {
      setLastSyncStatus({ type: 'error', message: 'Erreur de synchronisation' });
    }
    setTimeout(() => setLastSyncStatus(null), 3000);
  };

  if (!showBanner) return null;

  return (
    <div className={`
      fixed top-0 left-0 right-0 z-50
      ${isOnline ? 'bg-emerald-50 border-b border-emerald-200' : 'bg-amber-50 border-b border-amber-200'}
      transition-all duration-300
    `}>
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Icône statut */}
            <div className={`
              flex items-center gap-2
              ${isOnline ? 'text-emerald-600' : 'text-amber-600'}
            `}>
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              <span className="text-sm font-medium">
                {isOnline ? 'En ligne' : 'Mode hors ligne'}
              </span>
            </div>

            {/* Badge synchronisation */}
            {pendingCount > 0 && (
              <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                {pendingCount} en attente
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Message de statut */}
            {lastSyncStatus && (
              <div className={`
                flex items-center gap-1 text-xs px-2 py-1 rounded
                ${lastSyncStatus.type === 'success' ? 'bg-green-100 text-green-700' : ''}
                ${lastSyncStatus.type === 'error' ? 'bg-red-100 text-red-700' : ''}
                ${lastSyncStatus.type === 'info' ? 'bg-blue-100 text-blue-700' : ''}
              `}>
                {lastSyncStatus.type === 'success' && <CheckCircle className="w-3 h-3" />}
                {lastSyncStatus.type === 'error' && <AlertCircle className="w-3 h-3" />}
                {lastSyncStatus.message}
              </div>
            )}

            {/* Bouton synchroniser */}
            {isOnline && pendingCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="h-7 text-xs gap-1"
              >
                {isSyncing ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                Synchroniser
              </Button>
            )}

            {/* Bouton fermer (uniquement si online et rien en attente) */}
            {isOnline && pendingCount === 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowBanner(false)}
                className="h-7 w-7 p-0"
              >
                ×
              </Button>
            )}
          </div>
        </div>

        {/* Message informatif offline */}
        {!isOnline && (
          <div className="mt-1 text-xs text-amber-700">
            Les données seront synchronisées dès que la connexion sera rétablie.
          </div>
        )}
      </div>
    </div>
  );
}

export default OfflineBanner;
