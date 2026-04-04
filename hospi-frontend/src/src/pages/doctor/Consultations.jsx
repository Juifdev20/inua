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
  Wallet,        // ✅ AJOUT: Icône caisse
  CreditCard,    // ✅ AJOUT: Icône paiement
  ArrowRight     // ✅ AJOUT: Icône workflow
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

const API = "http://localhost:8080/api/v1/doctor";

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
    return `http://localhost:8080${patientPhoto}`;
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
  
  const [newConsultation, setNewConsultation] = useState({
    patient_id: '',
    motif: '',
    symptomes: []
  });

  const [editData, setEditData] = useState({
    diagnostic: '',
    traitement: '',
    notes_medicales: '',
    constantes: { tension: '', temperature: '', poids: '' }
  });

  const [examServices, setExamServices] = useState([]);
  const [examList, setExamList] = useState([]);
  const [newExamItem, setNewExamItem] = useState({ serviceId: '', note: '' });

  // ✅ NOUVEAU: Calcul du montant total des examens sélectionnés
  const montantTotalExamens = useMemo(() => {
    return examList.reduce((total, exam) => {
      const service = examServices.find(s => s.id?.toString() === exam.serviceId?.toString());
      return total + (service?.prix || service?.price || 0);
    }, 0);
  }, [examList, examServices]);

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
      const response = await api.get(`${API}/consultations`);
      const data = response.data.data?.content || response.data.consultations || response.data || [];
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
      fetchConsultations();
    } catch (error) {
      toast.error("Erreur lors de la création");
      console.error('Error creating consultation:', error);
    }
  };

  // ✅ CORRIGÉ: Message adapté au nouveau workflow (Caisse, pas Réception/Labo direct)
  const terminerConsultation = async () => {
    if (!selectedConsultation) return;
    
    if (examList.length === 0) {
      toast.error('Veuillez sélectionner au moins un examen avant de terminer');
      return;
    }
    
    try {
      const endpoint = `${API}/consultations/${selectedConsultation.id}/terminer`;
      
      const requestData = {
        diagnostic: editData.diagnostic || '',
        traitement: editData.traitement || '',
        exams: examList.map(exam => ({
          serviceId: parseInt(exam.serviceId),
          note: exam.note || ''
        }))
      };

      console.log('📡 Envoi vers:', endpoint);
      console.log('📋 Payload:', JSON.stringify(requestData));

      const response = await api.put(endpoint, requestData);
      
      const examCount = examList.length;
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
      setExamList([]);
      setEditData({
        diagnostic: '',
        traitement: '',
        notes_medicales: '',
        constantes: { tension: '', temperature: '', poids: '' }
      });
      
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
        diagnostic: editData.diagnostic,
        traitement: editData.traitement,
        notes_medicales: editData.notes_medicales,
        exams: examList.map(e => ({ serviceId: e.serviceId, note: e.note }))
      };

      const response = await api.put(endpoint, payload);
      toast.success('Fiche patient mise à jour');
      fetchConsultations();
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
        setSheetOpen(true);
    } catch (error) {
        console.error('❌ Erreur ouverture consultation:', error);
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

  const filteredConsultations = (consultations || []).filter(cons => {
    if (!cons) return false;
    const patient = cons.patient;
    const patientName = patient ? `${patient.first_name || patient.firstName || patient.prenom || ''} ${patient.last_name || patient.lastName || patient.nom || ''}`.toLowerCase() : "";
    const motif = (cons.reason_for_visit || cons.motif || "").toLowerCase();
    const matchesSearch = patientName.includes(searchTerm.toLowerCase()) || motif.includes(searchTerm.toLowerCase());
    const currentStatus = (cons.status || cons.statut || '').toLowerCase();
    const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter;
    return matchesSearch && matchesStatus;
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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 rounded-xl" data-testid="new-consultation-btn">
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
        <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-card border-border shadow-2xl backdrop-blur-sm">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center gap-4 mb-2">
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
          </DialogHeader>
          
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
                  value={editData.diagnostic}
                  onChange={(e) => setEditData({ ...editData, diagnostic: e.target.value })}
                  className="bg-background border-border min-h-[120px] rounded-xl focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold">Prescription Médicale</Label>
                <Textarea
                  placeholder="Sera actif après réception des résultats labo"
                  value=""
                  disabled
                  className="bg-muted border-border min-h-[120px] rounded-xl opacity-50 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground italic">Ce champ sera déverrouillé une fois les résultats d'analyses reçus du laboratoire.</p>
              </div>

              {/* --- SECTION EXAMENS PRESCRITS --- */}
              <div className="bg-blue-50/20 p-4 rounded-2xl border border-blue-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-blue-600 flex items-center gap-2">
                    <Beaker className="w-3 h-3" /> Examens / Analyses prescrits
                  </h4>
                  {/* ✅ AJOUT: Affichage du montant total en temps réel */}
                  {examList.length > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total estimé</p>
                      <p className="text-lg font-bold text-orange-600">{formatMontant(montantTotalExamens)}</p>
                    </div>
                  )}
                </div>

                {/* ✅ AJOUT: Message informatif workflow */}
                {examList.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
                    <ArrowRight className="w-4 h-4 text-orange-600 mt-0.5" />
                    <p className="text-xs text-orange-800">
                      <strong>Workflow:</strong> Le patient devra d'abord se rendre à la <strong>CAISSE</strong> pour régler {formatMontant(montantTotalExamens)}, 
                      puis se diriger vers le laboratoire avec le reçu de paiement.
                    </p>
                  </div>
                )}

                {/* liste actuelle */}
                {examList.map((ex, idx) => {
                  const svc = examServices.find(s => s.id?.toString() === ex.serviceId?.toString());
                  return (
                    <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-100">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{svc ? svc.name : 'Service inconnu'}</p>
                        {ex.note && <p className="text-xs text-muted-foreground">{ex.note}</p>}
                        {svc && <p className="text-xs font-bold text-orange-600">{formatMontant(svc.prix || svc.price)}</p>}
                      </div>
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-700 p-1"
                        onClick={() => setExamList(examList.filter((_, i) => i !== idx))}
                      >×</button>
                    </div>
                  );
                })}

                {/* ajout d'un examen */}
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
                        setExamList([...examList, { ...newExamItem }]);
                        setNewExamItem({ serviceId: '', note: '' });
                      }}
                    >Ajouter l'examen</Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border">
                <Button 
                  className="flex-1 bg-primary text-white shadow-lg shadow-primary/20 h-12 rounded-xl"
                  onClick={handleSaveConsultation}
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Sauvegarder brouillon
                </Button>
                <Button 
                  className="flex-1 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 h-12 rounded-xl"
                  onClick={terminerConsultation}
                  disabled={examList.length === 0}
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
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Consultations;