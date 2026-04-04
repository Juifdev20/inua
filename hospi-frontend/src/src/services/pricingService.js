import api from '@/services/api';

/**
 * Service API pour la gestion des tarifs et de la facturation
 */

// 1. Récupère tous les prix actifs de la grille tarifaire
export const getAllPrices = async () => {
  try {
    const response = await api.get('/pricing/prices');
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des prix:', error);
    throw error;
  }
};

// 2. Calcule les montants pour une admission (NOUVELLE API CENTRALISÉE)
export const calculateAdmissionPrice = async (patientId, serviceId) => {
  try {
    const response = await api.get('/pricing/admission/calculate', {
      params: { patientId, serviceId }
    });
    return response.data;
  } catch (error) {
    console.error('Erreur lors du calcul des montants:', error);
    throw error;
  }
};

// 3. Vérifie le statut de la fiche patient
export const getPatientFicheStatus = async (patientId) => {
  try {
    const response = await api.get(`/pricing/patient/${patientId}/fiche-status`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la vérification du statut fiche:', error);
    throw error;
  }
};

// 4. Crée un nouveau prix
export const createPrice = async (priceData) => {
  try {
    const response = await api.post('/pricing/prices', priceData);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la création du prix:', error);
    throw error;
  }
};

// 5. Met à jour un prix existant
export const updatePrice = async (id, priceData) => {
  try {
    const response = await api.put(`/pricing/prices/${id}`, priceData);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du prix:', error);
    throw error;
  }
};

// 6. Initialise la grille tarifaire avec les valeurs par défaut
export const initializePrices = async () => {
  try {
    const response = await api.post('/pricing/prices/initialize');
    return response.data;
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des prix:', error);
    throw error;
  }
};

/**
 * EXPORT PAR DÉFAUT
 * Permet l'importation sous la forme : import pricingService from '...'
 */
const pricingService = {
  getAllPrices,
  calculateAdmissionPrice,
  getPatientFicheStatus,
  createPrice,
  updatePrice,
  initializePrices
};

export default pricingService;