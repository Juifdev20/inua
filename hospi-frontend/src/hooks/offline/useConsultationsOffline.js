/**
 * Hook offline pour le module Doctor / Consultations
 */
import { useCallback } from 'react';
import { useOfflineSync } from '../useOfflineSync';
import { offlineDB, offlineHelpers } from '../../db/offlineDB';
import api from '../../services/api';

export function useConsultationsOffline() {
  const { execute, isOnline } = useOfflineSync();

  const getPatientConsultations = useCallback(async (patientId) => {
    return execute({
      apiCall: () => api.get(`/v1/consultations/patient/${patientId}`),
      tableName: 'consultations',
      action: 'read',
    });
  }, [execute]);

  const getConsultationById = useCallback(async (id) => {
    return execute({
      apiCall: () => api.get(`/v1/consultations/${id}`),
      tableName: 'consultations',
      action: 'read',
    });
  }, [execute]);

  const createConsultation = useCallback(async (data) => {
    return execute({
      apiCall: () => api.post('/v1/consultations', data),
      tableName: 'consultations',
      localData: data,
      action: 'create',
    });
  }, [execute]);

  const updateConsultation = useCallback(async (id, data) => {
    return execute({
      apiCall: () => api.put(`/v1/consultations/${id}`, data),
      tableName: 'consultations',
      localData: { ...data, id },
      action: 'update',
    });
  }, [execute]);

  const addVitalSigns = useCallback(async (consultationId, data) => {
    return execute({
      apiCall: () => api.post(`/v1/consultations/${consultationId}/vitals`, data),
      tableName: 'vitalSigns',
      localData: { ...data, consultationId },
      action: 'create',
    });
  }, [execute]);

  const addPrescription = useCallback(async (consultationId, data) => {
    return execute({
      apiCall: () => api.post(`/v1/consultations/${consultationId}/prescriptions`, data),
      tableName: 'prescriptions',
      localData: { ...data, consultationId },
      action: 'create',
    });
  }, [execute]);

  const requestExam = useCallback(async (consultationId, data) => {
    return execute({
      apiCall: () => api.post(`/v1/consultations/${consultationId}/exams`, data),
      tableName: 'examRequests',
      localData: { ...data, consultationId },
      action: 'create',
    });
  }, [execute]);

  return {
    getPatientConsultations,
    getConsultationById,
    createConsultation,
    updateConsultation,
    addVitalSigns,
    addPrescription,
    requestExam,
    isOnline,
  };
}

export default useConsultationsOffline;
