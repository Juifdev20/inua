/**
 * Hook principal pour gérer lecture/écriture online/offline
 * Intercepte les appels API et bascule vers IndexedDB quand offline
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineDB, offlineHelpers } from '../db/offlineDB';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const syncListeners = useRef([]);

  // Surveiller l'état de la connexion
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerAutoSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Compter les opérations en attente
  useEffect(() => {
    const interval = setInterval(async () => {
      const pending = await offlineHelpers.getPendingSyncs();
      setPendingCount(pending.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Exécuter une requête : online → API, offline → IndexedDB
   */
  const execute = useCallback(async (options) => {
    const {
      apiCall,           // Fonction API à appeler (axios/fetch)
      tableName,         // Table IndexedDB fallback
      localData,         // Données à sauvegarder localement si offline
      action = 'read',   // 'read' | 'create' | 'update' | 'delete'
      cacheKey,          // Clé pour le cache
      invalidateCache,   // Tables à invalider après mutation
    } = options;

    // ─── MODE ONLINE ───
    if (navigator.onLine) {
      try {
        const result = await apiCall();

        // Mettre à jour le cache local avec les données fraîches
        if (action === 'read' && tableName && result?.data) {
          const data = Array.isArray(result.data) ? result.data : [result.data];
          await offlineHelpers.replaceTableData(tableName, data);
        }

        if ((action === 'create' || action === 'update') && tableName && result?.data) {
          await offlineHelpers.saveLocal(tableName, { ...result.data, syncStatus: 'synced' });
        }

        setLastSyncAt(new Date());
        return { success: true, data: result.data, source: 'api' };
      } catch (error) {
        // Si l'API échoue malgré online (timeout), fallback offline
        if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
          return handleOfflineOperation({ tableName, localData, action, cacheKey });
        }
        throw error;
      }
    }

    // ─── MODE OFFLINE ───
    return handleOfflineOperation({ tableName, localData, action, cacheKey });
  }, []);

  /**
   * Gérer une opération en mode offline
   */
  const handleOfflineOperation = async ({ tableName, localData, action, cacheKey }) => {
    switch (action) {
      case 'read': {
        // Lire depuis IndexedDB
        const localResults = await offlineHelpers.getLocal(tableName);
        return { success: true, data: localResults, source: 'offline' };
      }
      case 'create': {
        // Sauvegarder localement + mettre en file d'attente
        const localId = await offlineHelpers.saveLocal(tableName, localData);
        await offlineHelpers.queueCreate(tableName, { ...localData, id: localId });
        return { success: true, data: { ...localData, id: localId }, source: 'offline', pending: true };
      }
      case 'update': {
        await offlineHelpers.saveLocal(tableName, localData);
        await offlineHelpers.markForSync(tableName, localData.id, 'update');
        return { success: true, data: localData, source: 'offline', pending: true };
      }
      case 'delete': {
        if (localData?.id) {
          await offlineDB.table(tableName).delete(localData.id);
          await offlineHelpers.markForSync(tableName, localData.id, 'delete');
        }
        return { success: true, data: localData, source: 'offline', pending: true };
      }
      default:
        return { success: false, error: 'Action non supportée', source: 'offline' };
    }
  };

  /**
   * Synchroniser toutes les opérations en attente avec le serveur
   */
  const syncPending = useCallback(async (syncCallbacks = {}) => {
    if (!navigator.onLine || isSyncing) return { synced: 0, failed: 0 };

    setIsSyncing(true);
    const pending = await offlineHelpers.getPendingSyncs();
    let synced = 0;
    let failed = 0;

    for (const item of pending) {
      try {
        const callback = syncCallbacks[item.tableName];
        if (callback) {
          await callback(item.action, item.payload);
          await offlineHelpers.dequeueSync(item.id);
          synced++;
        } else {
          // Pas de handler défini → marquer comme échec temporaire
          failed++;
        }
      } catch (err) {
        console.error(`Sync failed for ${item.tableName}:`, err);
        failed++;
      }
    }

    setIsSyncing(false);
    setPendingCount(await (await offlineHelpers.getPendingSyncs()).length);
    setLastSyncAt(new Date());
    return { synced, failed };
  }, [isSyncing]);

  /**
   * Déclencher la synchronisation auto quand on revient online
   */
  const triggerAutoSync = useCallback(async () => {
    if (navigator.onLine && pendingCount > 0) {
      // Toast/info pourrait être ajouté ici
      console.log('[OfflineSync] Connexion restaurée, synchronisation en cours...');
    }
  }, [pendingCount]);

  /**
   * Précharger les données d'une table depuis le serveur
   */
  const preload = useCallback(async (apiCall, tableName) => {
    if (!navigator.onLine) return;
    try {
      const response = await apiCall();
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      await offlineHelpers.replaceTableData(tableName, data);
      setLastSyncAt(new Date());
    } catch (err) {
      console.error(`[OfflineSync] Preload failed for ${tableName}:`, err);
    }
  }, []);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncAt,
    execute,
    syncPending,
    preload,
  };
}

/**
 * Hook utilitaire : wrapper simple pour les composants
 * Usage : const { data, loading, error } = useOfflineQuery(apiFn, 'patients')
 */
export function useOfflineQuery(apiFn, tableName, deps = []) {
  const { execute, isOnline } = useOfflineSync();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await execute({
          apiCall: apiFn,
          tableName,
          action: 'read',
        });
        if (!cancelled) {
          setData(result.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Erreur de chargement');
          // Fallback sur IndexedDB même en cas d'erreur API
          try {
            const local = await offlineHelpers.getLocal(tableName);
            setData(local);
          } catch { /* noop */ }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, deps);

  return { data, loading, error, isOnline };
}

export default useOfflineSync;
