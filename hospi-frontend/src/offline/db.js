// 🗄️ Base de données locale (IndexedDB via Dexie) pour le mode hors-ligne.
// Contient : un OUTBOX (écritures en attente de synchronisation) + des caches
// de lecture par module (files, listes, catalogues). Aucune donnée sensible
// n'y est stockée au-delà de ce que l'utilisateur voit déjà à l'écran.
import Dexie from 'dexie';

export const db = new Dexie('inuaOffline');

// ⚠️ Migrations ADDITIVES uniquement (ne jamais re-cléer un store existant).
db.version(1).stores({
  // ++seq = auto-incrément LOCAL, sert uniquement à l'ordre FIFO du rejeu.
  // Ce n'est PAS un id serveur.
  outbox:            '++seq, idempotencyKey, status, moduleTag, createdAt',

  // Caches de lecture : { cacheKey, data (response.data brut), updatedAt }
  receptionPatients: 'cacheKey, updatedAt',
  financeQueues:     'cacheKey, updatedAt',
  labQueue:          'cacheKey, updatedAt',
  pharmacyQueue:     'cacheKey, updatedAt',
  catalogs:          'cacheKey, updatedAt',

  // Divers : { key, value } — ex. lastSync
  meta:              'key',
});

export default db;
