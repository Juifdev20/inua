// Point d'entrée du module hors-ligne.
export { db } from './db';
export { isOnline, isNetworkError, onConnectivityChange } from './net';
export { uuid } from './idempotency';
export { registerInstance, resolveInstance, hasInstance } from './instances';
export { cachedGet, getCached, putCached } from './cache';
export { queueableMutation, executeMutation, countPending, notifyPending } from './outbox';
export { drainOutbox, retryFailed, dismissFailed, initAutoSync } from './sync';
export { useOffline } from './useOffline';
