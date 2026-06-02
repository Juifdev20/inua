import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { admissionService } from '../../services/admissionService';
import api from '../../services/api';
import { useLocation } from 'react-router-dom';
import './Consultations.css';
import { 
  Stethoscope,
  User,
  Calendar,
  Plus,
  Search,
  FileText,
  CheckCircle,
  Clock,
  ChevronRight,
  Activity,
  Beaker,
  RefreshCcw,
  Wallet,
  CreditCard,
  ArrowRight,
  History,
  X,
  FileCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import ExamenSelector from '../../components/doctor/ExamenSelector';
import DecisionModal from '../../components/modals/DecisionModal';
import { useConsultationIsolation } from '../../hooks/useConsultationIsolation';
import PatientHistoryPanel from '../../components/doctor/PatientHistoryPanel';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const API = `${BACKEND_URL}/api/v1/doctor`;

// Helper functions (conservées)
const normalizeImageUrl = (photoUrl) => {
    if (!photoUrl) return null;
    if (photoUrl.includes('/uploads//uploads/')) return photoUrl.replace('/uploads//uploads/', '/uploads/');
    if (photoUrl.includes('/profiles//uploads/')) return photoUrl.replace('/profiles//uploads/', '/uploads/');
    if (photoUrl.includes('/uploads/profiles//uploads/')) return photoUrl.replace('/uploads/profiles//uploads/', '/uploads/');
    if (photoUrl.includes('profiles//uploads/')) return photoUrl.replace('profiles//uploads/', '/uploads/');
    if (photoUrl.startsWith('/uploads/')) return photoUrl;
    if (photoUrl.startsWith('uploads/')) return '/' + photoUrl;
    if (photoUrl.startsWith('/profiles/')) return photoUrl.replace('/profiles/', '/uploads/');
    if (photoUrl.startsWith('profiles/')) return '/uploads/' + photoUrl.substring(9);
    return '/uploads/' + photoUrl;
};

const getImageUrl = (patientPhoto) => {
    if (!patientPhoto) return null;
    if (patientPhoto.startsWith('http')) return patientPhoto;
    return `${BACKEND_URL}${patientPhoto}`;
};

const formatDateFrench = (dateString) => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Erreur formatage date:', error);
    return null;
  }
};

// ✅ NOUVEAU: Fonction pour formater les montants en $
const formatMontant = (montant) => {
  if (!montant || montant === 0) return '0 $';
  return new Intl.NumberFormat('fr-FR').format(montant) + ' $';
};

// ✅ NOUVEAU: Mapping des statuts pour l'affichage
const STATUS_CONFIG = {
  'en_cours': { label: 'En cours', color: 'bg-amber-500/10 text-amber-600', icon: Clock },
  'en_attente': { label: 'En attente', color: 'bg-gray-500/10 text-gray-600', icon: Clock },
  'examens_prescrits': { label: 'En attente caisse', color: 'bg-orange-500/10 text-orange-600', icon: Wallet },
  'examens_payes': { label: 'Payé - Vers labo', color: 'bg-blue-500/10 text-blue-600', icon: CreditCard },
  'au_labo': { label: 'Au Laboratoire', color: 'bg-indigo-500/10 text-indigo-600', icon: Beaker },
  'labo': { label: 'Au Laboratoire', color: 'bg-blue-500/10 text-blue-600', icon: Beaker },
  'laboratoire_en_attente': { label: 'Au Laboratoire', color: 'bg-blue-500/10 text-blue-600', icon: Beaker },
  'termine': { label: 'Terminée', color: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle },
  'completed': { label: 'Terminée', color: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle },
  'pending_payment': { label: 'En attente paiement', color: 'bg-orange-500/10 text-orange-600', icon: Wallet },
};

const getStatusDisplay = (status) => {
  const normalized = (status || '').toLowerCase().replace(/-/g, '_');
  return STATUS_CONFIG[normalized] || { label: status || 'Inconnu', color: 'bg-gray-500/10 text-gray-600', icon: Clock };
};

