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
  X
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

// ✅ NOUVEAU: Fonction pour formater les montants en FCFA
const formatMontant = (montant) => {
  if (!montant || montant === 0) return '0 F';
  return new Intl.NumberFormat('fr-FR').format(montant) + ' F';
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
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  
  // Fonction pour vérifier si la consultation est modifiable
  const isConsultationEditable = (consultation) => {
    const status = (consultation?.status || consultation?.statut || '').toLowerCase();
    const nonEditableStatuses = ['termine', 'terminée', 'completed', 'payee', 'payée', 'paid'];
    return !nonEditableStatuses.includes(status);
  };
  
  const [newConsultation, setNewConsultation] = useState({
    patient_id: '',
    motif: '',
    symptomes: []
  });

  const [examServices, setExamServices] = useState([]);
  const [newExamItem, setNewExamItem] = useState({ serviceId: '', note: '' });
  
  // ✅ NOUVEAU: État pour les résultats de laboratoire
  const [labResults, setLabResults] = useState([]);
  const [loadingLabResults, setLoadingLabResults] = useState(false);

  // ✅ NOUVEAU: Calcul du montant total des examens sélectionnés (avec isolation)
  const montantTotalExamens = useMemo(() => {
    return activeConsultationData.examList.reduce((total, exam) => {
      const service = examServices.find(s => s.id?.toString() === exam.serviceId?.toString());
      return total + (service?.prix || service?.price || 0);
    }, 0);
  }, [activeConsultationData.examList, examServices]);

  useEffect(() => {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      console.log("⏳ Consultations - token non prêt ou invalide, attente...");
      return;
    }
    
    if (token) {
      console.log("📡 Consultations - token disponible, user:", user);
      fetchConsultations();
      fetchPatients();
      admissionService.getAvailableExams()
        .then(list => setExamServices(Array.isArray(list) ? list : []))
        .catch(err => {
          console.error('Erreur chargement examens:', err);
          setExamServices([]);
        });
    }
    
    if (location.state?.selectedConsultation) {
      openConsultationDetail(location.state.selectedConsultation);
    }
  }, [token, location.state]);

  useEffect(() => {
    if (!token || typeof token !== 'string' || token.trim().length === 0) return;
    const intervalId = setInterval(() => {
      console.log("🔄 Auto-refresh des consultations (toutes les 15s)...");
      fetchConsultations();
    }, 15000);
    return () => clearInterval(intervalId);
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
  const terminerConsultation = async () => {
    if (!selectedConsultation) return;
    
    if (activeConsultationData.examList.length === 0) {
      toast.error('Veuillez sélectionner au moins un examen avant de terminer');
      return;
    }
    
    try {
      const endpoint = `${API}/consultations/${selectedConsultation.id}/terminer`;
      
      const requestData = {
        diagnostic: activeConsultationData.diagnostic || '',
        traitement: activeConsultationData.traitement || '',
        exams: activeConsultationData.examList.map(exam => ({
          serviceId: parseInt(exam.serviceId),
          note: exam.note || ''
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
      resetAll();
      
      fetchConsultations();
    } catch (error) {
      console.error('❌ Erreur terminaison:', error.response?.data || error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Erreur lors de la terminaison de la consultation';
      toast.error(errorMessage);
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
        exams: activeConsultationData.examList.map(e => ({ serviceId: e.serviceId, note: e.note }))
      };

      const response = await api.put(endpoint, payload);
      toast.success('Fiche patient mise à jour');
      
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
        <DialogContent className="max-w-7xl w-full max-h-[90vh] overflow-hidden bg-card border-border shadow-2xl backdrop-blur-sm p-0">
          <DialogHeader className="border-b pb-4 p-6">
            <div className="flex items-center justify-between gap-4 mb-2">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl">
                     <Activity className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                     <DialogTitle className="text-2xl font-bold">Détails Consultation</DialogTitle>
                     <DialogDescription className="text-muted-foreground font-medium">
                       Patient: {selectedConsultation?.patientName || `${selectedConsultation?.patient?.first_name || selectedConsultation?.patient?.firstName || selectedConsultation?.patient?.prenom || ''} ${selectedConsultation?.patient?.last_name || selectedConsultation?.patient?.lastName || selectedConsultation?.patient?.nom || ''}`.trim() || 'Chargement...'}
                     </DialogDescription>
                  </div>
               </div>
            </div>
          </DialogHeader>
          
          {/* Double View Layout */}
          <div className="flex flex-col lg:flex-row h-[calc(90vh-120px)]">
            {/* Left: Consultation Form (60-70%) */}
            <div className="flex-1 lg:w-[65%] overflow-y-auto p-4 sm:p-6 border-b lg:border-b-0 lg:border-r border-border">
              {/* Mobile: Toggle History Button */}
              <div className="lg:hidden mb-4">
                <Button
                  variant="outline"
                  onClick={() => setShowHistoryPanel(!showHistoryPanel)}
                  className="w-full gap-2 border-blue-200 hover:bg-blue-50"
                >
                  <History className="w-4 h-4 text-blue-600" />
                  <span>{showHistoryPanel ? 'Masquer' : 'Afficher'} l'historique</span>
                </Button>
              </div>
              {/* Bandeau Récapitulatif du Triage */}
              {selectedConsultation && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800 mb-6">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Signes Vitaux (Triage Réception)
                  </h4>
                  {(() => {
                    const vitalSigns = getVitalSigns(selectedConsultation);
                    const poids = parseFloat(String(vitalSigns.poids || '').replace('Non renseigné', ''));
                    const tailleStr = String(vitalSigns.taille || '').replace(' cm', '').replace('Non renseigné', '');
                    const taille = parseFloat(tailleStr);
                    const imc = (poids && taille && taille > 0) ? (poids / Math.pow(taille / 100, 2)).toFixed(1) : '--';
                    
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center">
                          <p className="text-xs font-bold text-muted-foreground uppercase">Tension</p>
                          <p className="text-lg font-black text-foreground">{vitalSigns.tensionArterielle || 'Non renseigné'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-muted-foreground uppercase">Température</p>
                          <p className="text-lg font-black text-foreground">{vitalSigns.temperature ? `${vitalSigns.temperature} °C` : 'Non renseigné'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-muted-foreground uppercase">Poids</p>
                          <p className="text-lg font-black text-foreground">{vitalSigns.poids ? `${vitalSigns.poids} kg` : 'Non renseigné'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-muted-foreground uppercase">Taille</p>
                          <p className="text-lg font-black text-foreground">{vitalSigns.taille ? `${vitalSigns.taille} cm` : 'Non renseigné'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-muted-foreground uppercase">IMC</p>
                          <p className={`text-lg font-black ${imc !== '--' ? (imc < 18.5 || imc > 25 ? 'text-amber-600' : 'text-green-600') : 'text-muted-foreground'}`}>{imc}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              
              {selectedConsultation && (
                <div className="mt-8 space-y-8 pb-10">
                  {/* Message de verrouillage si consultation terminée */}
                  {!isConsultationEditable(selectedConsultation) && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                      <div>
                        <p className="font-bold text-destructive">Consultation archivée</p>
                        <p className="text-sm text-muted-foreground">Cette consultation est terminée ou payée et ne peut plus être modifiée.</p>
                      </div>
                    </div>
                  )}

                  <div className="p-5 rounded-2xl bg-muted/30 border border-border">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Motif de la visite
                    </h4>
                <p className="text-foreground leading-relaxed font-medium">
                  {selectedConsultation.reason_for_visit || selectedConsultation.motif || "Non spécifié"}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="font-bold flex items-center gap-2">
                   Diagnostic Médical
                </Label>
                <Textarea
                  placeholder="Établissez votre diagnostic ici..."
                  value={activeConsultationData.diagnostic}
                  onChange={(e) => isConsultationEditable(selectedConsultation) && updateActiveData('diagnostic', e.target.value)}
                  disabled={!isConsultationEditable(selectedConsultation)}
                  className={`bg-background border-border min-h-[120px] rounded-xl focus:ring-primary ${!isConsultationEditable(selectedConsultation) ? 'bg-muted/50 cursor-not-allowed opacity-60' : ''}`}
                />
                {/* Debug pour voir la valeur */}
                <div className="text-xs text-muted-foreground">
                  Debug diagnostic: "{activeConsultationData.diagnostic}" | Longueur: {activeConsultationData.diagnostic?.length || 0}
                </div>
              </div>

              {/* --- SECTION EXAMENS PRESCRITS --- */}
              <div className="bg-blue-50/20 p-4 rounded-2xl border border-blue-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-blue-600 flex items-center gap-2">
                    <Beaker className="w-3 h-3" /> Examens / Analyses prescrits
                  </h4>
                  {/* ✅ AJOUT: Affichage du montant total en temps réel */}
                  {activeConsultationData.examList.length > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total estimé</p>
                      <p className="text-lg font-bold text-orange-600">{formatMontant(montantTotalExamens)}</p>
                    </div>
                  )}
                </div>

                {/* ✅ AJOUT: Message informatif workflow */}
                {activeConsultationData.examList.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
                    <ArrowRight className="w-4 h-4 text-orange-600 mt-0.5" />
                    <p className="text-xs text-orange-800">
                      <strong>Workflow:</strong> Le patient devra d'abord se rendre à la <strong>CAISSE</strong> pour régler {formatMontant(montantTotalExamens)}, 
                      puis se diriger vers le laboratoire avec le reçu de paiement.
                    </p>
                  </div>
                )}

                {/* liste actuelle */}
                {activeConsultationData.examList.map((ex, idx) => {
                  const svc = examServices.find(s => s.id?.toString() === ex.serviceId?.toString());
                  return (
                    <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-100">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{svc ? svc.name : 'Service inconnu'}</p>
                        {ex.note && <p className="text-xs text-muted-foreground">{ex.note}</p>}
                        {svc && <p className="text-xs font-bold text-orange-600">{formatMontant(svc.prix || svc.price)}</p>}
                      </div>
                      {isConsultationEditable(selectedConsultation) && (
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-700 p-1"
                          onClick={() => removeExam(idx)}
                        >×</button>
                      )}
                    </div>
                  );
                })}

                {/* ajout d'un examen (caché si consultation terminée) */}
                {isConsultationEditable(selectedConsultation) && (
                <div className="grid grid-cols-2 gap-2 items-end pt-2 border-t border-blue-100">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Type d'examen</label>
                    <select
                      value={newExamItem.serviceId}
                      onChange={(e) => setNewExamItem({ ...newExamItem, serviceId: e.target.value })}
                      className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="">Sélectionner...</option>
                      {examServices.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({formatMontant(s.prix || s.price)})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Remarque / Détails</label>
                    <Input
                      value={newExamItem.note}
                      onChange={(e) => setNewExamItem({ ...newExamItem, note: e.target.value })}
                      placeholder="Ajoutez un commentaire"
                      className="rounded-xl border-border h-10"
                    />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!newExamItem.serviceId) return;
                        addExam({ ...newExamItem });
                        setNewExamItem({ serviceId: '', note: '' });
                      }}
                    >Ajouter l'examen</Button>
                  </div>
                </div>
                )}
              </div>

              {/* ✅ NOUVEAU: SECTION RÉSULTATS DE LABORATOIRE */}
              {labResults.length > 0 && (
                <div className="bg-emerald-50/30 p-5 rounded-2xl border border-emerald-200 space-y-4">
                  <div className="flex items-center gap-2">
                    <Beaker className="w-5 h-5 text-emerald-600" />
                    <h4 className="text-sm font-black uppercase text-emerald-700">
                      Résultats de Laboratoire Reçus
                    </h4>
                    <Badge className="bg-emerald-500 text-white ml-2">
                      {labResults.length} examen(s)
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
                        
                        {/* Affichage des résultats */}
                        {(() => {
                          // Parser le JSON des résultats si c'est une chaîne
                          let resultsData = result.results;
                          if (typeof resultsData === 'string') {
                            try {
                              resultsData = JSON.parse(resultsData);
                            } catch (e) {
                              resultsData = { valeur: resultsData };
                            }
                          }
                          
                          return (
                            <div className="grid grid-cols-2 gap-4 mt-3">
                              {resultsData && Object.entries(resultsData).map(([key, value]) => (
                                <div key={key} className="bg-muted/30 p-2 rounded-lg">
                                  <p className="text-xs text-muted-foreground uppercase">{key}</p>
                                  <p className={`font-bold ${
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
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="text-xs font-bold text-blue-700 mb-1">Interprétation du biologiste:</p>
                            <p className="text-sm text-blue-800">{result.interpretation}</p>
                          </div>
                        )}
                        
                        {result.normalRange && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Valeurs de référence: {result.normalRange}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Message indiquant que la prescription est déverrouillée */}
                  <div className="bg-emerald-100 border border-emerald-300 rounded-lg p-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <p className="text-sm text-emerald-800">
                      <strong>Prêt pour prescription:</strong> Les résultats sont disponibles, vous pouvez maintenant rédiger la prescription médicale.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border">
                <Button 
                  className="flex-1 bg-primary text-white shadow-lg shadow-primary/20 h-12 rounded-xl"
                  onClick={handleSaveConsultation}
                  disabled={!isConsultationEditable(selectedConsultation)}
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Sauvegarder brouillon
                </Button>
                <Button 
                  className="flex-1 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 h-12 rounded-xl"
                  onClick={terminerConsultation}
                  disabled={!isConsultationEditable(selectedConsultation) || activeConsultationData.examList.length === 0}
                >
                  <ChevronRight className="w-5 h-5 mr-2" />
                  Terminer & envoyer à la caisse
                </Button>
                <Button 
                  variant="outline"
                  className="h-12 rounded-xl border-border"
                  onClick={() => setSheetOpen(false)}
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}
            </div>
            
            {/* Right: History Panel (30-40%) */}
            {selectedConsultation && (
              <div className={`lg:w-[35%] bg-gray-50 dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto ${showHistoryPanel ? 'block' : 'hidden'} lg:block`}>
                <div className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Historique Médical</h3>
                  </div>
                  <PatientHistoryPanel
                    patientId={selectedConsultation.patient?.id || selectedConsultation.patientId}
                    currentConsultationId={selectedConsultation.id}
                    onRenewPrescription={(prescription) => {
                      console.log('Renouvellement prescription:', prescription);
                      toast.success('Prescription copiée vers la consultation actuelle');
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Consultations;