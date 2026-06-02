/**
 * Hook offline pour le module Pharmacie
 */
import { useCallback } from 'react';
import { useOfflineSync } from '../useOfflineSync';
import { offlineHelpers } from '../../db/offlineDB';
import api from '../../services/api';

export function usePharmacyOffline() {
  const { execute, isOnline } = useOfflineSync();

  const getMedicines = useCallback(async () => {
    return execute({
      apiCall: () => api.get('/v1/pharmacie/medicaments'),
      tableName: 'medicines',
      action: 'read',
    });
  }, [execute]);

  const getMedicineById = useCallback(async (id) => {
    return execute({
      apiCall: () => api.get(`/v1/pharmacie/medicaments/${id}`),
      tableName: 'medicines',
      action: 'read',
    });
  }, [execute]);

  const createSale = useCallback(async (data) => {
    return execute({
      apiCall: () => api.post('/v1/pharmacie/ventes', data),
      tableName: 'pharmacySales',
      localData: data,
      action: 'create',
    });
  }, [execute]);

  const getSales = useCallback(async () => {
    return execute({
      apiCall: () => api.get('/v1/pharmacie/ventes'),
      tableName: 'pharmacySales',
      action: 'read',
    });
  }, [execute]);

  const updateStock = useCallback(async (medicineId, quantity) => {
    return execute({
      apiCall: () => api.patch(`/v1/pharmacie/medicaments/${medicineId}/stock`, { quantity }),
      tableName: 'medicines',
      localData: { id: medicineId, stockQuantity: quantity },
      action: 'update',
    });
  }, [execute]);

  const addInventoryMovement = useCallback(async (data) => {
    return execute({
      apiCall: () => api.post('/v1/pharmacie/mouvements', data),
      tableName: 'inventoryMovements',
      localData: data,
      action: 'create',
    });
  }, [execute]);

  const searchMedicines = useCallback(async (query) => {
    if (!navigator.onLine) {
      const all = await offlineHelpers.getLocal('medicines');
      const filtered = all.filter(m =>
        m.name?.toLowerCase().includes(query.toLowerCase()) ||
        m.category?.toLowerCase().includes(query.toLowerCase())
      );
      return { success: true, data: filtered, source: 'offline' };
    }
    return execute({
      apiCall: () => api.get(`/v1/pharmacie/medicaments/search?q=${encodeURIComponent(query)}`),
      tableName: 'medicines',
      action: 'read',
    });
  }, [execute]);

  return {
    getMedicines,
    getMedicineById,
    createSale,
    getSales,
    updateStock,
    addInventoryMovement,
    searchMedicines,
    isOnline,
  };
}

export default usePharmacyOffline;
