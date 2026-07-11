import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, X, UploadCloud, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { toast } from 'sonner';
import { useOffline } from '../offline';

const OfflineIndicator = () => {
  const { isOnline, pendingCount, failed, syncNow, retryFailed, dismissFailed } = useOffline();
  const [showOfflineMessage, setShowOfflineMessage] = useState(!navigator.onLine);
  const [isDismissed, setIsDismissed] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setShowOfflineMessage(false);
      toast.success('Connexion rétablie — synchronisation…');
    };
    const handleOffline = () => {
      setShowOfflineMessage(true);
      setIsDismissed(false);
      toast.error('Connexion perdue — mode hors ligne activé');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncNow();
      toast.success('Synchronisation terminée');
    } catch (e) {
      toast.error('Échec de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const hasPending = pendingCount > 0;
  const hasConflicts = failed.length > 0;

  // Rien à afficher : en ligne, sans écritures en attente, pas de conflit
  if (isOnline && !hasPending && !hasConflicts && !showOfflineMessage) return null;

  // Réduit : hors-ligne masqué → petite pastille
  if (isDismissed) {
    return (
      <button
        onClick={() => setIsDismissed(false)}
        className={`fixed bottom-4 right-4 z-50 p-2 rounded-full shadow-lg transition-all text-white ${
          isOnline ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-500 hover:bg-amber-600 animate-pulse'
        }`}
        title={hasPending ? `${pendingCount} en attente de synchronisation` : 'Mode hors ligne'}
      >
        {isOnline ? <UploadCloud className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
        {(hasPending || hasConflicts) && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {pendingCount + failed.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs">
      <Card className={`shadow-lg ${isOnline ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-amber-50 border-amber-200 text-amber-900'} dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100`}>
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {isOnline ? <Wifi className="w-4 h-4 text-blue-600" /> : <WifiOff className="w-4 h-4 text-amber-600" />}
              <div>
                <p className="font-semibold text-xs">{isOnline ? 'En ligne' : 'Hors ligne'}</p>
                <p className="text-[10px] opacity-75">
                  {isOnline ? 'Connexion active' : 'Vos saisies sont enregistrées localement'}
                </p>
              </div>
            </div>
            <button onClick={() => setIsDismissed(true)} className="text-gray-400 hover:text-gray-600 p-1" title="Masquer">
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Écritures en attente */}
          {hasPending && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-white/60 dark:bg-gray-900/40 px-2 py-1.5">
              <span className="text-[11px] font-medium flex items-center gap-1">
                <UploadCloud className="w-3.5 h-3.5" />
                {pendingCount} modif. en attente
              </span>
              {isOnline && (
                <Button onClick={handleSync} disabled={syncing} size="sm" className="h-6 px-2 text-[10px] bg-blue-600 hover:bg-blue-700">
                  {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <><RefreshCw className="w-3 h-3 mr-1" /> Synchroniser</>}
                </Button>
              )}
            </div>
          )}

          {/* Conflits */}
          {hasConflicts && (
            <div className="mt-2 rounded-md bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 px-2 py-1.5">
              <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {failed.length} en conflit
              </p>
              <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">
                {failed[0]?.lastError?.message || 'Non synchronisable'}
              </p>
              <div className="flex gap-1 mt-1">
                <Button onClick={() => retryFailed()} size="sm" className="h-5 px-2 text-[10px] bg-rose-600 hover:bg-rose-700">Réessayer</Button>
                <Button onClick={() => failed.forEach((f) => dismissFailed(f.seq))} size="sm" variant="outline" className="h-5 px-2 text-[10px]">Ignorer</Button>
              </div>
            </div>
          )}

          {!isOnline && !hasPending && (
            <p className="mt-2 text-[10px] opacity-75">Les données se synchroniseront automatiquement au retour de la connexion.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OfflineIndicator;
