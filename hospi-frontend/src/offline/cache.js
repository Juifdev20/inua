// 💾 Cache de lecture write-through.
// - En ligne : exécute le fetcher, met le résultat en cache Dexie, le retourne.
//   Si le fetcher échoue pour cause réseau (y compris faux-503 du SW) → retombe
//   sur le cache s'il existe.
// - Hors ligne : lit directement le cache (throw si vide).
import { db } from './db';
import { isOnline, isNetworkError } from './net';

const readCache = async (store, cacheKey) => {
  const row = await db[store].get(cacheKey);
  return row ? row.data : undefined;
};

const writeCache = async (store, cacheKey, data) => {
  await db[store].put({ cacheKey, data, updatedAt: Date.now() });
};

/**
 * @param {string} store   nom du store Dexie (labQueue, financeQueues, …)
 * @param {string} cacheKey clé (ex: 'default', `box:${id}`, `type:${t}`)
 * @param {Function} fetcher () => Promise<data>  (doit retourner response.data BRUT)
 */
export async function cachedGet(store, cacheKey, fetcher) {
  if (isOnline()) {
    try {
      const data = await fetcher();
      await writeCache(store, cacheKey, data);
      return data;
    } catch (e) {
      if (isNetworkError(e)) {
        const cached = await readCache(store, cacheKey);
        if (cached !== undefined) return cached;
      }
      throw e;
    }
  }
  const cached = await readCache(store, cacheKey);
  if (cached !== undefined) return cached;
  // Rien en cache et hors-ligne : on renvoie une erreur explicite exploitable par l'UI
  const err = new Error('offline-no-cache');
  err.offlineNoCache = true;
  throw err;
}

/** Lecture directe du cache (sans fetch) — utile pour patcher l'optimistic UI. */
export const getCached = (store, cacheKey) => readCache(store, cacheKey);
export const putCached = (store, cacheKey, data) => writeCache(store, cacheKey, data);
