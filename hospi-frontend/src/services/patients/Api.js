import axios from 'axios';
import { validateId } from '../api';

// ✅ Base URL dynamique - fonctionne en local et en production
const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
const API_BASE = `${API_URL}/api/v1`;

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour injecter automatiquement le Token Bearer (Sécurité)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- SERVICES NOTIFICATIONS (Facebook Style) ---
export const getUserNotifications = (userId) => {
  const validId = validateId(userId, 'getUserNotifications');
  return api.get(`/notifications/user/${validId}`);
};

export const getUnreadNotificationsCount = (userId) => {
  const validId = validateId(userId, 'getUnreadNotificationsCount');
  return api.get(`/notifications/user/${validId}/unread-count`);
};

export const markNotificationAsRead = (id) => {
  const validId = validateId(id, 'markNotificationAsRead');
  return api.patch(`/notifications/${validId}/read`);
};

export const markAllNotificationsAsRead = (userId) => {
  const validId = validateId(userId, 'markAllNotificationsAsRead');
  return api.post(`/notifications/user/${validId}/mark-all-read`);
};

// --- SERVICES FACTURATION ---
export const getPatientBillingStats = () => api.get('/invoices/patient/stats');
export const getMyInvoices = (page = 0, size = 10) => 
  api.get(`/invoices/patient/my-invoices?page=${page}&size=${size}`);

// --- SERVICES PATIENT ---
export const updatePatientProfile = (id, data) => {
  const validId = validateId(id, 'updatePatientProfile');
  return api.put(`/admin/update-profile/${validId}`, data);
};

export const getPatientDetails = (id) => {
  const validId = validateId(id, 'getPatientDetails');
  return api.get(`/admin/all/${validId}`);
};

export const getMyProfile = () => api.get('/patients/me');

// --- SERVICES CONSULTATIONS ---
export const getConsultationById = (id) => {
  const validId = validateId(id, 'getConsultationById');
  console.log(`📡 Appel API: GET /consultations/${validId}`);
  return api.get(`/consultations/${validId}`);
};

// Récupère les consultations du patient connecté (pour son dashboard)
export const getMyConsultations = (identifier) => {
  const validId = validateId(identifier, 'getMyConsultations');
  return api.get(`/consultations/patient-current/${validId}`);
};

// Récupère l'historique filtré pour le docteur (Uniquement Terminé, Archivé, Annulé)
export const getDoctorConsultationHistory = (doctorId, page = 0, size = 10) => {
  const validId = validateId(doctorId, 'getDoctorConsultationHistory');
  return api.get(`/consultations/doctor/${validId}/history?page=${page}&size=${size}`);
};

// Récupère toutes les consultations d'un docteur (pour la liste centrale)
export const getDoctorConsultations = (doctorId, page = 0, size = 10) => {
  const validId = validateId(doctorId, 'getDoctorConsultations');
  return api.get(`/consultations/doctor/${validId}?page=${page}&size=${size}`);
};

/**
 * ✅ MÉTHODE POUR LA DÉCISION DU DOCTEUR - AVEC VALIDATION
 */
export const processDoctorDecision = (id, decisionData) => {
  const validId = validateId(id, 'processDoctorDecision');
  console.log(`📡 Appel API: POST /consultations/${validId}/decide`);
  return api.post(`/consultations/${validId}/decide`, decisionData);
};

export const updateConsultationStatus = (id, status) => {
  const validId = validateId(id, 'updateConsultationStatus');
  console.log(`📡 Appel API: PUT /consultations/${validId}/status avec status=${status}`);
  return api.put(`/consultations/${validId}/status`, null, { params: { status } });
};

export const bookConsultation = (data) => api.post('/consultations/book', data);

// Accepter un report de date (côté Patient)
export const acceptConsultationReschedule = (id) => {
  const validId = validateId(id, 'acceptConsultationReschedule');
  return api.post(`/consultations/${validId}/accept-reschedule`);
};

// --- SERVICES MÉDECINS ---
export const getAllDoctors = () => api.get('/doctors/all');

export default api;
