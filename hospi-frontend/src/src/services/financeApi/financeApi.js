import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
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
    const response = await api.post(`/pay/${id}`, paymentData);
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
  // QUEUES PAR DÉPARTEMENT
  // ═══════════════════════════════════════
  getQueueByType: async (type) => {
    const response = await api.get(`/queues/${type}`);
    return response.data;
  },

  getPharmacyQueue: async () => {
    const response = await api.get('/queues/PHARMACY');
    return response.data;
  },

  getPharmacyStats: async () => {
    const response = await api.get('/queues/PHARMACY/stats');
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