const Consultations = () => {
  const { token, user } = useAuth();
  const location = useLocation();
  
  // ✅ Hook d'isolation par épisode de soin
  const {
    activeConsultationData,
    startNewConsultation,
    updateActiveData,
    updateConstantes,
    addExam,
    removeExam,
    resetAll,
    hasActiveConsultation,
    getActiveConsultationId
  } = useConsultationIsolation();

  const [consultations, setConsultations] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  
  // Fonction pour vérifier si la consultation est modifiable
  const isConsultationEditable = (consultation) => {
    const status = (consultation?.status || consultation?.statut || '').toLowerCase();
    const editableStatuses = ['en_cours', 'en cours', 'in_progress', 'pending'];
    return editableStatuses.includes(status);
  };
  
  const [newConsultation, setNewConsultation] = useState({
    patient_id: '',
    motif: '',
    symptomes: []
  });

  // ✅ NOUVEAU: État pour les résultats de laboratoire
  const [labResults, setLabResults] = useState([]);
  const [loadingLabResults, setLoadingLabResults] = useState(false);
  
  // ✅ NOUVEAU: État pour le dossier patient
  const [patientDossier, setPatientDossier] = useState(null);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const [dossierModalOpen, setDossierModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  
  // ✅ NOTIFICATION POUR AJOUT D'EXAMEN
  const [examNotification, setExamNotification] = useState(null);

  // ✅ NOUVEAU: Calcul du montant total des examens (utilise exam.prix directement)
  const montantTotalExamens = useMemo(() => {
    return activeConsultationData.examList.reduce((total, exam) => {
      return total + (exam.prix || exam.price || 0);
    }, 0);
  }, [activeConsultationData.examList]);

  useEffect(() => {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      console.log("⏳ Consultations - token non prêt ou invalide, attente...");
      return;
    }
    
    if (token) {
      console.log("📡 Consultations - token disponible, user:", user);
      fetchConsultations();
      fetchPatients();
      // ✅ Plus besoin de charger examServices - on utilise l'API /api/v1/examens/search directement
    }
    
    if (location.state?.selectedConsultation) {
      openConsultationDetail(location.state.selectedConsultation);
    }
  }, [token, location.state]);

  useEffect(() => {
    if (!token || typeof token !== 'string' || token.trim().length === 0) return;
    // Auto-refresh désactivé pour éviter la lenteur
    // const intervalId = setInterval(() => {
    //   console.log("🔄 Auto-refresh des consultations (toutes les 15s)...");
    //   fetchConsultations();
    // }, 15000);
    // return () => clearInterval(intervalId);
  }, [token]);

  const handleRefresh = useCallback(() => {
    console.log("🔄 Rafraîchissement manuel...");
    setLoading(true);
    fetchConsultations();
    fetchPatients();
    setLastUpdate(Date.now());
    toast.success("🔄 Consultations actualisées");
  }, []);

  const fetchConsultations = async () => {
    try {
      console.log("📡 Fetching consultations from:", `${API}/consultations`);
      const response = await api.get(`${API}/consultations`);
      const data = response.data.data?.content || response.data.consultations || response.data || [];
      
      console.log("📊 Total consultations received:", data.length);
      console.log("📅 All consultation dates:", data.map(c => ({
        id: c.id,
        date: c.consultation_date || c.consultationDate,
        status: c.status
      })));
      
      setConsultations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching consultations:', error);
      setConsultations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await api.get(`${API}/patients`);
      const data = response.data.data?.content || response.data.patients || response.data || [];
      setPatients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching patients:', error);
      setPatients([]);
    }
  };

  const handleCreateConsultation = async () => {
    try {
      await api.post(`${API}/consultations`, newConsultation);
      toast.success("Consultation créée avec succès");
      setDialogOpen(false);
      setNewConsultation({ patient_id: '', motif: '', symptomes: [] });
      // Réinitialiser tous les états partagés pour éviter l'accumulation
      resetAll();
      fetchConsultations();
    } catch (error) {
      toast.error("Erreur lors de la création");
      console.error('Error creating consultation:', error);
    }
  };

  // ✅ CORRIGÉ: Message adapté au nouveau workflow (Caisse, pas Réception/Labo direct)
  const [isTerminerLoading, setIsTerminerLoading] = useState(false);
  
  const terminerConsultation = async () => {
    if (!selectedConsultation) return;
    
    if (activeConsultationData.examList.length === 0) {
      toast.error('Veuillez sélectionner au moins un examen avant de terminer');
      return;
    }
    
    setIsTerminerLoading(true);
    try {
      const endpoint = `${API}/consultations/${selectedConsultation.id}/terminer`;
      
      const requestData = {
        diagnostic: activeConsultationData.diagnostic || '',
        traitement: activeConsultationData.traitement || '',
        exams: activeConsultationData.examList.map(exam => ({
          examenId: parseInt(exam.id),
          note: exam.doctorNote || exam.note || ''
        }))
      };

      console.log('📡 Envoi vers:', endpoint);
      console.log('📋 Payload:', JSON.stringify(requestData));

      const response = await api.put(endpoint, requestData);
      
      const examCount = activeConsultationData.examList.length;
      const montant = response.data?.examTotalAmount || montantTotalExamens;
      
      // ✅ CORRIGÉ: Message indiquant clairement le workflow Caisse → Labo
      toast.success(
        <div className="space-y-1">
          <div>✅ {examCount} examen(s) prescrit(s)</div>
          <div className="font-bold text-orange-600">Montant: {formatMontant(montant)}</div>
          <div className="text-xs">Le patient doit se rendre à la CAISSE pour paiement</div>
        </div>,
        { duration: 5000 }
      );
      
      setSheetOpen(false);
      // Nettoyer le brouillon du localStorage après terminaison réussie
      resetAll(selectedConsultation.id);
      
      fetchConsultations();
    } catch (error) {
      console.error('❌ Erreur terminaison:', error.response?.data || error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Erreur lors de la terminaison de la consultation';
      toast.error(errorMessage);
    } finally {
      setIsTerminerLoading(false);
    }
  };

  const handleSaveConsultation = async () => {
    if (!selectedConsultation) return;
    try {
      const endpoint = `${API}/consultations/${selectedConsultation.id}`;
      const payload = {
        diagnostic: activeConsultationData.diagnostic,
        traitement: activeConsultationData.traitement,
        notes_medicales: activeConsultationData.notes_medicales,
        exams: activeConsultationData.examList.map(e => ({ 
          examenId: e.id, 
          note: e.doctorNote || e.note || '' 
        }))
      };

      const response = await api.put(endpoint, payload);
      toast.success('Fiche patient mise à jour');
      // Nettoyer le brouillon après sauvegarde réussie
      resetAll(selectedConsultation.id);
      
      // Forcer le rafraîchissement immédiat
      console.log("🔄 Refreshing consultations after save...");
      await fetchConsultations();
      
      // Mettre à jour la consultation sélectionnée avec les nouvelles données
      setSelectedConsultation(prev => ({
        ...prev,
        diagnosis: activeConsultationData.diagnostic,
        treatment: activeConsultationData.traitement,
        notes_medicales: activeConsultationData.notes_medicales
      }));
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error.response?.data || error);
      toast.error(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    }
  };

  const getVitalSigns = (consultation) => {
      return {
          poids: consultation?.poids || consultation?.weight || null,
          temperature: consultation?.temperature || null,
          taille: consultation?.taille || consultation?.height || null,
          tensionArterielle: consultation?.tensionArterielle || consultation?.tension || null
      };
  };

  const openConsultationDetail = async (consultation) => {
    try {
        let consultationDetails;
        if (typeof consultation === 'object' && consultation.id) {
            consultationDetails = consultation;
        } else {
            const response = await api.get(`${API}/consultations/${consultation}`);
            consultationDetails = response.data.data;
        }
        
        setSelectedConsultation(consultationDetails);
        
        // ✅ ISOLATION PAR ÉPISODE DE SOIN - Démarrage d'un nouvel espace de données
        console.log("🔍 [ISOLATION] Démarrage épisode de soin pour consultation ID:", consultationDetails.id);
        startNewConsultation(consultationDetails.id);
        
        // ✅ VÉRIFIER SI UN BROUILLON EXISTE DANS LOCALSTORAGE
        const draftKey = `consultation_drafts`;
        try {
          const drafts = JSON.parse(localStorage.getItem(draftKey) || '{}');
          const draft = drafts[consultationDetails.id];
          if (draft && draft.examList?.length > 0) {
            const examCount = draft.examList.length;
            toast.info(
              <div className="space-y-1">
                <div>📝 Brouillon restauré</div>
                <div className="text-xs">{examCount} examen(s) et diagnostic récupérés</div>
              </div>,
              { duration: 3000 }
            );
          }
        } catch (e) {
          console.log('Pas de brouillon pour cette consultation');
        }
        
        // ✅ VÉRIFIER SI UN DOSSIER EXISTE DÉJÀ POUR CETTE CONSULTATION
        checkPatientDossier(consultationDetails.id);
        
        // ✅ CHARGEMENT DU DIAGNOSTIC EXISTANT
        console.log("🩺 Existing diagnosis:", consultationDetails.diagnosis);
        
        // ✅ NOUVEAU: Charger les résultats de laboratoire pour cette consultation
        if (consultationDetails.id) {
            fetchLabResultsForConsultation(consultationDetails.id);
        }
        
        setSheetOpen(true);
    } catch (error) {
        console.error('❌ Erreur ouverture consultation:', error);
    }
  };
  
  // ✅ NOUVEAU: Fonction pour charger les résultats labo d'une consultation
  const fetchLabResultsForConsultation = async (consultationId) => {
    try {
        setLoadingLabResults(true);
        const response = await api.get(`/lab-tests/consultation/${consultationId}`);
        const results = response.data.data?.content || response.data.data || [];
        setLabResults(Array.isArray(results) ? results : []);
    } catch (error) {
        console.error('❌ Erreur chargement résultats labo:', error);
        
        // Gérer différents types d'erreurs
        if (error.response?.status === 404) {
            // Pas de résultats labo pour cette consultation - c'est normal
            setLabResults([]);
        } else if (error.response?.status === 500) {
            // Erreur serveur - informer l'utilisateur
            toast.error("Erreur serveur lors du chargement des résultats labo. Veuillez réessayer.");
            setLabResults([]);
        } else {
            // Autres erreurs
            toast.error("Impossible de charger les résultats laboratoire");
            setLabResults([]);
        }
    } finally {
        setLoadingLabResults(false);
    }
  };

  // ✅ NOUVEAU: Fonctions pour le dossier patient
  const checkPatientDossier = async (consultationId) => {
    try {
      setLoadingDossier(true);
      const response = await api.get(`${BACKEND_URL}/api/v1/doctor/dossiers/check/${consultationId}`);
      if (response.data.exists) {
        setPatientDossier(response.data.document);
        return response.data.document;
      } else {
        setPatientDossier(null);
        return null;
      }
    } catch (error) {
      console.error('Erreur vérification dossier:', error);
      setPatientDossier(null);
      return null;
    } finally {
      setLoadingDossier(false);
    }
  };
  
  const viewPatientDossier = async (dossierId) => {
    try {
      setLoadingDossier(true);
      const response = await api.get(`${BACKEND_URL}/api/v1/doctor/dossiers/${dossierId}/content`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setPdfUrl(url);
      setDossierModalOpen(true);
    } catch (error) {
      console.error('Erreur chargement dossier:', error);
      toast.error("Impossible de charger le dossier");
    } finally {
      setLoadingDossier(false);
    }
  };
  
  const generatePatientDossier = async (consultationId) => {
    try {
      setLoadingDossier(true);
      const response = await api.post(`${BACKEND_URL}/api/v1/doctor/dossiers/generate/${consultationId}`);
      
      if (response.data.success) {
        toast.success("✅ Dossier généré avec succès");
        setPatientDossier(response.data.document);
        // Ouvrir immédiatement
        viewPatientDossier(response.data.document.id);
      } else if (response.data.alreadyExists) {
        toast.info("Un dossier existe déjà");
        setPatientDossier(response.data.document);
        viewPatientDossier(response.data.document.id);
      }
    } catch (error) {
      console.error('Erreur génération dossier:', error);
      toast.error("Erreur lors de la génération du dossier");
    } finally {
      setLoadingDossier(false);
    }
  };

  const openDecisionModal = (consultation) => {
    let pId = null;
    if (consultation.patient?.id) pId = consultation.patient.id;
    else if (consultation.patient_id) pId = consultation.patient_id;
    else if (consultation.patientId) pId = consultation.patientId;

    if (!pId) {
      toast.error("❌ Erreur: ID patient manquant");
      return;
    }

    let patientNameDisplay = consultation.patientName;
    if (!patientNameDisplay && consultation.patient) {
      const firstName = consultation.patient.first_name || consultation.patient.firstName || consultation.patient.prenom || '';
      const lastName = consultation.patient.last_name || consultation.patient.lastName || consultation.patient.nom || '';
      patientNameDisplay = `${firstName} ${lastName}`.trim();
    }
    if (!patientNameDisplay) patientNameDisplay = 'Patient inconnu';

    const enrichedConsultation = {
      id: consultation.id,
      doctorId: consultation.doctorId || consultation.doctor_id,
      patientId: pId,
      patientName: patientNameDisplay,
      reasonForVisit: consultation.reason_for_visit || consultation.motif || consultation.reasonForVisit || '',
      patient: consultation.patient,
      ...consultation
    };

    setSelectedConsultation(enrichedConsultation);
    setDecisionModalOpen(true);
  };

  const filteredConsultations = (consultations || [])
    .filter(cons => {
      if (!cons) return false;
      const patient = cons.patient;
      const patientName = patient ? `${patient.first_name || patient.firstName || patient.prenom || ''} ${patient.last_name || patient.lastName || patient.nom || ''}`.toLowerCase() : "";
      const motif = (cons.reason_for_visit || cons.motif || "").toLowerCase();
      const matchesSearch = patientName.includes(searchTerm.toLowerCase()) || motif.includes(searchTerm.toLowerCase());
      const currentStatus = (cons.status || cons.statut || '').toLowerCase();
      const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // Trier par date de consultation (plus récent en premier)
      const dateA = new Date(a.consultation_date || a.consultationDate || 0);
      const dateB = new Date(b.consultation_date || b.consultationDate || 0);
      return dateB - dateA;
    });

  return (
    <div className="space-y-6 p-1" data-testid="doctor-consultations">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-space-grotesk font-bold text-foreground">Consultations</h1>
          <p className="text-muted-foreground font-medium">
            Gérez vos examens et diagnostics médicaux
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Dernière mise à jour: {new Date(lastUpdate).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={handleRefresh}
            className="gap-2"
            title="Rafraîchir (Ctrl+R)"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            // Réinitialiser quand on ferme le dialogue sans créer
            setNewConsultation({ patient_id: '', motif: '', symptomes: [] });
          }
        }}>
          <DialogTrigger asChild>
            <Button 
              className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 rounded-xl" 
              data-testid="new-consultation-btn"
              onClick={() => {
                // Réinitialiser les états quand on ouvre le dialogue de nouvelle consultation
                resetAll();
              }}
            >
              <Plus className="w-5 h-5 mr-2" />
              Nouvelle consultation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Nouvelle consultation</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Démarrez une nouvelle session pour un patient.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 mt-4">
              <div className="space-y-2">
                <Label className="text-foreground">Sélectionner le Patient</Label>
                <Select
                  value={newConsultation.patient_id}
                  onValueChange={(value) => setNewConsultation({ ...newConsultation, patient_id: value })}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Choisir un patient..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id.toString()}>
                        {patient.first_name || patient.firstName || patient.prenom} {patient.last_name || patient.lastName || patient.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Motif de consultation</Label>
                <Textarea
                  placeholder="Ex: Fièvre persistante, Douleurs abdominales..."
                  value={newConsultation.motif}
                  onChange={(e) => setNewConsultation({ ...newConsultation, motif: e.target.value })}
                  className="bg-background border-border min-h-[100px]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button 
                  className="bg-primary text-white"
                  onClick={handleCreateConsultation}
                  disabled={!newConsultation.patient_id || !newConsultation.motif}
                >
                  Commencer l'examen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border bg-card shadow-sm rounded-2xl">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par patient ou motif..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background border-border rounded-xl"
                data-testid="search-consultations"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[220px] bg-background border-border rounded-xl">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                {/* ✅ AJOUT: Nouveaux statuts workflow caisse */}
                <SelectItem value="examens_prescrits">En attente caisse</SelectItem>
                <SelectItem value="examens_payes">Payé - Vers labo</SelectItem>
                <SelectItem value="au_labo">Au Laboratoire</SelectItem>
                <SelectItem value="termine">Terminées</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Consultations List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          [1, 2, 3].map(i => (
            <Card key={i} className="border-border bg-card shadow-none">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-14 h-14 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-40 mb-2" />
                    <Skeleton className="h-4 w-60" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredConsultations.length > 0 ? (
          filteredConsultations.map((consultation) => {
            const statusConfig = getStatusDisplay(consultation?.status || consultation?.statut);
            const StatusIcon = statusConfig.icon;
            
            return (
            <Card 
              key={consultation.id}
              className="hover:shadow-lg transition-all cursor-pointer border-border bg-card group rounded-2xl overflow-hidden"
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="w-14 h-14 border-2 border-background shadow-sm">
                    <AvatarImage 
                      src={getImageUrl(consultation?.patientPhoto)} 
                    />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {(consultation?.patientName || consultation?.patient?.first_name || consultation?.patient?.firstName || consultation?.patient?.prenom || '?')[0]}
                      {(consultation?.patient?.last_name || consultation?.patient?.lastName || consultation?.patient?.nom || '')[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                        {consultation?.patientName || "Chargement..."}
                      </h3>
                      <Badge className={statusConfig.color + ' border-none'}>
                        <StatusIcon className="w-3 h-3 mr-1" /> 
                        {statusConfig.label}
                      </Badge>
                    </div>
                    <p className="text-foreground/80 font-medium mb-3 line-clamp-1 italic">
                      {consultation.reason_for_visit || consultation.reasonForVisit || consultation.motif || "Non spécifié"}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDateFrench(consultation?.consultationDate) || formatDateFrench(consultation?.createdAt) || 'Date non définie'}
                      </span>
                      {/* ✅ AJOUT: Affichage du montant si examens prescrits/payés */}
                      {(consultation.examTotalAmount > 0 || consultation.montantTotal > 0) && (
                        <span className="flex items-center gap-1.5 bg-orange-50 text-orange-700 px-2 py-1 rounded-md">
                          <Wallet className="w-3.5 h-3.5" />
                          {formatMontant(consultation.examTotalAmount || consultation.montantTotal)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full group-hover:bg-primary group-hover:text-white transition-all"
                      onClick={() => openConsultationDetail(consultation)}
                      title="Éditer la consultation"
                    >
                      <FileText className="w-6 h-6" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full group-hover:bg-emerald-500 group-hover:text-white transition-all"
                      onClick={() => openDecisionModal(consultation)}
                      title="Prendre une décision (Labo/Clôture)"
                    >
                      <CheckCircle className="w-6 h-6" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )})
        ) : (
          <Card className="border-dashed border-2 border-border bg-muted/5 rounded-3xl">
            <CardContent className="py-20 text-center">
              <div className="bg-muted/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Stethoscope className="w-10 h-10 text-muted-foreground/40" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Aucune consultation</h3>
              <p className="text-muted-foreground max-w-xs mx-auto mt-1">
                {searchTerm || statusFilter !== 'all'
                  ? 'Essayez de réinitialiser vos filtres de recherche.'
                  : 'Commencez par créer une nouvelle consultation pour un patient.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Decision Modal */}
      {decisionModalOpen && selectedConsultation && (
        <DecisionModal
          appointment={selectedConsultation}
          patientId={selectedConsultation.patientId}
          onClose={() => setDecisionModalOpen(false)}
          onRefresh={fetchConsultations}
        />
      )}

      {/* Consultation Detail Dialog */}
      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent 
          className="max-w-4xl w-[95vw] max-h-[85vh] overflow-hidden bg-background border-border shadow-2xl backdrop-blur-sm p-0"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="border-b pb-3 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                     <Activity className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                     <DialogTitle className="text-lg font-semibold">Consultation</DialogTitle>
                     <DialogDescription className="text-xs text-muted-foreground">
                       {selectedConsultation?.patientName || `${selectedConsultation?.patient?.first_name || selectedConsultation?.patient?.firstName || selectedConsultation?.patient?.prenom || ''} ${selectedConsultation?.patient?.last_name || selectedConsultation?.patient?.lastName || selectedConsultation?.patient?.nom || ''}`.trim() || 'Chargement...'}
                     </DialogDescription>
                  </div>
               </div>
               
               {/* ✅ BOUTON DOSSIER PATIENT */}
               <div className="flex items-center gap-2">
                  {loadingDossier ? (
                    <Button variant="outline" disabled>
                      <RefreshCcw className="w-4 h-4 animate-spin mr-2" />
                      Chargement...
                    </Button>
                  ) : patientDossier ? (
                    <Button
                      variant="outline"
                      className="gap-2 border-emerald-500/30 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-700"
                      onClick={() => viewPatientDossier(patientDossier.id)}
                    >
                      <FileText className="w-4 h-4" />
                      Voir Dossier
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => generatePatientDossier(selectedConsultation?.id)}
                      disabled={!['termine', 'terminée', 'completed'].includes((selectedConsultation?.status || selectedConsultation?.statut || '').toLowerCase())}
                      title={!['termine', 'terminée', 'completed'].includes((selectedConsultation?.status || selectedConsultation?.statut || '').toLowerCase()) 
                        ? "La consultation doit être terminée pour générer le dossier" 
                        : "Générer la fiche médicale individuelle"}
                    >
                      <FileText className="w-4 h-4" />
                      Générer Dossier
                    </Button>
                  )}
               </div>
            </div>
          </DialogHeader>
          
          {/* Single Column Compact Layout */}
          <div className="h-[calc(85vh-80px)] overflow-y-auto p-4">
              {/* ✅ NOTIFICATION D'AJOUT D'EXAMEN - Fixed au-dessus du contenu */}
              <AnimatePresence>
                {examNotification && (
                  <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="sticky top-0 z-[100] mx-auto mb-4 w-fit"
                  >
                    <div className="bg-gradient-to-r from-[#37f49e] to-[#2bd98b] text-white px-5 py-2.5 rounded-full shadow-xl flex items-center gap-2">
                      <div className="bg-white/20 rounded-full p-1">
                        <Plus className="w-4 h-4" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm">✓ {examNotification.name}</span>
                        <span className="text-xs text-white/80">ajouté • {examNotification.price?.toLocaleString()} $</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Mobile: Toggle History Button */}
              <div className="mb-3">
                <Button
                  onClick={() => setHistoryModalOpen(true)}
                  size="sm"
                  className="w-full gap-2 bg-gradient-to-r from-[#37f49e] to-[#2bd98b] hover:from-[#2bd98b] hover:to-[#22c978] text-white"
                >
                  <History className="w-4 h-4" />
                  <span>Historique patient</span>
                </Button>
              </div>
              {/* Bandeau Récapitulatif du Triage - Compact */}
              {selectedConsultation && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> Signes Vitaux
                  </h4>
                  {(() => {
                    const vitalSigns = getVitalSigns(selectedConsultation);
                    const poids = parseFloat(String(vitalSigns.poids || '').replace('Non renseigné', ''));
                    const tailleStr = String(vitalSigns.taille || '').replace(' cm', '').replace('Non renseigné', '');
                    const taille = parseFloat(tailleStr);
                    const imc = (poids && taille && taille > 0) ? (poids / Math.pow(taille / 100, 2)).toFixed(1) : '--';
                    
                    return (
                      <div className="grid grid-cols-5 gap-2 text-center">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase">Tension</p>
                          <p className="text-sm font-bold text-foreground">{vitalSigns.tensionArterielle || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase">Temp</p>
                          <p className="text-sm font-bold text-foreground">{vitalSigns.temperature ? `${vitalSigns.temperature}°C` : '-'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase">Poids</p>
                          <p className="text-sm font-bold text-foreground">{vitalSigns.poids ? `${vitalSigns.poids}kg` : '-'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase">Taille</p>
                          <p className="text-sm font-bold text-foreground">{vitalSigns.taille ? `${vitalSigns.taille}cm` : '-'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase">IMC</p>
                          <p className={`text-sm font-bold ${imc !== '--' ? (imc < 18.5 || imc > 25 ? 'text-amber-600' : 'text-green-600') : 'text-muted-foreground'}`}>{imc}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              
              {selectedConsultation && (
                <div className="space-y-4 pb-4">
                  {/* Message de verrouillage si consultation pas en cours */}
                  {!isConsultationEditable(selectedConsultation) && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-destructive">Consultation non modifiable</p>
                        <p className="text-xs text-muted-foreground">Seules les consultations en cours peuvent être modifiées</p>
                      </div>
                    </div>
                  )}

                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Motif
                    </h4>
                    <p className="text-sm text-foreground">
                      {selectedConsultation.reason_for_visit || selectedConsultation.motif || "Non spécifié"}
                    </p>
                  </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-bold">Diagnostic</Label>
                <Textarea
                  placeholder="Diagnostic..."
                  value={activeConsultationData.diagnostic}
                  onChange={(e) => isConsultationEditable(selectedConsultation) && updateActiveData('diagnostic', e.target.value)}
                  disabled={!isConsultationEditable(selectedConsultation)}
                  className={`bg-background border-border min-h-[80px] rounded-lg text-sm focus:ring-primary ${!isConsultationEditable(selectedConsultation) ? 'bg-muted/50 cursor-not-allowed opacity-60' : ''}`}
                />
              </div>

              {/* ═══════════════════════════════════════════════════════════════
                  ★ SECTION EXAMENS - COMPACT
              ═══════════════════════════════════════════════════════════════ */}
              <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-gradient-to-br from-[#37f49e] to-[#2bd98b] p-2 rounded-lg text-white shadow-sm">
                    <Beaker className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Examens</h4>
                    <p className="text-[10px] text-muted-foreground">Sélectionnez les analyses</p>
                  </div>
                </div>

                {/* ✅ Message workflow compact */}
                {activeConsultationData.examList.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5 mb-3 flex items-center gap-2">
                    <ArrowRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      CAISSE: {formatMontant(montantTotalExamens)} → LABO
                    </p>
                  </div>
                )}

                {/* ★ Composant de sélection professionnel */}
                {isConsultationEditable(selectedConsultation) ? (
                  <ExamenSelector
                    selectedExams={activeConsultationData.examList}
                    onChange={(newList) => {
                      // Sync avec le hook d'isolation
                      updateActiveData('examList', newList);
                    }}
                    onExamAdded={(exam) => {
                      // Afficher notification inline
                      setExamNotification({
                        name: exam.nom,
                        price: exam.prix
                      });
                      setTimeout(() => setExamNotification(null), 2000);
                    }}
                  />
                ) : (
                  /* Mode lecture seule - Compact */
                  <div className="space-y-2">
                    {activeConsultationData.examList.length === 0 ? (
                      <p className="text-center text-xs text-muted-foreground py-4">
                        Aucun examen prescrit
                      </p>
                    ) : (
                      activeConsultationData.examList.map((ex, idx) => (
                        <div key={idx} className="bg-muted/30 rounded-lg p-2.5 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">{ex.nom}</p>
                            <p className="text-[10px] text-muted-foreground">{ex.code}</p>
                          </div>
                          <p className="text-sm font-bold text-[#37f49e]">{formatMontant(ex.prix)}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* ✅ SECTION RÉSULTATS LABO - Compact */}
              {labResults.length > 0 && (
                <div className="bg-emerald-50/30 p-3 rounded-xl border border-emerald-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <Beaker className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-bold uppercase text-emerald-700">
                      Résultats Labo
                    </h4>
                    <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0">
                      {labResults.length}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    {labResults.map((result, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-bold text-foreground">{result.testName}</p>
                          <Badge className={result.status === 'TERMINE' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}>
                            {result.status}
                          </Badge>
                        </div>
                        
                        {/* Résultats compact */}
                        {(() => {
                          let resultsData = result.results;
                          if (typeof resultsData === 'string') {
                            try {
                              resultsData = JSON.parse(resultsData);
                            } catch (e) {
                              resultsData = { valeur: resultsData };
                            }
                          }
                          
                          return (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {resultsData && Object.entries(resultsData).map(([key, value]) => (
                                <div key={key} className="bg-muted/30 p-1.5 rounded">
                                  <p className="text-[10px] text-muted-foreground uppercase">{key}</p>
                                  <p className={`text-sm font-bold ${
                                    typeof value === 'string' && parseFloat(value) > 7.0 
                                      ? 'text-rose-500' 
                                      : 'text-emerald-600'
                                  }`}>
                                    {value} {result.unit || ''}
                                  </p>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                        
                        {result.interpretation && (
                          <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100">
                            <p className="text-[10px] font-bold text-blue-700">Interprétation:</p>
                            <p className="text-xs text-blue-800">{result.interpretation}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-emerald-100 border border-emerald-300 rounded p-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <p className="text-xs text-emerald-800">
                      <strong>Prêt:</strong> Résultats disponibles pour prescription
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
                <Button 
                  className="flex-1 bg-primary text-white shadow-md h-12 sm:h-10 rounded-xl text-base sm:text-sm font-medium"
                  onClick={handleSaveConsultation}
                  disabled={!isConsultationEditable(selectedConsultation)}
                >
                  <CheckCircle className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                  Sauvegarder
                </Button>
                <Button 
                  className="flex-1 bg-gradient-to-r from-[#37f49e] to-[#2bd98b] text-white shadow-md h-12 sm:h-10 rounded-xl text-base sm:text-sm font-medium"
                  onClick={terminerConsultation}
                  disabled={!isConsultationEditable(selectedConsultation) || activeConsultationData.examList.length === 0 || isTerminerLoading}
                >
                  {isTerminerLoading ? (
                    <>
                      <RefreshCcw className="w-5 h-5 sm:w-4 sm:h-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <ChevronRight className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                      Terminer → Caisse
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  className="h-12 sm:h-10 rounded-xl border-border px-4 sm:px-3"
                  onClick={() => setSheetOpen(false)}
                >
                  <span className="sm:hidden">Annuler</span>
                  <span className="hidden sm:inline">✕</span>
                </Button>
              </div>
            </div>
          )}
          
          {/* ═══════════════════════════════════════════════════════════════
              ★ BOUTON FLOTTANT: Historique (Compact)
          ═══════════════════════════════════════════════════════════════ */}
            <button
              onClick={() => setHistoryModalOpen(true)}
              className="hidden lg:flex fixed bottom-4 right-4 z-50 items-center gap-1.5 bg-gradient-to-r from-[#37f49e] to-[#2bd98b] hover:from-[#2bd98b] hover:to-[#22c978] text-white px-4 py-2 rounded-full shadow-md text-sm transition-all hover:scale-105"
            >
              <History className="w-4 h-4" />
              <span>Historique</span>
            </button>
          </div>
        </DialogContent>

        {/* ═══════════════════════════════════════════════════════════════
            ★ MODAL HISTORIQUE MÉDICAL
        ═══════════════════════════════════════════════════════════════ */}
        <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
          <DialogContent className="max-w-3xl w-[95vw] h-[85vh] bg-card border-border p-0 overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b border-border bg-gradient-to-r from-[#37f49e]/10 to-[#2bd98b]/5 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-[#37f49e] to-[#2bd98b] p-2 rounded-lg text-white">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                    Historique Médical
                  </DialogTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Patient: {selectedConsultation?.patient?.firstName} {selectedConsultation?.patient?.lastName}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setHistoryModalOpen(false)}
                className="h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5 text-slate-500" />
              </Button>
            </DialogHeader>
            
            <div className="flex-1 h-[calc(85vh-80px)] overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/50">
              <PatientHistoryPanel
                patientId={selectedConsultation?.patient?.id || selectedConsultation?.patientId}
                currentConsultationId={selectedConsultation?.id}
                onRenewPrescription={(prescription) => {
                  console.log('Renouvellement prescription:', prescription);
                  toast.success('Prescription copiée');
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </Dialog>

      {/* ✅ MODAL VISIONNEUSE DOSSIER PATIENT */}
      <Dialog open={dossierModalOpen} onOpenChange={setDossierModalOpen}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] bg-card border-border/50 p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-emerald-500" />
              <DialogTitle className="text-base font-bold">Fiche Médicale Individuelle</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDossierModalOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </DialogHeader>
          
          <div className="flex-1 h-full bg-muted/30">
            {pdfUrl ? (
              <iframe 
                src={pdfUrl} 
                className="w-full h-[calc(90vh-80px)]"
                title="Fiche médicale"
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-4">
                <RefreshCcw className="w-10 h-10 text-muted-foreground/40 animate-spin" />
                <p className="text-muted-foreground">Chargement du document...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Consultations;