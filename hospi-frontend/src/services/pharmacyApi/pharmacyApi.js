import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const API_BASE_URL = `${BACKEND_URL}/api/v1`;

// Create axios instance with interceptors
const pharmacyApi = axios.create({
  baseURL: `${API_BASE_URL}/pharmacy`,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
export const createOrder = (orderData) => pharmacyApi.post('/orders', orderData);
export const getOrderById = (id) => pharmacyApi.get(`/orders/${id}`);
export const getOrderByCode = (orderCode) => pharmacyApi.get(`/orders/code/${orderCode}`);
export const updateOrder = (id, orderData) => pharmacyApi.put(`/orders/${id}`, orderData);
export const getOrdersByStatus = (status, page = 0, size = 20) => 
  pharmacyApi.get('/orders', { params: { status, page, size } });
export const searchOrders = (query, page = 0, size = 20) => 
  pharmacyApi.get('/orders/search', { params: { query, page, size } });
export const getPendingOrders = () => pharmacyApi.get('/orders/pending');

// Order Status Management
export const updateOrderStatus = (id, status) => 
  pharmacyApi.put(`/orders/${id}/status`, { status });
export const processPayment = (id, paymentData) => {
  const { amountPaid, paymentMethod, allowPartialPayment } = paymentData;
  return pharmacyApi.post(`/orders/${id}/pay`, { 
    amountPaid, 
    paymentMethod, 
    allowPartialPayment 
  });
};
export const dispenseOrder = (id, pharmacistId) => 
  pharmacyApi.post(`/orders/${id}/dispense`, { pharmacistId });
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
export const getStockAlerts = () => pharmacyApi.get('/stock/alerts');
export const getUnpaidOrders = () => pharmacyApi.get('/orders/unpaid');
export const getSalesHistory = (params) => 
  pharmacyApi.get('/sales/history', { params });

// Prescriptions API
export const getPendingPrescriptions = () => pharmacyApi.get('/prescriptions/pending');
export const convertPrescriptionToOrder = (prescriptionId, options = {}) => 
  pharmacyApi.post(`/prescriptions/${prescriptionId}/convert`, options);
export const getPrescriptionById = (prescriptionId) => 
  pharmacyApi.get(`/prescriptions/${prescriptionId}`);
export const validatePrescription = (prescriptionId, validationData) => 
  pharmacyApi.post(`/prescriptions/${prescriptionId}/validate`, validationData);
export const removePrescriptionItem = (itemId, reasonData) => 
  pharmacyApi.delete(`/prescriptions/items/${itemId}`, { data: reasonData });
export const updatePrescriptionItem = (itemId, itemData) => 
  pharmacyApi.put(`/prescriptions/items/${itemId}`, itemData);

// Suppliers API
export const createSupplier = (supplierData) => pharmacyApi.post('/suppliers', supplierData);
export const getSupplierById = (id) => pharmacyApi.get(`/suppliers/${id}`);
export const updateSupplier = (id, supplierData) => pharmacyApi.put(`/suppliers/${id}`, supplierData);
export const getActiveSuppliers = () => pharmacyApi.get('/suppliers');
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

export default pharmacyApi;
