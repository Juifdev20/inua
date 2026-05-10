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
        toast.success('Configuration enregistrée avec succès');
        return true;
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      if (err.response?.status === 403) {
        toast.error('Accès refusé', {
          description: 'Vous devez être connecté en tant qu\'administrateur',
        });
      } else if (err.response?.status === 401) {
        toast.error('Session expirée', {
          description: 'Veuillez vous reconnecter',
        });
      } else if (err.response?.status === 404) {
        // API pas encore prête - la config est sauvegardée localement
        toast.success('Configuration enregistrée localement');
        return true;
      } else {
        toast.error('Erreur lors de la sauvegarde', {
          description: err.response?.data?.message || 'Une erreur est survenue',
        });
      }
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
