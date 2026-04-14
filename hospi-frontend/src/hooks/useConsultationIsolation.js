import { useState, useCallback, useRef } from 'react';

/**
 * Hook pour isoler complètement chaque consultation (Épisode de soin)
 * Chaque consultation a son propre espace de données hermétique
 */
export const useConsultationIsolation = () => {
  // Référence à l'ID de consultation actuellement active
  const activeConsultationIdRef = useRef(null);
  
  // État local pour la consultation active (saisie en cours)
  const [activeConsultationData, setActiveConsultationData] = useState({
    diagnostic: '',
    traitement: '',
    notes_medicales: '',
    constantes: { tension: '', temperature: '', poids: '', taille: '' },
    examList: [],
    prescriptions: []
  });

  // Cache des consultations par ID (pour éviter les rechargements)
  const [consultationsCache, setConsultationsCache] = useState({});

  /**
   * Démarre une nouvelle consultation isolée
   */
  const startNewConsultation = useCallback((consultationId) => {
    console.log(`[ConsultationIsolation] Démarrage nouvelle consultation ID: ${consultationId}`);
    
    // Sauvegarder l'ancienne consultation si elle existe
    if (activeConsultationIdRef.current) {
      const oldId = activeConsultationIdRef.current;
      setConsultationsCache(prev => ({
        ...prev,
        [oldId]: { ...activeConsultationData, lastAccessed: Date.now() }
      }));
    }

    // Vérifier si on a déjà des données en cache pour cette consultation
    if (consultationsCache[consultationId]) {
      console.log(`[ConsultationIsolation] Restauration depuis cache pour ID: ${consultationId}`);
      setActiveConsultationData(consultationsCache[consultationId]);
    } else {
      // Créer un nouvel espace de données vierge
      console.log(`[ConsultationIsolation] Création espace vierge pour ID: ${consultationId}`);
      setActiveConsultationData({
        diagnostic: '',
        traitement: '',
        notes_medicales: '',
        constantes: { tension: '', temperature: '', poids: '', taille: '' },
        examList: [],
        prescriptions: []
      });
    }

    activeConsultationIdRef.current = consultationId;
  }, [consultationsCache, activeConsultationData]);

  /**
   * Met à jour une donnée de la consultation active
   */
  const updateActiveData = useCallback((field, value) => {
    setActiveConsultationData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  /**
   * Met à jour les constantes vitales
   */
  const updateConstantes = useCallback((field, value) => {
    setActiveConsultationData(prev => ({
      ...prev,
      constantes: {
        ...prev.constantes,
        [field]: value
      }
    }));
  }, []);

  /**
   * Ajoute un examen à la liste
   */
  const addExam = useCallback((exam) => {
    setActiveConsultationData(prev => ({
      ...prev,
      examList: [...prev.examList, exam]
    }));
  }, []);

  /**
   * Supprime un examen de la liste
   */
  const removeExam = useCallback((index) => {
    setActiveConsultationData(prev => ({
      ...prev,
      examList: prev.examList.filter((_, i) => i !== index)
    }));
  }, []);

  /**
   * Ajoute une prescription
   */
  const addPrescription = useCallback((prescription) => {
    setActiveConsultationData(prev => ({
      ...prev,
      prescriptions: [...prev.prescriptions, prescription]
    }));
  }, []);

  /**
   * Supprime une prescription
   */
  const removePrescription = useCallback((index) => {
    setActiveConsultationData(prev => ({
      ...prev,
      prescriptions: prev.prescriptions.filter((_, i) => i !== index)
    }));
  }, []);

  /**
   * Sauvegarde les données actives dans le cache
   */
  const saveToCache = useCallback(() => {
    if (activeConsultationIdRef.current) {
      const id = activeConsultationIdRef.current;
      setConsultationsCache(prev => ({
        ...prev,
        [id]: { ...activeConsultationData, lastAccessed: Date.now() }
      }));
      console.log(`[ConsultationIsolation] Sauvegarde cache pour ID: ${id}`);
    }
  }, [activeConsultationData]);

  /**
   * Réinitialise complètement (fermeture consultation)
   */
  const resetAll = useCallback(() => {
    console.log('[ConsultationIsolation] Réinitialisation complète');
    activeConsultationIdRef.current = null;
    setActiveConsultationData({
      diagnostic: '',
      traitement: '',
      notes_medicales: '',
      constantes: { tension: '', temperature: '', poids: '', taille: '' },
      examList: [],
      prescriptions: []
    });
  }, []);

  /**
   * Vérifie si une consultation est active
   */
  const hasActiveConsultation = useCallback(() => {
    return activeConsultationIdRef.current !== null;
  }, []);

  /**
   * Récupère l'ID de la consultation active
   */
  const getActiveConsultationId = useCallback(() => {
    return activeConsultationIdRef.current;
  }, []);

  return {
    // États
    activeConsultationData,
    activeConsultationId: activeConsultationIdRef.current,
    consultationsCache,
    
    // Actions
    startNewConsultation,
    updateActiveData,
    updateConstantes,
    addExam,
    removeExam,
    addPrescription,
    removePrescription,
    saveToCache,
    resetAll,
    hasActiveConsultation,
    getActiveConsultationId
  };
};

export default useConsultationIsolation;
