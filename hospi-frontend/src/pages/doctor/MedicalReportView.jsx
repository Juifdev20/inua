import React, { useEffect, useState } from 'react';
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
  Heart
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { admissionService } from '../../services/admissionService';
import { toast } from 'sonner';

const MedicalReportView = () => {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const response = await admissionService.getPatientJourney(consultationId);
        setReport(response);
      } catch (err) {
        console.error('Erreur:', err);
        setError('Impossible de charger la fiche médicale');
        toast.error('Erreur lors du chargement de la fiche');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [consultationId]);

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

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    toast.info('Téléchargement PDF en cours...');
    // TODO: Implémenter le téléchargement PDF
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement de la fiche médicale...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-rose-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Dossier introuvable</h2>
          <p className="text-muted-foreground mb-6">{error || 'La fiche médicale n\'a pas pu être chargée.'}</p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background print:bg-white print:text-black">
      {/* Header - Non imprimable */}
      <div className="print:hidden bg-background border-b border-border p-3 sm:p-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="h-9 px-2 sm:px-3 shrink-0">
              <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="text-sm">Retour</span>
            </Button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">Fiche Medicale Individuelle</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Consultation #{report.consultationCode}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={handlePrint} variant="outline" size="sm" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 h-9">
              <Printer className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Imprimer</span>
            </Button>
            <Button onClick={handleDownloadPDF} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-9">
              <FileDown className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Contenu du rapport */}
      <div className="max-w-5xl mx-auto p-4 sm:p-6 print:p-0">
        {/* Bandeau d-en-tete INUA AFIA */}
        <div className="bg-emerald-600 text-white rounded-t-lg p-3 sm:p-4 print:rounded-none print:bg-emerald-600">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-wide">INUA AFIA</h1>
                <p className="text-sm text-emerald-100">Systeme de Gestion Hospitaliere</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">FICHE MEDICALE INDIVIDUELLE</p>
              <p className="text-xs text-emerald-100">Genere: {formatDate(report.reportGeneratedAt)}</p>
            </div>
          </div>
        </div>

        {/* Contenu avec bordure */}
        <div className="border-2 border-emerald-600 border-t-0 rounded-b-lg bg-card print:border-2 print:rounded-none">
          
          {/* Section 1: Identification Patient */}
          <div className="border-b border-border">
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
                  <span className="text-xs sm:text-sm font-semibold text-muted-foreground sm:min-w-[90px]">Code:</span>
                  <span className="text-sm sm:text-base border-b border-border flex-1 pb-1">{report.patientCode}</span>
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
          <div className="border-b border-border">
            <div className="bg-muted/50 px-3 sm:px-4 py-2 border-b border-border">
              <h2 className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                <Stethoscope className="w-3 h-3 sm:w-4 sm:h-4" />
                Medecin Traitant
              </h2>
            </div>
            <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground sm:min-w-[90px]">Nom:</span>
                <span className="text-sm sm:text-base border-b border-border flex-1 pb-1 truncate">{report.doctorName}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground sm:min-w-[90px]">Specialite:</span>
                <span className="text-sm sm:text-base border-b border-border flex-1 pb-1">{report.doctorSpecialty}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Constantes Vitales */}
          {report.triageInfo && (
            <div className="border-b border-border">
              <div className="bg-muted/50 px-3 sm:px-4 py-2 border-b border-border">
                <h2 className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                  <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
                  Constantes Vitales
                </h2>
              </div>
              <div className="p-3 sm:p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                  <div className="border border-border rounded p-2 sm:p-3 text-center bg-muted/50">
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Temperature</p>
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
            <div className="border-b border-border">
              <div className="bg-muted/50 px-3 sm:px-4 py-2 border-b border-border">
                <h2 className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                  <FlaskConical className="w-3 h-3 sm:w-4 sm:h-4" />
                  Resultats de Laboratoire
                </h2>
              </div>
              <div className="p-2 sm:p-4 overflow-x-auto">
                <table className="w-full border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border border-border px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-semibold text-muted-foreground">Examen</th>
                      <th className="border border-border px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-semibold text-muted-foreground">Resultat</th>
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
            <div className="border-b border-border">
              <div className="bg-muted/50 px-3 sm:px-4 py-2 border-b border-border">
                <h2 className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                  Prescription Medicale
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
                    <table className="w-full border-collapse min-w-[400px]">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="border border-border px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-semibold text-muted-foreground">Medicament</th>
                          <th className="border border-border px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-semibold text-muted-foreground">Dosage</th>
                          <th className="border border-border px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-semibold text-muted-foreground">Frequence</th>
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
            <div className="border-b border-border">
              <div className="bg-muted/50 px-3 sm:px-4 py-2 border-b border-border">
                <h2 className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                  <Pill className="w-3 h-3 sm:w-4 sm:h-4" />
                  Dispensation Pharmacie
                </h2>
              </div>
              <div className="p-2 sm:p-4 overflow-x-auto">
                <table className="w-full border-collapse min-w-[400px]">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border border-border px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-semibold text-muted-foreground">Medicament</th>
                      <th className="border border-border px-2 sm:px-3 py-2 text-center text-xs sm:text-sm font-semibold text-muted-foreground">Prescrit</th>
                      <th className="border border-border px-2 sm:px-3 py-2 text-center text-xs sm:text-sm font-semibold text-muted-foreground">Delivre</th>
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
            <div>
              <div className="bg-muted/50 px-3 sm:px-4 py-2 border-b border-border">
                <h2 className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                  <Wallet className="w-3 h-3 sm:w-4 sm:h-4" />
                  Facturation
                </h2>
              </div>
              <div className="p-3 sm:p-4">
                {/* Tableau des transactions detaillees */}
                <div className="overflow-x-auto mb-4 sm:mb-6">
                  <table className="w-full border-collapse min-w-[400px]">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="border border-border px-2 sm:px-3 py-2 text-left text-xs sm:text-sm font-semibold text-muted-foreground">Description</th>
                        <th className="border border-border px-2 sm:px-3 py-2 text-right text-xs sm:text-sm font-semibold text-muted-foreground">Montant</th>
                        <th className="border border-border px-2 sm:px-3 py-2 text-center text-xs sm:text-sm font-semibold text-muted-foreground">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-border px-2 sm:px-3 py-2 text-sm text-foreground">Consultation</td>
                        <td className="border border-border px-2 sm:px-3 py-2 text-sm text-right font-medium text-foreground">{report.billingSummary.consultationAmount?.toLocaleString()} $</td>
                        <td className="border border-border px-2 sm:px-3 py-2 text-center">
                          {report.billingSummary.consultationPaid ? (
                            <Badge className="bg-emerald-100 text-emerald-800">Paye</Badge>
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
                            <Badge className="bg-emerald-100 text-emerald-800">Paye</Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800">En attente</Badge>
                          )}
                        </td>
                      </tr>
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
                              <Badge className="bg-emerald-100 text-emerald-800">Paye</Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800">En attente</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Recapitulatif des montants */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {/* Colonne gauche - Totaux */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 sm:p-4">
                    <h3 className="text-xs sm:text-sm font-bold text-emerald-800 mb-2 sm:mb-3 uppercase">Recapitulatif</h3>
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">TOTAL</span>
                        <span className="font-bold text-base sm:text-lg text-emerald-700">{report.billingSummary.totalAmount?.toLocaleString()} $</span>
                      </div>
                      <div className="h-px bg-emerald-200 my-1 sm:my-2"></div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">PAYE</span>
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
              </div>
            </div>
          )}
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
          
          .bg-muted\\/50 {
            background-color: #f5f5f5 !important;
            -webkit-print-color-adjust: exact;
          }
          
          .border-emerald-600 {
            border-color: #059669 !important;
            -webkit-print-color-adjust: exact;
          }
          
          .border-border {
            border-color: #e5e7eb !important;
            -webkit-print-color-adjust: exact;
          }
          
          .text-emerald-800 {
            color: #065f46 !important;
            -webkit-print-color-adjust: exact;
          }
          
          .text-emerald-700 {
            color: #047857 !important;
            -webkit-print-color-adjust: exact;
          }
          
          .text-emerald-600 {
            color: #059669 !important;
            -webkit-print-color-adjust: exact;
          }
          
          .text-foreground,
          .text-gray-900,
          .text-gray-700 {
            color: #000000 !important;
            -webkit-print-color-adjust: exact;
          }
          
          .text-muted-foreground,
          .text-gray-500,
          .text-gray-600 {
            color: #374151 !important;
            -webkit-print-color-adjust: exact;
          }
          
          .bg-card,
          .bg-background,
          .bg-white {
            background-color: #ffffff !important;
            -webkit-print-color-adjust: exact;
          }
          
          .hidden.md\\:block {
            display: block !important;
          }
          
          /* Éviter les sauts de page à l'intérieur des sections */
          .border-b {
            page-break-inside: avoid;
          }
          
          .grid {
            page-break-inside: avoid;
          }
          
          table {
            page-break-inside: auto;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          td {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default MedicalReportView;
