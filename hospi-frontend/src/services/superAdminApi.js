import axios from 'axios';
import { BACKEND_URL } from '../config/environment.js';

const API_BASE = `${BACKEND_URL}/api/superadmin`;

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

const superAdminApi = {

  // ═══════════════════════════════════════
  // AUDIT & SÉCURITÉ
  // ═══════════════════════════════════════

  getAuditLogs: async (filters = {}, page = 0, size = 50) => {
    const params = { ...filters, page, size };
    const response = await api.get('/audit/logs', { params });
    return response.data?.data || response.data;
  },

  getSecurityStats: async () => {
    const response = await api.get('/audit/stats');
    return response.data?.data || response.data;
  },

  getSecurityAlerts: async () => {
    const response = await api.get('/audit/alerts');
    return response.data?.data || response.data;
  },

  // ═══════════════════════════════════════
  // GESTION UTILISATEURS
  // ═══════════════════════════════════════

  getAllUsers: async () => {
    const response = await api.get('/users');
    return response.data?.data || response.data;
  },

  toggleUserActive: async (userId, activate) => {
    const response = await api.post(`/users/${userId}/toggle-active`, { activate });
    return response.data?.data || response.data;
  },

  forcePasswordReset: async (userId) => {
    const response = await api.post(`/users/${userId}/reset-password`);
    return response.data?.data || response.data;
  },

  // ═══════════════════════════════════════
  // TIMELINE — Graphique Recharts
  // ═══════════════════════════════════════

  getTimeline: async (hours = 24) => {
    const response = await api.get('/audit/timeline', { params: { hours } });
    return response.data?.data || response.data;
  },

  // ═══════════════════════════════════════
  // SESSIONS ACTIVES
  // ═══════════════════════════════════════

  getActiveSessions: async () => {
    const response = await api.get('/sessions/active');
    return response.data?.data || response.data;
  },

  forceLogout: async (userId) => {
    const response = await api.post(`/users/${userId}/force-logout`);
    return response.data?.data || response.data;
  },

  // ═══════════════════════════════════════
  // MODE MAINTENANCE
  // ═══════════════════════════════════════

  getMaintenanceStatus: async () => {
    const response = await api.get('/system/maintenance');
    return response.data?.data || response.data;
  },

  setMaintenanceStatus: async (enabled, message = '') => {
    const response = await api.post('/system/maintenance', { enabled, message });
    return response.data?.data || response.data;
  },

  // ═══════════════════════════════════════
  // GESTION DES SUPER ADMINS
  // ═══════════════════════════════════════

  getSuperAdmins: async () => {
    const response = await api.get('/admins');
    return response.data?.data || response.data;
  },

  promoteToSuperAdmin: async (userId) => {
    const response = await api.post(`/admins/${userId}/promote`);
    return response.data?.data || response.data;
  },

  // ═══════════════════════════════════════
  // APPAREILS CONNECTÉS (Device Fingerprint)
  // ═══════════════════════════════════════

  getDevices: async () => {
    const response = await api.get('/devices');
    return response.data?.data || response.data;
  },

  blockDevice: async (deviceId) => {
    const response = await api.post(`/devices/${deviceId}/block`, { reason: 'Bloqué par Super Admin' });
    return response.data?.data || response.data;
  },

  unblockDevice: async (deviceId) => {
    const response = await api.post(`/devices/${deviceId}/unblock`);
    return response.data?.data || response.data;
  },

  // ═══════════════════════════════════════
  // SYSTÈME
  // ═══════════════════════════════════════

  getSystemHealth: async () => {
    const response = await api.get('/system/health');
    return response.data?.data || response.data;
  },

  // ═══════════════════════════════════════
  // GESTION DES HOPITAUX (MULTI-TENANT)
  // ═══════════════════════════════════════

  getHospitals: async () => {
    const response = await api.get('/hospitals');
    return response.data?.data || response.data;
  },

  getHospital: async (id) => {
    const response = await api.get(`/hospitals/${id}`);
    return response.data?.data || response.data;
  },

  createHospital: async (data) => {
    const response = await api.post('/hospitals', data);
    return response.data?.data || response.data;
  },

  updateHospital: async (id, data) => {
    const response = await api.put(`/hospitals/${id}`, data);
    return response.data?.data || response.data;
  },

  toggleHospital: async (id) => {
    const response = await api.patch(`/hospitals/${id}/toggle-status`);
    return response.data?.data || response.data;
  },

  deleteHospital: async (id) => {
    const response = await api.delete(`/hospitals/${id}`);
    return response.data?.data || response.data;
  },

  provisionAdmin: async (hospitalId, data) => {
    const response = await api.post(`/hospitals/${hospitalId}/provision-admin`, data);
    return response.data?.data || response.data;
  },

  resendCredentials: async (hospitalId) => {
    const response = await api.post(`/hospitals/${hospitalId}/resend-credentials`);
    return response.data?.data || response.data;
  },

  // ═══════════════════════════════════════
  // DEMANDES D'INSCRIPTION D'HÔPITAUX (workflow d'approbation)
  // ═══════════════════════════════════════

  getPendingHospitals: async () => {
    const response = await api.get('/hospitals/pending');
    return response.data?.data || response.data;
  },

  approveHospital: async (hospitalId) => {
    const response = await api.post(`/hospitals/${hospitalId}/approve`);
    return response.data?.data || response.data;
  },

  rejectHospital: async (hospitalId, reason = '') => {
    const response = await api.post(`/hospitals/${hospitalId}/reject`, { reason });
    return response.data?.data || response.data;
  },

  // ═══════════════════════════════════════
  // ABONNEMENTS — TARIFS & PAIEMENTS
  // ═══════════════════════════════════════

  getSubscriptionSettings: async () => {
    const response = await api.get('/subscription-settings');
    return response.data?.data || response.data;
  },

  updateSubscriptionSettings: async (data) => {
    const response = await api.put('/subscription-settings', data);
    return response.data?.data || response.data;
  },

  getPendingPayments: async () => {
    const response = await api.get('/payments/pending');
    return response.data?.data || response.data;
  },

  confirmPayment: async (paymentId) => {
    const response = await api.post(`/payments/${paymentId}/confirm`);
    return response.data?.data || response.data;
  },

  rejectPayment: async (paymentId, reason = '') => {
    const response = await api.post(`/payments/${paymentId}/reject`, { reason });
    return response.data?.data || response.data;
  },

  // ═══════════════════════════════════════
  // PERFORMANCE DASHBOARD
  // ═══════════════════════════════════════

  getPerformanceMetrics: async () => {
    const response = await api.get('/metrics');
    return response.data?.data || response.data;
  },

  // ═══════════════════════════════════════
  // GESTION DES EMAILS
  // ═══════════════════════════════════════

  getEmailLogs: async (page = 0, size = 50) => {
    const response = await api.get('/emails', { params: { page, size } });
    return response.data?.data || response.data;
  },

  getEmailStats: async () => {
    const response = await api.get('/emails/stats');
    return response.data?.data || response.data;
  },

  retryFailedEmails: async () => {
    const response = await api.post('/emails/retry');
    return response.data?.data || response.data;
  },

  testSmtp: async (to) => {
    const response = await api.post('/emails/test', { to });
    return response.data?.data || response.data;
  },

  clearOldEmailLogs: async () => {
    const response = await api.delete('/emails/clear-old');
    return response.data?.data || response.data;
  },

  // ═══════════════════════════════════════
  // BACKUP & RESTAURATION
  // ═══════════════════════════════════════

  triggerBackup: async () => {
    const response = await api.post('/backup/trigger');
    return response.data?.data || response.data;
  },

  getBackupHistory: async () => {
    const response = await api.get('/backup/history');
    return response.data?.data || response.data;
  },

  getBackupStats: async () => {
    const response = await api.get('/backup/stats');
    return response.data?.data || response.data;
  }

};

export default superAdminApi;
