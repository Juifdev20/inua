import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { admissionService } from '../../services/admissionService';
import { patientService } from '../../services/patientService';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  Printer, 
  ArrowLeft, 
  FileText, 
  Heart,
  Activity,
  User,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Stethoscope
} from 'lucide-react';

/**
 * Composant ReceptionMedicalReport - Vue simplifiée de la fiche pour la réception
 * Utilise les endpoints accessibles par la réception (pas patient-journey)
 */
const ReceptionMedicalReport = () => {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const [admission, setAdmission] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // État pour les sections repliables sur mobile
  const [expandedSections, setExpandedSections] = useState({
    patient: true,
    doctor: true,
    triage: true,
    status: true
  });

  useEffect(() => {
    loadData();
  }, [consultationId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Récupérer l'admission (accessible par la réception)
      const admissionData = await admissionService.getAdmissionById(consultationId);
      setAdmission(admissionData);
      
      // Récupérer les infos patient si disponible
      if (admissionData?.patient?.id || admissionData?.patientId) {
        try {
          const patientId = admissionData.patient?.id || admissionData.patientId;
          const patientData = await patientService.getPatientById(patientId);
          setPatient(patientData);
        } catch (err) {
          console.log('Patient détails non récupérés, utilisation des données admission');
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
      setError(error.message || 'Erreur lors du chargement');
      toast.error('Impossible de charger la fiche');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'EN_COURS': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'TERMINEE': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'PAYEE': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'ANNULEE': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'EN_COURS': return <Clock className="w-4 h-4" />;
      case 'TERMINEE': return <CheckCircle2 className="w-4 h-4" />;
      case 'PAYEE': return <CheckCircle2 className="w-4 h-4" />;
      case 'ANNULEE': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Composant pour les sections repliables sur mobile
  const MobileSection = ({ title, icon: Icon, sectionKey, children }) => (
    <div className="border-b border-emerald-200">
      <button
        onClick={() => toggleSection(sectionKey)}
        className="w-full bg-emerald-50 px-3 md:px-4 py-2 md:py-3 border-b border-emerald-200 flex items-center justify-between md:cursor-default"
      >
        <h2 className="text-xs md:text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
          <Icon className="w-3 h-3 md:w-4 md:h-4" />
          {title}
        </h2>
        <span className="md:hidden">
          {expandedSections[sectionKey] ? (
            <ChevronUp className="w-4 h-4 text-emerald-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-emerald-600" />
          )}
        </span>
      </button>
      <div className={`${expandedSections[sectionKey] ? 'block' : 'hidden md:block'}`}>
        {children}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error || !admission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-red-600 text-center font-medium">{error || 'Fiche introuvable'}</p>
        <p className="text-sm text-gray-500 text-center max-w-md">
          La réception n'a pas accès aux détails médicaux complets. 
          Contactez un médecin pour la fiche complète.
        </p>
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
      </div>
    );
  }

  // Données fusionnées admission + patient
  const patientData = patient || admission.patient || {};
  const doctorData = admission.doctor || {};
  
  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Header - Non imprimable */}
      <div className="print:hidden bg-white border-b p-3 md:p-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1000px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="h-9">
              <ArrowLeft className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Retour</span>
            </Button>
            <div>
              <h1 className="text-base md:text-lg font-semibold text-gray-900">Fiche Admission - Réception</h1>
              <p className="text-xs md:text-sm text-gray-500">Consultation #{admission.consultationCode || admission.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={handlePrint} 
              variant="outline" 
              size="sm"
              className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 h-9"
            >
              <Printer className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Imprimer</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Message info - non imprimable */}
      <div className="print:hidden max-w-[900px] mx-auto px-3 md:px-6 pt-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Vue simplifiée - Réception</p>
            <p className="text-xs text-amber-700 mt-1">
              Cette fiche affiche les informations basiques du triage. 
              Pour la fiche médicale complète (diagnostic, prescriptions, résultats labo), 
              consultez un médecin ou le module docteur.
            </p>
          </div>
        </div>
      </div>

      {/* Contenu du rapport */}
      <div className="max-w-[900px] mx-auto p-3 md:p-6 print:p-0">
        
        {/* Bandeau d'en-tete INUA AFIA */}
        <div className="bg-emerald-600 text-white rounded-t-lg p-3 md:p-4 print:rounded-none print:bg-emerald-600">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-wide">INUA AFIA</h1>
                <p className="text-xs md:text-sm text-emerald-100">Système de Gestion Hospitalière</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs md:text-sm font-medium">FICHE D'ADMISSION</p>
              <p className="text-[10px] md:text-xs text-emerald-100">Accès Réception</p>
            </div>
          </div>
        </div>

        {/* Contenu avec bordure */}
        <div className="border-2 border-emerald-600 border-t-0 rounded-b-lg bg-white print:border-2 print:rounded-none">
          
          {/* Section 1: Statut de la consultation */}
          <MobileSection title="Statut" icon={FileText} sectionKey="status">
            <div className="p-3 md:p-4">
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Statut actuel</p>
                  <Badge className={`${getStatusColor(admission.status)} px-3 py-1.5 text-sm font-bold`}>
                    {getStatusIcon(admission.status)}
                    <span className="ml-2">{admission.status || 'INCONNU'}</span>
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">Date d'admission</p>
                  <p className="text-sm font-medium">{formatDate(admission.createdAt || admission.consultationDate)}</p>
                </div>
              </div>
            </div>
          </MobileSection>

          {/* Section 2: Identification Patient */}
          <MobileSection title="Identification du Patient" icon={User} sectionKey="patient">
            <div className="p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-2 md:space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                  <span className="text-xs md:text-sm font-semibold text-gray-700 sm:min-w-[100px]">Nom:</span>
                  <span className="text-sm md:text-base border-b border-gray-300 flex-1 pb-1">
                    {patientData.firstName} {patientData.lastName}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                  <span className="text-xs md:text-sm font-semibold text-gray-700 sm:min-w-[100px]">Code Patient:</span>
                  <span className="text-sm md:text-base border-b border-gray-300 flex-1 pb-1">
                    {patientData.patientCode || patientData.code || '-'}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                  <span className="text-xs md:text-sm font-semibold text-gray-700 sm:min-w-[100px]">Âge:</span>
                  <span className="text-sm md:text-base border-b border-gray-300 flex-1 pb-1">
                    {patientData.age || patientData.birthDate ? 
                      (patientData.age || Math.floor((new Date() - new Date(patientData.birthDate)) / (365.25 * 24 * 60 * 60 * 1000))) + ' ans' 
                      : '-'}
                  </span>
                </div>
              </div>
              <div className="space-y-2 md:space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                  <span className="text-xs md:text-sm font-semibold text-gray-700 sm:min-w-[100px]">Sexe:</span>
                  <span className="text-sm md:text-base border-b border-gray-300 flex-1 pb-1">
                    {patientData.gender || patientData.sexe || '-'}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                  <span className="text-xs md:text-sm font-semibold text-gray-700 sm:min-w-[100px]">Téléphone:</span>
                  <span className="text-sm md:text-base border-b border-gray-300 flex-1 pb-1">
                    {patientData.phoneNumber || patientData.phone || patientData.telephone || '-'}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                  <span className="text-xs md:text-sm font-semibold text-gray-700 sm:min-w-[100px]">Adresse:</span>
                  <span className="text-sm md:text-base border-b border-gray-300 flex-1 pb-1">
                    {patientData.address || patientData.city || patientData.healthArea || '-'}
                  </span>
                </div>
              </div>
            </div>
          </MobileSection>

          {/* Section 3: Médecin Traitant */}
          <MobileSection title="Médecin Traitant" icon={Stethoscope} sectionKey="doctor">
            <div className="p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <span className="text-xs md:text-sm font-semibold text-gray-700 sm:min-w-[100px]">Nom:</span>
                <span className="text-sm md:text-base border-b border-gray-300 flex-1 pb-1">
                  {doctorData.firstName} {doctorData.lastName}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <span className="text-xs md:text-sm font-semibold text-gray-700 sm:min-w-[100px]">Spécialité:</span>
                <span className="text-sm md:text-base border-b border-gray-300 flex-1 pb-1">
                  {doctorData.specialty || doctorData.specialite || 'Non assigné'}
                </span>
              </div>
            </div>
          </MobileSection>

          {/* Section 4: Constantes Vitales (Triage) */}
          <MobileSection title="Constantes Vitales - Triage" icon={Activity} sectionKey="triage">
            <div className="p-3 md:p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                <div className="border border-gray-200 rounded p-2 md:p-3 text-center bg-gray-50">
                  <p className="text-[10px] md:text-xs text-gray-500 mb-1">Température</p>
                  <p className="text-base md:text-lg font-semibold text-emerald-700">
                    {admission.temperature || admission.triage?.temperature || '-'}
                    {(admission.temperature || admission.triage?.temperature) && '°C'}
                  </p>
                </div>
                <div className="border border-gray-200 rounded p-2 md:p-3 text-center bg-gray-50">
                  <p className="text-[10px] md:text-xs text-gray-500 mb-1">Tension</p>
                  <p className="text-base md:text-lg font-semibold text-emerald-700">
                    {admission.tensionArterielle || admission.triage?.tensionArterielle || admission.tension || '--/--'}
                  </p>
                </div>
                <div className="border border-gray-200 rounded p-2 md:p-3 text-center bg-gray-50">
                  <p className="text-[10px] md:text-xs text-gray-500 mb-1">Poids</p>
                  <p className="text-base md:text-lg font-semibold text-emerald-700">
                    {admission.poids || admission.triage?.poids || '-'}
                    {(admission.poids || admission.triage?.poids) && ' kg'}
                  </p>
                </div>
                <div className="border border-gray-200 rounded p-2 md:p-3 text-center bg-gray-50">
                  <p className="text-[10px] md:text-xs text-gray-500 mb-1">Taille</p>
                  <p className="text-base md:text-lg font-semibold text-emerald-700">
                    {admission.taille || admission.triage?.taille || '-'}
                    {(admission.taille || admission.triage?.taille) && ' cm'}
                  </p>
                </div>
              </div>
              {(admission.reasonForVisit || admission.motif || admission.triage?.motifVisite) && (
                <div className="mt-3 md:mt-4 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                  <span className="text-xs md:text-sm font-semibold text-gray-700">Motif de visite:</span>
                  <span className="text-sm md:text-base border-b border-gray-300 flex-1 pb-1">
                    {admission.reasonForVisit || admission.motif || admission.triage?.motifVisite}
                  </span>
                </div>
              )}
              {(admission.symptomes || admission.triage?.symptomes) && (
                <div className="mt-3 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                  <span className="text-xs md:text-sm font-semibold text-gray-700">Symptômes:</span>
                  <span className="text-sm md:text-base border-b border-gray-300 flex-1 pb-1">
                    {admission.symptomes || admission.triage?.symptomes}
                  </span>
                </div>
              )}
            </div>
          </MobileSection>

          {/* Pied de page */}
          <div className="border-t border-emerald-200 p-3 md:p-4 text-center text-[10px] md:text-xs text-gray-500 bg-gray-50 rounded-b-lg print:rounded-none">
            <p className="font-medium text-emerald-700">Document généré par INUA AFIA - Système de Gestion Hospitalière</p>
            <p>Généré le {formatDate(new Date())}</p>
            <p className="mt-2 text-gray-400">Ce document est confidentiel. Vue réception - informations triage uniquement.</p>
          </div>
        </div>
      </div>

      {/* Styles pour l'impression */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .print\\:hidden,
          nav, aside, .sidebar, header,
          .fixed, .sticky, [role="banner"] {
            display: none !important;
          }
          
          .bg-emerald-600 {
            background-color: #059669 !important;
            -webkit-print-color-adjust: exact;
          }
          
          .bg-emerald-50 {
            background-color: #ecfdf5 !important;
            -webkit-print-color-adjust: exact;
          }
          
          .hidden.md\\:block {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ReceptionMedicalReport;
