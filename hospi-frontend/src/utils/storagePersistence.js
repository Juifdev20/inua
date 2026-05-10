/**
 * 🔐 Utilitaire pour la persistance du stockage sur mobile
 * Les PWA sur mobile peuvent voir leur localStorage effacé par le système
 * lorsque l'app est en arrière-plan ou fermée
 */

/**
 * Demande la persistance du stockage au navigateur
 * Cela empêche le navigateur d'effacer automatiquement les données
 */
export const requestStoragePersistence = async () => {
  if (navigator.storage && navigator.storage.persist) {
    try {
      const isPersistent = await navigator.storage.persist();
      console.log(`[Storage] Persistance accordée: ${isPersistent}`);
      return isPersistent;
    } catch (error) {
      console.error('[Storage] Erreur lors de la demande de persistance:', error);
      return false;
    }
  }
  console.log('[Storage] API de persistance non disponible');
  return false;
};

/**
 * Vérifie si le stockage est persistant
 */
export const checkStoragePersistence = async () => {
  if (navigator.storage && navigator.storage.persisted) {
    try {
      const isPersisted = await navigator.storage.persisted();
      console.log(`[Storage] Stockage persistant: ${isPersisted}`);
      return isPersisted;
    } catch (error) {
      console.error('[Storage] Erreur lors de la vérification:', error);
      return false;
    }
  }
  return false;
};

/**
 * Estime l'espace de stockage disponible
 */
export const estimateStorage = async () => {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = (estimate.usage / 1024 / 1024).toFixed(2);
      const quota = (estimate.quota / 1024 / 1024).toFixed(2);
      const percentage = ((estimate.usage / estimate.quota) * 100).toFixed(2);
      
      console.log(`[Storage] Utilisation: ${usage}MB / ${quota}MB (${percentage}%)`);
      return estimate;
    } catch (error) {
      console.error('[Storage] Erreur estimation:', error);
      return null;
    }
  }
  return null;
};

/**
 * Initialise la persistance du stockage au démarrage de l'app
 * À appeler dans main.jsx ou App.jsx
 */
export const initStoragePersistence = async () => {
  console.log('[Storage] Initialisation de la persistance...');
  
  // Vérifier si déjà persistant
  const isPersisted = await checkStoragePersistence();
  
  if (!isPersisted) {
    // Demander la persistance
    const granted = await requestStoragePersistence();
    
    if (granted) {
      console.log('[Storage] ✅ Stockage maintenant persistant');
    } else {
      console.warn('[Storage] ⚠️ Stockage non persistant - les données peuvent être effacées');
    }
  }
  
  // Estimer l'espace (pour debug)
  await estimateStorage();
  
  return isPersisted;
};

/**
 * Sauvegarde sécurisée dans localStorage avec gestion d'erreur
 */
export const safeLocalStorageSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`[Storage] Erreur sauvegarde ${key}:`, error);
    
    // Si quota exceeded, essayer de libérer de l'espace
    if (error.name === 'QuotaExceededError') {
      console.warn('[Storage] Quota dépassé - tentative de nettoyage...');
      // Nettoyer les anciennes entrées non critiques
      const keysToRemove = ['oldCache', 'tempData', 'backupData'];
      keysToRemove.forEach(k => {
        if (localStorage.getItem(k)) {
          localStorage.removeItem(k);
        }
      });
      
      // Réessayer
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (retryError) {
        console.error('[Storage] Échec persistant:', retryError);
      }
    }
    return false;
  }
};

/**
 * Lecture sécurisée depuis localStorage
 */
export const safeLocalStorageGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`[Storage] Erreur lecture ${key}:`, error);
    return null;
  }
};
