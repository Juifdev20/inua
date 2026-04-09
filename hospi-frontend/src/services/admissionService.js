import api, { validateId } from './api';

export const admissionService = {
  // --- SECTION : ADMISSIONS & RÉCEPTION ---

  getAdmissions: async (page = 0, size = 10) => {
    try {
      const response = await api.get('/v1/consultations', {
        params: { page, size }
      });
      return response.data?.data || response.data;
    } catch (error) {
      throw error.response?.data || { message: error.message };
    }
  },

  getAdmissionById: async (id) => {
    try {
      const validId = validateId(id, 'getAdmissionById');
      console.log(`📡 Appel API: GET /v1/consultations/${validId}`);
      const response = await api.get(`/v1/consultations/${validId}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ Erreur getAdmissionById:', error.message);
      throw error.response?.data || { message: error.message };
    }
  },

  /**
   * ★ Créer une nouvelle admission → Envoi en CAISSE (pas au médecin)
   * Le doctorId sera assigné par la caissière après paiement
   */
  createAdmission: async (admissionData) => {
    try {
      // ★ Construire le payload STRICTEMENT compatible avec le backend
      const payload = {
        patientId: admissionData.patientId,
        serviceId: admissionData.serviceId ? parseInt(admissionData.serviceId, 10) : null,

        // ★ Triage
        taille: admissionData.taille ? parseFloat(admissionData.taille) : 0,
        poids: admissionData.poids ? parseFloat(admissionData.poids) : 0,
        temperature: admissionData.temperature ? parseFloat(admissionData.temperature) : 0,
        tensionArterielle: (admissionData.tension || admissionData.tensionArterielle || "").trim(),
        reasonForVisit: (admissionData.motif || admissionData.reasonForVisit || "").trim(),
        symptomes: (admissionData.symptomes || "").trim(),

        // ★ Infos patient
        birthDate: admissionData.birthDate && admissionData.birthDate !== "" ? admissionData.birthDate : null,
        birthPlace: (admissionData.birthPlace || "").trim(),
        maritalStatus: admissionData.maritalStatus || "",
        religion: admissionData.religion || "",
        city: (admissionData.city || "").trim(),
        healthArea: (admissionData.healthArea || "").trim(),

        // ★ Tracking financier
        ficheAmountDue: admissionData.ficheAmountDue ? parseFloat(admissionData.ficheAmountDue) : 0,
        ficheAmountPaid: admissionData.ficheAmountPaid ? parseFloat(admissionData.ficheAmountPaid) : 0,
        consulAmountDue: admissionData.consulAmountDue ? parseFloat(admissionData.consulAmountDue) : 0,
        consulAmountPaid: admissionData.consulAmountPaid ? parseFloat(admissionData.consulAmountPaid) : 0,
      };

      // ★ DoctorId : inclure SEULEMENT si fourni (sinon le backend rejette null)
      if (admissionData.doctorId) {
        payload.doctorId = parseInt(admissionData.doctorId, 10);
      }

      // ★ Status : utiliser celui fourni ou le défaut backend
      if (admissionData.status) {
        payload.status = admissionData.status;
      }

      console.log('📡 createAdmission payload:', JSON.stringify(payload, null, 2));

      const response = await api.post('/v1/consultations', payload);
      return response.data?.data || response.data;
    } catch (error) {
      console.error("❌ Détails Erreur Backend:", error.response?.data || error);

      // ★ Log les erreurs de validation pour debug
      if (error.response?.data?.data) {
        console.error("📋 Champs en erreur:", JSON.stringify(error.response.data.data, null, 2));
      }

      throw error.response?.data || { message: error.message || "Erreur lors de la création de l'admission" };
    }
  },

  /**
   * Mettre à jour une admission existante
   */
  updateAdmission: async (id, admissionData) => {
    try {
      const validId = validateId(id, 'updateAdmission');
      console.log(`📡 Appel API: PUT /v1/consultations/${validId}`);

      const payload = {
        patientId: admissionData.patientId ? parseInt(admissionData.patientId, 10) : null,
        doctorId: admissionData.doctorId ? parseInt(admissionData.doctorId, 10) : null,
        serviceId: admissionData.serviceId ? parseInt(admissionData.serviceId, 10) : null,
        taille: admissionData.taille ? parseFloat(admissionData.taille) : 0,
        poids: admissionData.poids ? parseFloat(admissionData.poids) : 0,
        temperature: admissionData.temperature ? parseFloat(admissionData.temperature) : 0,
        tensionArterielle: (admissionData.tension || admissionData.tensionArterielle || "").trim(),
        reasonForVisit: (admissionData.motif || admissionData.reasonForVisit || "").trim(),
        symptomes: (admissionData.symptomes || "").trim(),
        examAmountPaid: admissionData.examAmountPaid ? parseFloat(admissionData.examAmountPaid) : 0,
      };
      if (admissionData.status || admissionData.statut) {
        payload.status = admissionData.status || admissionData.statut;
      }

      const response = await api.put(`/v1/consultations/${validId}`, payload);
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Détails Erreur Update Backend:", error.response?.data || error);
      throw error.response?.data || { message: error.message || "Erreur lors de la mise à jour" };
    }
  },

  deleteAdmission: async (id) => {
    try {
      const validId = validateId(id, 'deleteAdmission');
      console.log(`📡 Appel API: DELETE /v1/consultations/${validId}`);
      const response = await api.delete(`/v1/consultations/${validId}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Erreur suppression/archivage:", error.response?.status);
      throw error.response?.data || { message: error.message };
    }
  },

  updateAdmissionStatus: async (id, status) => {
    try {
      const validId = validateId(id, 'updateAdmissionStatus');
      console.log(`📡 Appel API: PUT /v1/consultations/${validId}/status avec status=${status}`);

      const statusMap = {
        'PENDING': 'EN_ATTENTE',
        'IN_PROGRESS': 'EN_COURS',
        'COMPLETED': 'TERMINE',
        'CANCELLED': 'ANNULE',
        'ARCHIVED': 'ARCHIVED',
        'ARRIVED': 'ARRIVED',
        'WAITING_PAYMENT': 'WAITING_PAYMENT',
        'PAID': 'PAID',
        'WITH_DOCTOR': 'WITH_DOCTOR',
        'RESTORE': 'ARRIVED'
      };

      const formattedStatus = statusMap[status] || status.toUpperCase();

      const response = await api.put(`/v1/consultations/${validId}/status`,
        { status: formattedStatus },
        { params: { status: formattedStatus } }
      );
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Erreur mise à jour statut:", error);
      throw error.response?.data || { message: error.message };
    }
  },

  updateStatus: async (id, status) => {
    return admissionService.updateAdmissionStatus(id, status);
  },

  // ★ NOUVEAU : Assigner un médecin (appelé par la caissière après paiement)
  assignDoctor: async (consultationId, doctorId) => {
    try {
      const validId = validateId(consultationId, 'assignDoctor');
      console.log(`📡 assignDoctor: PUT /v1/consultations/${validId} avec doctorId=${doctorId}`);

      const response = await api.put(`/v1/consultations/${validId}`, {
        doctorId: parseInt(doctorId, 10),
        status: 'WITH_DOCTOR'
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Erreur assignDoctor:", error);
      throw error.response?.data || { message: error.message };
    }
  },

  // --- SECTION : MÉDICAL & CONSULTATION ---

  startConsultation: async (id) => {
    try {
      const validId = validateId(id, 'startConsultation');
      const response = await api.patch(`/v1/consultations/${validId}/start`);
      return response.data?.data || response.data;
    } catch (error) {
      throw error.response?.data || { message: error.message };
    }
  },

  updateConsultation: async (id, consultationData) => {
    try {
      const validId = validateId(id, 'updateConsultation');
      const response = await api.put(`/v1/consultations/${validId}`, consultationData);
      return response.data?.data || response.data;
    } catch (error) {
      throw error.response?.data || { message: error.message };
    }
  },

  // --- SECTION : PATIENTS & RECHERCHE ---

  searchPatients: async (query) => {
    try {
      const endpoint = (query && query.trim() !== '') ? '/v1/patients/search' : '/v1/patients';
      const response = await api.get(endpoint, { params: query ? { query } : {} });
      const baseData = response.data?.data || response.data;
      const finalArray = baseData?.content || baseData;
      return Array.isArray(finalArray) ? finalArray : [];
    } catch (error) {
      throw error.response?.data || { message: "Erreur lors de la recherche" };
    }
  },

  getPatientById: async (id) => {
    try {
      const validId = validateId(id, 'getPatientById');
      const response = await api.get(`/v1/patients/${validId}`);
      return response.data?.data || response.data;
    } catch (error) {
      throw error.response?.data || { message: "Patient introuvable" };
    }
  },

  getPatientHistory: async (patientId) => {
    try {
      const validPatientId = validateId(patientId, 'getPatientHistory');
      const response = await api.get(`/v1/consultations/patient/${validPatientId}`);
      const baseData = response.data?.data || response.data;
      const finalData = baseData?.content || baseData;

      if (!Array.isArray(finalData)) return [];

      return finalData.map(c => ({
        ...c,
        id: c.id,
        date: c.createdAt || c.consultationDate,
        poids: c.poids || "--",
        taille: c.taille || "--",
        temperature: c.temperature || "--",
        tension: c.tensionArterielle || "--/--",
        motif: c.reasonForVisit || "--",
        status: c.status
      }));
    } catch (error) {
      console.error("Erreur historique:", error);
      return [];
    }
  },

  // --- SECTION : SYSTÈME ---

  getStatistics: async () => {
    try {
      const response = await api.get('/v1/consultations/statistics');
      return response.data?.data || response.data;
    } catch (error) {
      throw error.response?.data || { message: error.message };
    }
  },

  getDoctorsOnDuty: async () => {
    try {
      const response = await api.get('/v1/users/doctors');
      return response.data?.data || response.data;
    } catch (error) {
      return [];
    }
  },

  getAvailableServices: async () => {
    try {
      const response = await api.get('/v1/services');
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Erreur getAvailableServices:", error);
      throw error.response?.data || { message: error.message };
    }
  },

  getAvailableExams: async () => {
    try {
      return await admissionService.getAvailableServices();
    } catch (error) {
      console.error("Erreur getAvailableExams:", error);
      return [];
    }
  },

  // --- SECTION : PAIEMENTS & RÉCEPTION LABO ---

  getPendingConsultations: async () => {
    try {
      const response = await api.get('/v1/reception/consultations/pending');
      const data = response.data?.content || response.data || [];
      console.log("📡 getPendingConsultations - Réponse:", data);
      return data;
    } catch (error) {
      console.error("Erreur getPendingConsultations:", error);
      try {
        const fallbackResponse = await api.get('/v1/reception/consultations', {
          params: { status: 'PENDING_PAYMENT' }
        });
        return fallbackResponse.data?.content || fallbackResponse.data || [];
      } catch (fallbackError) {
        return [];
      }
    }
  },

  getPendingLabPayments: async () => {
    try {
      const response = await api.get('/v1/consultations', {
        params: { status: 'ATTENTE_PAIEMENT_LABO', size: 100 }
      });
      const data = response.data?.data?.content || response.data?.data || response.data || [];
      return data.filter(c => Array.isArray(c.exams) && c.exams.length > 0);
    } catch (error) {
      console.error("Erreur getPendingLabPayments:", error);
      try {
        const allResponse = await api.get('/v1/consultations', { params: { size: 100 } });
        const all = allResponse.data?.data?.content || allResponse.data?.data || allResponse.data || [];
        return all.filter(c =>
          (c.status === 'ATTENTE_PAIEMENT_LABO' || c.statut === 'ATTENTE_PAIEMENT_LABO') &&
          Array.isArray(c.exams) && c.exams.length > 0
        );
      } catch (fallbackError) {
        return [];
      }
    }
  },

  processLabPayment: async (consultationId, amountPaid) => {
    try {
      const validId = validateId(consultationId, 'processLabPayment');
      const payload = {
        examAmountPaid: parseFloat(amountPaid) || 0,
        status: 'labo'
      };
      const response = await api.put(`/v1/consultations/${validId}`, payload);
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Erreur processLabPayment:", error);
      throw error.response?.data || { message: error.message };
    }
  },

  getReceptionStats: async () => {
    try {
      const response = await api.get('/v1/consultations/statistics');
      return response.data?.data || response.data;
    } catch (error) {
      return { totalPending: 0, totalAmount: 0, todayProcessed: 0, todayRevenue: 0 };
    }
  },

  getTodayProcessed: async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get('/v1/consultations', {
        params: { status: 'labo', size: 100 }
      });
      const data = response.data?.data?.content || response.data?.data || response.data || [];
      return data.filter(c => c.createdAt && c.createdAt.startsWith(today));
    } catch (error) {
      return [];
    }
  },

  getDashboardStats: async () => {
    try {
      const response = await api.get('/v1/reception/dashboard/stats');
      console.log("📡 getDashboardStats - Réponse:", response.data);
      return response.data;
    } catch (error) {
      console.error("Erreur getDashboardStats:", error);
      return null;
    }
  }
};

export default admissionService;