// 🪝 Hook React : état de connexion + nombre d'écritures en attente + conflits.
import { useState, useEffect } from 'react';
import { liveQuery } from 'dexie';
import { db } from './db';
import { isOnline } from './net';
import { drainOutbox, retryFailed, dismissFailed } from './sync';

export function useOffline() {
  const [online, setOnline] = useState(isOnline());
  const [pendingCount, setPendingCount] = useState(0);
  const [failed, setFailed] = useState([]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    const sub = liveQuery(() =>
      db.outbox.where('status').anyOf('pending', 'inflight', 'failed').toArray()
    ).subscribe({
      next: (rows) => {
        setPendingCount(rows.length);
        setFailed(rows.filter((r) => r.status === 'failed'));
      },
      error: () => {},
    });
    return () => sub.unsubscribe();
  }, []);

  return {
    isOnline: online,
    pendingCount,
    failed,
    syncNow: drainOutbox,
    retryFailed,
    dismissFailed,
  };
}

export default useOffline;
