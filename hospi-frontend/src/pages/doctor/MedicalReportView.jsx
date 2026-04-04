import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  Printer, 
  ArrowLeft, 
  FileText, 
  FlaskConical, 
  Pill, 
  Stethoscope,
  Heart,
  Activity,
  Wallet,
  User,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileDown
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Composant MedicalReportView - Fiche Medicale Individuelle INUA AFIA
 * Design inspire des fiches medicales francaises professionnelles
 */
const MedicalReportView = () => {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatientJourney();
  }, [consultationId]);

  const loadPatientJourney = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/consultations/${consultationId}/patient-journey`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement du dossier');
      }

      const data = await response.json();
      setReport(data.data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Impossible de charger le dossier patient');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!report) return;
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text('INUA AFIA - FICHE MEDICALE', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Systeme de Gestion Hospitaliere', 105, 28, { align: 'center' });
    doc.text(`Consultation: #${report.consultationCode} - Date: ${formatDate(report.consultationDate)}`, 105, 35, { align: 'center' });
    
    let y = 50;
    
    // Patient Section
    doc.setFontSize(12);
    doc.setFillColor(22, 163, 74);
    doc.rect(20, y - 5, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('IDENTIFICATION DU PATIENT', 25, y);
    doc.setTextColor(0, 0, 0);
    
    y += 12;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Nom:', 20, y);
    doc.setFont(undefined, 'normal');
    doc.text(report.patientName || '-', 50, y);
    
    doc.setFont(undefined, 'bold');
    doc.text('Code Patient:', 110, y);
    doc.setFont(undefined, 'normal');
    doc.text(report.patientCode || '-', 140, y);
    
    y += 8;
    doc.setFont(undefined, 'bold');
    doc.text('Age:', 20, y);
    doc.setFont(undefined, 'normal');
    doc.text(`${report.patientAge || '-'} ans`, 50, y);
    
    doc.setFont(undefined, 'bold');
    doc.text('Sexe:', 110, y);
    doc.setFont(undefined, 'normal');
    doc.text(report.patientGender || '-', 140, y);
    
    // Medecin Section
    y += 15;
    doc.setFontSize(12);
    doc.setFillColor(22, 163, 74);
    doc.rect(20, y - 5, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('MEDECIN TRAITANT', 25, y);
    doc.setTextColor(0, 0, 0);
    
    y += 12;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Nom:', 20, y);
    doc.setFont(undefined, 'normal');
    doc.text(report.doctorName || '-', 50, y);
    
    doc.setFont(undefined, 'bold');
    doc.text('Specialite:', 110, y);
    doc.setFont(undefined, 'normal');
    doc.text(report.doctorSpecialty || '-', 140, y);
    
    y += 15;
    
    // TRIAGE Section
    if (report.triageInfo) {
      doc.setFontSize(12);
      doc.setFillColor(22, 163, 74);
      doc.rect(20, y - 5, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('CONSTANTES VITALES', 25, y);
      doc.setTextColor(0, 0, 0);
      
      y += 12;
      doc.setFontSize(10);
      const vitals = [
        ['Temperature', `${report.triageInfo.temperature || '-'} °C`],
        ['Tension', report.triageInfo.tensionArterielle || '-'],
        ['Poids', `${report.triageInfo.poids || '-'} kg`],
        ['Taille', `${report.triageInfo.taille || '-'} cm`]
      ];
      
      vitals.forEach(([label, value]) => {
        doc.setFont(undefined, 'bold');
        doc.text(`${label}:`, 20, y);
        doc.setFont(undefined, 'normal');
        doc.text(value, 50, y);
        y += 7;
      });
      
      if (report.triageInfo.motifVisite) {
        y += 3;
        doc.setFont(undefined, 'bold');
        doc.text('Motif de visite:', 20, y);
        doc.setFont(undefined, 'normal');
        doc.text(report.triageInfo.motifVisite, 60, y);
        y += 8;
      }
      y += 10;
    }
    
    // Lab Results
    if (report.labResults && report.labResults.length > 0) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(12);
      doc.setFillColor(22, 163, 74);
      doc.rect(20, y - 5, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('RESULTATS DE LABORATOIRE', 25, y);
      doc.setTextColor(0, 0, 0);
      
      y += 8;
      
      const labData = report.labResults.map(lab => [
        lab.testName,
        `${lab.resultValue || '-'} ${lab.unit || ''}`,
        lab.referenceRange || '-',
        lab.interpretation || '-'
      ]);
      
      autoTable(doc, {
        startY: y,
        head: [['Examen', 'Resultat', 'Reference', 'Interpretation']],
        body: labData,
        theme: 'grid',
        headStyles: { fillColor: [22, 163, 74], textColor: 255 },
        styles: { fontSize: 9 },
        margin: { left: 20, right: 20 }
      });
      y = doc.lastAutoTable.finalY + 10;
    }
    
    // Prescription
    if (report.prescription && report.prescription.items?.length > 0) {
      if (y > 220) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(12);
      doc.setFillColor(22, 163, 74);
      doc.rect(20, y - 5, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('PRESCRIPTION MEDICALE', 25, y);
      doc.setTextColor(0, 0, 0);
      
      y += 8;
      
      if (report.prescription.diagnosis) {
        y += 5;
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Diagnostic:', 20, y);
        doc.setFont(undefined, 'normal');
        doc.text(report.prescription.diagnosis, 50, y);
        y += 10;
      }
      
      const presData = report.prescription.items.map(item => [
        item.medicationName || '-',
        `${item.dosage || '-'} ${item.frequency || ''}`,
        item.duration || '-',
        item.instructions || '-'
      ]);
      
      autoTable(doc, {
        startY: y,
        head: [['Medicament', 'Posologie', 'Duree', 'Instructions']],
        body: presData,
        theme: 'grid',
        headStyles: { fillColor: [22, 163, 74], textColor: 255 },
        styles: { fontSize: 9 },
        margin: { left: 20, right: 20 }
      });
      y = doc.lastAutoTable.finalY + 10;
    }
    
    // Billing
    if (report.billingSummary) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(12);
      doc.setFillColor(22, 163, 74);
      doc.rect(20, y - 5, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('FACTURATION', 25, y);
      doc.setTextColor(0, 0, 0);
      
      y += 12;
      doc.setFontSize(10);
      
      const billingItems = [
        ['Consultation', `${report.billingSummary.consultationAmount?.toLocaleString() || '0'} $`],
        ['Laboratoire', `${report.billingSummary.labAmount?.toLocaleString() || '0'} $`],
        ['TOTAL', `${report.billingSummary.totalAmount?.toLocaleString() || '0'} $`],
        ['Paye', `${report.billingSummary.totalPaid?.toLocaleString() || '0'} $`],
        ['Reste a payer', `${report.billingSummary.balanceDue?.toLocaleString() || '0'} $`]
      ];
      
      billingItems.forEach(([label, value], index) => {
        if (index === 2) {
          doc.setFont(undefined, 'bold');
          doc.setFillColor(220, 252, 231);
          doc.rect(20, y - 4, 170, 7, 'F');
        } else {
          doc.setFont(undefined, 'normal');
        }
        doc.text(label, 25, y);
        doc.text(value, 100, y);
        y += 7;
      });
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('Document genere par INUA AFIA - Systeme de Gestion Hospitaliere', 105, 285, { align: 'center' });
    doc.text(`Genere le: ${new Date().toLocaleString('fr-FR')}`, 105, 290, { align: 'center' });
    
    // Save
    doc.save(`Fiche_Medicale_${report.patientName}_${report.consultationCode}.pdf`);
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

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'SOLDE': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'PARTIEL': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'NON_PAYE': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPharmacyStatusColor = (status) => {
    switch (status) {
      case 'SERVI': return 'bg-emerald-100 text-emerald-800';
      case 'PARTIEL': return 'bg-amber-100 text-amber-800';
      case 'NON_SERVI': return 'bg-rose-100 text-rose-800';
      case 'REFUSE': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="w-12 h-12 text-gray-400" />
        <p className="text-gray-600">Dossier introuvable</p>
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Header - Non imprimable */}
      <div className="print:hidden bg-white border-b p-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1000px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Fiche Medicale Individuelle</h1>
              <p className="text-sm text-gray-500">Consultation #{report.consultationCode}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} variant="outline" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50">
              <Printer className="w-4 h-4 mr-2" />
              Imprimer
            </Button>
            <Button onClick={handleDownloadPDF} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <FileDown className="w-4 h-4 mr-2" />
              Telecharger PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Contenu du rapport - Style fiche medicale */}
      <div className="max-w-[900px] mx-auto p-6 print:p-0">
        
        {/* Bandeau d'en-tete INUA AFIA */}
        <div className="bg-emerald-600 text-white rounded-t-lg p-4 print:rounded-none print:bg-emerald-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-wide">INUA AFIA</h1>
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
        <div className="border-2 border-emerald-600 border-t-0 rounded-b-lg bg-white print:border-2 print:rounded-none">
          
          {/* Section 1: Identification Patient */}
          <div className="border-b border-emerald-200">
            <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200">
              <h2 className="text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                <User className="w-4 h-4" />
                Identification du Patient
              </h2>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-gray-700 min-w-[100px]">Nom:</span>
                  <span className="text-sm border-b border-gray-300 flex-1 pb-1">{report.patientName}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-gray-700 min-w-[100px]">Code Patient:</span>
                  <span className="text-sm border-b border-gray-300 flex-1 pb-1">{report.patientCode}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-gray-700 min-w-[100px]">Age:</span>
                  <span className="text-sm border-b border-gray-300 flex-1 pb-1">{report.patientAge} ans</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-gray-700 min-w-[100px]">Sexe:</span>
                  <span className="text-sm border-b border-gray-300 flex-1 pb-1">{report.patientGender}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-gray-700 min-w-[100px]">Telephone:</span>
                  <span className="text-sm border-b border-gray-300 flex-1 pb-1">{report.patientPhone || '-'}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-gray-700 min-w-[100px]">Consultation:</span>
                  <span className="text-sm border-b border-gray-300 flex-1 pb-1">{formatDate(report.consultationDate)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Medecin Traitant */}
          <div className="border-b border-emerald-200">
            <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200">
              <h2 className="text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                <Stethoscope className="w-4 h-4" />
                Medecin Traitant
              </h2>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-gray-700 min-w-[100px]">Nom:</span>
                <span className="text-sm border-b border-gray-300 flex-1 pb-1">{report.doctorName}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-gray-700 min-w-[100px]">Specialite:</span>
                <span className="text-sm border-b border-gray-300 flex-1 pb-1">{report.doctorSpecialty}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Constantes Vitales (Triage) */}
          {report.triageInfo && (
            <div className="border-b border-emerald-200">
              <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200">
                <h2 className="text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Constantes Vitales
                </h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="border border-gray-200 rounded p-3 text-center bg-gray-50">
                    <p className="text-xs text-gray-500 mb-1">Temperature</p>
                    <p className="text-lg font-semibold text-emerald-700">{report.triageInfo.temperature || '-'}°C</p>
                  </div>
                  <div className="border border-gray-200 rounded p-3 text-center bg-gray-50">
                    <p className="text-xs text-gray-500 mb-1">Tension</p>
                    <p className="text-lg font-semibold text-emerald-700">{report.triageInfo.tensionArterielle || '-'}</p>
                  </div>
                  <div className="border border-gray-200 rounded p-3 text-center bg-gray-50">
                    <p className="text-xs text-gray-500 mb-1">Poids</p>
                    <p className="text-lg font-semibold text-emerald-700">{report.triageInfo.poids || '-'} kg</p>
                  </div>
                  <div className="border border-gray-200 rounded p-3 text-center bg-gray-50">
                    <p className="text-xs text-gray-500 mb-1">Taille</p>
                    <p className="text-lg font-semibold text-emerald-700">{report.triageInfo.taille || '-'} cm</p>
                  </div>
                </div>
                {report.triageInfo.motifVisite && (
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-gray-700">Motif de visite:</span>
                    <span className="text-sm border-b border-gray-300 flex-1 pb-1">{report.triageInfo.motifVisite}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 4: Resultats Laboratoire */}
          {report.labResults && report.labResults.length > 0 && (
            <div className="border-b border-emerald-200">
              <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200">
                <h2 className="text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                  <FlaskConical className="w-4 h-4" />
                  Resultats de Laboratoire
                </h2>
              </div>
              <div className="p-4">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-emerald-100">
                      <th className="border border-emerald-300 px-3 py-2 text-left text-xs font-semibold text-emerald-800">Examen</th>
                      <th className="border border-emerald-300 px-3 py-2 text-center text-xs font-semibold text-emerald-800">Resultat</th>
                      <th className="border border-emerald-300 px-3 py-2 text-center text-xs font-semibold text-emerald-800">Reference</th>
                      <th className="border border-emerald-300 px-3 py-2 text-left text-xs font-semibold text-emerald-800">Interpretation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.labResults.map((test, index) => (
                      <tr key={index} className={index % 2 === 1 ? 'bg-gray-50' : ''}>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            {test.isCritical && <AlertTriangle className="w-4 h-4 text-red-500" />}
                            {test.testName}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center font-medium">
                          {test.resultValue} {test.unit}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center text-gray-600">
                          {test.referenceRange}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          {test.interpretation || '-'}
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
            <div className="border-b border-emerald-200">
              <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200">
                <h2 className="text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Prescription Medicale
                </h2>
              </div>
              <div className="p-4">
                {report.prescription.diagnosis && (
                  <div className="mb-4 flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-gray-700">Diagnostic:</span>
                    <span className="text-sm border-b border-gray-300 flex-1 pb-1">{report.prescription.diagnosis}</span>
                  </div>
                )}
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-emerald-100">
                      <th className="border border-emerald-300 px-3 py-2 text-left text-xs font-semibold text-emerald-800">Medicament</th>
                      <th className="border border-emerald-300 px-3 py-2 text-center text-xs font-semibold text-emerald-800">Posologie</th>
                      <th className="border border-emerald-300 px-3 py-2 text-center text-xs font-semibold text-emerald-800">Duree</th>
                      <th className="border border-emerald-300 px-3 py-2 text-left text-xs font-semibold text-emerald-800">Instructions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.prescription.items?.map((item, index) => (
                      <tr key={index} className={index % 2 === 1 ? 'bg-gray-50' : ''}>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          <p className="font-medium">{item.medicationName}</p>
                          <p className="text-xs text-gray-500">{item.genericName}</p>
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                          {item.dosage} {item.frequency && <span className="text-gray-500">({item.frequency})</span>}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center">{item.duration}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">{item.instructions || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 6: Pharmacie */}
          {report.pharmacyStatus && (
            <div className="border-b border-emerald-200">
              <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200">
                <h2 className="text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                  <Pill className="w-4 h-4" />
                  Dispensation Pharmacie
                </h2>
              </div>
              <div className="p-4">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-emerald-100">
                      <th className="border border-emerald-300 px-3 py-2 text-left text-xs font-semibold text-emerald-800">Medicament</th>
                      <th className="border border-emerald-300 px-3 py-2 text-center text-xs font-semibold text-emerald-800">Prescrit</th>
                      <th className="border border-emerald-300 px-3 py-2 text-center text-xs font-semibold text-emerald-800">Livre</th>
                      <th className="border border-emerald-300 px-3 py-2 text-center text-xs font-semibold text-emerald-800">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.pharmacyStatus.items?.map((item, index) => (
                      <tr key={index} className={index % 2 === 1 ? 'bg-gray-50' : ''}>
                        <td className="border border-gray-300 px-3 py-2 text-sm">{item.medicationName}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center">{item.prescribedQty}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center">{item.deliveredQty}</td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          <Badge className={`${getPharmacyStatusColor(item.status)} text-xs`}>
                            {item.status === 'REFUSE' && <XCircle className="w-3 h-3 mr-1" />}
                            {item.status === 'SERVI' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                            {item.status === 'PARTIEL' && <AlertTriangle className="w-3 h-3 mr-1" />}
                            {item.status}
                          </Badge>
                        </td>
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
              <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200">
                <h2 className="text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Facturation
                </h2>
              </div>
              <div className="p-4">
                {/* Tableau des transactions detaillees */}
                <table className="w-full border-collapse mb-6">
                  <thead>
                    <tr className="bg-emerald-100">
                      <th className="border border-emerald-300 px-3 py-2 text-left text-xs font-semibold text-emerald-800">Libelle</th>
                      <th className="border border-emerald-300 px-3 py-2 text-right text-xs font-semibold text-emerald-800">Montant Du</th>
                      <th className="border border-emerald-300 px-3 py-2 text-center text-xs font-semibold text-emerald-800">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Frais de Fiche - visible uniquement si nouveau patient ou montant > 0 */}
                    {(report.billingSummary.fraisFiche > 0 || report.isNewPatient) && (
                      <tr className="bg-gray-50">
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          <span className="font-medium">Frais de Fiche (Nouveau Patient)</span>
                          {report.isNewPatient && <span className="text-xs text-amber-600 ml-2">(1ere visite)</span>}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right font-medium">
                          {(report.billingSummary.fraisFiche || 5000).toLocaleString()} $
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          {report.billingSummary.fraisFichePaid ? (
                            <span className="inline-flex items-center px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Paye
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                              <AlertCircle className="w-3 h-3 mr-1" /> En attente
                            </span>
                          )}
                        </td>
                      </tr>
                    )}
                    
                    {/* Consultation */}
                    <tr>
                      <td className="border border-gray-300 px-3 py-2 text-sm">
                        <span className="font-medium">Consultation {report.doctorSpecialty && `(${report.doctorSpecialty})`}</span>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-right font-medium">
                        {report.billingSummary.consultationAmount?.toLocaleString() || '0'} $
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        {report.billingSummary.consultationPaid ? (
                          <span className="inline-flex items-center px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Paye
                          </span>
                        ) : report.billingSummary.consultationAmount > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                            <AlertCircle className="w-3 h-3 mr-1" /> En attente
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Gratuit</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Laboratoire - detaille par examen si disponible */}
                    {report.billingSummary.labDetails && report.billingSummary.labDetails.length > 0 ? (
                      report.billingSummary.labDetails.map((lab, index) => (
                        <tr key={index} className={index % 2 === 1 ? 'bg-gray-50' : ''}>
                          <td className="border border-gray-300 px-3 py-2 text-sm">
                            <span className="font-medium">{lab.testName}</span>
                            <span className="text-xs text-gray-500 block">{lab.category}</span>
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-right font-medium">
                            {lab.amount?.toLocaleString()} $
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-center">
                            {lab.isPaid ? (
                              <span className="inline-flex items-center px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Paye
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                                <AlertCircle className="w-3 h-3 mr-1" /> En attente
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : report.labResults && report.labResults.length > 0 && (
                      <tr className="bg-gray-50">
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          <span className="font-medium">Examens de Laboratoire</span>
                          <span className="text-xs text-gray-500 block">({report.labResults.length} examen{report.labResults.length > 1 ? 's' : ''})</span>
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right font-medium">
                          {report.billingSummary.labAmount?.toLocaleString() || '0'} $
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          {report.billingSummary.labPaid ? (
                            <span className="inline-flex items-center px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Paye
                            </span>
                          ) : report.billingSummary.labAmount > 0 ? (
                            <span className="inline-flex items-center px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                              <AlertCircle className="w-3 h-3 mr-1" /> En attente
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">-</span>
                          )}
                        </td>
                      </tr>
                    )}
                    
                    {/* Pharmacie/Medicaments */}
                    {report.billingSummary.pharmacyAmount > 0 && (
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          <span className="font-medium">Medicaments (Pharmacie)</span>
                          {report.pharmacyStatus?.items && (
                            <span className="text-xs text-gray-500 block">({report.pharmacyStatus.items.length} produit{report.pharmacyStatus.items.length > 1 ? 's' : ''})</span>
                          )}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right font-medium">
                          {report.billingSummary.pharmacyAmount?.toLocaleString()} $
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          {report.billingSummary.pharmacyPaid ? (
                            <span className="inline-flex items-center px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Paye
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                              <AlertCircle className="w-3 h-3 mr-1" /> En attente
                            </span>
                          )}
                        </td>
                      </tr>
                    )}
                    
                    {/* Autres frais */}
                    {report.billingSummary.otherAmounts?.map((item, index) => (
                      <tr key={index} className={index % 2 === 1 ? 'bg-gray-50' : ''}>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          <span className="font-medium">{item.label}</span>
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right font-medium">
                          {item.amount?.toLocaleString()} $
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          {item.isPaid ? (
                            <span className="inline-flex items-center px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Paye
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                              <AlertCircle className="w-3 h-3 mr-1" /> En attente
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Recapitulatif des montants */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Colonne gauche - Totaux */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <h3 className="text-sm font-bold text-emerald-800 mb-3 uppercase">Recapitulatif</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">TOTAL GENERAL</span>
                        <span className="font-bold text-lg text-emerald-700">{report.billingSummary.totalAmount?.toLocaleString()} $</span>
                      </div>
                      <div className="h-px bg-emerald-200 my-2"></div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">ACOMPTE VERSE</span>
                        <span className="font-semibold text-emerald-600">{report.billingSummary.totalPaid?.toLocaleString()} $</span>
                      </div>
                      <div className="flex justify-between text-sm bg-white p-2 rounded border border-emerald-200">
                        <span className="text-gray-700 font-medium">RESTE A PAYER</span>
                        <span className={`font-bold ${report.billingSummary.balanceDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {report.billingSummary.balanceDue?.toLocaleString()} $
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Colonne droite - Statut global */}
                  <div className="flex flex-col justify-center items-center bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <span className="text-sm text-gray-500 mb-2">Statut de paiement</span>
                    <Badge className={`${getPaymentStatusColor(report.billingSummary.paymentStatus)} px-6 py-3 text-base font-bold`}>
                      {report.billingSummary.paymentStatus === 'SOLDE' && <CheckCircle2 className="w-5 h-5 mr-2" />}
                      {report.billingSummary.paymentStatus === 'PARTIEL' && <AlertCircle className="w-5 h-5 mr-2" />}
                      {report.billingSummary.paymentStatus === 'NON_PAYE' && <XCircle className="w-5 h-5 mr-2" />}
                      {report.billingSummary.paymentStatus}
                    </Badge>
                    {report.billingSummary.lastPaymentDate && (
                      <p className="text-xs text-gray-500 mt-2">
                        Dernier paiement: {formatDate(report.billingSummary.lastPaymentDate)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pied de page */}
          <div className="border-t border-emerald-200 p-4 text-center text-xs text-gray-500 bg-gray-50 rounded-b-lg print:rounded-none">
            <p className="font-medium text-emerald-700">Document genere par INUA AFIA - Systeme de Gestion Hospitaliere</p>
            <p>Genere le {formatDate(report.reportGeneratedAt)} par {report.generatedBy}</p>
            <p className="mt-2 text-gray-400">Ce document est confidentiel et destine uniquement aux professionnels de sante habilites.</p>
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
          
          /* Cacher la navigation */
          nav, aside, .sidebar, header, .print\\:hidden,
          .fixed, .sticky, [role="banner"] {
            display: none !important;
          }
          
          /* Optimiser les couleurs */
          .bg-emerald-600 {
            background-color: #059669 !important;
            -webkit-print-color-adjust: exact;
          }
          
          .bg-emerald-50 {
            background-color: #ecfdf5 !important;
            -webkit-print-color-adjust: exact;
          }
          
          .bg-emerald-100 {
            background-color: #d1fae5 !important;
            -webkit-print-color-adjust: exact;
          }
          
          .text-emerald-800 {
            color: #065f46 !important;
          }
          
          /* Bordures */
          .border-emerald-600 {
            border-color: #059669 !important;
          }
          
          .border-emerald-200 {
            border-color: #a7f3d0 !important;
          }
          
          .border-emerald-300 {
            border-color: #6ee7b7 !important;
          }
          
          /* Eviter les coupures */
          .border-b {
            break-inside: avoid;
          }
          
          table {
            break-inside: avoid;
          }
          
          tr {
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
};

export default MedicalReportView;
