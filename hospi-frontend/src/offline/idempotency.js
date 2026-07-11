// 🔑 Génération de clés d'idempotence (uuid v4) pour que le rejeu d'une écriture
// déjà appliquée côté serveur ne l'exécute pas une seconde fois (ex: double paiement).

export const uuid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Repli
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default uuid;
