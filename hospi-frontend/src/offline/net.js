// 🌐 Détection réseau + reconnaissance des erreurs "hors-ligne".
// Réutilise navigator.onLine et les events window online/offline.

export const isOnline = () => navigator.onLine;

/**
 * Vrai si l'erreur axios correspond à une absence de connexion.
 *
 * ⚠️ POINT CRITIQUE : le service worker (public/sw.js) renvoie un FAUX 503 JSON
 * `{ error, offline: true }` quand une requête /api échoue hors-ligne. axios le
 * voit alors comme une *réponse* (status 503), PAS comme une erreur réseau.
 * On doit donc traiter ce cas comme "offline", sinon les GET hors-ligne
 * lèveraient une erreur au lieu de retomber sur le cache Dexie, et les écritures
 * apparaîtraient en 4xx/5xx au lieu d'être mises en file.
 */
export const isNetworkError = (error) => {
  if (!error) return false;
  // Faux 503 injecté par le service worker
  const resp = error.response;
  if (resp && resp.status === 503) {
    const data = resp.data;
    if (data && (data.offline === true || data.offline === 'true')) return true;
  }
  // Vraie erreur réseau (pas de réponse du serveur)
  if (!resp) {
    const msg = (error.message || '').toLowerCase();
    if (error.code === 'ECONNABORTED') return true; // timeout
    if (msg.includes('network') || msg.includes('timeout') || msg.includes('failed to fetch')) return true;
    return true; // pas de réponse => réseau
  }
  return false;
};

/** Abonne un callback aux changements de connectivité. Retourne une fonction de désabonnement. */
export const onConnectivityChange = (cb) => {
  const on = () => cb(true);
  const off = () => cb(false);
  window.addEventListener('online', on);
  window.addEventListener('offline', off);
  return () => {
    window.removeEventListener('online', on);
    window.removeEventListener('offline', off);
  };
};
