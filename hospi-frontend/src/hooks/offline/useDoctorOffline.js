/**
 * Hook offline pour le module Doctor (Consultations + Prescriptions)
 */
import { useCallback } from 'react';
import { useOfflineSync } from '../useOfflineSync';
import { offlineDB, offlineHelpers } from '../../db/offlineDB';
import api from '../../services/api';

export function useDoctorOffline() {
  const { execute, isOnline } = useOfflineSync();

  // ─── CONSULTATIONS ────────────────────────────────────────────────
  const getConsultations = useCallback(async () => {
    return execute({
      apiCall: () => api.get('/api/v1/doctor/consultations'),
      tableName: 'consultations',
      action: 'read',
    });
  }, [execute]);

  const createConsultation = useCallback(async (data) => {
    return execute({
      apiCall: () => api.post('/api/v1/doctor/consultations', data),
      tableName: 'consultations',
      localData: { ...data, syncStatus: 'pending' },
      action: 'create',
    });
  }, [execute]);

  const updateConsultation = useCallback(async (id, data) => {
    return execute({
      apiCall: () => api.put(`/api/v1/doctor/consultations/${id}`, data),
      tableName: 'consultations',
      localData: { ...data, id, syncStatus: 'pending' },
      action: 'update',
    });
  }, [execute]);

  // ─── PRESCRIPTIONS ────────────────────────────────────────────────
  const createPrescription = useCallback(async (data) => {
    return execute({
      apiCall: () => api.post('/api/prescriptions/create', data),
      tableName: 'prescriptions',
      localData: { ...data, syncStatus: 'pending' },
      action: 'create',
    });
  }, [execute]);

  const getPrescriptions = useCallback(async (consultationId) => {
    return execute({
      apiCall: () => api.get(`/api/prescriptions/consultation/${consultationId}`),
      tableName: 'prescriptions',
      action: 'read',
    });
  }, [execute]);

  // ─── EXAMENS ────────────────────────────────────────────────────
  const getLabExams = useCallback(async (patientId) => {
    return execute({
      apiCall: () => api.get(`/api/v1/examens/patient/${patientId}`),
      tableName: 'labExams',
      action: 'read',
    });
  }, [execute]);

  return {
    isOnline,
    getConsultations,
    createConsultation,
    updateConsultation,
    createPrescription,
    getPrescriptions,
    getLabExams,
  };
}
