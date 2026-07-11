// 🔄 Moteur de synchronisation : rejoue la file (outbox) à la reconnexion.
import { db } from './db';
import { isOnline, isNetworkError } from './net';
import { executeMutation, notifyPending } from './outbox';

let draining = false;

/** Rejoue les écritures en attente dans l'ordre FIFO (seq). */
export async function drainOutbox() {
  if (draining || !isOnline()) return;
  draining = true;
  try {
    const items = await db.outbox.where('status').anyOf('pending', 'failed').sortBy('seq');
    for (const item of items) {
      if (!isOnline()) break;
      await db.outbox.update(item.seq, { status: 'inflight' });
      try {
        await executeMutation({
          instanceTag: item.instanceTag,
          method: item.method,
          url: item.url,
          body: item.body,
          headers: item.headers,
          key: item.idempotencyKey, // le backend dédoublonne sur cette clé
        });
        await db.outbox.update(item.seq, { status: 'done', lastError: null });
      } catch (e) {
        if (isNetworkError(e)) {
          // Toujours hors-ligne : on remet en attente et on arrête le drain
          await db.outbox.update(item.seq, { status: 'pending' });
          break;
        }
        // Erreur métier (4xx/5xx) = conflit → on marque échoué, on remonte, on ne perd rien
        await db.outbox.update(item.seq, {
          status: 'failed',
          retryCount: (item.retryCount || 0) + 1,
          lastError: { status: e.response?.status, message: e.response?.data?.message || e.message },
        });
        window.dispatchEvent(new CustomEvent('offline-sync-conflict', { detail: { seq: item.seq } }));
      }
    }

    await db.meta.put({ key: 'lastSync', value: new Date().toISOString() });

    // Purge des entrées "done" de plus de 24h
    const cutoff = Date.now() - 24 * 3600 * 1000;
    const done = await db.outbox.where('status').equals('done').toArray();
    await Promise.all(
      done.filter((r) => new Date(r.createdAt).getTime() < cutoff).map((r) => db.outbox.delete(r.seq))
    );

    notifyPending();
    // Invite les pages à recharger depuis le serveur (on est en ligne : cachedGet rafraîchira le cache)
    window.dispatchEvent(new CustomEvent('offline-cache-updated', { detail: { reason: 'sync' } }));
  } finally {
    draining = false;
  }
}

/** Relance les écritures en conflit (après résolution manuelle par l'utilisateur). */
export async function retryFailed() {
  await db.outbox.where('status').equals('failed').modify({ status: 'pending' });
  await drainOutbox();
}

/** Abandonne une écriture en conflit (l'utilisateur choisit de la supprimer). */
export async function dismissFailed(seq) {
  await db.outbox.delete(seq);
  notifyPending();
}

/** Branche le rejeu automatique : au retour de connexion + au démarrage si en ligne. */
export function initAutoSync() {
  window.addEventListener('online', () => { drainOutbox(); });
  if (isOnline()) {
    // léger délai pour laisser l'app s'initialiser
    setTimeout(() => drainOutbox(), 1500);
  }
}
