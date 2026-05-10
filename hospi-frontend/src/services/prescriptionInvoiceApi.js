import api from '../api/axios.js';

const prescriptionInvoiceApi = {
  // Créer une facture à partir d'une prescription
  createInvoice: async (prescriptionId) => {
    try {
      const response = await api.post(`/api/v1/finance/prescription/create-invoice`, null, {
        params: { prescriptionId }
      });
      return response.data;
    } catch (error) {
      console.error('Erreur création facture:', error);
      throw error;
    }
  },

  // Traiter le paiement d'une facture
  processPayment: async (invoiceId, paymentMethod) => {
    try {
      const response = await api.post(`/api/v1/finance/prescription/process-payment/${invoiceId}`, null, {
        params: { paymentMethod }
      });
      return response.data;
    } catch (error) {
      console.error('Erreur paiement:', error);
      throw error;
    }
  },

  // Lister les factures en attente
  getPendingInvoices: async () => {
    try {
      const response = await api.get(`/api/v1/finance/prescription/pending`);
      return response.data;
    } catch (error) {
      console.error('Erreur récupération factures:', error);
      throw error;
    }
  },

  // Obtenir les statistiques de la pharmacie
  getPharmacyStats: async () => {
    try {
      const response = await api.get(`/api/v1/finance/prescription/stats`);
      return response.data;
    } catch (error) {
      console.error('Erreur statistiques:', error);
      throw error;
    }
  }
};

export default prescriptionInvoiceApi;
