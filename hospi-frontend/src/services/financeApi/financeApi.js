import axios from 'axios';
import { BACKEND_URL } from '../../config/environment.js';

const API_BASE = `${BACKEND_URL}/api/finance`;

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// ★ CORRIGÉ : Ajouter /api dans le baseURL
const globalApi = axios.create({
  baseURL: `${BACKEND_URL}/api`,  // ← /api ajouté ici
  headers: { 'Content-Type': 'application/json' }
});

// Intercepteurs pour les 2 instances
[api, globalApi].forEach(instance => {
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    },
    (error) => Promise.reject(error)
  );
});

const financeApi = {

  // ═══════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════
  getDashboardStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  // ★ NOUVEAU : Dashboard complet avec stats par devise (CDF/USD)
  getFullDashboard: async () => {
    const response = await api.get('/dashboard');
    return response.data;
  },

  // ═══════════════════════════════════════
  // ADMISSIONS — CAISSE
  // ═══════════════════════════════════════
  getAdmissionsQueue: async (params = {}) => {
    const response = await api.get('/admissions/queue', { params });
    return response.data;
  },

  getAdmissionsStats: async () => {
    const response = await api.get('/admissions/stats');
    return response.data;
  },

  getAdmissionById: async (id) => {
    const response = await api.get(`/admissions/${id}`);
    return response.data;
  },

  payInvoice: async (id, paymentData) => {
    // Utiliser l'endpoint FinanceController - le baseURL contient déjà /api/finance
    const response = await api.post(`/pay/${id}`, {
      amountPaid: paymentData.amountPaid || 0,
      paymentMethod: paymentData.paymentMethod || 'ESPECES'
    });
    return response.data;
  },

  // ═══════════════════════════════════════
  // ★ MÉDECINS DISPONIBLES — CORRIGÉ
  // ═══════════════════════════════════════
  getAvailableDoctors: async () => {
    try {
      // ★ Appelle /api/v1/users/doctors (globalApi a baseURL = /api)
      const response = await globalApi.get('/v1/users/doctors');
      const data = response.data?.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching doctors:', error);
      return [];
    }
  },

  sendToDoctor: async (admissionId, data = {}) => {
    const response = await api.post(`/admissions/${admissionId}/send-to-doctor`, data);
    return response.data;
  },

  // ═══════════════════════════════════════
  // ARCHIVAGE DES ADMISSIONS
  // ═══════════════════════════════════════
  archiveAdmission: async (admissionId) => {
    // Utiliser l'endpoint de consultation existant
    const response = await globalApi.put(`/v1/consultations/${admissionId}/archive`);
    return response.data;
  },

  restoreAdmission: async (admissionId) => {
    // Pour l'instant, pas d'endpoint de restauration - on pourrait le créer si nécessaire
    throw new Error("Fonction de restauration non implémentée côté backend");
  },

  getArchivedAdmissions: async () => {
    // Pour l'instant, pas d'endpoint pour récupérer les archivés - on pourrait le créer si nécessaire
    throw new Error("Fonction de récupération des archivés non implémentée côté backend");
  },

  // ═══════════════════════════════════════
  // QUEUES PAR DÉPARTEMENT
  // ═══════════════════════════════════════
  getQueueByType: async (type) => {
    const response = await api.get(`/queues/${type}`);
    return response.data;
  },

  getPharmacyQueue: async () => {
    try {
      console.log('🔍 [DEBUG] Appel de getPharmacyQueue...');
      
      // 2. Appeler l'endpoint principal
      const response = await api.get('/prescription/pharmacy-invoices');
      console.log('🔍 [DEBUG] Données reçues de /prescription/pharmacy-invoices:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [DEBUG] Erreur getPharmacyQueue:', error.response?.status, error.response?.data);
      
      // Fallback: essayer l'ancien endpoint
      try {
        const response = await api.get('/queues/PHARMACY');
        console.log('🔄 [DEBUG] Fallback vers /queues/PHARMACY:', response.data);
        return response.data;
      } catch (fallbackError) {
        console.error('❌ [DEBUG] Erreur fallback aussi:', fallbackError.response?.status, fallbackError.response?.data);
        return [];
      }
    }
  },

  // ★ NOUVEAU : Récupérer les statistiques de la pharmacie (payées + non payées)
  getPharmacyStats: async () => {
    try {
      // Utiliser pharmacy/pending-payments pour avoir les stats réelles
      const response = await api.get('/pharmacy/pending-payments?page=0&size=1');
      const data = response.data;
      return {
        pendingCount: data.totalElements || 0,
        pendingAmount: 0, // Calculé si besoin
        totalCount: data.totalElements || 0,
        currency: 'USD'
      };
    } catch (error) {
      // Fallback silencieux
      return {
        pendingCount: 0,
        pendingAmount: 0,
        paidCount: 0,
        paidAmount: 0,
        totalCount: 0,
        totalAmount: 0,
        todayPaidAmount: 0,
        currency: 'USD'
      };
    }
  },

  getLaboratoryQueue: async () => {
    const response = await api.get('/queues/LABORATORY');
    return response.data;
  },

  getLaboratoryStats: async () => {
    // Utiliser all-lab-payments et calculer les stats côté client
    const response = await api.get('/all-lab-payments');
    const data = response.data;
    if (Array.isArray(data)) {
      const pending = data.filter(item => item.remainingAmount > 0);
      return {
        pendingCount: pending.length,
        totalPending: pending.reduce((sum, item) => sum + (item.remainingAmount || 0), 0)
      };
    }
    return { pendingCount: 0, totalPending: 0 };
  },

  // ★ NOUVEAU : Récupérer tous les paiements laboratoire (pour le sidebar)
  getAllLabPayments: async (date = null) => {
    const params = date ? { date } : {};
    const response = await api.get('/all-lab-payments', { params });
    return response.data;
  },

  // ═══════════════════════════════════════
  // FACTURES
  // ═══════════════════════════════════════
  getInvoices: async (filters = {}) => {
    const response = await api.get('/invoices', { params: filters });
    return response.data;
  },

  getInvoiceById: async (id) => {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  },

  // ═══════════════════════════════════════
  // SERVICES CRUD
  // ═══════════════════════════════════════
  getServices: async () => {
    const response = await api.get('/services');
    return response.data;
  },

  updateService: async (id, serviceData) => {
    const response = await api.put(`/services/${id}`, serviceData);
    return response.data;
  },

  createService: async (serviceData) => {
    const response = await api.post('/services', serviceData);
    return response.data;
  },

  deleteService: async (id) => {
    const response = await api.delete(`/services/${id}`);
    return response.data;
  },

  // ═══════════════════════════════════════
  // DÉPENSES
  // ═══════════════════════════════════════
  getExpenses: async (filters = {}) => {
    const params = {
      page: 0,
      size: 100, // Get more expenses to avoid pagination issues
      ...filters
    };
    const response = await api.get('/expenses', { params });
    // Handle ApiResponse wrapper - the actual data is in response.data.data
    return response.data?.data || response.data;
  },

  createExpense: async (expenseData) => {
    const response = await api.post('/expenses', expenseData);
    // Handle ApiResponse wrapper
    return response.data?.data || response.data;
  },

  updateExpense: async (id, expenseData) => {
    const response = await api.put(`/expenses/${id}`, expenseData);
    return response.data;
  },

  deleteExpense: async (id) => {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
  },

  // ★ NOUVEAU : Dépenses du jour depuis FinanceTransaction (achats médicaments inclus)
  getTodayTotalFromTransactions: async () => {
    const response = await globalApi.get('/finance/transactions/today-total');
    return response.data;
  },

  // ★ NOUVEAU : Liste des transactions en attente (achats pharmacie)
  getPendingTransactions: async () => {
    const response = await globalApi.get('/finance/transactions/en-attente');
    return response.data;
  },

  // ═══════════════════════════════════════
  // TARIFS
  // ═══════════════════════════════════════
  getTarifs: async () => {
    const response = await api.get('/tarifs');
    return response.data;
  },

  updateTarif: async (id, tarifData) => {
    const response = await api.put(`/tarifs/${id}`, tarifData);
    return response.data;
  },

  createTarif: async (tarifData) => {
    const response = await api.post('/tarifs', tarifData);
    return response.data;
  },

  deleteTarif: async (id) => {
    const response = await api.delete(`/tarifs/${id}`);
    return response.data;
  },

  getDailyRevenue: async (date) => {
    const response = await api.get('/daily-revenue', { params: { date } });
    return response.data;
  },

  // ═══════════════════════════════════════
  // ENTRÉES / REVENUES
  // ═══════════════════════════════════════
  getRevenues: async (filters = {}) => {
    const response = await api.get('/revenues', { params: filters });
    return response.data;
  },

  getRevenueById: async (id) => {
    const response = await api.get(`/revenues/${id}`);
    return response.data;
  },

  createRevenue: async (revenueData) => {
    const response = await api.post('/revenues', revenueData);
    return response.data;
  },

  createRevenueFromInvoice: async (invoiceId) => {
    const response = await api.post(`/revenues/from-invoice/${invoiceId}`);
    return response.data;
  },

  updateRevenue: async (id, revenueData) => {
    const response = await api.put(`/revenues/${id}`, revenueData);
    return response.data;
  },

  deleteRevenue: async (id) => {
    const response = await api.delete(`/revenues/${id}`);
    return response.data;
  },

  getRevenueStats: async () => {
    const response = await api.get('/revenues/stats');
    return response.data;
  },

  getRevenueDashboard: async () => {
    const response = await api.get('/revenues/dashboard-summary');
    return response.data;
  },

  getRecentRevenues: async (limit = 10) => {
    const response = await api.get('/revenues/recent', { params: { limit } });
    return response.data;
  },

  getTodayRevenueTotal: async () => {
    const response = await api.get('/revenues/today-total');
    return response.data;
  },

  getMonthlyRevenueTotal: async () => {
    const response = await api.get('/revenues/monthly-total');
    return response.data;
  },

  // ═══════════════════════════════════════
  // CASHFLOW - Vue consolidée
  // ═══════════════════════════════════════
  getCashFlowSummary: async (params = {}) => {
    const response = await api.get('/cashflow/summary', { params });
    return response.data;
  },

  getCashBalance: async () => {
    const response = await api.get('/cashflow/balance');
    return response.data;
  },

  // ═══════════════════════════════════════
  // CASH BALANCE - Soldes par catégorie
  // ═══════════════════════════════════════
  getBalancesBySource: async () => {
    const response = await api.get('/cash-balance/by-source');
    return response.data?.balances || response.data;
  },

  getBalanceBySource: async (source) => {
    const response = await api.get(`/cash-balance/source/${source}`);
    return response.data;
  },

  getTotalCashBalance: async () => {
    const response = await api.get('/cash-balance/total');
    return response.data;
  },

  getCashFlowSummary: async () => {
    const response = await api.get('/cash-balance/summary');
    return response.data;
  },

  checkBalance: async (source, amount) => {
    const response = await api.get('/cash-balance/check-balance', {
      params: { source, amount }
    });
    return response.data;
  },

  // ═══════════════════════════════════════
  // LIVRE DE CAISSE
  // ═══════════════════════════════════════
  /**
   * Vue Synthétique - Totaux journaliers
   * Retourne les entrées/sorties et solde par jour
   */
  getLivreCaisseSynthese: async (dateDebut, dateFin) => {
    const response = await api.get('/livre-caisse/synthese', {
      params: { dateDebut, dateFin }
    });
    return response.data;
  },

  /**
   * Vue Détaillée - Transaction par transaction
   * Avec pagination et calcul du solde cumulatif
   */
  getLivreCaisseDetails: async (dateDebut, dateFin, page = 0, size = 50) => {
    const response = await api.get('/livre-caisse/details', {
      params: { dateDebut, dateFin, page, size }
    });
    return response.data;
  },

  /**
   * Transactions par caissier (pour clôture individuelle)
   */
  getLivreCaisseByCaissier: async (caissierId, dateDebut, dateFin) => {
    const response = await api.get(`/livre-caisse/details/caissier/${caissierId}`, {
      params: { dateDebut, dateFin }
    });
    return response.data;
  },

  /**
   * Export Excel du livre de caisse (2 onglets: Synthèse + Détails)
   */
  exportLivreCaisseExcel: async (dateDebut, dateFin, caissierId = null) => {
    const params = { dateDebut, dateFin };
    if (caissierId) params.caissierId = caissierId;
    
    const response = await api.get('/livre-caisse/export/excel', {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  /**
   * Export PDF du livre de caisse
   */
  exportLivreCaissePDF: async (dateDebut, dateFin, caissierId = null) => {
    const params = { dateDebut, dateFin };
    if (caissierId) params.caissierId = caissierId;
    
    const response = await api.get('/livre-caisse/export/pdf', {
      params,
      responseType: 'blob'
    });
    return response.data;
  }
};

export default financeApi;
