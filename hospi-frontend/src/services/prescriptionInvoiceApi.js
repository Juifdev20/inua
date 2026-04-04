import axios from 'axios';

const API_URL = 'http://localhost:8080/api/v1/finance/prescription';

const prescriptionInvoiceApi = {
  // Créer une facture à partir d'une prescription
  createInvoice: async (prescriptionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/create-invoice`, null, {
        params: { prescriptionId },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
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
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/process-payment/${invoiceId}`, null, {
        params: { paymentMethod },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
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
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erreur récupération factures:', error);
      throw error;
    }
  },

  // Obtenir les statistiques de la pharmacie
  getPharmacyStats: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erreur statistiques:', error);
      throw error;
    }
  }
};

export default prescriptionInvoiceApi;
