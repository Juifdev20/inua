import api from './api';

/**
 * Service de gestion des entreprises abonnées (Slice 1 — module Abonnés).
 * Toutes les routes sont protégées par ROLE_ADMIN côté backend.
 */
const unwrap = (resp) => resp?.data?.data ?? resp?.data ?? null;

export const companyService = {
  // ============================== ENTREPRISES ==============================

  /** Liste des entreprises, avec filtre optionnel par statut ACTIVE | SUSPENDED | EXPIRED. */
  getAll: async (status) => {
    const params = status ? { status } : {};
    const resp = await api.get('/companies', { params });
    return unwrap(resp) || [];
  },

  getActive: async () => {
    const resp = await api.get('/companies', { params: { status: 'ACTIVE' } });
    return unwrap(resp) || [];
  },

  getById: async (id) => {
    const resp = await api.get(`/companies/${id}`);
    return unwrap(resp);
  },

  create: async (payload) => {
    const resp = await api.post('/companies', payload);
    return unwrap(resp);
  },

  update: async (id, payload) => {
    const resp = await api.put(`/companies/${id}`, payload);
    return unwrap(resp);
  },

  remove: async (id) => {
    const resp = await api.delete(`/companies/${id}`);
    return unwrap(resp);
  },

  // ============================== AGENTS ==============================

  getEmployees: async (companyId) => {
    const resp = await api.get(`/companies/${companyId}/employees`);
    return unwrap(resp) || [];
  },

  addEmployee: async (companyId, payload) => {
    const resp = await api.post(`/companies/${companyId}/employees`, payload);
    return unwrap(resp);
  },

  removeEmployee: async (companyId, employeeId) => {
    const resp = await api.delete(`/companies/${companyId}/employees/${employeeId}`);
    return unwrap(resp);
  },

  /** Récupère l'agent actif d'un patient (null si patient non abonné). */
  findEmployeeByPatient: async (patientId) => {
    if (!patientId) return null;
    try {
      const resp = await api.get(`/companies/employees/by-patient/${patientId}`);
      return unwrap(resp);
    } catch (_) {
      return null;
    }
  },

  // ============================== RAPPORTS & PDF ==============================

  downloadConsumptionSheet: async (companyId, month) => {
    const resp = await api.get(`/companies/${companyId}/consumption-sheet`, {
      params: { month },
      responseType: 'blob',
    });
    const blob = new Blob([resp.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `feuille-consommation-${companyId}-${month}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  getStats: async (companyId) => {
    const resp = await api.get(`/companies/${companyId}/stats`);
    return unwrap(resp);
  },

  getAllStats: async () => {
    const resp = await api.get('/companies/stats/all');
    return unwrap(resp);
  },
};

export default companyService;
