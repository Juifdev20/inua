import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BACKEND_URL } from '../../config/environment.js';
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
      const response = await fetch(`${BACKEND_URL}/api/v1/consultations/${consultationId}/patient-journey`, {
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
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    
    let y = 15;
    
    // Helper pour nettoyer le texte (remplacer accents)
    const cleanText = (text) => {
      if (!text) return '-';
      return String(text)
        .replace(/[éèêë]/g, 'e')
        .replace(/[àâä]/g, 'a')
        .replace(/[ùûü]/g, 'u')
        .replace(/[ôö]/g, 'o')
        .replace(/[îï]/g, 'i')
        .replace(/[ç]/g, 'c')
        .replace(/[ÉÈÊË]/g, 'E')
        .replace(/[ÀÂÄ]/g, 'A')
        .replace(/[ÙÛÜ]/g, 'U')
        .replace(/[ÔÖ]/g, 'O')
        .replace(/[ÎÏ]/g, 'I')
        .replace(/[Ç]/g, 'C');
    };
    
    // ============================================
    // HEADER VERT (style emerald-600)
    // ============================================
    doc.setFillColor(5, 150, 105);
    doc.rect(margin, y, contentWidth, 24, 'F');
    
    // Cercle blanc pour le logo (plus grand)
    const logoX = margin + 15;
    const logoY = y + 12;
    const logoR = 10;
    doc.setFillColor(255, 255, 255);
    doc.circle(logoX, logoY, logoR, 'F');
    
    // Coeur stylise dans le cercle - dessine avec des formes
    const cx = logoX;
    const cy = logoY + 1;
    const heartColor = [5, 150, 105];
    
    // Deux cercles pour les lobes du coeur
    doc.setFillColor(heartColor[0], heartColor[1], heartColor[2]);
    doc.circle(cx - 2.5, cy - 1.5, 2.8, 'F'); // lobe gauche
    doc.circle(cx + 2.5, cy - 1.5, 2.8, 'F'); // lobe droit
    
    // Triangle pour la pointe du coeur
    const trianglePoints = [
      [cx, cy + 6],      // pointe bas
      [cx - 4.5, cy - 0.5], // gauche
      [cx + 4.5, cy - 0.5]  // droite
    ];
    doc.triangle(trianglePoints[0][0], trianglePoints[0][1], 
                 trianglePoints[1][0], trianglePoints[1][1], 
                 trianglePoints[2][0], trianglePoints[2][1], 'F');
    
    // Titre INUA AFIA
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('INUA AFIA', margin + 32, y + 10);
    
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    doc.text('Systeme de Gestion Hospitaliere', margin + 32, y + 16);
    
    // Droite: FICHE MEDICALE
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text('FICHE MEDICALE', pageWidth - margin - 3, y + 7, { align: 'right' });
    doc.text('INDIVIDUELLE', pageWidth - margin - 3, y + 12, { align: 'right' });
    doc.setFontSize(6);
    doc.setFont(undefined, 'normal');
    doc.text('Genere: ' + cleanText(formatDate(report.reportGeneratedAt || new Date())), pageWidth - margin - 3, y + 17, { align: 'right' });
    
    y += 30;
    
    // Fonction pour dessiner une section
    const drawSection = (title, startY) => {
      // Fond vert clair pour le titre
      doc.setFillColor(220, 252, 231);
      doc.rect(margin, startY, contentWidth, 9, 'F');
      
      // Bordure bas
      doc.setDrawColor(167, 243, 208);
      doc.setLineWidth(0.3);
      doc.line(margin, startY + 9, margin + contentWidth, startY + 9);
      
      // Titre
      doc.setTextColor(6, 95, 70);
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.text(cleanText(title).toUpperCase(), margin + 4, startY + 6);
      
      return startY + 13;
    };
    
    // ============================================
    // SECTION PATIENT
    // ============================================
    y = drawSection('Identification du Patient', y);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    
    const leftX = margin + 4;
    const midX = margin + contentWidth / 2 + 4;
    const labelW = 40;
    const lineH = 7;
    
    // Ligne 1
    doc.setFont(undefined, 'bold');
    doc.text('Nom:', leftX, y);
    doc.setFont(undefined, 'normal');
    doc.text(cleanText(report.patientName), leftX + labelW, y);
    
    doc.setFont(undefined, 'bold');
    doc.text('Sexe:', midX, y);
    doc.setFont(undefined, 'normal');
    doc.text(cleanText(report.patientGender), midX + labelW, y);
    y += lineH;
    
    // Ligne 2
    doc.setFont(undefined, 'bold');
    doc.text('Code:', leftX, y);
    doc.setFont(undefined, 'normal');
    doc.text(cleanText(report.patientCode), leftX + labelW, y);
    
    doc.setFont(undefined, 'bold');
    doc.text('Tel:', midX, y);
    doc.setFont(undefined, 'normal');
    doc.text(cleanText(report.patientPhone), midX + labelW, y);
    y += lineH;
    
    // Ligne 3
    doc.setFont(undefined, 'bold');
    doc.text('Age:', leftX, y);
    doc.setFont(undefined, 'normal');
    doc.text((report.patientAge || '-') + ' ans', leftX + labelW, y);
    
    doc.setFont(undefined, 'bold');
    doc.text('Consultation:', midX, y);
    doc.setFont(undefined, 'normal');
    doc.text(cleanText(formatDate(report.consultationDate)), midX + labelW, y);
    y += 10;
    
    doc.setDrawColor(167, 243, 208);
    doc.line(margin, y, margin + contentWidth, y);
    y += 6;
    
    // ============================================
    // SECTION MEDECIN
    // ============================================
    y = drawSection('Medecin Traitant', y);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    
    doc.setFont(undefined, 'bold');
    doc.text('Nom:', leftX, y);
    doc.setFont(undefined, 'normal');
    doc.text(cleanText(report.doctorName), leftX + labelW, y);
    
    doc.setFont(undefined, 'bold');
    doc.text('Specialite:', midX, y);
    doc.setFont(undefined, 'normal');
    doc.text(cleanText(report.doctorSpecialty), midX + labelW, y);
    y += 10;
    
    doc.setDrawColor(167, 243, 208);
    doc.line(margin, y, margin + contentWidth, y);
    y += 6;
    
    // ============================================
    // SECTION CONSTANTES VITALES
    // ============================================
    if (report.triageInfo) {
      y = drawSection('Constantes Vitales', y);
      
      // 4 boites identiques, bien alignees
      const boxW = 38;
      const boxH = 20;
      const gap = 4;
      const startX = margin + 4;
      
      const vitals = [
        { label: 'Temperature', value: (report.triageInfo.temperature || '-') + ' C' },
        { label: 'Tension', value: cleanText(report.triageInfo.tensionArterielle) || '-' },
        { label: 'Poids', value: (report.triageInfo.poids || '-') + ' kg' },
        { label: 'Taille', value: (report.triageInfo.taille || '-') + ' cm' }
      ];
      
      vitals.forEach((vital, i) => {
        const boxX = startX + (i * (boxW + gap));
        
        // Fond gris clair
        doc.setFillColor(249, 250, 251);
        doc.setDrawColor(209, 213, 219);
        doc.rect(boxX, y, boxW, boxH, 'FD');
        
        // Label en haut
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(6);
        doc.setFont(undefined, 'normal');
        doc.text(cleanText(vital.label), boxX + boxW/2, y + 5, { align: 'center' });
        
        // Valeur centree
        doc.setTextColor(4, 120, 87);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text(vital.value, boxX + boxW/2, y + 14, { align: 'center' });
      });
      
      y += boxH + 6;
      
      // Motif de visite sur toute la largeur
      if (report.triageInfo.motifVisite) {
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.text('Motif:', leftX, y);
        doc.setFont(undefined, 'normal');
        const splitMotif = doc.splitTextToSize(cleanText(report.triageInfo.motifVisite), contentWidth - 30);
        doc.text(splitMotif, leftX + 20, y);
        y += (splitMotif.length * 4) + 4;
      }
      
      y += 4;
      doc.setDrawColor(167, 243, 208);
      doc.line(margin, y, margin + contentWidth, y);
      y += 6;
    }
    
    // ============================================
    // SECTION LABORATOIRE
    // ============================================
    if (report.labResults && report.labResults.length > 0) {
      if (y > 230) {
        doc.addPage();
        y = 15;
      }
      
      y = drawSection('Resultats de Laboratoire', y);
      
      const labData = report.labResults.map(lab => [
        cleanText(lab.testName) + (lab.isCritical ? ' (!)' : ''),
        (lab.resultValue || '-') + ' ' + cleanText(lab.unit),
        cleanText(lab.referenceRange) || '-',
        cleanText(lab.interpretation) || '-'
      ]);
      
      autoTable(doc, {
        startY: y,
        head: [['Examen', 'Resultat', 'Reference', 'Interpretation']],
        body: labData,
        theme: 'grid',
        headStyles: { 
          fillColor: [209, 250, 229],
          textColor: [6, 95, 70],
          fontSize: 8,
          fontStyle: 'bold'
        },
        styles: { 
          fontSize: 8,
          cellPadding: 3,
          lineColor: [209, 213, 219]
        },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 35, halign: 'center' },
          3: { cellWidth: 'auto' }
        },
        margin: { left: margin + 4, right: margin + 4 },
        alternateRowStyles: { fillColor: [249, 250, 251] }
      });
      
      y = doc.lastAutoTable.finalY + 6;
      doc.setDrawColor(167, 243, 208);
      doc.line(margin, y, margin + contentWidth, y);
      y += 6;
    }
    
    // ============================================
    // SECTION PRESCRIPTION
    // ============================================
    if (report.prescription && report.prescription.items?.length > 0) {
      if (y > 200) {
        doc.addPage();
        y = 15;
      }
      
      y = drawSection('Prescription Medicale', y);
      
      // Diagnostic
      if (report.prescription.diagnosis) {
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.text('Diagnostic:', leftX, y);
        doc.setFont(undefined, 'normal');
        const splitDiag = doc.splitTextToSize(cleanText(report.prescription.diagnosis), contentWidth - 45);
        doc.text(splitDiag, leftX + 30, y);
        y += (splitDiag.length * 4) + 4;
      }
      
      const presData = report.prescription.items.map(item => [
        cleanText(item.medicationName) + (item.genericName ? '\n' + cleanText(item.genericName) : ''),
        cleanText(item.dosage) + (item.frequency ? ' (' + cleanText(item.frequency) + ')' : ''),
        cleanText(item.duration) || '-',
        cleanText(item.instructions) || '-'
      ]);
      
      autoTable(doc, {
        startY: y,
        head: [['Medicament', 'Posologie', 'Duree', 'Instructions']],
        body: presData,
        theme: 'grid',
        headStyles: { 
          fillColor: [209, 250, 229],
          textColor: [6, 95, 70],
          fontSize: 8,
          fontStyle: 'bold'
        },
        styles: { 
          fontSize: 8,
          cellPadding: 3,
          lineColor: [209, 213, 219]
        },
        margin: { left: margin + 4, right: margin + 4 },
        alternateRowStyles: { fillColor: [249, 250, 251] }
      });
      
      y = doc.lastAutoTable.finalY + 6;
      doc.setDrawColor(167, 243, 208);
      doc.line(margin, y, margin + contentWidth, y);
      y += 6;
    }
    
    // ============================================
    // SECTION FACTURATION
    // ============================================
    if (report.billingSummary) {
      if (y > 180) {
        doc.addPage();
        y = 15;
      }
      
      y = drawSection('Facturation', y);
      
      const billingRows = [];
      
      // Frais de fiche
      if (report.billingSummary.fraisFiche > 0 || report.isNewPatient) {
        billingRows.push([
          'Frais de Fiche' + (report.isNewPatient ? ' (1ere visite)' : ''),
          (report.billingSummary.fraisFiche || 5000).toLocaleString() + ' $',
          report.billingSummary.fraisFichePaid ? '[Paye]' : '[En attente]'
        ]);
      }
      
      // Consultation
      billingRows.push([
        'Consultation' + (report.doctorSpecialty ? ' (' + cleanText(report.doctorSpecialty) + ')' : ''),
        (report.billingSummary.consultationAmount || 0).toLocaleString() + ' $',
        report.billingSummary.consultationPaid ? '[Paye]' : 
          (report.billingSummary.consultationAmount > 0 ? '[En attente]' : '[Gratuit]')
      ]);
      
      // Laboratoire
      if (report.billingSummary.labAmount > 0) {
        billingRows.push([
          'Examens de Laboratoire',
          report.billingSummary.labAmount.toLocaleString() + ' $',
          report.billingSummary.labPaid ? '[Paye]' : '[En attente]'
        ]);
      }
      
      // Pharmacie
      if (report.billingSummary.pharmacyAmount > 0) {
        billingRows.push([
          'Medicaments (Pharmacie)',
          report.billingSummary.pharmacyAmount.toLocaleString() + ' $',
          report.billingSummary.pharmacyPaid ? '[Paye]' : '[En attente]'
        ]);
      }
      
      // TOTAL
      billingRows.push([
        { content: 'TOTAL', styles: { fontStyle: 'bold', fillColor: [220, 252, 231] } },
        { content: (report.billingSummary.totalAmount || 0).toLocaleString() + ' $', styles: { fontStyle: 'bold', fillColor: [220, 252, 231] } },
        { content: '', styles: { fillColor: [220, 252, 231] } }
      ]);
      
      autoTable(doc, {
        startY: y,
        head: [['Libelle', 'Montant Du', 'Statut']],
        body: billingRows,
        theme: 'grid',
        headStyles: { 
          fillColor: [209, 250, 229],
          textColor: [6, 95, 70],
          fontSize: 8,
          fontStyle: 'bold'
        },
        styles: { 
          fontSize: 8,
          cellPadding: 3,
          lineColor: [209, 213, 219]
        },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 40, halign: 'right' },
          2: { cellWidth: 40, halign: 'center' }
        },
        margin: { left: margin + 4, right: margin + 4 },
        alternateRowStyles: { fillColor: [249, 250, 251] }
      });
      
      y = doc.lastAutoTable.finalY + 6;
      
      // ============================================
      // RECAPITULATIF ET STATUT (2 colonnes comme dans l'interface)
      // ============================================
      y += 6;
      
      // Calculer la position pour 2 colonnes
      const boxWidth = (contentWidth - 8) / 2;
      const leftColX = margin + 4;
      const rightColX = margin + 4 + boxWidth + 8;
      const boxHeight = 45;
      const startY = y;
      
      // ========== COLONNE GAUCHE: RECAPITULATIF ==========
      // Fond vert clair
      doc.setFillColor(236, 253, 245); // emerald-50
      doc.setDrawColor(167, 243, 208); // emerald-200
      doc.roundedRect(leftColX, startY, boxWidth, boxHeight, 2, 2, 'FD');
      
      // Titre
      doc.setTextColor(6, 95, 70);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('RECAPITULATIF', leftColX + 5, startY + 8);
      
      let recapY = startY + 18;
      
      // TOTAL GENERAL
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text('TOTAL GENERAL', leftColX + 5, recapY);
      doc.setTextColor(4, 120, 87);
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text((report.billingSummary.totalAmount || 0).toLocaleString() + ' $', leftColX + boxWidth - 5, recapY, { align: 'right' });
      recapY += 10;
      
      // Ligne separateur
      doc.setDrawColor(167, 243, 208);
      doc.setLineWidth(0.3);
      doc.line(leftColX + 5, recapY - 4, leftColX + boxWidth - 5, recapY - 4);
      
      // ACOMPTE VERSE
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text('ACOMPTE VERSE', leftColX + 5, recapY);
      doc.setTextColor(5, 150, 105);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text((report.billingSummary.totalPaid || 0).toLocaleString() + ' $', leftColX + boxWidth - 5, recapY, { align: 'right' });
      recapY += 12;
      
      // RESTE A PAYER (dans un cadre blanc)
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(167, 243, 208);
      doc.roundedRect(leftColX + 5, recapY - 6, boxWidth - 10, 10, 1, 1, 'FD');
      
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.text('RESTE A PAYER', leftColX + 8, recapY);
      
      const balanceDue = report.billingSummary.balanceDue || 0;
      if (balanceDue > 0) {
        doc.setTextColor(220, 38, 38); // rouge
      } else {
        doc.setTextColor(5, 150, 105); // vert
      }
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(balanceDue.toLocaleString() + ' $', leftColX + boxWidth - 8, recapY, { align: 'right' });
      
      // ========== COLONNE DROITE: STATUT DE PAIEMENT ==========
      // Fond gris clair - meme hauteur que la colonne gauche
      doc.setFillColor(249, 250, 251);
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(rightColX, startY, boxWidth, boxHeight, 2, 2, 'FD');
      
      // Label "Statut de paiement"
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text('Statut de paiement', rightColX + boxWidth/2, startY + 10, { align: 'center' });
      
      // Badge statut
      const status = report.billingSummary.paymentStatus || 'NON_PAYE';
      let statusText = status;
      let statusBgColor, statusTextColor;
      
      if (status === 'SOLDE') {
        statusBgColor = [209, 250, 229]; // vert clair
        statusTextColor = [6, 95, 70]; // vert fonce
        statusText = 'SOLDE';
      } else if (status === 'PARTIEL') {
        statusBgColor = [254, 243, 199]; // orange clair
        statusTextColor = [146, 64, 14]; // orange fonce
        statusText = 'PARTIEL';
      } else {
        statusBgColor = [254, 226, 226]; // rouge clair
        statusTextColor = [153, 27, 27]; // rouge fonce
        statusText = 'NON_PAYE';
      }
      
      // Fond du badge - centre parfait dans la colonne
      const badgeY = startY + 20;
      const badgeWidth = 45;
      const badgeHeight = 12;
      const badgeX = rightColX + (boxWidth - badgeWidth) / 2;
      doc.setFillColor(statusBgColor[0], statusBgColor[1], statusBgColor[2]);
      doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 6, 6, 'F');
      
      // Texte du badge centre
      doc.setTextColor(statusTextColor[0], statusTextColor[1], statusTextColor[2]);
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.text(statusText, rightColX + boxWidth / 2, badgeY + 8.5, { align: 'center' });
      
      y = startY + boxHeight + 10;
    }
    
    // ============================================
    // FOOTER
    // ============================================
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(128, 128, 128);
      doc.text('Document genere par INUA AFIA - Systeme de Gestion Hospitaliere', pageWidth/2, 285, { align: 'center' });
      doc.text('Genere le: ' + cleanText(new Date().toLocaleString('fr-FR')) + ' - Page ' + i + '/' + pageCount, pageWidth/2, 290, { align: 'center' });
    }
    
    // Save
    doc.save('Fiche_Medicale_' + cleanText(report.patientName).replace(/\s+/g, '_') + '_' + report.consultationCode + '.pdf');
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
      <div className="print:hidden bg-white border-b p-3 sm:p-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1000px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="h-9 px-2 sm:px-3">
              <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="text-sm">Retour</span>
            </Button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Fiche Medicale Individuelle</h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">Consultation #{report.consultationCode}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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

      {/* Contenu du rapport - Style fiche medicale */}
      <div className="max-w-[900px] mx-auto p-6 print:p-0">
        
        {/* Bandeau d'en-tete INUA AFIA */}
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
        <div className="border-2 border-emerald-600 border-t-0 rounded-b-lg bg-white print:border-2 print:rounded-none">
          
          {/* Section 1: Identification Patient */}
          <div className="border-b border-emerald-200">
            <div className="bg-emerald-50 px-3 sm:px-4 py-2 border-b border-emerald-200">
              <h2 className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                <User className="w-3 h-3 sm:w-4 sm:h-4" />
                Identification du Patient
              </h2>
            </div>
            <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-gray-700 sm:min-w-[90px]">Nom:</span>
                  <span className="text-sm sm:text-base border-b border-gray-300 flex-1 pb-1 truncate">{report.patientName}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-gray-700 sm:min-w-[90px]">Code:</span>
                  <span className="text-sm sm:text-base border-b border-gray-300 flex-1 pb-1">{report.patientCode}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-gray-700 sm:min-w-[90px]">Age:</span>
                  <span className="text-sm sm:text-base border-b border-gray-300 flex-1 pb-1">{report.patientAge} ans</span>
                </div>
              </div>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-gray-700 sm:min-w-[90px]">Sexe:</span>
                  <span className="text-sm sm:text-base border-b border-gray-300 flex-1 pb-1">{report.patientGender}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-gray-700 sm:min-w-[90px]">Tel:</span>
                  <span className="text-sm sm:text-base border-b border-gray-300 flex-1 pb-1">{report.patientPhone || '-'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-gray-700 sm:min-w-[90px]">Date:</span>
                  <span className="text-sm sm:text-base border-b border-gray-300 flex-1 pb-1">{formatDate(report.consultationDate)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Medecin Traitant */}
          <div className="border-b border-emerald-200">
            <div className="bg-emerald-50 px-3 sm:px-4 py-2 border-b border-emerald-200">
              <h2 className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                <Stethoscope className="w-3 h-3 sm:w-4 sm:h-4" />
                Medecin Traitant
              </h2>
            </div>
            <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-semibold text-gray-700 sm:min-w-[90px]">Nom:</span>
                <span className="text-sm sm:text-base border-b border-gray-300 flex-1 pb-1 truncate">{report.doctorName}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-semibold text-gray-700 sm:min-w-[90px]">Specialite:</span>
                <span className="text-sm sm:text-base border-b border-gray-300 flex-1 pb-1">{report.doctorSpecialty}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Constantes Vitales (Triage) */}
          {report.triageInfo && (
            <div className="border-b border-emerald-200">
              <div className="bg-emerald-50 px-3 sm:px-4 py-2 border-b border-emerald-200">
                <h2 className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                  <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
                  Constantes Vitales
                </h2>
              </div>
              <div className="p-3 sm:p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                  <div className="border border-gray-200 rounded p-2 sm:p-3 text-center bg-gray-50">
                    <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Temperature</p>
                    <p className="text-base sm:text-lg font-semibold text-emerald-700">{report.triageInfo.temperature || '-'}°C</p>
                  </div>
                  <div className="border border-gray-200 rounded p-2 sm:p-3 text-center bg-gray-50">
                    <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Tension</p>
                    <p className="text-base sm:text-lg font-semibold text-emerald-700">{report.triageInfo.tensionArterielle || '-'}</p>
                  </div>
                  <div className="border border-gray-200 rounded p-2 sm:p-3 text-center bg-gray-50">
                    <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Poids</p>
                    <p className="text-base sm:text-lg font-semibold text-emerald-700">{report.triageInfo.poids || '-'} kg</p>
                  </div>
                  <div className="border border-gray-200 rounded p-2 sm:p-3 text-center bg-gray-50">
                    <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Taille</p>
                    <p className="text-base sm:text-lg font-semibold text-emerald-700">{report.triageInfo.taille || '-'} cm</p>
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
              <div className="bg-emerald-50 px-3 sm:px-4 py-2 border-b border-emerald-200">
                <h2 className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                  <FlaskConical className="w-3 h-3 sm:w-4 sm:h-4" />
                  Resultats de Laboratoire
                </h2>
              </div>
              <div className="p-2 sm:p-4 overflow-x-auto">
                <table className="w-full border-collapse min-w-[500px]">
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
              <div className="bg-emerald-50 px-3 sm:px-4 py-2 border-b border-emerald-200">
                <h2 className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                  Prescription Medicale
                </h2>
              </div>
              <div className="p-3 sm:p-4">
                {report.prescription.diagnosis && (
                  <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                    <span className="text-xs sm:text-sm font-semibold text-gray-700">Diagnostic:</span>
                    <span className="text-sm sm:text-base border-b border-gray-300 flex-1 pb-1">{report.prescription.diagnosis}</span>
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
              <div className="bg-emerald-50 px-3 sm:px-4 py-2 border-b border-emerald-200">
                <h2 className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                  <Pill className="w-3 h-3 sm:w-4 sm:h-4" />
                  Dispensation Pharmacie
                </h2>
              </div>
              <div className="p-2 sm:p-4 overflow-x-auto">
                <table className="w-full border-collapse min-w-[400px]">
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
              <div className="bg-emerald-50 px-3 sm:px-4 py-2 border-b border-emerald-200">
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
                </div>
                
                {/* Recapitulatif des montants */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {/* Colonne gauche - Totaux */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 sm:p-4">
                    <h3 className="text-xs sm:text-sm font-bold text-emerald-800 mb-2 sm:mb-3 uppercase">Recapitulatif</h3>
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-600">TOTAL</span>
                        <span className="font-bold text-base sm:text-lg text-emerald-700">{report.billingSummary.totalAmount?.toLocaleString()} $</span>
                      </div>
                      <div className="h-px bg-emerald-200 my-1 sm:my-2"></div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-600">PAYE</span>
                        <span className="font-semibold text-emerald-600">{report.billingSummary.totalPaid?.toLocaleString()} $</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm bg-white p-1.5 sm:p-2 rounded border border-emerald-200">
                        <span className="text-gray-700 font-medium">RESTE</span>
                        <span className={`font-bold ${report.billingSummary.balanceDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {report.billingSummary.balanceDue?.toLocaleString()} $
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Colonne droite - Statut global */}
                  <div className="flex flex-col justify-center items-center bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
                    <span className="text-xs sm:text-sm text-gray-500 mb-2">Statut</span>
                    <Badge className={`${getPaymentStatusColor(report.billingSummary.paymentStatus)} px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-bold`}>
                      {report.billingSummary.paymentStatus === 'SOLDE' && <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />}
                      {report.billingSummary.paymentStatus === 'PARTIEL' && <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />}
                      {report.billingSummary.paymentStatus === 'NON_PAYE' && <XCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />}
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
