import api from './api';

/**
 * API pour le flux Pharmacie-Finance
 * Gère les transactions entre pharmacie et finance
 */

const BASE_URL = '/finance/transactions';

export const pharmacieFinanceApi = {
  // ==================== PHARMACIE ====================
  
  /**
   * Achète des médicaments et crée automatiquement une transaction finance
   */
  acheterMedicament: (medicationId, data) => {
    return api.post(`/pharmacy/medications/${medicationId}/purchase`, data);
  },

  /**
   * Traite un retour fournisseur (débite stock + crée avoir)
   */
  retourFournisseur: (data) => {
    return api.post(`${BASE_URL}/retour-fournisseur`, data);
  },

  // ==================== FINANCE (Caissier) ====================

  /**
   * Liste des dépenses en attente de validation
   */
  getDepensesEnAttente: () => {
    return api.get(`${BASE_URL}/en-attente`);
  },

  /**
   * Liste des dettes fournisseurs
   */
  getDettesFournisseurs: () => {
    return api.get(`${BASE_URL}/dettes-fournisseurs`);
  },

  /**
   * Liste toutes les transactions
   */
  getAllTransactions: (page = 0, size = 20) => {
    return api.get(`${BASE_URL}?page=${page}&size=${size}`);
  },

  /**
   * Valide une dépense avec upload de scan (multipart/form-data)
   */
  validerDepense: (transactionId, formData) => {
    return api.post(
      `${BASE_URL}/${transactionId}/valider`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  },

  /**
   * Paie une dette fournisseur
   */
  payerDette: (transactionId, caisseId) => {
    return api.post(`${BASE_URL}/${transactionId}/payer?caisseId=${caisseId}`);
  },

  /**
   * Crée un avoir (correction) pour une transaction erronée
   */
  corrigerTransaction: (transactionId, motif) => {
    return api.post(`${BASE_URL}/${transactionId}/corriger`, {
      transactionOriginaleId: transactionId,
      motifCorrection: motif,
    });
  },

  /**
   * Récupère l'avoir lié à une transaction
   */
  getAvoir: (transactionId) => {
    return api.get(`${BASE_URL}/${transactionId}/avoir`);
  },

  // ==================== CAISSES ====================

  /**
   * Liste des caisses actives
   */
  getCaisses: () => {
    return api.get(`${BASE_URL}/caisses`);
  },
};

export default pharmacieFinanceApi;
