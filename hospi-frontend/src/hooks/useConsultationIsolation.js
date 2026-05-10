import { useState, useCallback, useRef, useEffect } from 'react';

const STORAGE_KEY = 'consultation_drafts';

/**
 * Hook pour isoler complètement chaque consultation (Épisode de soin)
 * Chaque consultation a son propre espace de données hermétique
 * Avec persistance localStorage pour sauvegarder les brouillons
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
   * Sauvegarde dans localStorage
   */
  const saveToLocalStorage = useCallback((consultationId, data) => {
    try {
      const drafts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      drafts[consultationId] = {
        ...data,
        lastSaved: Date.now(),
        consultationId
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
      console.log(`[ConsultationIsolation] 💾 Sauvegarde localStorage ID: ${consultationId}`);
    } catch (e) {
      console.error('[ConsultationIsolation] Erreur sauvegarde localStorage:', e);
    }
  }, []);

  /**
   * Charge depuis localStorage
   */
  const loadFromLocalStorage = useCallback((consultationId) => {
    try {
      const drafts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const draft = drafts[consultationId];
      if (draft) {
        console.log(`[ConsultationIsolation] 📂 Chargement localStorage ID: ${consultationId}`);
        // Vérifier si le draft n'est pas trop vieux (24h)
        const isExpired = Date.now() - draft.lastSaved > 24 * 60 * 60 * 1000;
        if (isExpired) {
          console.log(`[ConsultationIsolation] Draft expiré pour ID: ${consultationId}`);
          return null;
        }
        return draft;
      }
      return null;
    } catch (e) {
      console.error('[ConsultationIsolation] Erreur chargement localStorage:', e);
      return null;
    }
  }, []);

  /**
   * Supprime du localStorage (après sauvegarde officielle)
   */
  const clearFromLocalStorage = useCallback((consultationId) => {
    try {
      const drafts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      delete drafts[consultationId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
      console.log(`[ConsultationIsolation] 🗑️ Nettoyage localStorage ID: ${consultationId}`);
    } catch (e) {
      console.error('[ConsultationIsolation] Erreur nettoyage localStorage:', e);
    }
  }, []);

  /**
   * Démarre une nouvelle consultation isolée
   */
  const startNewConsultation = useCallback((consultationId) => {
    console.log(`[ConsultationIsolation] Démarrage nouvelle consultation ID: ${consultationId}`);
    
    // Sauvegarder l'ancienne consultation si elle existe
    if (activeConsultationIdRef.current) {
      const oldId = activeConsultationIdRef.current;
      const dataToSave = { ...activeConsultationData, lastAccessed: Date.now() };
      setConsultationsCache(prev => ({
        ...prev,
        [oldId]: dataToSave
      }));
      // Sauvegarder aussi dans localStorage
      saveToLocalStorage(oldId, dataToSave);
    }

    // Vérifier d'abord le localStorage (persistance entre sessions)
    const localDraft = loadFromLocalStorage(consultationId);
    if (localDraft) {
      console.log(`[ConsultationIsolation] 📂 Restauration depuis localStorage pour ID: ${consultationId}`);
      const { lastSaved, consultationId: _, ...restoredData } = localDraft;
      setActiveConsultationData(restoredData);
    }
    // Sinon vérifier le cache mémoire (même session)
    else if (consultationsCache[consultationId]) {
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
  }, [consultationsCache, activeConsultationData, saveToLocalStorage, loadFromLocalStorage]);

  /**
   * Met à jour une donnée de la consultation active
   */
  const updateActiveData = useCallback((field, value) => {
    setActiveConsultationData(prev => {
      const newData = { ...prev, [field]: value };
      // Sauvegarder automatiquement dans localStorage
      if (activeConsultationIdRef.current) {
        saveToLocalStorage(activeConsultationIdRef.current, newData);
      }
      return newData;
    });
  }, [saveToLocalStorage]);

  /**
   * Met à jour les constantes vitales
   */
  const updateConstantes = useCallback((field, value) => {
    setActiveConsultationData(prev => {
      const newData = {
        ...prev,
        constantes: { ...prev.constantes, [field]: value }
      };
      // Sauvegarder automatiquement
      if (activeConsultationIdRef.current) {
        saveToLocalStorage(activeConsultationIdRef.current, newData);
      }
      return newData;
    });
  }, [saveToLocalStorage]);

  /**
   * Ajoute un examen à la liste
   */
  const addExam = useCallback((exam) => {
    setActiveConsultationData(prev => {
      const newData = { ...prev, examList: [...prev.examList, exam] };
      if (activeConsultationIdRef.current) {
        saveToLocalStorage(activeConsultationIdRef.current, newData);
      }
      return newData;
    });
  }, [saveToLocalStorage]);

  /**
   * Supprime un examen de la liste
   */
  const removeExam = useCallback((examId) => {
    setActiveConsultationData(prev => {
      const newData = { ...prev, examList: prev.examList.filter(e => e.id !== examId) };
      if (activeConsultationIdRef.current) {
        saveToLocalStorage(activeConsultationIdRef.current, newData);
      }
      return newData;
    });
  }, [saveToLocalStorage]);

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
  const resetAll = useCallback((consultationId = null) => {
    console.log('[ConsultationIsolation] Réinitialisation complète');
    const idToClear = consultationId || activeConsultationIdRef.current;
    if (idToClear) {
      clearFromLocalStorage(idToClear);
    }
    activeConsultationIdRef.current = null;
    setActiveConsultationData({
      diagnostic: '',
      traitement: '',
      notes_medicales: '',
      constantes: { tension: '', temperature: '', poids: '', taille: '' },
      examList: [],
      prescriptions: []
    });
  }, [clearFromLocalStorage]);

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
