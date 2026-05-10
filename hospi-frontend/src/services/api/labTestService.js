import api from './api'; // Votre instance axios configurée

/**
 * 🛠️ SERVICES DE RÉCUPÉRATION DE BASE
 */

export const getAllLabTests = (page = 0, size = 20) => {
  return api.get('/lab-tests', { params: { page, size } });
};

export const getLabTestById = (id) => {
  return api.get(`/lab-tests/${id}`);
};

export const getLabTestByCode = (code) => {
  return api.get(`/lab-tests/code/${code}`);
};

/**
 * 🔍 SERVICES DE FILTRAGE
 */

export const getLabTestsByPatient = (patientId, page = 0, size = 20) => {
  return api.get(`/lab-tests/patient/${patientId}`, { params: { page, size } });
};

export const getLabTestsByConsultation = (consultationId, page = 0, size = 20) => {
  return api.get(`/lab-tests/consultation/${consultationId}`, { params: { page, size } });
};

export const getLabTestsByStatus = (status, page = 0, size = 20) => {
  return api.get(`/lab-tests/status/${status}`, { params: { page, size } });
};

/**
 * 🚀 WORKFLOW FINANCE -> LABORATOIRE
 */

// ✅ C'est cette fonction que CaisseLaboratoire.jsx réclame
export const addToQueue = (labTestData) => {
  return api.post('/lab-tests/queue', labTestData);
};

// Récupérer la file d'attente pour le technicien
export const getQueue = (page = 0, size = 20, additionalParams = {}) => {
  return api.get('/lab-tests/queue', { 
    params: { page, size, ...additionalParams } 
  });
};

// Synchronisation après paiement
export const syncLabAfterPayment = (consultationId) => {
  return api.patch(`/lab-tests/consultation/${consultationId}/ready`, {
    status: 'READY_FOR_LAB'
  });
};

/**
 * 🧪 GESTION DES RÉSULTATS (SAISIE)
 */

// Récupérer les tests actifs d'un patient
export const getActiveTestsForPatient = (patientId) => {
  return api.get(`/lab-tests/patient/${patientId}/active-tests`);
};

// Soumission individuelle
export const submitResults = (id, results, interpretation = '') => {
  return api.post(`/lab-tests/${id}/results`, null, {
    params: { results, interpretation }
  });
};

// Alias pour compatibilité
export const addResults = submitResults;

// Soumission groupée (Batch)
export const submitBatchResults = (batchData) => {
  return api.post('/lab-tests/batch-results', batchData);
};

// Mise à jour de statut
export const updateStatus = (id, status) => {
  return api.patch(`/lab-tests/${id}/status`, { status: status.toUpperCase() });
};

/**
 * ⚙️ ADMINISTRATION
 */

export const deleteLabTest = (id) => {
  return api.delete(`/lab-tests/${id}`);
};

export const createLabTest = (labTestData) => {
  return api.post('/lab-tests', labTestData);
};