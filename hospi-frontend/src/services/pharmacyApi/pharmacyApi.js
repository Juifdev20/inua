import axios from 'axios';
import { cachedGet, queueableMutation, registerInstance } from '../../offline';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const API_BASE_URL = `${BACKEND_URL}/api/v1`;

// Create axios instance with interceptors
const pharmacyApi = axios.create({
  baseURL: `${API_BASE_URL}/pharmacy`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // ⏱️ Timeout global 30s pour éviter les blocages infinis
});

// 🔌 Enregistre l'instance pharmacie pour le rejeu hors-ligne
registerInstance('pharmacy', pharmacyApi);

// Request interceptor to add auth token
pharmacyApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // ✅ Même clé que AuthContext
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔍 [API DEBUG] Envoi de la requête:', {
        url: config.url,
        method: config.method,
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`,
        hasToken: !!token,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'none'
      });
    } else {
      console.warn('⚠️ [API DEBUG] Aucun token trouvé dans localStorage');
      // 💡 Redirection si pas de token pour les routes protégées
      if (config.url.includes('/prescriptions') || config.url.includes('/dashboard')) {
        window.location.href = '/login';
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
pharmacyApi.interceptors.response.use(
  (response) => {
    console.log('✅ [API DEBUG] Réponse réussie:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('❌ [API DEBUG] Erreur de réponse:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      fullURL: error.config ? `${error.config.baseURL}${error.config.url}` : 'unknown',
      hadToken: !!error.config?.headers?.Authorization
    });

    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      
      // 🔓 NE PAS rediriger pour la vérification du mot de passe de la fiche médicale
      const isPasswordVerification = requestUrl.includes('/consultations/') && 
                                     (requestUrl.includes('/verify') || requestUrl.includes('/check-access'));
      
      if (isPasswordVerification) {
        console.log('🔐 [API] Mot de passe incorrect pour la fiche médicale - pas de redirection');
        return Promise.reject(error);
      }
      
      console.log('🔄 [API DEBUG] Token expiré ou invalide, redirection vers login');
      localStorage.removeItem('token'); // ✅ Même clé
      window.location.href = '/login';
    }
    
    if (error.response?.status === 403) {
      console.error('🚫 [API DEBUG] Erreur 403 - Accès refusé:', {
        message: 'Vérifiez vos permissions ou rôles',
        currentToken: localStorage.getItem('token') ? 'exists' : 'missing', // ✅ Même clé
        tokenValid: localStorage.getItem('token') ? 'check expiration' : 'N/A'
      });
    }
    
    return Promise.reject(error);
  }
);

// Dashboard API
export const getDashboardStats = () => pharmacyApi.get('/dashboard/stats');

// Orders API
// 🚧 Création = nouvel id serveur → nécessite une connexion (exclu Phase 1 hors-ligne)
export const createOrder = (orderData) => {
  if (!navigator.onLine) return Promise.reject({ message: "La création d'une commande nécessite une connexion internet." });
  return pharmacyApi.post('/orders', orderData);
};
export const getOrderById = (id) => pharmacyApi.get(`/orders/${id}`);
export const getOrderByCode = (orderCode) => pharmacyApi.get(`/orders/code/${orderCode}`);
export const updateOrder = (id, orderData) => pharmacyApi.put(`/orders/${id}`, orderData);
export const getOrdersByStatus = async (status, page = 0, size = 20) => {
  const data = await cachedGet('pharmacyQueue', `orders:${status}:${page}:${size}`, () =>
    pharmacyApi.get('/orders', { params: { status, page, size } }).then((r) => r.data)
  );
  return { data };
};
export const searchOrders = (query, page = 0, size = 20) =>
  pharmacyApi.get('/orders/search', { params: { query, page, size } });
export const getPendingOrders = async () => {
  const data = await cachedGet('pharmacyQueue', 'pending', () => pharmacyApi.get('/orders/pending').then((r) => r.data));
  return { data };
};

// Order Status Management
export const updateOrderStatus = (id, status) => 
  pharmacyApi.put(`/orders/${id}/status`, { status });
// ✍️ Paiement d'une commande EXISTANTE → encaissable hors-ligne (rejeu idempotent)
export const processPayment = (id, paymentData) => {
  const { amountPaid, paymentMethod, allowPartialPayment } = paymentData;
  return queueableMutation({
    instanceTag: 'pharmacy',
    method: 'post',
    url: `/orders/${id}/pay`,
    body: { amountPaid, paymentMethod, allowPartialPayment },
    moduleTag: 'pharmacy',
    entityRef: { type: 'PharmacyOrder', id },
  });
};
// ✍️ Délivrance d'une commande EXISTANTE → hors-ligne OK
export const dispenseOrder = (id, pharmacistId) =>
  queueableMutation({
    instanceTag: 'pharmacy',
    method: 'post',
    url: `/orders/${id}/dispense`,
    body: { pharmacistId },
    moduleTag: 'pharmacy',
    entityRef: { type: 'PharmacyOrder', id },
  });
export const validateOrder = (id) => pharmacyApi.post(`/orders/${id}/validate`);
export const cancelOrder = (id, reason) => 
  pharmacyApi.post(`/orders/${id}/cancel`, { reason });

// Archive API
export const archiveOrder = (id) => 
  pharmacyApi.patch(`/orders/${id}/archive`, {});

// Order Items
export const addOrderItem = (orderId, itemData) => 
  pharmacyApi.post(`/orders/${orderId}/items`, itemData);
export const updateOrderItem = (itemId, itemData) => 
  pharmacyApi.put(`/orders/items/${itemId}`, itemData);
export const removeOrderItem = (itemId) => 
  pharmacyApi.delete(`/orders/items/${itemId}`);

// Stock Management
export const checkMedicationStock = (medicationId, requiredQuantity) => 
  pharmacyApi.get(`/stock/check/${medicationId}`, { params: { requiredQuantity } });
export const updateMedicationStock = (medicationId, quantityChange) => 
  pharmacyApi.put(`/stock/${medicationId}`, null, { params: { quantityChange } });
export const getStockAlerts = async () => {
  const data = await cachedGet('pharmacyQueue', 'stock-alerts', () => pharmacyApi.get('/stock/alerts').then((r) => r.data));
  return { data };
};
export const getUnpaidOrders = () => pharmacyApi.get('/orders/unpaid');
export const getSalesHistory = (params) => 
  pharmacyApi.get('/sales/history', { params });

// Prescriptions API
export const getPendingPrescriptions = async () => {
  const data = await cachedGet('pharmacyQueue', 'prescriptions-pending', () =>
    pharmacyApi.get('/prescriptions/pending').then((r) => r.data)
  );
  return { data };
};
export const getPaidPrescriptions = (params) => axios.get(`${BACKEND_URL}/api/prescriptions/paid`, { params, headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
export const convertPrescriptionToOrder = (prescriptionId, options = {}) => 
  pharmacyApi.post(`/prescriptions/${prescriptionId}/convert`, options);
export const getPrescriptionById = (prescriptionId) => 
  pharmacyApi.get(`/prescriptions/${prescriptionId}`);
export const validatePrescription = (prescriptionId, validationData) => 
  pharmacyApi.post(`/prescriptions/${prescriptionId}/validate`, validationData, { timeout: 15000 });
export const removePrescriptionItem = (itemId, reasonData) => 
  pharmacyApi.delete(`/prescriptions/items/${itemId}`, { data: reasonData });
export const updatePrescriptionItem = (itemId, itemData) => 
  pharmacyApi.put(`/prescriptions/items/${itemId}`, itemData);

// Medications API (Stock/Inventory)
export const getAllMedications = async (page = 0, size = 100) => {
  const data = await cachedGet('catalogs', `medications:${page}:${size}`, () =>
    pharmacyApi.get('/medications', { params: { page, size } }).then((r) => r.data)
  );
  return { data };
};
export const getMedicationById = (id) => pharmacyApi.get(`/medications/${id}`);
export const purchaseMedication = (medicationId, data) => 
  pharmacyApi.post(`/medications/${medicationId}/purchase`, data);

// Suppliers API
export const createSupplier = (supplierData) => pharmacyApi.post('/suppliers', supplierData);
export const getSupplierById = (id) => pharmacyApi.get(`/suppliers/${id}`);
export const updateSupplier = (id, supplierData) => pharmacyApi.put(`/suppliers/${id}`, supplierData);
export const getActiveSuppliers = () => pharmacyApi.get('/suppliers');
export const getSuppliers = () => pharmacyApi.get('/suppliers'); // Alias pour compatibilité
export const searchSuppliers = (query, page = 0, size = 20) => 
  pharmacyApi.get('/suppliers/search', { params: { query, page, size } });

// ═════════════════════════════════════════════════════════════════
// RAPPORTS PHARMACIE - Reports API
// ═════════════════════════════════════════════════════════════════

/**
 * Génère un rapport complet
 * @param {Object} params - { startDate, endDate, reportType }
 */
export const generateReport = (params) => 
  pharmacyApi.get('/reports/generate', { params });

/**
 * Récupère l'évolution des ventes pour le graphique
 * @param {Object} params - { startDate, endDate, groupBy }
 */
export const getSalesEvolution = (params) => 
  pharmacyApi.get('/reports/sales-evolution', { params });

/**
 * Récupère les top produits vendus
 * @param {Object} params - { startDate, endDate, limit }
 */
export const getTopProducts = (params) => 
  pharmacyApi.get('/reports/top-products', { params });

/**
 * Récupère la répartition des méthodes de paiement
 * @param {Object} params - { startDate, endDate }
 */
export const getPaymentMethods = (params) => 
  pharmacyApi.get('/reports/payment-methods', { params });

/**
 * Récupère l'analyse financière
 * @param {Object} params - { startDate, endDate }
 */
export const getFinancialAnalysis = (params) => 
  pharmacyApi.get('/reports/financial', { params });

// ═════════════════════════════════════════════════════════════════
// PARAMÈTRES UTILISATEUR - User Settings API
// ═════════════════════════════════════════════════════════════════

/**
 * Change le mot de passe de l'utilisateur connecté
 * @param {Object} passwordData - { currentPassword, newPassword }
 */
export const changePassword = (passwordData) => {
  return pharmacyApi.put('/profile/password', {
    currentPassword: passwordData.currentPassword,
    newPassword: passwordData.newPassword
  });
};

/**
 * Récupère les alertes de péremption des médicaments
 * @param {number} days - Nombre de jours avant péremption (default: 30)
 */
export const getExpiryAlerts = (days = 30) => 
  pharmacyApi.get('/inventory/expiry-alerts', { params: { days } });

export const sortirPerime = (medicationId) =>
  pharmacyApi.post(`/inventory/${medicationId}/sortir-perime`);

// ═════════════════════════════════════════════════════════════════
// 💰 FLUX PHARMACIE → FINANCE - Pharmacy Finance Integration
// ═════════════════════════════════════════════════════════════════

/**
 * Récupère les commandes en attente de paiement (pour la finance)
 * @param {number} page - Numéro de page
 * @param {number} size - Taille de la page
 */
export const getPendingPaymentsForFinance = (page = 0, size = 20) => {
  return axios.get(`${BACKEND_URL}/api/finance/pharmacy/pending-payments?page=${page}&size=${size}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    }
  });
};

/**
 * Confirme le paiement d'une commande pharmacie (appelé par la finance)
 * @param {number} orderId - ID de la commande
 * @param {Object} paymentData - { amountPaid, paymentMethod }
 */
export const confirmPharmacyPayment = (orderId, paymentData) => {
  return axios.post(`${BACKEND_URL}/api/finance/pharmacy/confirm-payment/${orderId}`, paymentData, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    }
  });
};

/**
 * Récupère les détails d'une commande pharmacie
 * @param {number} orderId - ID de la commande
 */
export const getPharmacyOrderDetails = (orderId) => {
  return axios.get(`${BACKEND_URL}/api/finance/pharmacy/order/${orderId}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    }
  });
};

export default pharmacyApi;
