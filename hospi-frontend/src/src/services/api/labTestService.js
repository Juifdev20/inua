import api from './api'; // Votre instance axios configurée

// Méthodes existantes (à adapter selon vos besoins)
export const getAllLabTests = (page = 0, size = 20) => {
  return api.get('/lab-tests', { params: { page, size } });
};

export const getLabTestById = (id) => {
  return api.get(`/lab-tests/${id}`);
};

export const getLabTestByCode = (code) => {
  return api.get(`/lab-tests/code/${code}`);
};

export const getLabTestsByPatient = (patientId, page = 0, size = 20) => {
  return api.get(`/lab-tests/patient/${patientId}`, { params: { page, size } });
};

export const getLabTestsByConsultation = (consultationId, page = 0, size = 20) => {
  return api.get(`/lab-tests/consultation/${consultationId}`, { params: { page, size } });
};

export const getLabTestsByStatus = (status, page = 0, size = 20) => {
  return api.get(`/lab-tests/status/${status}`, { params: { page, size } });
};

// 🚀 NOUVELLES MÉTHODES pour le workflow Finance → Labo
export const getQueue = (page = 0, size = 20) => {
  return api.get('/lab-tests/queue', { params: { page, size } });
};

export const addToQueue = (labTestData) => {
  return api.post('/lab-tests/queue', {
    ...labTestData,
    fromFinance: true // ✅ Automatiquement vrai pour les tests de la finance
  });
};

export const addResults = (id, results, interpretation) => {
  return api.post(`/lab-tests/${id}/results`, { results, interpretation });
};

export const updateStatus = (id, status) => {
  return api.patch(`/lab-tests/${id}/status`, { status });
};

export const deleteLabTest = (id) => {
  return api.delete(`/lab-tests/${id}`);
};

// Méthode utilitaire pour créer un test standard (non-finance)
export const createLabTest = (labTestData) => {
  return api.post('/lab-tests', {
    ...labTestData,
    fromFinance: false // ✅ Faux pour les tests standards
  });
};