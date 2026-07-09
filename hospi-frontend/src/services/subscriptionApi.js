import axios from 'axios';
import { BACKEND_URL } from '../config/environment.js';

// Facturation de l'hôpital (admin authentifié)
const api = axios.create({
  baseURL: `${BACKEND_URL}/api/billing`,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

const subscriptionApi = {
  /** Tarifs (par plan, mensuel/annuel). */
  getPricing: async () => {
    const r = await api.get('/pricing');
    return r.data?.data || r.data;
  },

  /** État de l'abonnement de mon hôpital (statut, jours restants, dates). */
  getSubscription: async () => {
    const r = await api.get('/subscription');
    return r.data?.data || r.data;
  },

  /** Historique des paiements de mon hôpital. */
  getPayments: async () => {
    const r = await api.get('/payments');
    return r.data?.data || r.data;
  },

  /** Payer / renouveler (simulation). */
  pay: async (data) => {
    const r = await api.post('/pay', data);
    return r.data?.data || r.data;
  }
};

export default subscriptionApi;
