import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

/**
 * Service pour gérer la configuration hospitalière
 */
export const hospitalConfigService = {
  /**
   * Récupère la configuration de l'hôpital
   */
  getConfig: async () => {
    const response = await axios.get(`${API_URL}/hospital-config`);
    return response.data.data;
  },

  /**
   * Met à jour la configuration (Admin uniquement)
   */
  updateConfig: async (configData) => {
    const response = await axios.put(`${API_URL}/hospital-config`, configData);
    return response.data;
  },

  /**
   * Initialise la configuration par défaut (Admin uniquement)
   */
  initializeDefault: async () => {
    const response = await axios.post(`${API_URL}/hospital-config/initialize`);
    return response.data;
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
