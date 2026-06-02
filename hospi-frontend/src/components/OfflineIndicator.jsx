import React, { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, CloudUpload, Database } from 'lucide-react';
import { Button } from './ui/button';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { toast } from 'sonner';

const OfflineIndicator = () => {
  const { isOnline, pendingCount, isSyncing, syncPending } = useOfflineSync();
  const [expanded, setExpanded] = useState(false);

  const handleSyncNow = async () => {
    try {
      const result = await syncPending();
      if (result.synced > 0) {
        toast.success(`${result.synced} éléments synchronisés`);
      } else {
        toast.info('Tout est à jour');
      }
    } catch (err) {
      toast.error('Erreur de synchronisation');
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  // Mode online : rien ou juste un petit badge vert si synchro en cours
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  // Mode online avec synchro en cours ou en attente
  if (isOnline && (pendingCount > 0 || isSyncing)) {
    return (
      <button
        onClick={() => setExpanded(!expanded)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded-full shadow-lg hover:bg-emerald-600 transition-all"
        title={isSyncing ? 'Synchronisation...' : `${pendingCount} en attente`}
      >
        <CloudUpload className="w-4 h-4" />
        <span className="text-xs font-medium">
          {isSyncing ? 'Sync...' : `${pendingCount} en attente`}
        </span>
      </button>
    );
  }

  // Mode offline - expanded
  if (expanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-64">
        <div className="bg-amber-50 border border-amber-200 rounded-xl shadow-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <WifiOff className="w-5 h-5 text-amber-600" />
              <span className="font-semibold text-sm text-amber-800">Mode hors ligne</span>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="text-amber-400 hover:text-amber-600"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>

          <p className="text-xs text-amber-700 mb-3">
            Les données sont enregistrées localement et seront synchronisées dès que la connexion sera rétablie.
          </p>

          {pendingCount > 0 && (
            <div className="mb-3 p-2 bg-amber-100 rounded-lg flex items-center gap-2">
              <Database className="w-3 h-3 text-amber-600" />
              <span className="text-xs font-medium text-amber-800">
                {pendingCount} modification{pendingCount > 1 ? 's' : ''} en attente
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleReload}
              size="sm"
              variant="outline"
              className="flex-1 h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Recharger
            </Button>
            <Button
              onClick={() => setExpanded(false)}
              size="sm"
              className="flex-1 h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white"
            >
              Fermer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Mode offline - compact (badge cliquable)
  return (
    <button
      onClick={() => setExpanded(true)}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-full shadow-lg hover:bg-amber-600 transition-all animate-pulse"
      title="Mode hors ligne - Cliquez pour plus d'options"
    >
      <WifiOff className="w-4 h-4" />
      <span className="text-xs font-medium">Hors ligne</span>
      {pendingCount > 0 && (
        <span className="bg-white text-amber-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          {pendingCount}
        </span>
      )}
    </button>
  );
};

export default OfflineIndicator;
