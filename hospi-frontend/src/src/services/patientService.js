import api, { validateId } from './api';

/**
 * 🛠️ UTILITAIRE : Convertit le Base64 de la caméra en fichier binaire (Blob)
 * Indispensable car ton Java attend un MultipartFile.
 */
const dataURLtoBlob = (dataurl) => {
  if (!dataurl || !dataurl.includes(',')) return null;
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

/**
 * 🛠️ UTILITAIRE : Transforme l'objet patient en FormData
 */
const prepareFormData = (patientData) => {
  // Si c'est déjà un FormData, on ne touche à rien
  if (patientData instanceof FormData) return patientData;

  const formData = new FormData();
  
  Object.keys(patientData).forEach(key => {
    // Cas spécial : la photo envoyée par la caméra (Base64)
    if (key === 'photoUrl' && patientData[key]?.startsWith('data:image')) {
      const imageBlob = dataURLtoBlob(patientData[key]);
      if (imageBlob) {
        formData.append('photo', imageBlob, 'patient_photo.jpg');
      }
    } 
    // On ajoute les autres champs (sauf null/undefined)
    else if (patientData[key] !== null && patientData[key] !== undefined) {
      formData.append(key, patientData[key]);
    }
  });

  return formData;
};

export const patientService = {
  // 1. Liste paginée
  getPatients: async (page = 0, size = 10) => {
    try {
      const response = await api.get('/v1/patients', { params: { page, size } });
      const data = response.data?.data || response.data;
      return data?.content || data || [];
    } catch (error) {
      throw error.response?.data || { message: error.message };
    }
  },

  // 2. CRÉATION (Utilise maintenant FormData)
  createPatient: async (patientData) => {
    try {
      const formData = prepareFormData(patientData);
      const response = await api.post('/v1/patients', formData);
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Erreur création:", error);
      throw error.response?.data || { message: "Erreur lors de la création" };
    }
  },

  // 3. MISE À JOUR (Utilise aussi FormData pour supporter la photo)
  updatePatient: async (id, patientData) => {
    try {
      // ✅ Validation de l'ID
      const validId = validateId(id, 'updatePatient');
      console.log(`📡 Appel API: PUT /v1/patients/${validId}`);
      
      const formData = prepareFormData(patientData);
      const response = await api.put(`/v1/patients/${validId}`, formData);
      return response.data?.data || response.data;
    } catch (error) {
      throw error.response?.data || { message: "Erreur lors de la mise à jour" };
    }
  },

  // 4. Recherche
  searchPatients: async (query) => {
    try {
      const response = await api.get('/v1/patients/search', { params: { query } });
      const data = response.data?.data || response.data;
      return data?.content || data || [];
    } catch (error) {
      throw error.response?.data || { message: "Erreur de recherche" };
    }
  },

  // 5. Récupération par ID
  getPatientById: async (id) => {
    try {
      // ✅ Validation de l'ID
      const validId = validateId(id, 'getPatientById');
      console.log(`📡 Appel API: GET /v1/patients/${validId}`);
      
      const response = await api.get(`/v1/patients/${validId}`);
      return response.data?.data || response.data;
    } catch (error) {
      throw error.response?.data || { message: "Patient introuvable" };
    }
  }
};

export default patientService;
