import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  FileDown,
  User,
  Stethoscope,
  Activity,
  FlaskConical,
  FileText,
  Pill,
  Wallet,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Building2,
  Loader2,
  Lock,
  Shield,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { admissionService } from '../../services/admissionService';
import { useHospitalConfig } from '../../hooks/useHospitalConfig';
import { API_BASE_URL } from '../../config/environment';
import { toast } from 'sonner';
import api from '../../services/patients/Api';
import '../../styles/print.css';

/**
 * 🏥 FICHE MEDICALE PATIENT (SÉCURISÉE)
 * 
 * Affiche la même fiche médicale que l'espace médecin.
 * 🔒 Accès protégé par mot de passe à chaque ouverture (confidentialité médicale)
 * Session temporaire de 5 minutes après vérification.
 * 
 * Route: /patient/medical-report/:consultationId
 */
const MedicalReportPatientView = () => {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { config } = useHospitalConfig();
  const printRef = useRef();
  
  // 🔒 États pour la sécurité
  const [accessGranted, setAccessGranted] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [sessionExpiry, setSessionExpiry] = useState(null);

  // 🔒 SÉCURITÉ RENFORCÉE: Toujours demander le mot de passe à chaque ouverture
  // Pas de vérification de session existante - on force la saisie du mot de passe à chaque fois
  useEffect(() => {
    // Réinitialiser l'état d'accès à chaque chargement du composant
    setAccessGranted(false);
    setPassword('');
    setCheckingAccess(false);
    
    // 📝 Note: On ne vérifie PAS s'il existe une session active
    // Le patient doit TOUJOURS entrer son mot de passe pour voir sa fiche
    console.log('🔒 Sécurité: Mot de passe requis à chaque ouverture de fiche');
  }, [consultationId]);

  // 📄 Charger la fiche uniquement si l'accès est autorisé
  useEffect(() => {
    if (!accessGranted) return;
    
    const fetchReport = async () => {
      try {
        setLoading(true);
        const response = await admissionService.getPatientJourney(consultationId);
        console.log('📄 Données du rapport patient:', response);
        setReport(response);
      } catch (err) {
        console.error('❌ Erreur:', err);
        setError('Impossible de charger votre fiche médicale');
        toast.error('Erreur lors du chargement de la fiche');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [consultationId, accessGranted]);

  // 🔐 Vérifier le mot de passe
  const handleVerifyPassword = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      toast.error('Veuillez entrer votre mot de passe');
      return;
    }

    setVerifying(true);
    try {
      const response = await api.post(`/patient/documents/consultations/${consultationId}/verify`, {
        password: password
      });

      if (response.data?.success) {
        setAccessGranted(true);
        setSessionExpiry(response.data.expiresAt);
        toast.success('✅ Accès autorisé - Session valide 5 minutes');
      }
    } catch (err) {
      console.error('❌ Erreur vérification:', err);
      if (err.response?.status === 401) {
        toast.error('Mot de passe incorrect');
      } else if (err.response?.status === 403) {
        const remaining = err.response?.data?.remainingAmount;
        const message = remaining 
          ? `Paiement incomplet - Reste à payer: ${remaining} $`
          : err.response?.data?.message || 'Accès refusé - Paiement incomplet';
        toast.error(`⛔ ${message}`);
      } else {
        toast.error('Erreur lors de la vérification');
      }
    } finally {
      setVerifying(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const resolveLogoUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return url.startsWith('/') ? `${API_BASE_URL}${url}` : `${API_BASE_URL}/${url}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    toast.info("Sélectionnez 'Enregistrer au format PDF' comme destination d'impression");
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'SOLDE':
        return 'bg-emerald-100 text-emerald-800';
      case 'PARTIEL':
        return 'bg-amber-100 text-amber-800';
      case 'NON_PAYE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 🔒 Modal de vérification du mot de passe (accès non autorisé)
  if (!accessGranted) {
    return (
      <div className="min-h-screen bg-background print:hidden relative">
        {/* Arrière-plan flou avec contenu de la fiche (placeholder) */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-xl z-0" />
        
        {/* Header visible en arrière-plan */}
        <div className="relative z-10 p-4 opacity-30 pointer-events-none select-none">
          <div className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Retour</span>
          </div>
        </div>

        {/* Modal centré compact */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-2xl w-full max-w-sm animate-in zoom-in-95 fade-in duration-300">
            {/* Header avec icône et retour */}
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <Lock className="w-6 h-6 text-amber-600" />
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/patient/documents')}
                className="text-muted-foreground hover:text-foreground h-8 px-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Titre compact */}
            <h2 className="text-lg font-bold text-foreground mb-1">
              Fiche Médicale Protégée
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Confirmez votre <strong>mot de passe de connexion</strong>
            </p>

            {/* Info de sécurité compacte */}
            <div className="bg-amber-50/80 border border-amber-200/50 rounded-lg p-3 mb-4">
              <p className="text-xs text-amber-700 leading-relaxed">
                <Shield className="w-3 h-3 inline mr-1" />
                <strong>Confidentialité:</strong> Mot de passe requis à chaque consultation. Aucune session conservée.
              </p>
            </div>

            {/* Formulaire compact */}
            <form onSubmit={handleVerifyPassword} className="space-y-3">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Votre mot de passe..."
                  className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  disabled={verifying || checkingAccess}
                  autoComplete="new-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <Button
                type="submit"
                disabled={verifying || checkingAccess || !password.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-10 text-sm"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-1.5" />
                    Ouvrir la fiche
                  </>
                )}
              </Button>
            </form>

            {/* Footer minimal */}
            <p className="text-center text-[10px] text-muted-foreground mt-3">
              🔒 Données chiffrées et sécurisées
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ⏳ Chargement de la fiche (accès autorisé)
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center print:hidden">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-emerald-500" />
          <p className="text-muted-foreground">Chargement de votre fiche médicale...</p>
        </div>
      </div>
    );
  }

  // ❌ Erreur ou fiche introuvable
  if (error || !report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 print:hidden">
        <div className="bg-card border border-border rounded-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-rose-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Fiche introuvable</h2>
          <p className="text-muted-foreground mb-6">{error || 'Votre fiche médicale n\'est pas disponible actuellement.'}</p>
          <Button onClick={() => navigate('/patient/documents')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux documents
          </Button>
        </div>
      </div>
    );
  }

  // ✅ Affichage de la fiche médicale
  return (
    <div className="min-h-screen bg-background">
      {/* Header - Non imprimable */}
      <div className="print:hidden bg-background border-b border-border p-3 sm:p-4 sticky top-0 z-50 shadow-sm no-print">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Button variant="outline" size="sm" onClick={() => navigate('/patient/documents')} className="h-9 px-2 sm:px-3 shrink-0">
              <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="text-sm">Retour</span>
            </Button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">Ma Fiche Médicale</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Consultation #{report.consultationCode}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Indicateur de session sécurisée */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium">
              <Shield className="w-3.5 h-3.5" />
              <span>Session sécurisée</span>
            </div>
            <Button onClick={handlePrint} variant="outline" size="sm" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 h-9">
              <Printer className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Imprimer</span>
            </Button>
            <Button onClick={handleDownloadPDF} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-9">
              <FileDown className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Télécharger PDF</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Contenu du rapport - Optimisé pour impression */}
      <div ref={printRef} className="medical-print-container w-full mx-auto p-2 sm:p-3 print:p-2">
        {/* Bandeau d'en-tête dynamique avec config hospitalière */}
        <div
          className="print-header text-white rounded-t-lg p-3 sm:p-4"
          style={{ backgroundColor: config.primaryColor || '#059669' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Logo ou icône par défaut */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center shrink-0">
                {config.hospitalLogoUrl && config.enableLogoOnDocuments !== false ? (
                  <img
                    src={resolveLogoUrl(config.hospitalLogoUrl)}
                    alt={config.hospitalName}
                    className="w-12 h-12 sm:w-16 sm:h-16 object-contain"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <Building2
                    className="w-8 h-8 sm:w-10 sm:h-10"
                    style={{ color: config.primaryColor || '#059669' }}
                  />
                )}
              </div>
              <div>
                {/* Nom de l'hôpital et informations ministère/zone */}
                <h1 className="text-xl sm:text-2xl font-bold tracking-wide">
                  {config.hospitalName || 'INUA AFYA'}
                </h1>
                <p className="text-sm text-white/90">
                  {config.ministryName && `${config.ministryName} - `}
                  {config.zoneName || config.headerSubtitle || 'Système de Gestion Hospitalière'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-white/20 backdrop-blur-sm rounded px-3 py-1.5 mb-2">
                <p className="text-xs text-white/70 mb-0.5">N° DE FICHE</p>
                <p className="text-lg font-bold">
                  {report.consultationCode || report.numeroFiche || 'N/A'}
                </p>
              </div>
              <p className="text-sm font-medium">FICHE MEDICALE INDIVIDUELLE</p>
              <p className="text-xs text-white/80">
                {config.city && `${config.city}, `}
                Généré: {formatDate(report.reportGeneratedAt)}
              </p>
            </div>
          </div>

          {/* Informations supplémentaires (département, région) */}
          {(config.departmentName || config.region) && (
            <div className="mt-2 pt-2 border-t border-white/20 text-xs text-white/80">
              {config.departmentName && <span>{config.departmentName}</span>}
              {config.departmentName && config.region && <span className="mx-2">|</span>}
              {config.region && <span>{config.region}</span>}
              {config.country && <span className="ml-2">- {config.country}</span>}
            </div>
          )}
        </div>

        {/* Contenu avec bordure */}
        <div className="print-content border-2 border-emerald-600 border-t-0 rounded-b-lg bg-card">

          {/* Section 1: Identification Patient */}
          <div className="border-b border-border print-section">
            <div className="bg-muted/50 px-3 sm:px-4 py-2 border-b border-border">
              <h2 className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                <User className="w-3 h-3 sm:w-4 sm:h-4" />
                Identification du Patient
              </h2>
            </div>
            <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-muted-foreground sm:min-w-[90px]">Nom:</span>
                  <span className="text-sm sm:text-base border-b border-border flex-1 pb-1 truncate">{report.patientName}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-muted-foreground sm:min-w-[90px]">Code Patient:</span>
                  <span className="text-sm sm:text-base border-b border-border flex-1 pb-1">{report.patientCode}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-muted-foreground sm:min-w-[90px]">N° Fiche:</span>
                  <span className="text-sm sm:text-base border-b border-border flex-1 pb-1 font-bold text-emerald-700">{report.consultationCode}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-muted-foreground sm:min-w-[90px]">Age:</span>
                  <span className="text-sm sm:text-base border-b border-border flex-1 pb-1">{report.patientAge} ans</span>
                </div>
              </div>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-muted-foreground sm:min-w-[90px]">Sexe:</span>
                  <span className="text-sm sm:text-base border-b border-border flex-1 pb-1">{report.patientGender}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-muted-foreground sm:min-w-[90px]">Tel:</span>
                  <span className="text-sm sm:text-base border-b border-border flex-1 pb-1">{report.patientPhone || '-'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-muted-foreground sm:min-w-[90px]">Date:</span>
                  <span className="text-sm sm:text-base border-b border-border flex-1 pb-1">{formatDate(report.consultationDate)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Medecin Traitant */}
          <div className="border-b border-border print-section">
            <div className="bg-muted/50 px-3 sm:px-4 py-2 border-b border-border">
              <h2 className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                <Stethoscope className="w-3 h-3 sm:w-4 sm:h-4" />
                Médecin Traitant
              </h2>
            </div>
            <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground sm:min-w-[90px]">Nom:</span>
                <span className="text-sm sm:text-base border-b border-border flex-1 pb-1 truncate">{report.doctorName}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground sm:min-w-[90px]">Spécialité:</span>
                <span className="text-sm sm:text-base border-b border-border flex-1 pb-1">{report.doctorSpecialty}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Constantes Vitales */}
          {report.triageInfo && (
            <div className="border-b border-border print-section">
              <div className="bg-muted/50 px-3 sm:px-4 py-2 border-b border-border">
                <h2 className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                  <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
                  Constantes Vitales
                </h2>
              </div>
              <div className="p-3 sm:p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                  <div className="border border-border rounded p-2 sm:p-3 text-center bg-muted/50">
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Température</p>
                    <p className="text-base sm:text-lg font-semibold text-emerald-700">{report.triageInfo.temperature || '-'}°C</p>
                  </div>
                  <div className="border border-border rounded p-2 sm:p-3 text-center bg-muted/50">
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Tension</p>
                    <p className="text-base sm:text-lg font-semibold text-emerald-700">{report.triageInfo.tensionArterielle || '-'}</p>
                  </div>
                  <div className="border border-border rounded p-2 sm:p-3 text-center bg-muted/50">
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Poids</p>
                    <p className="text-base sm:text-lg font-semibold text-emerald-700">{report.triageInfo.poids || '-'} kg</p>
                  </div>
                  <div className="border border-border rounded p-2 sm:p-3 text-center bg-muted/50">
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Taille</p>
                    <p className="text-base sm:text-lg font-semibold text-emerald-700">{report.triageInfo.taille || '-'} cm</p>
                  </div>
                </div>
                {report.triageInfo.motifVisite && (
                  <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-[10px] sm:text-xs font-bold text-amber-800 uppercase mb-1">Motif de visite</p>
                    <p className="text-sm text-foreground">{report.triageInfo.motifVisite}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 4: Resultats Laboratoire */}
          {report.labResults && report.labResults.length > 0 && (
            <div className="border-b border-border print-section">
              <div className="bg-muted/50 px-3 sm:px-4 py-2 border-b border-border">
                <h2 className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                  <FlaskConical className="w-3 h-3 sm:w-4 sm:h-4" />
                  Résultats de Laboratoire
                </h2>
              </div>
              <div className="p-2 sm:p-4 overflow-x-auto">
                <table className="w-full border-collapse min-w-[500px] print-table">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border border-border px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-semibold text-muted-foreground">Examen</th>
                      <th className="border border-border px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-semibold text-muted-foreground">Résultat</th>
                      <th className="border border-border px-2 sm:px-3 py-2 text-center text-xs sm:text-sm font-semibold text-muted-foreground">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.labResults.map((lab, index) => (
                      <tr key={index} className={index % 2 === 1 ? 'bg-muted/30' : ''}>
                        <td className="border border-border px-2 sm:px-3 py-2 text-sm text-foreground">{lab.testName}</td>
                        <td className="border border-border px-2 sm:px-3 py-2 text-sm text-foreground">{lab.resultValue || 'En attente'}</td>
                        <td className="border border-border px-2 sm:px-3 py-2 text-center">
                          {lab.isCritical ? (
                            <Badge className="bg-red-100 text-red-800">Critique</Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800">Normal</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 5: Prescription */}
          {report.prescription && (
            <div className="border-b border-border print-section">
              <div className="bg-muted/50 px-3 sm:px-4 py-2 border-b border-border">
                <h2 className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                  Prescription Médicale
                </h2>
              </div>
              <div className="p-3 sm:p-4">
                {report.prescription.diagnosis && (
                  <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                    <span className="text-xs sm:text-sm font-semibold text-muted-foreground">Diagnostic:</span>
                    <span className="text-sm sm:text-base border-b border-border flex-1 pb-1">{report.prescription.diagnosis}</span>
                  </div>
                )}
                {report.prescription.items && report.prescription.items.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[400px] print-table">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="border border-border px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-semibold text-muted-foreground">Médicament</th>
                          <th className="border border-border px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-semibold text-muted-foreground">Dosage</th>
                          <th className="border border-border px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-semibold text-muted-foreground">Fréquence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.prescription.items.map((item, index) => (
                          <tr key={index} className={index % 2 === 1 ? 'bg-muted/30' : ''}>
                            <td className="border border-border px-2 sm:px-3 py-2 text-sm text-foreground">{item.medicationName}</td>
                            <td className="border border-border px-2 sm:px-3 py-2 text-sm text-foreground">{item.dosage}</td>
                            <td className="border border-border px-2 sm:px-3 py-2 text-sm text-foreground">{item.frequency}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 6: Pharmacie */}
          {report.pharmacyStatus && (
            <div className="border-b border-border print-section">
              <div className="bg-muted/50 px-3 sm:px-4 py-2 border-b border-border">
                <h2 className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                  <Pill className="w-3 h-3 sm:w-4 sm:h-4" />
                  Dispensation Pharmacie
                </h2>
              </div>
              <div className="p-2 sm:p-4 overflow-x-auto">
                <table className="w-full border-collapse min-w-[400px] print-table">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border border-border px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-semibold text-muted-foreground">Médicament</th>
                      <th className="border border-border px-2 sm:px-3 py-2 text-center text-xs sm:text-sm font-semibold text-muted-foreground">Prescrit</th>
                      <th className="border border-border px-2 sm:px-3 py-2 text-center text-xs sm:text-sm font-semibold text-muted-foreground">Délivré</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.pharmacyStatus.items?.map((item, index) => (
                      <tr key={index} className={index % 2 === 1 ? 'bg-muted/30' : ''}>
                        <td className="border border-border px-2 sm:px-3 py-2 text-sm text-foreground">{item.medicationName}</td>
                        <td className="border border-border px-2 sm:px-3 py-2 text-center text-sm text-foreground">{item.prescribedQty}</td>
                        <td className="border border-border px-2 sm:px-3 py-2 text-center text-sm text-foreground">{item.deliveredQty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 7: Facturation */}
          {report.billingSummary && (
            <div className="print-section">
              <div className="bg-muted/50 px-3 sm:px-4 py-2 border-b border-border">
                <h2 className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                  <Wallet className="w-3 h-3 sm:w-4 sm:h-4" />
                  {report.isAbonne ? 'Couverture Entreprise' : 'Facturation'}
                </h2>
              </div>
              <div className="p-3 sm:p-4">
                {report.isAbonne ? (
                  // ✅ ABONNÉ → pas de montants, juste un message de couverture
                  <div className="flex flex-col items-center justify-center py-6 sm:py-8 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600 mb-3" />
                    <p className="text-sm sm:text-base font-bold text-emerald-800 text-center">
                      {report.companyName
                        ? `Couvert à 100% par ${report.companyName}`
                        : 'Couvert à 100% par votre entreprise'}
                    </p>
                    <p className="text-xs text-emerald-600 mt-1 text-center">
                      Patient abonné — toutes les consommations sont prises en charge
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Tableau des transactions détaillées */}
                    <div className="overflow-x-auto mb-4 sm:mb-6">
                      <table className="w-full border-collapse min-w-[400px] print-table">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="border border-border px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-semibold text-muted-foreground">Description</th>
                            <th className="border border-border px-2 sm:px-3 py-2 text-right text-xs sm:text-sm font-semibold text-muted-foreground">Montant</th>
                            <th className="border border-border px-2 sm:px-3 py-2 text-center text-xs sm:text-sm font-semibold text-muted-foreground">Statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-border px-2 sm:px-3 py-2 text-sm text-foreground">Frais de fiche</td>
                            <td className="border border-border px-2 sm:px-3 py-2 text-sm text-right font-medium text-foreground">{report.billingSummary.fraisFiche?.toLocaleString()} $</td>
                            <td className="border border-border px-2 sm:px-3 py-2 text-center">
                              {report.billingSummary.fraisFichePaid ? (
                                <Badge className="bg-emerald-100 text-emerald-800">Payé</Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-800">En attente</Badge>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-border px-2 sm:px-3 py-2 text-sm text-foreground">Consultation</td>
                            <td className="border border-border px-2 sm:px-3 py-2 text-sm text-right font-medium text-foreground">{report.billingSummary.consultationAmount?.toLocaleString()} $</td>
                            <td className="border border-border px-2 sm:px-3 py-2 text-center">
                              {report.billingSummary.consultationPaid ? (
                                <Badge className="bg-emerald-100 text-emerald-800">Payé</Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-800">En attente</Badge>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-border px-2 sm:px-3 py-2 text-sm text-foreground">Laboratoire</td>
                            <td className="border border-border px-2 sm:px-3 py-2 text-sm text-right font-medium text-foreground">{report.billingSummary.labAmount?.toLocaleString()} $</td>
                            <td className="border border-border px-2 sm:px-3 py-2 text-center">
                              {report.billingSummary.labPaid ? (
                                <Badge className="bg-emerald-100 text-emerald-800">Payé</Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-800">En attente</Badge>
                              )}
                            </td>
                          </tr>
                          {report.billingSummary.pharmacyAmount && report.billingSummary.pharmacyAmount > 0 && (
                            <tr>
                              <td className="border border-border px-2 sm:px-3 py-2 text-sm text-foreground">Pharmacie</td>
                              <td className="border border-border px-2 sm:px-3 py-2 text-sm text-right font-medium text-foreground">{report.billingSummary.pharmacyAmount?.toLocaleString()} $</td>
                              <td className="border border-border px-2 sm:px-3 py-2 text-center">
                                {report.billingSummary.pharmacyPaid ? (
                                  <Badge className="bg-emerald-100 text-emerald-800">Payé</Badge>
                                ) : (
                                  <Badge className="bg-amber-100 text-amber-800">En attente</Badge>
                                )}
                              </td>
                            </tr>
                          )}
                          {report.billingSummary.otherAmounts?.map((item, index) => (
                            <tr key={index} className={index % 2 === 1 ? 'bg-muted/30' : ''}>
                              <td className="border border-border px-2 sm:px-3 py-2 text-sm text-foreground">
                                <span className="font-medium">{item.label}</span>
                              </td>
                              <td className="border border-border px-2 sm:px-3 py-2 text-sm text-right font-medium text-foreground">
                                {item.amount?.toLocaleString()} $
                              </td>
                              <td className="border border-border px-2 sm:px-3 py-2 text-center">
                                {item.isPaid ? (
                                  <Badge className="bg-emerald-100 text-emerald-800">Payé</Badge>
                                ) : (
                                  <Badge className="bg-amber-100 text-amber-800">En attente</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Récapitulatif des montants */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      {/* Colonne gauche - Totaux */}
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 sm:p-4">
                        <h3 className="text-xs sm:text-sm font-bold text-emerald-800 mb-2 sm:mb-3 uppercase">Récapitulatif</h3>
                        <div className="space-y-1.5 sm:space-y-2">
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-muted-foreground">TOTAL</span>
                            <span className="font-bold text-base sm:text-lg text-emerald-700">{report.billingSummary.totalAmount?.toLocaleString()} $</span>
                          </div>
                          <div className="h-px bg-emerald-200 my-1 sm:my-2"></div>
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-muted-foreground">PAYÉ</span>
                            <span className="font-semibold text-emerald-600">{report.billingSummary.totalPaid?.toLocaleString()} $</span>
                          </div>
                          <div className="flex justify-between text-xs sm:text-sm bg-background p-1.5 sm:p-2 rounded border border-emerald-200">
                            <span className="text-foreground font-medium">RESTE</span>
                            <span className={`font-bold ${report.billingSummary.balanceDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                              {report.billingSummary.balanceDue?.toLocaleString()} $
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Colonne droite - Statut global */}
                      <div className="flex flex-col justify-center items-center bg-muted/50 border border-border rounded-lg p-3 sm:p-4">
                        <span className="text-xs sm:text-sm text-muted-foreground mb-2">Statut</span>
                        <Badge className={`${getPaymentStatusColor(report.billingSummary.paymentStatus)} px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-bold`}>
                          {report.billingSummary.paymentStatus === 'SOLDE' && <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />}
                          {report.billingSummary.paymentStatus === 'PARTIEL' && <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />}
                          {report.billingSummary.paymentStatus === 'NON_PAYE' && <XCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />}
                          {report.billingSummary.paymentStatus}
                        </Badge>
                        {report.billingSummary.lastPaymentDate && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Dernier paiement: {formatDate(report.billingSummary.lastPaymentDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Styles pour l'impression */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          html, body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .medical-print-container {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          
          .max-w-5xl, .max-w-4xl, .max-w-3xl,
          .container, .mx-auto, [class*="max-w-"] {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
          }
          
          .p-4, .p-6, .px-4, .px-6, .sm\\:p-6 {
            padding: 2mm !important;
          }
          
          .print-header {
            background-color: #059669 !important;
            color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 8px !important;
          }
          
          .print-content {
            border: 2px solid #059669 !important;
            border-top: none !important;
            background: white !important;
            border-radius: 0 !important;
          }
          
          .print-section {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          
          .print-table {
            width: 100% !important;
            break-inside: auto !important;
          }
          
          .print-table thead {
            display: table-header-group !important;
          }
          
          .print-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          
          .text-foreground, .text-muted-foreground,
          p, span, td, th, div {
            color: #000000 !important;
          }
          
          .text-muted-foreground {
            color: #4b5563 !important;
          }
          
          .text-emerald-700 { color: #047857 !important; }
          .text-emerald-800 { color: #065f46 !important; }
          .bg-emerald-50 { background-color: #ecfdf5 !important; }
          .bg-emerald-100 { background-color: #d1fae5 !important; }
          .border-emerald-600 { border-color: #059669 !important; }
          
          .bg-muted\\/50, .bg-muted\\/30 {
            background-color: #f9fafb !important;
          }
          
          .bg-card, .bg-background {
            background-color: white !important;
          }
          
          .border-border {
            border-color: #e5e7eb !important;
          }
          
          .bg-amber-100 { background-color: #fef3c7 !important; }
          .text-amber-800 { color: #92400e !important; }
          
          .bg-red-100 { background-color: #fee2e2 !important; }
          .text-red-800 { color: #991b1b !important; }
          
          .bg-rose-100 { background-color: #ffe4e6 !important; }
          .text-rose-600 { color: #e11d48 !important; }
        }
      `}</style>
    </div>
  );
};

export default MedicalReportPatientView;
