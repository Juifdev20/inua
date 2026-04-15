import { useState, useEffect, useCallback } from 'react';
import { hospitalConfigService, defaultHospitalConfig } from '../services/hospitalConfigService';
import { toast } from 'sonner';

/**
 * Hook pour récupérer et utiliser la configuration hospitalière
 * @returns {Object} La configuration hospitalière et les fonctions associées
 */
export const useHospitalConfig = () => {
  const [config, setConfig] = useState(defaultHospitalConfig);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await hospitalConfigService.getConfig();
      if (data) {
        setConfig({ ...defaultHospitalConfig, ...data });
      }
    } catch (err) {
      console.error('Erreur lors du chargement de la config:', err);
      setError(err);
      // Garder les valeurs par défaut en cas d'erreur
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConfig = useCallback(async (newConfig) => {
    try {
      const response = await hospitalConfigService.updateConfig(newConfig);
      if (response.success) {
        setConfig({ ...defaultHospitalConfig, ...response.data });
        toast.success('Configuration mise à jour avec succès');
        return true;
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      toast.error('Erreur lors de la mise à jour de la configuration');
      return false;
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    loading,
    error,
    refreshConfig: fetchConfig,
    updateConfig
  };
};

export default useHospitalConfig;
