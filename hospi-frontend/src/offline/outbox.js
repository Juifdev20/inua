// 📤 File d'écritures hors-ligne (outbox).
// En ligne : exécute la mutation puis applique l'optimistic (le serveur fait foi
//   au prochain refresh). Hors-ligne (ou bascule réseau) : applique l'optimistic
//   sur le cache Dexie et met la mutation en file pour rejeu à la reconnexion.
import { db } from './db';
import { isOnline, isNetworkError } from './net';
import { uuid } from './idempotency';
import { getCached, putCached } from './cache';
import { resolveInstance } from './instances';

export const notifyPending = () => window.dispatchEvent(new CustomEvent('offline-outbox-changed'));
const notifyCacheUpdated = (detail) => window.dispatchEvent(new CustomEvent('offline-cache-updated', { detail }));

/** Applique une modification optimiste sur le cache Dexie (persiste, survit au reload). */
async function applyOptimistic(optimistic) {
  if (!optimistic || !optimistic.store || !optimistic.cacheKey || typeof optimistic.apply !== 'function') return;
  const current = await getCached(optimistic.store, optimistic.cacheKey);
  const next = optimistic.apply(current);
  if (next !== undefined) {
    await putCached(optimistic.store, optimistic.cacheKey, next);
    notifyCacheUpdated({ store: optimistic.store, cacheKey: optimistic.cacheKey });
  }
}

/** Exécute la requête via l'instance axios enregistrée + header Idempotency-Key. */
export async function executeMutation({ instanceTag, method, url, body, headers = {}, key }) {
  const inst = resolveInstance(instanceTag);
  return inst.request({
    url,
    method: (method || 'post').toLowerCase(),
    data: body,
    headers: { ...headers, 'Idempotency-Key': key },
  });
}

/**
 * Écriture "hors-ligne-consciente".
 * @param {object} p
 * @param {string} p.instanceTag  tag d'instance axios (enregistrée via registerInstance)
 * @param {string} p.method       'post' | 'put' | 'patch'
 * @param {string} p.url          url relative à la baseURL de l'instance
 * @param {*}      p.body         corps JSON (pas de FormData)
 * @param {string} p.moduleTag    'reception'|'finance'|'lab'|'pharmacy'
 * @param {object} p.entityRef    { type, id } — l'id serveur EXISTANT visé
 * @param {object} p.optimistic   { store, cacheKey, apply(cached)->next }
 * @returns {Promise<axiosResponse | {queuedOffline:true, idempotencyKey}>}
 */
export async function queueableMutation({ instanceTag, method = 'post', url, body, headers = {}, moduleTag, entityRef, optimistic }) {
  const key = uuid();
  if (isOnline()) {
    try {
      const res = await executeMutation({ instanceTag, method, url, body, headers, key });
      await applyOptimistic(optimistic);
      return res;
    } catch (e) {
      if (!isNetworkError(e)) throw e; // vraie erreur métier => on la propage
      // erreur réseau => on bascule en file ci-dessous
    }
  }
  await applyOptimistic(optimistic);
  await db.outbox.add({
    idempotencyKey: key,
    method, url, instanceTag, body, headers,
    moduleTag: moduleTag || null,
    entityRef: entityRef || null,
    optimistic: optimistic ? { store: optimistic.store, cacheKey: optimistic.cacheKey } : null,
    status: 'pending',
    retryCount: 0,
    lastError: null,
    createdAt: new Date().toISOString(),
  });
  notifyPending();
  // Forme compatible avec les appelants qui lisent `response.data`
  return {
    queuedOffline: true,
    idempotencyKey: key,
    status: 202,
    data: { success: true, queuedOffline: true, message: 'Enregistré hors-ligne — sera synchronisé au retour de la connexion.' },
  };
}

export const countPending = () =>
  db.outbox.where('status').anyOf('pending', 'inflight', 'failed').count();
