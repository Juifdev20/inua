import api from './api';
import { cachedGet, queueableMutation, registerInstance } from '../offline';

const API = '/lab';

// 🔌 Enregistre l'instance axios du labo pour le rejeu hors-ligne
registerInstance('lab', api);

export const labApi = {
  // 📥 File d'attente labo — mise en cache (lisible hors-ligne)
  getQueue: async () => {
    const data = await cachedGet('labQueue', 'default', () => api.get(`${API}/queue`).then((r) => r.data));
    return { data };
  },

  // 📥 Boîte spécifique — mise en cache par consultation
  getBox: async (consultationId) => {
    const data = await cachedGet('labQueue', `box:${consultationId}`, () =>
      api.get(`${API}/box/${consultationId}`).then((r) => r.data)
    );
    return { data };
  },

  // ✍️ Démarrer le traitement (cible une consultation EXISTANTE) — file hors-ligne OK
  startProcessing: (consultationId, technicianName) =>
    queueableMutation({
      instanceTag: 'lab',
      method: 'post',
      url: `${API}/box/${consultationId}/start?technicianName=${encodeURIComponent(technicianName || '')}`,
      body: null,
      moduleTag: 'lab',
      entityRef: { type: 'Consultation', id: consultationId },
    }),

  // ✍️ Saisir un résultat (cible un examen EXISTANT) — file hors-ligne OK
  enterResult: (examId, resultData) =>
    queueableMutation({
      instanceTag: 'lab',
      method: 'post',
      url: `${API}/exam/${examId}/result`,
      body: resultData,
      moduleTag: 'lab',
      entityRef: { type: 'PrescribedExam', id: examId },
    }),

  // ✍️ Finaliser une boîte — file hors-ligne OK
  finalizeBox: (consultationId) =>
    queueableMutation({
      instanceTag: 'lab',
      method: 'post',
      url: `${API}/box/${consultationId}/finalize`,
      body: null,
      moduleTag: 'lab',
      entityRef: { type: 'Consultation', id: consultationId },
    }),

  // Médecin consulte les résultats (lecture/mutation légère) — reste en ligne
  viewResults: (consultationId) => api.post(`${API}/box/${consultationId}/view-results`),
};
