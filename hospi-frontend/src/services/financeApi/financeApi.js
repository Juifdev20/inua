import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
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

  // ═══════════════════════════════════════
  // ADMISSIONS — CAISSE
  // ═══════════════════════════════════════
  getAdmissionsQueue: async (params = {}) => {
    // Utiliser le nouvel endpoint qui filtre correctement les archivés
    const response = await globalApi.get('/v1/reception/admissions/queue-fixed', { params });
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
      
      // 0. Afficher les infos de l'utilisateur connecté
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Décoder le token JWT pour voir les rôles
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('👤 [DEBUG] Utilisateur connecté:', payload);
          console.log('🔑 [DEBUG] Rôles bruts:', payload.roles || payload.authorities || 'Non spécifiés');
          
          // Afficher les rôles formatés pour Spring Security
          const roles = payload.roles || payload.authorities || [];
          console.log('🔑 [DEBUG] Rôles formatés pour Spring:', roles.map(r => r.startsWith('ROLE_') ? r : 'ROLE_' + r));
        } catch (e) {
          console.log('⚠️ [DEBUG] Impossible de décoder le token:', e.message);
        }
      } else {
        console.log('❌ [DEBUG] Aucun token trouvé dans localStorage');
      }
      
      // 1. Tester l'endpoint de test
      try {
        const testResponse = await api.get('/prescription/test');
        console.log('✅ [DEBUG] Endpoint test fonctionne:', testResponse);
      } catch (testError) {
        console.error('❌ [DEBUG] Endpoint test échoue:', testError.response?.status, testError.response?.data);
      }
      
      // 1.5. Tester l'endpoint de debug des rôles
      try {
        const debugResponse = await api.get('/prescription/debug-roles');
        console.log('🔍 [DEBUG] Rôles côté backend:', debugResponse.data);
      } catch (debugError) {
        console.error('❌ [DEBUG] Endpoint debug-roles échoue:', debugError.response?.status, debugError.response?.data);
      }
      
      // 2. Appeler l'endpoint principal
      const response = await api.get('/prescription/pharmacy-invoices');
      console.log('🔍 [DEBUG] Données reçues de /prescription/pharmacy-invoices:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [DEBUG] Erreur getPharmacyQueue:', error.response?.status, error.response?.data);
      console.error('❌ [DEBUG] Message d\'erreur complet:', error.response?.data?.message);
      
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

  getPharmacyStats: async () => {
    const response = await api.get('/pharmacy-invoices/stats');
    return response.data;
  },

  getLaboratoryQueue: async () => {
    const response = await api.get('/queues/LABORATORY');
    return response.data;
  },

  getLaboratoryStats: async () => {
    const response = await api.get('/queues/LABORATORY/stats');
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
    const response = await api.get('/expenses', { params: filters });
    return response.data;
  },

  createExpense: async (expenseData) => {
    const response = await api.post('/expenses', expenseData);
    return response.data;
  },

  updateExpense: async (id, expenseData) => {
    const response = await api.put(`/expenses/${id}`, expenseData);
    return response.data;
  },

  deleteExpense: async (id) => {
    const response = await api.delete(`/expenses/${id}`);
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

  getDailyRevenue: async (date) => {
    const response = await api.get('/daily-revenue', { params: { date } });
    return response.data;
  }
};

export default financeApi;
