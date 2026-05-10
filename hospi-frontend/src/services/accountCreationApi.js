import api from '../api/axios.js';

/**
 * ★ SERVICE DE CRÉATION AUTOMATIQUE DE COMPTES
 */
const accountCreationApi = {

  /**
   * Créer un compte staff (Admin uniquement)
   * Retourne les identifiants générés
   */
  createStaffAccount: async (userData) => {
    const response = await api.post('/account-creation/staff', userData);
    return response.data;
  },

  /**
   * Créer un compte patient (Réception ou Admin)
   * @param patientId ID du patient existant
   */
  createPatientAccount: async (patientId) => {
    const response = await api.post(`/account-creation/patient/${patientId}`);
    return response.data;
  },

  /**
   * Vérifier si un username existe déjà
   */
  checkUsernameAvailability: async (username) => {
    const response = await api.get('/account-creation/check-username', {
      params: { username }
    });
    return response.data;
  },

  /**
   * Prévisualiser le username qui sera généré
   */
  previewUsername: async (firstName, lastName) => {
    const response = await api.get('/account-creation/preview-username', {
      params: { firstName, lastName }
    });
    return response.data;
  },

  /**
   * Vérifier si l'utilisateur doit changer son mot de passe
   */
  getMustChangeStatus: async () => {
    const response = await api.get('/password/must-change-status');
    return response.data;
  },

  /**
   * Changer le mot de passe (obligatoire au premier login)
   */
  forcePasswordChange: async (newPassword, confirmPassword) => {
    const response = await api.post('/password/force-change', {
      newPassword,
      confirmPassword
    });
    return response.data;
  },

  /**
   * Changer le mot de passe (volontaire)
   */
  changePassword: async (oldPassword, newPassword, confirmPassword) => {
    const response = await api.post('/password/change', {
      oldPassword,
      newPassword,
      confirmPassword
    });
    return response.data;
  },

  /**
   * ★ ENVOYER LES CREDENTIALS PAR EMAIL
   * Envoie un email avec les identifiants de connexion
   */
  sendCredentialsEmail: async (emailData) => {
    const response = await api.post('/email/send-credentials', emailData);
    return response.data;
  },

  /**
   * ★ TESTER LA CONNEXION EMAIL
   */
  testEmailConnection: async (to) => {
    const response = await api.post('/email/test', { to });
    return response.data;
  }
};

export default accountCreationApi;
