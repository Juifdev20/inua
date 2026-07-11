// 🧭 Registre des instances axios vivantes.
// L'outbox stocke seulement un `instanceTag` (Dexie ne peut pas sérialiser une
// instance axios). Au moment du rejeu, on résout le tag vers l'instance réelle.
// Chaque service enregistre son instance au chargement via registerInstance().

const registry = new Map();

export const registerInstance = (tag, axiosInstance) => {
  if (tag && axiosInstance) registry.set(tag, axiosInstance);
};

export const resolveInstance = (tag) => {
  const inst = registry.get(tag);
  if (!inst) {
    throw new Error(`[offline] Instance axios introuvable pour le tag "${tag}"`);
  }
  return inst;
};

export const hasInstance = (tag) => registry.has(tag);
