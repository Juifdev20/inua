import axios from 'axios';
import { BACKEND_URL } from '../config/environment.js';

// Endpoints publics — aucune authentification requise
const api = axios.create({
  baseURL: `${BACKEND_URL}/api/public`,
  headers: { 'Content-Type': 'application/json' }
});

const publicApi = {
  /**
   * Demande publique d'inscription d'un hôpital.
   * L'établissement est créé en attente (PENDING) et les superadmins sont notifiés.
   */
  registerHospital: async (data) => {
    const response = await api.post('/hospital-registration', data);
    return response.data;
  },

  /** Liste publique des hôpitaux actifs (pour l'inscription des patients). */
  getActiveHospitals: async () => {
    const response = await api.get('/hospitals');
    return response.data?.data || response.data;
  },

  /** Tarifs publics des abonnements (par plan, mensuel/annuel) + devise + jours d'essai. */
  getPricing: async () => {
    const response = await api.get('/subscription-pricing');
    return response.data?.data || response.data;
  },

  /** Soumettre un paiement d'abonnement (simulation) pour un hôpital fraîchement inscrit. */
  submitPayment: async (data) => {
    const response = await api.post('/subscription-payment', data);
    return response.data?.data || response.data;
  }
};

export default publicApi;
