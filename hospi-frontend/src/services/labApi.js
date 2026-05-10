import api from './api';

const API = '/lab';

export const labApi = {
  // Récupérer la file d'attente du laboratoire
  getQueue: () => api.get(`${API}/queue`),

  // Récupérer une boîte spécifique
  getBox: (consultationId) => api.get(`${API}/box/${consultationId}`),

  // Démarrer le traitement d'une boîte
  startProcessing: (consultationId, technicianName) => 
    api.post(`${API}/box/${consultationId}/start?technicianName=${technicianName}`),

  // Saisir un résultat d'examen
  enterResult: (examId, resultData) => 
    api.post(`${API}/exam/${examId}/result`, resultData),

  // Finaliser une boîte (tous les résultats saisis)
  finalizeBox: (consultationId) => 
    api.post(`${API}/box/${consultationId}/finalize`),

  // Médecin consulte les résultats
  viewResults: (consultationId) => 
    api.post(`${API}/box/${consultationId}/view-results`)
};
