/**
 * Hook offline pour le module Patient / Reception
 * Gère patients et admissions avec fallback IndexedDB
 */
import { useCallback } from 'react';
import { useOfflineSync } from '../useOfflineSync';
import { offlineDB, offlineHelpers } from '../../db/offlineDB';
import { patientService } from '../../services/patientService';

export function usePatientsOffline() {
  const { execute, isOnline } = useOfflineSync();

  const getPatients = useCallback(async (page = 0, size = 10) => {
    return execute({
      apiCall: () => patientService.getPatients(page, size),
      tableName: 'patients',
      action: 'read',
    });
  }, [execute]);

  const getPatientById = useCallback(async (id) => {
    return execute({
      apiCall: () => patientService.getPatientById(id),
      tableName: 'patients',
      action: 'read',
    });
  }, [execute]);

  const searchPatients = useCallback(async (query) => {
    if (!navigator.onLine) {
      // Recherche locale par nom ou téléphone
      const all = await offlineHelpers.getLocal('patients');
      const filtered = all.filter(p =>
        (p.firstName?.toLowerCase().includes(query.toLowerCase())) ||
        (p.lastName?.toLowerCase().includes(query.toLowerCase())) ||
        (p.phone?.includes(query)) ||
        (p.matricule?.toLowerCase().includes(query.toLowerCase()))
      );
      return { success: true, data: filtered, source: 'offline' };
    }
    return execute({
      apiCall: () => patientService.searchPatients(query),
      tableName: 'patients',
      action: 'read',
    });
  }, [execute]);

  const createPatient = useCallback(async (patientData) => {
    return execute({
      apiCall: () => patientService.createPatient(patientData),
      tableName: 'patients',
      localData: patientData,
      action: 'create',
    });
  }, [execute]);

  const updatePatient = useCallback(async (id, patientData) => {
    return execute({
      apiCall: () => patientService.updatePatient(id, patientData),
      tableName: 'patients',
      localData: { ...patientData, id },
      action: 'update',
    });
  }, [execute]);

  const preloadPatients = useCallback(async () => {
    return execute({
      apiCall: () => patientService.getPatients(0, 500),
      tableName: 'patients',
      action: 'read',
    });
  }, [execute]);

  return {
    getPatients,
    getPatientById,
    searchPatients,
    createPatient,
    updatePatient,
    preloadPatients,
    isOnline,
  };
}

export default usePatientsOffline;
