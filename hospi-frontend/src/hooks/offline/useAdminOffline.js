/**
 * Hook offline pour le module Admin
 * Couvre : utilisateurs, services, configuration hôpital
 */
import { useCallback } from 'react';
import { useOfflineSync } from '../useOfflineSync';
import { offlineHelpers } from '../../db/offlineDB';
import api from '../../services/api';

export function useAdminOffline() {
  const { execute, isOnline } = useOfflineSync();

  // ─── UTILISATEURS ───
  const getUsers = useCallback(async () => {
    return execute({
      apiCall: () => api.get('/v1/admin/users'),
      tableName: 'users',
      action: 'read',
    });
  }, [execute]);

  const getUserById = useCallback(async (id) => {
    return execute({
      apiCall: () => api.get(`/v1/admin/users/${id}`),
      tableName: 'users',
      action: 'read',
    });
  }, [execute]);

  const createUser = useCallback(async (data) => {
    return execute({
      apiCall: () => api.post('/v1/admin/users', data),
      tableName: 'users',
      localData: data,
      action: 'create',
    });
  }, [execute]);

  const updateUser = useCallback(async (id, data) => {
    return execute({
      apiCall: () => api.put(`/v1/admin/users/${id}`, data),
      tableName: 'users',
      localData: { ...data, id },
      action: 'update',
    });
  }, [execute]);

  // ─── SERVICES ───
  const getServices = useCallback(async () => {
    return execute({
      apiCall: () => api.get('/v1/admin/services'),
      tableName: 'services',
      action: 'read',
    });
  }, [execute]);

  const createService = useCallback(async (data) => {
    return execute({
      apiCall: () => api.post('/v1/admin/services', data),
      tableName: 'services',
      localData: data,
      action: 'create',
    });
  }, [execute]);

  const updateService = useCallback(async (id, data) => {
    return execute({
      apiCall: () => api.put(`/v1/admin/services/${id}`, data),
      tableName: 'services',
      localData: { ...data, id },
      action: 'update',
    });
  }, [execute]);

  // ─── CONFIG HÔPITAL ───
  const getHospitalConfig = useCallback(async () => {
    return execute({
      apiCall: () => api.get('/v1/admin/config'),
      tableName: 'hospitalConfig',
      action: 'read',
    });
  }, [execute]);

  const updateHospitalConfig = useCallback(async (data) => {
    return execute({
      apiCall: () => api.put('/v1/admin/config', data),
      tableName: 'hospitalConfig',
      localData: data,
      action: 'update',
    });
  }, [execute]);

  return {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    getServices,
    createService,
    updateService,
    getHospitalConfig,
    updateHospitalConfig,
    isOnline,
  };
}

export default useAdminOffline;
