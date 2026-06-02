/**
 * Hook offline pour le module Laboratoire
 */
import { useCallback } from 'react';
import { useOfflineSync } from '../useOfflineSync';
import { offlineHelpers } from '../../db/offlineDB';
import api from '../../services/api';

export function useLabOffline() {
  const { execute, isOnline } = useOfflineSync();

  const getLabExams = useCallback(async (patientId) => {
    return execute({
      apiCall: () => api.get(`/v1/lab/exams/patient/${patientId}`),
      tableName: 'labExams',
      action: 'read',
    });
  }, [execute]);

  const getLabExamById = useCallback(async (id) => {
    return execute({
      apiCall: () => api.get(`/v1/lab/exams/${id}`),
      tableName: 'labExams',
      action: 'read',
    });
  }, [execute]);

  const createLabExam = useCallback(async (data) => {
    return execute({
      apiCall: () => api.post('/v1/lab/exams', data),
      tableName: 'labExams',
      localData: data,
      action: 'create',
    });
  }, [execute]);

  const updateLabResult = useCallback(async (id, data) => {
    return execute({
      apiCall: () => api.put(`/v1/lab/exams/${id}/results`, data),
      tableName: 'labResults',
      localData: { ...data, examId: id },
      action: 'update',
    });
  }, [execute]);

  const getPendingExams = useCallback(async () => {
    if (!navigator.onLine) {
      const all = await offlineHelpers.getLocal('labExams');
      const pending = all.filter(e => e.status === 'EN_ATTENTE' || e.status === 'PENDING');
      return { success: true, data: pending, source: 'offline' };
    }
    return execute({
      apiCall: () => api.get('/v1/lab/exams/pending'),
      tableName: 'labExams',
      action: 'read',
    });
  }, [execute]);

  return {
    getLabExams,
    getLabExamById,
    createLabExam,
    updateLabResult,
    getPendingExams,
    isOnline,
  };
}

export default useLabOffline;
