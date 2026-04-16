import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
const API_URL = `${BACKEND_URL}/api`;
const STORAGE_KEY = 'inua_afya_hospital_config';

// Helper pour obtenir les headers avec authentification
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

/**
 * Service pour gérer la configuration hospitalière
 * Utilise localStorage comme fallback si l'API n'est pas disponible
 */
export const hospitalConfigService = {
  /**
   * Récupère la configuration de l'hôpital
   */
  getConfig: async () => {
    // Essayer d'abord l'API
    try {
      const response = await axios.get(`${API_URL}/hospital-config`, getAuthHeaders());
      // Sauvegarder en local pour fallback
      localStorage.setItem(STORAGE_KEY, JSON.stringify(response.data.data));
      return response.data.data;
    } catch (error) {
      // Si 404 ou erreur, utiliser localStorage
      console.log('API non disponible, utilisation du stockage local');
      const localConfig = localStorage.getItem(STORAGE_KEY);
      if (localConfig) {
        return JSON.parse(localConfig);
      }
      // Retourner null pour utiliser les valeurs par défaut
      return null;
    }
  },

  /**
   * Met à jour la configuration (Admin uniquement)
   */
  updateConfig: async (configData) => {
    // Sauvegarder toujours en localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configData));
    
    // Essayer l'API si disponible
    try {
      const response = await axios.put(`${API_URL}/hospital-config`, configData, getAuthHeaders());
      return response.data;
    } catch (error) {
      // Si 404, simuler un succès avec les données locales
      if (error.response?.status === 404) {
        console.log('API non disponible, sauvegarde locale uniquement');
        return { success: true, data: configData, message: 'Configuration sauvegardée localement' };
      }
      throw error;
    }
  },

  /**
   * Initialise la configuration par défaut (Admin uniquement)
   */
  initializeDefault: async () => {
    localStorage.removeItem(STORAGE_KEY);
    try {
      const response = await axios.post(`${API_URL}/hospital-config/initialize`, {}, getAuthHeaders());
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: true, message: 'Configuration réinitialisée localement' };
      }
      throw error;
    }
  },
  
  /**
   * Réinitialise la configuration locale
   */
  resetLocalConfig: () => {
    localStorage.removeItem(STORAGE_KEY);
  }
};

// Configuration par défaut locale (fallback)
export const defaultHospitalConfig = {
  hospitalName: 'INUA AFIA',
  hospitalCode: 'HOSP-001',
  hospitalLogoUrl: null,
  ministryName: 'MINISTERE DE LA SANTE',
  departmentName: 'DEPARTEMENT DE LA SANTE PUBLIQUE',
  zoneName: 'ZONE RURALE DE BENI',
  region: 'NORD-KIVU',
  city: 'BENI',
  country: 'RÉPUBLIQUE DÉMOCRATIQUE DU CONGO',
  phoneNumber: '+243 000 000 000',
  email: 'contact@inuafia.com',
  website: 'www.inuafia.com',
  address: 'Boulevard du 30 Juin, Beni, RDC',
  postalCode: '0001',
  taxId: 'TAX-000000',
  registrationNumber: 'REG-000000',
  licenseNumber: 'LIC-000000',
  headerTitle: 'INUA AFIA',
  headerSubtitle: 'Système de Gestion Hospitalière',
  footerText: '© INUA AFIA - Tous droits réservés',
  documentWatermark: null,
  primaryColor: '#059669',
  secondaryColor: '#065f46',
  currencyCode: 'USD',
  currencySymbol: '$',
  language: 'fr',
  timezone: 'Africa/Kinshasa',
  dateFormat: 'dd/MM/yyyy',
  enableLogoOnDocuments: true,
  enableWatermark: false,
  enableSignature: true
};

export default hospitalConfigService;
