import axios from './axios';

const API_URL = '/api/medications';

export const medicationAPI = {
  // Récupérer tous les médicaments
  getMedications: async () => {
    const response = await axios.get(`${API_URL}/inventory`);
    return response.data;
  },

  // Ajouter un médicament à l'inventaire
  addMedication: async (medicationData) => {
    const response = await axios.post(`${API_URL}/inventory/add`, medicationData);
    return response.data;
  },

  // Récupérer tous les médicaments de l'inventaire
  getInventory: async () => {
    const response = await axios.get(`${API_URL}/inventory`);
    return response.data;
  },

  // Mettre à jour un médicament
  updateMedication: async (id, medicationData) => {
    console.log('🔄 API updateMedication - ID:', id);
    console.log('🔄 API updateMedication - Data:', medicationData);
    console.log('🔄 API updateMedication - URL:', `${API_URL}/inventory/${id}`);
    
    try {
      const response = await axios.put(`${API_URL}/inventory/${id}`, medicationData);
      console.log('✅ API updateMedication - Response status:', response.status);
      console.log('✅ API updateMedication - Response data:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ API updateMedication - Error:', error);
      console.error('❌ API updateMedication - Error response:', error.response?.data);
      console.error('❌ API updateMedication - Full error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
      throw error;
    }
  },

  // Supprimer un médicament
  deleteMedication: async (id) => {
    const response = await axios.delete(`${API_URL}/inventory/${id}`);
    return response.data;
  },

  // Récupérer un médicament par ID
  getMedicationById: async (id) => {
    const response = await axios.get(`${API_URL}/inventory/${id}`);
    return response.data;
  }
};
