/**
 * Hook offline pour le module Finance
 * Couvre : factures, paiements, dépenses, revenus, tarifs, consommation entreprise
 */
import { useCallback } from 'react';
import { useOfflineSync } from '../useOfflineSync';
import { offlineHelpers } from '../../db/offlineDB';
import api from '../../services/api';

export function useFinanceOffline() {
  const { execute, isOnline } = useOfflineSync();

  // ─── FACTURES ───
  const getInvoices = useCallback(async () => {
    return execute({
      apiCall: () => api.get('/v1/finance/factures'),
      tableName: 'invoices',
      action: 'read',
    });
  }, [execute]);

  const getInvoiceById = useCallback(async (id) => {
    return execute({
      apiCall: () => api.get(`/v1/finance/factures/${id}`),
      tableName: 'invoices',
      action: 'read',
    });
  }, [execute]);

  const createInvoice = useCallback(async (data) => {
    return execute({
      apiCall: () => api.post('/v1/finance/factures', data),
      tableName: 'invoices',
      localData: data,
      action: 'create',
    });
  }, [execute]);

  // ─── PAIEMENTS ───
  const createPayment = useCallback(async (data) => {
    return execute({
      apiCall: () => api.post('/v1/finance/paiements', data),
      tableName: 'payments',
      localData: data,
      action: 'create',
    });
  }, [execute]);

  const getPayments = useCallback(async () => {
    return execute({
      apiCall: () => api.get('/v1/finance/paiements'),
      tableName: 'payments',
      action: 'read',
    });
  }, [execute]);

  // ─── DÉPENSES ───
  const getExpenses = useCallback(async () => {
    return execute({
      apiCall: () => api.get('/v1/finance/depenses'),
      tableName: 'expenses',
      action: 'read',
    });
  }, [execute]);

  const createExpense = useCallback(async (data) => {
    return execute({
      apiCall: () => api.post('/v1/finance/depenses', data),
      tableName: 'expenses',
      localData: data,
      action: 'create',
    });
  }, [execute]);

  // ─── REVENUS ───
  const getRevenues = useCallback(async () => {
    return execute({
      apiCall: () => api.get('/v1/finance/revenues'),
      tableName: 'revenues',
      action: 'read',
    });
  }, [execute]);

  // ─── TARIFS ───
  const getTarifs = useCallback(async () => {
    return execute({
      apiCall: () => api.get('/v1/finance/tarifs'),
      tableName: 'tarifs',
      action: 'read',
    });
  }, [execute]);

  const createTarif = useCallback(async (data) => {
    return execute({
      apiCall: () => api.post('/v1/finance/tarifs', data),
      tableName: 'tarifs',
      localData: data,
      action: 'create',
    });
  }, [execute]);

  const updateTarif = useCallback(async (id, data) => {
    return execute({
      apiCall: () => api.put(`/v1/finance/tarifs/${id}`, data),
      tableName: 'tarifs',
      localData: { ...data, id },
      action: 'update',
    });
  }, [execute]);

  // ─── CONSOMMATION ENTREPRISE ───
  const getCompanyConsumptions = useCallback(async (companyId, month) => {
    return execute({
      apiCall: () => api.get(`/v1/finance/company-consumption/${companyId}`, { params: { month } }),
      tableName: 'companyConsumptions',
      action: 'read',
    });
  }, [execute]);

  return {
    getInvoices,
    getInvoiceById,
    createInvoice,
    createPayment,
    getPayments,
    getExpenses,
    createExpense,
    getRevenues,
    getTarifs,
    createTarif,
    updateTarif,
    getCompanyConsumptions,
    isOnline,
  };
}

export default useFinanceOffline;
