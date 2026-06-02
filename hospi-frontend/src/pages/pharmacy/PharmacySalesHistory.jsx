import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  History,
  Search,
  Calendar,
  DollarSign,
  Receipt,
  Printer,
  Download,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  CreditCard,
  Wallet,
  Filter,
  RefreshCw,
  Eye,
  X
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import axios from '../../api/axios.js';
import hospitalConfigService, { defaultHospitalConfig } from '../../services/hospitalConfigService';
import { resolveLogoUrl } from '../../utils/printUtils';
import { API_BASE_URL } from '../../config/environment.js';
import { getPaidPrescriptions } from '../../services/pharmacyApi/pharmacyApi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useHospitalConfig } from '../../hooks/useHospitalConfig';
import { formatCurrencyPDF, formatCurrency, getCurrencySymbol } from '../../utils/currencyFormat';

// Fonction utilitaire pour obtenir le vrai statut de paiement (utilisée par tous les composants)
const getPaymentStatusLabel = (sale) => {
  const status = sale.status;
  const remainingAmount = Math.max(0, sale.remainingAmount || (sale.totalAmount - (sale.amountPaid || 0)));
  const isFullyPaid = remainingAmount <= 0;
  
  // Si statut PAYEE mais pas complètement payé
  if (status === 'PAYEE' && !isFullyPaid && remainingAmount > 0) {
    return `Partiellement payé (Reste: ${formatCurrency(remainingAmount)})`;
  }
  
  // Sinon retourner le statut normal
  const statusLabels = {
    'PAYEE': 'Payée',
    'LIVREE': 'Livrée',
    'EN_ATTENTE': 'En attente',
    'EN_PREPARATION': 'En préparation',
    'ANNULEE': 'Annulée'
  };
  return statusLabels[status] || status;
};

/* =========================================
   COMPOSANT MODAL DÉTAILS VENTE
   ========================================= */
const SaleDetailsModal = ({ sale, onClose }) => {
  if (!sale) return null;

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'CASH':
      case 'ESPECES':
        return <Wallet className="w-4 h-4" />;
      case 'CARTE_BANCAIRE':
      case 'CARD':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case 'CASH':
      case 'ESPECES':
        return 'Espèces';
      case 'CARTE_BANCAIRE':
      case 'CARD':
        return 'Carte bancaire';
      case 'MOBILE_MONEY':
        return 'Mobile Money';
      default:
        return method;
    }
  };

  const getStatusBadge = (sale) => {
    const status = sale.status;
    const remainingAmount = sale.remainingAmount || (sale.totalAmount - (sale.amountPaid || 0));
    const isFullyPaid = sale.isFullyPaid || remainingAmount <= 0;
    
    // Déterminer le statut de paiement réel
    if (status === 'PAYEE' && !isFullyPaid && remainingAmount > 0) {
      return (
        <div className="flex flex-col items-end gap-1">
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
            Partiellement payé
          </Badge>
          <span className="text-xs text-red-600 font-bold">
            Reste: ${remainingAmount.toFixed(2)}
          </span>
        </div>
      );
    }
    
    const statusConfig = {
      'PAYEE': { class: 'bg-emerald-100 text-emerald-700', label: 'Payée' },
      'LIVREE': { class: 'bg-blue-100 text-blue-700', label: 'Livrée' },
      'EN_ATTENTE': { class: 'bg-yellow-100 text-yellow-700', label: 'En attente' },
      'EN_PREPARATION': { class: 'bg-orange-100 text-orange-700', label: 'En préparation' },
      'ANNULEE': { class: 'bg-red-100 text-red-700', label: 'Annulée' }
    };
    const config = statusConfig[status] || { class: 'bg-gray-100 text-gray-700', label: status };
    return <Badge className={config.class}>{config.label}</Badge>;
  };

  // ✅ Fonction pour générer PDF de la vente individuelle
  const handlePrintPDF = async () => {
    try {
      const hospitalConfig = await (async () => {
        try { return await hospitalConfigService.getConfig() || defaultHospitalConfig; }
        catch { return defaultHospitalConfig; }
      })();

      const hexToRgb = (hex) => {
        if (!hex) return [16, 185, 129];
        const c = hex.replace('#', '');
        const b = parseInt(c, 16);
        return [(b >> 16) & 255, (b >> 8) & 255, b & 255];
      };
      const [r, g, b] = hexToRgb(hospitalConfig.primaryColor);

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = doc.internal.pageSize.getWidth();
      let currentY = 10;

      // Logo
      if (hospitalConfig.enableLogoOnDocuments && hospitalConfig.hospitalLogoUrl) {
        try {
          const absUrl = resolveLogoUrl(hospitalConfig.hospitalLogoUrl, API_BASE_URL);
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = absUrl;
          await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
          const canvas = document.createElement('canvas');
          canvas.width = img.width; canvas.height = img.height;
          canvas.getContext('2d').drawImage(img, 0, 0);
          const logoH = 15, logoW = logoH * (img.width / img.height);
          doc.addImage(canvas.toDataURL('image/png'), 'PNG', 15, currentY, logoW, logoH);
        } catch { /* ignore */ }
      }

      // Nom hôpital
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(r, g, b);
      doc.text(hospitalConfig.hospitalName || 'HÔPITAL', 15, currentY + 18);
      if (hospitalConfig.phoneNumber || hospitalConfig.email) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 100, 100);
        doc.text([hospitalConfig.phoneNumber, hospitalConfig.email].filter(Boolean).join(' | '), 15, currentY + 23);
      }
      currentY += 28;

      // Ligne séparatrice
      doc.setFillColor(r, g, b); doc.rect(0, currentY, pdfWidth, 1, 'F');
      currentY += 6;

      // Titre
      doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(r, g, b);
      doc.text('REÇU DE VENTE', pdfWidth / 2, currentY, { align: 'center' });
      currentY += 6;

      // Numéro de commande
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Commande: ${sale.orderCode}`, pdfWidth / 2, currentY, { align: 'center' });
      currentY += 8;

      // Informations générales
      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81);
      
      const clientName = sale.patientName || sale.customerName || 'Client comptoir';
      const leftX = 20;

      doc.text(`Date: ${sale.createdAt ? format(parseISO(sale.createdAt), 'dd/MM/yyyy HH:mm') : '-'}`, leftX, currentY);
      currentY += 8;
      doc.text(`Client: ${clientName}`, leftX, currentY);
      currentY += 8;
      doc.text(`Paiement: ${getPaymentMethodLabel(sale.paymentMethod)}`, leftX, currentY);
      currentY += 8;
      doc.text(`Statut: ${getPaymentStatusLabel(sale)}`, leftX, currentY);

      // Tableau des articles
      currentY += 15;
      
      const itemsData = sale.items?.map(item => [
        item.medicationName,
        `${item.quantity} x ${formatCurrencyPDF(item.unitPrice)}`,
        `${formatCurrencyPDF(item.quantity * (item.unitPrice || 0))}`
      ]) || [];

      if (itemsData.length > 0) {
        autoTable(doc, {
          startY: currentY,
          head: [['Article', 'Quantité × Prix', 'Total']],
          body: itemsData,
          theme: 'striped',
          headStyles: {
            fillColor: [243, 244, 246],
            textColor: [55, 65, 81],
            fontStyle: 'bold',
            fontSize: 10
          },
          bodyStyles: {
            fontSize: 10,
            textColor: [75, 85, 99]
          },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 50, halign: 'center' },
            2: { cellWidth: 40, halign: 'right' }
          },
          margin: { left: 20, right: 20 }
        });

        currentY = doc.lastAutoTable.finalY + 10;
      }

      // Totaux
      doc.setFontSize(12);
      doc.setTextColor(75, 85, 99);
      doc.text('Sous-total:', 120, currentY);
      doc.text(`${formatCurrencyPDF(sale.totalAmount)}`, 180, currentY, { align: 'right' });

      currentY += 10;
      doc.setFontSize(14);
      doc.setTextColor(r, g, b);
      doc.setFont(undefined, 'bold');
      doc.text('TOTAL:', 120, currentY);
      doc.text(`${formatCurrencyPDF(sale.totalAmount)}`, 180, currentY, { align: 'right' });

      if (sale.amountPaid) {
        currentY += 8;
        doc.setFontSize(10);
        doc.setTextColor(r, g, b);
        doc.setFont(undefined, 'normal');
        doc.text(`Montant payé: ${formatCurrencyPDF(sale.amountPaid)}`, 120, currentY);
      }

      // Pied de page
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Document généré par le système de gestion hospitalière', doc.internal.pageSize.getWidth() / 2, pageHeight - 20, { align: 'center' });
      doc.text(`Date: ${format(new Date(), 'dd/MM/yyyy HH:mm')} - Traçable`, doc.internal.pageSize.getWidth() / 2, pageHeight - 15, { align: 'center' });

      // Sauvegarder
      doc.save(`recu_${sale.orderCode}.pdf`);
      toast.success('Reçu PDF généré avec succès !');
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast.error('Erreur lors de la génération du reçu');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-2xl border-none shadow-2xl rounded-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-3 sticky top-0 bg-white z-10 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                Détails de la vente
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {sale.orderCode}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {/* Info générales */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-xl">
              <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Date</p>
              <p className="font-bold">
                {sale.createdAt ? format(parseISO(sale.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr }) : '-'}
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-xl">
              <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Statut</p>
              <div>{getStatusBadge(sale)}</div>
            </div>
            <div className="p-4 bg-muted/50 rounded-xl">
              <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Client</p>
              <p className="font-bold">
                {(() => {
                  const clientName = sale.patientName || sale.customerName || 'Client comptoir';
                  return clientName;
                })()}
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-xl">
              <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Paiement</p>
              <div className="flex items-center gap-2">
                {getPaymentMethodIcon(sale.paymentMethod)}
                <span className="font-bold">{getPaymentMethodLabel(sale.paymentMethod)}</span>
              </div>
            </div>
          </div>

          {/* Articles */}
          <div>
            <h3 className="font-bold text-sm uppercase text-muted-foreground mb-3">Articles</h3>
            <div className="space-y-2">
              {sale.items?.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                  <div>
                    <p className="font-bold">{item.medicationName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} x ${item.unitPrice?.toFixed(2)}
                    </p>
                  </div>
                  <p className="font-bold">${(item.quantity * (item.unitPrice || 0)).toFixed(2)}</p>
                </div>
              )) || <p className="text-muted-foreground text-sm">Aucun article</p>}
            </div>
          </div>

          {/* Totaux */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground">Sous-total</span>
              <span className="font-bold">${sale.totalAmount?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-lg">
              <span className="font-bold">TOTAL</span>
              <span className="font-black text-primary text-xl">${sale.totalAmount?.toFixed(2)}</span>
            </div>
            {sale.amountPaid && (
              <div className="flex justify-between items-center mt-2 text-sm">
                <span className="text-muted-foreground">Montant payé</span>
                <span className="font-bold text-emerald-600">${sale.amountPaid?.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-xl font-bold"
            >
              Fermer
            </Button>
            <Button
              onClick={handlePrintPDF}
              className="flex-1 rounded-xl font-bold bg-primary hover:bg-primary/90"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimer PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/* =========================================
   PAGE HISTORIQUE DES VENTES
   ========================================= */
const PharmacySalesHistory = () => {
  const { t } = useTranslation();
  
  // States
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return format(date, 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(() => {
    return format(new Date(), 'yyyy-MM-dd');
  });
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [selectedSale, setSelectedSale] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);

  // Load sales history + paid prescriptions
  const loadSalesHistory = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Récupérer les ventes directes (POS)
      const salesResponse = await axios.get('/api/pharmacy/sales/history', {
        params: {
          startDate,
          endDate,
          page,
          size: 20
        }
      });
      
      // 2. Récupérer les prescriptions payées
      let prescriptionsData = [];
      try {
        console.log('🔍 Chargement prescriptions payées...', { startDate, endDate });
        const prescriptionsResponse = await getPaidPrescriptions({
          startDate,
          endDate,
          page: 0,
          size: 100
        });
        console.log('📦 Réponse prescriptions:', prescriptionsResponse);
        console.log('📦 prescriptionsResponse.data:', prescriptionsResponse.data);
        console.log('📦 prescriptionsResponse.data?.data:', prescriptionsResponse.data?.data);
        console.log('📦 prescriptionsResponse.data?.data?.content:', prescriptionsResponse.data?.data?.content);
        
        prescriptionsData = prescriptionsResponse.data?.data?.content || prescriptionsResponse.data?.data || prescriptionsResponse.data?.content || prescriptionsResponse.data || [];
        console.log('✅ Prescriptions payées récupérées:', prescriptionsData.length);
        console.log('✅ prescriptionsData type:', typeof prescriptionsData, Array.isArray(prescriptionsData));
        console.log('📋 Premières prescriptions:', prescriptionsData.slice(0, 3));
      } catch (prescriptionError) {
        console.warn('⚠️ Impossible de charger les prescriptions payées:', prescriptionError);
        console.error('Détails erreur:', prescriptionError.response?.data || prescriptionError.message);
      }
      
      // 3. Transformer les prescriptions au format des ventes avec tag
      const transformedPrescriptions = prescriptionsData.map(prescription => ({
        ...prescription,
        saleType: 'PRESCRIPTION', // Tag distinct
        orderCode: prescription.prescriptionCode || prescription.code || `PRE-${prescription.id}`,
        patientName: prescription.patientName || prescription.patient?.name || 'Patient',
        totalAmount: prescription.totalAmount || prescription.amount || 0,
        amountPaid: prescription.totalAmount || prescription.amount || 0,
        remainingAmount: 0,
        isFullyPaid: true,
        status: 'PAYEE',
        createdAt: prescription.paidAt || prescription.updatedAt || prescription.createdAt,
        items: prescription.items?.map(item => ({
          ...item,
          medicationName: item.medicationName || item.medication?.name || 'Médicament',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || item.price || 0
        })) || []
      }));
      
      // 4. Transformer les ventes avec tag (conserver orderType du backend)
      const salesData = (salesResponse.data?.content || salesResponse.data || []).map(sale => ({
        ...sale,
        // Ne pas écraser saleType si orderType existe déjà
        saleType: sale.orderType || 'VENTE_DIRECTE'
      }));
      
      // 5. Fusionner et trier par date (plus récent en premier)
      const mergedData = [...salesData, ...transformedPrescriptions].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.saleDate || a.paidAt || 0);
        const dateB = new Date(b.createdAt || b.saleDate || b.paidAt || 0);
        return dateB - dateA;
      });
      
      console.log('✅ Ventes chargées:', salesData.length, '| Prescriptions payées:', transformedPrescriptions.length, '| Total fusionné:', mergedData.length);
      
      setSales(mergedData);
      setTotalPages(salesResponse.data?.totalPages || 1);
      setTotalElements(mergedData.length);
    } catch (error) {
      console.error('❌ Erreur chargement historique:', error);
      toast.error('Erreur lors du chargement de l\'historique des ventes');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, page]);

  useEffect(() => {
    loadSalesHistory();
  }, [loadSalesHistory]);

  // Filter sales locally (par recherche)
  const filteredSales = sales.filter(sale => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      sale.orderCode?.toLowerCase().includes(query) ||
      sale.patientName?.toLowerCase().includes(query)
    );
  });

  // Calculate totals
  const totalSales = filteredSales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
  const totalItems = filteredSales.reduce((sum, sale) => sum + (sale.items?.length || 0), 0);
  
  // Calculate totals by type
  const prescriptionSales = filteredSales.filter(s => s.orderType === 'ORDONNANCE_EXTERNE' || s.saleType === 'PRESCRIPTION');
  const directSales = filteredSales.filter(s => s.orderType === 'VENTE_DIRECTE' || s.saleType === 'VENTE_DIRECTE');
  const totalPrescriptions = prescriptionSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalDirectSales = directSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  const getStatusBadge = (sale) => {
    const status = sale.status;
    const remainingAmount = sale.remainingAmount || (sale.totalAmount - (sale.amountPaid || 0));
    const isFullyPaid = sale.isFullyPaid || remainingAmount <= 0;
    
    // Déterminer le statut de paiement réel
    if (status === 'PAYEE' && !isFullyPaid && remainingAmount > 0) {
      return (
        <div className="flex flex-col items-end gap-1">
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
            Partiellement payé
          </Badge>
          <span className="text-xs text-red-600 font-bold">
            Reste: ${remainingAmount.toFixed(2)}
          </span>
        </div>
      );
    }
    
    const statusConfig = {
      'PAYEE': { class: 'bg-emerald-100 text-emerald-700', label: 'Payée' },
      'LIVREE': { class: 'bg-blue-100 text-blue-700', label: 'Livrée' },
      'EN_ATTENTE': { class: 'bg-yellow-100 text-yellow-700', label: 'En attente' },
      'EN_PREPARATION': { class: 'bg-orange-100 text-orange-700', label: 'En préparation' },
      'ANNULEE': { class: 'bg-red-100 text-red-700', label: 'Annulée' }
    };
    const config = statusConfig[status] || { class: 'bg-gray-100 text-gray-700', label: status };
    return <Badge className={config.class}>{config.label}</Badge>;
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'CASH':
      case 'ESPECES':
        return <Wallet className="w-4 h-4 text-emerald-600" />;
      case 'CARTE_BANCAIRE':
      case 'CARD':
        return <CreditCard className="w-4 h-4 text-blue-600" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ======== HEADER ======== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge className="bg-primary/10 text-primary border-none mb-2 px-3 py-1 font-bold">
            <History className="w-3 h-3 mr-1" />
            HISTORIQUE
          </Badge>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Historique des Ventes
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            {totalElements} vente{totalElements > 1 ? 's' : ''} au total
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={loadSalesHistory}
            className="rounded-xl font-bold"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button
            variant="outline"
            className="rounded-xl font-bold"
            onClick={() => setShowExportModal(true)}
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* ======== STATS CARDS - 3 TOTAUX ======== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Prescriptions */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-bold uppercase">Total Prescriptions</p>
                <p className="text-2xl font-black text-blue-700 mt-1">
                  ${totalPrescriptions.toFixed(2)}
                </p>
                <p className="text-xs text-blue-500 mt-1">{prescriptionSales.length} vente(s)</p>
              </div>
              <div className="w-10 h-10 bg-blue-200 rounded-xl flex items-center justify-center">
                <Receipt className="w-5 h-5 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Ventes Directes */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600 font-bold uppercase">Total Ventes Directes</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">
                  ${totalDirectSales.toFixed(2)}
                </p>
                <p className="text-xs text-emerald-500 mt-1">{directSales.length} vente(s)</p>
              </div>
              <div className="w-10 h-10 bg-emerald-200 rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-emerald-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Général */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-primary font-bold uppercase">Total Général</p>
                <p className="text-2xl font-black text-primary mt-1">
                  ${totalSales.toFixed(2)}
                </p>
                <p className="text-xs text-primary/70 mt-1">{filteredSales.length} vente(s) | {totalItems} article(s)</p>
              </div>
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ======== FILTERS ======== */}
      <Card className="border-none shadow-sm rounded-2xl">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par n° de commande ou client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40 rounded-xl"
                />
              </div>
              <span className="text-muted-foreground self-center">à</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40 rounded-xl"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ======== SALES TABLE ======== */}
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b bg-muted/30">
          <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Liste des ventes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="py-16 text-center">
              <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">Aucune vente trouvée</p>
              <p className="text-xs text-muted-foreground mt-1">
                Modifiez les filtres ou la période sélectionnée
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredSales.map((sale) => (
                <div 
                  key={sale.id} 
                  className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedSale(sale)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Receipt className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold">{sale.orderCode}</p>
                          {(() => {
                            const type = sale.orderType || sale.saleType;
                            if (type === 'ORDONNANCE_EXTERNE' || type === 'PRESCRIPTION') {
                              return (
                                <Badge className="bg-blue-500/10 text-blue-600 border-none text-xs">
                                  PRESCRIPTION
                                </Badge>
                              );
                            } else if (type === 'VENTE_DIRECTE') {
                              return (
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-xs">
                                  VENTE DIRECTE
                                </Badge>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {sale.createdAt ? format(parseISO(sale.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr }) : '-'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden md:block">
                        <p className="text-sm text-muted-foreground">Client</p>
                        <p className="font-medium">
                          {(() => {
                            const clientName = sale.patientName || sale.customerName || 'Client comptoir';
                            return clientName;
                          })()}
                        </p>
                      </div>
                      
                      <div className="text-right hidden md:block">
                        <p className="text-sm text-muted-foreground">Articles</p>
                        <p className="font-medium">{sale.items?.length || 0}</p>
                      </div>
                      
                      <div className="text-right hidden md:block">
                        <p className="text-sm text-muted-foreground">Paiement</p>
                        <div className="flex items-center justify-end gap-1">
                          {getPaymentMethodIcon(sale.paymentMethod)}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-black text-primary">
                          ${sale.totalAmount?.toFixed(2)}
                        </p>
                        {getStatusBadge(sale)}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSale(sale);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t bg-muted/30">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} sur {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-lg"
                >
                  Suivant
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ======== SALE DETAILS MODAL ======== */}
      {selectedSale && (
        <SaleDetailsModal 
          sale={selectedSale} 
          onClose={() => setSelectedSale(null)} 
        />
      )}

      {/* ======== EXPORT MODAL ======== */}
      {showExportModal && (
        <ExportModal
          sales={filteredSales}
          totalSales={totalSales}
          totalItems={totalItems}
          startDate={startDate}
          endDate={endDate}
          onClose={() => setShowExportModal(false)}
          getPaymentStatusLabel={getPaymentStatusLabel}
        />
      )}
    </div>
  );
};

/* =========================================
   COMPOSANT MODAL EXPORT
   ========================================= */
const ExportModal = ({ sales, totalSales, totalItems, startDate, endDate, onClose, getPaymentStatusLabel }) => {
  const handleGeneratePDF = async () => {
    try {
      // 📦 Récupérer la configuration admin
      let hospitalConfig;
      try {
        hospitalConfig = await hospitalConfigService.getConfig();
      } catch (error) {
        hospitalConfig = defaultHospitalConfig;
      }

      // Conversion couleur hex en RGB
      const hexToRgb = (hex) => {
        if (!hex) return { r: 0, g: 128, b: 128 };
        const cleanHex = hex.replace('#', '');
        const bigint = parseInt(cleanHex, 16);
        return {
          r: (bigint >> 16) & 255,
          g: (bigint >> 8) & 255,
          b: bigint & 255
        };
      };
      const primaryColor = hexToRgb(hospitalConfig.primaryColor);

      // Créer un nouveau PDF en format paysage pour plus d'espace
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let currentY = 10;

      // ═══════════════════════════════════════════════════════════════
      // 📋 EN-TÊTE COMPACT AVEC CONFIGURATION ADMIN
      // ═══════════════════════════════════════════════════════════════

      // Ligne ministère/departement/zone en HAUT et CENTRÉE (compact)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      const topInfo = [hospitalConfig.ministryName, hospitalConfig.departmentName, hospitalConfig.zoneName, hospitalConfig.region]
        .filter(Boolean).join(' | ');
      if (topInfo) {
        doc.text(topInfo.toUpperCase(), pdfWidth / 2, currentY + 2, { align: 'center' });
        currentY += 5;
      }

      // Logo (si activé) - plus compact
      if (hospitalConfig.enableLogoOnDocuments && hospitalConfig.hospitalLogoUrl) {
        try {
          const absoluteLogoUrl = resolveLogoUrl(hospitalConfig.hospitalLogoUrl, API_BASE_URL);
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = absoluteLogoUrl;
          await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
          
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          canvas.getContext('2d').drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');

          const maxLogoHeight = 18;
          const imgRatio = img.width / img.height;
          const logoHeight = maxLogoHeight;
          const logoWidth = logoHeight * imgRatio;
          
          doc.addImage(dataUrl, 'PNG', margin, currentY, logoWidth, logoHeight);
          currentY += logoHeight + 4;
        } catch (e) {
          // Continue sans logo
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // Zone de texte alignée à GAUCHE avec le logo
      const textX = margin; // Aligné à gauche comme le logo
      const textAlign = 'left';

      // Titre de l'hôpital - plus compact
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.text(hospitalConfig.hospitalName || 'CLINIQUE CI UCBC', textX, currentY, { align: textAlign });
      currentY += 6;

      // Sous-titre (compact)
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(hospitalConfig.headerSubtitle || 'Système de Gestion Hospitalière', textX, currentY, { align: textAlign });
      currentY += 4;

      // Code Établissement (compact)
      if (hospitalConfig.hospitalCode) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text(`Code: ${hospitalConfig.hospitalCode}`, textX, currentY, { align: textAlign });
        currentY += 3;
      }

      // Adresse complète (compact)
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      const address = [hospitalConfig.address, hospitalConfig.city, hospitalConfig.country, hospitalConfig.postalCode]
        .filter(Boolean).join(', ');
      if (address) {
        doc.text(address, textX, currentY, { align: textAlign });
        currentY += 3;
      }

      // Contact (compact sur une ligne)
      const contact = [hospitalConfig.phoneNumber, hospitalConfig.email].filter(Boolean).join(' | ');
      if (contact) {
        doc.text(contact, textX, currentY, { align: textAlign });
        currentY += 5;
      }

      // Titre du rapport à DROITE (plus petit)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.text('RAPPORT DES VENTES', pdfWidth - margin, currentY - 15, { align: 'right' });

      // Barre séparatrice épaisse
      currentY += 2;
      doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.rect(0, currentY, pdfWidth, 1.5, 'F');
      currentY += 5;

      // Période et date (compact)
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Période: ${startDate} au ${endDate}  |  Généré le ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pdfWidth / 2, currentY, { align: 'center' });
      currentY += 5;

      // Ligne séparatrice
      doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.setLineWidth(0.3);
      doc.line(10, currentY, pdfWidth - 10, currentY);
      currentY += 6;

      // Calculer les totaux par type
      const prescriptionSales = sales.filter(s => s.orderType === 'ORDONNANCE_EXTERNE' || s.saleType === 'PRESCRIPTION');
      const directSales = sales.filter(s => s.orderType === 'VENTE_DIRECTE' || s.saleType === 'VENTE_DIRECTE');
      
      const totalPrescriptions = prescriptionSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      const totalDirectSales = directSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      const totalDettes = sales.reduce((sum, s) => sum + Math.max(0, s.remainingAmount || (s.totalAmount - (s.amountPaid || 0))), 0);
      
      // Résumé en 3 colonnes de totaux
      const summaryY = currentY;
      const colWidth = (pdfWidth - 40) / 3;
      const startX = 20;

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      
      // Colonne 1: Total Prescriptions
      doc.text('TOTAL PRESCRIPTIONS', startX + colWidth/2, summaryY, { align: 'center' });
      doc.setFontSize(14);
      doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.text(`$${totalPrescriptions.toFixed(2)}`, startX + colWidth/2, summaryY + 6, { align: 'center' });
      doc.setFontSize(8);
      doc.text(`${prescriptionSales.length} vente(s)`, startX + colWidth/2, summaryY + 10, { align: 'center' });

      // Colonne 2: Total Ventes Directes
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('TOTAL VENTES DIRECTES', startX + colWidth + colWidth/2, summaryY, { align: 'center' });
      doc.setFontSize(14);
      doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.text(`$${totalDirectSales.toFixed(2)}`, startX + colWidth + colWidth/2, summaryY + 6, { align: 'center' });
      doc.setFontSize(8);
      doc.text(`${directSales.length} vente(s)`, startX + colWidth + colWidth/2, summaryY + 10, { align: 'center' });

      // Colonne 3: Total Général
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('TOTAL GENERAL', startX + 2*colWidth + colWidth/2, summaryY, { align: 'center' });
      doc.setFontSize(16);
      doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.text(`$${totalSales.toFixed(2)}`, startX + 2*colWidth + colWidth/2, summaryY + 6, { align: 'center' });
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`${sales.length} vente(s) | ${totalItems} articles`, startX + 2*colWidth + colWidth/2, summaryY + 10, { align: 'center' });
      
      currentY = summaryY + 16;

      // Préparer les données pour le tableau
      const tableData = sales.map(sale => {
        const remainingAmount = Math.max(0, sale.remainingAmount || (sale.totalAmount - (sale.amountPaid || 0)));
        const typeLabel = sale.orderType === 'ORDONNANCE_EXTERNE' ? 'PRESCRIPTION' : 'VENTE DIRECTE';
        return [
          sale.createdAt ? format(parseISO(sale.createdAt), 'dd/MM/yyyy HH:mm') : '-',
          typeLabel,
          sale.orderCode,
          sale.patientName || sale.customerName || 'Client comptoir',
          (sale.items?.length || 0).toString(),
          `$${sale.totalAmount?.toFixed(2)}`,
          `$${sale.amountPaid?.toFixed(2) || '0.00'}`,
          remainingAmount > 0 ? `$${remainingAmount.toFixed(2)}` : '-',
          getPaymentStatusLabel(sale)
        ];
      });

      // Afficher les stats par type si les deux types existent
      if (directSales.length > 0 && prescriptionSales.length > 0) {
        currentY += 5;
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Ventes directes: ${directSales.length} | Prescriptions: ${prescriptionSales.length}`, pdfWidth / 2, currentY, { align: 'center' });
        currentY += 5;
      }
      
      // Calculer les marges pour centrer le tableau
      const tableTotalWidth = 25 + 28 + 35 + 45 + 15 + 25 + 25 + 25 + 25; // 248mm
      const pageWidth = doc.internal.pageSize.getWidth();
      const sideMargin = (pageWidth - tableTotalWidth) / 2;

      // Générer le tableau avec autoTable - centré
      autoTable(doc, {
        startY: currentY + 3,
        head: [['Date', 'Type', 'N° Commande', 'Client', 'Articles', 'Total', 'Payé', 'Dette', 'Statut']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [primaryColor.r, primaryColor.g, primaryColor.b],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center',
          valign: 'middle'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [75, 85, 99],
          valign: 'middle',
          overflow: 'linebreak'
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251]
        },
        columnStyles: {
          0: { cellWidth: 25, halign: 'center' },  // Date
          1: { cellWidth: 28, halign: 'center' },  // Type
          2: { cellWidth: 35, halign: 'left' },    // N° Commande
          3: { cellWidth: 45, halign: 'left' },    // Client
          4: { cellWidth: 15, halign: 'center' },  // Articles
          5: { cellWidth: 25, halign: 'right' },  // Total
          6: { cellWidth: 25, halign: 'right' },  // Payé
          7: { cellWidth: 25, halign: 'right' },  // Dette
          8: { cellWidth: 25, halign: 'center' }   // Statut
        },
        styles: {
          overflow: 'linebreak',
          cellPadding: 2,
          fontSize: 8,
          minCellHeight: 8
        },
        margin: { top: 10, left: sideMargin, right: sideMargin, bottom: 15 },
        pageBreak: 'auto',
        showHead: 'everyPage',
        tableWidth: 'auto',
        didDrawPage: function(data) {
          // Footer avec branding admin - positionné plus bas pour éviter chevauchement
          const pageHeight = doc.internal.pageSize.getHeight();
          const footerY = pageHeight - 18;
          
          // Ligne de séparation (uniquement si espace suffisant)
          if (data.cursor.y < footerY - 10) {
            doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
            doc.setLineWidth(0.3);
            doc.line(14, footerY, pdfWidth - 14, footerY);
          }
          
          // © INUA AFYA
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
          doc.text('© INUA AFYA - Tous droits réservés', pdfWidth / 2, footerY + 5, { align: 'center' });
          
          // Nom hôpital
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(80, 80, 80);
          doc.text(`- ${hospitalConfig.hospitalName || 'CLINIQUE CI UCBC'} -`, pdfWidth / 2, footerY + 10, { align: 'center' });
          
          // Numéro de page
          const str = 'Page ' + doc.internal.getNumberOfPages();
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(str, data.settings.margin.left, pageHeight - 3);
        }
      });

      // Sauvegarder le PDF
      const filename = `ventes_${startDate}_${endDate}.pdf`;
      doc.save(filename);
      
      toast.success('PDF généré avec succès ! Traçable avec numéros de page.');
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'N° Commande', 'Client', 'Articles', 'Total', 'Payé', 'Dette', 'Statut'];
    const rows = sales.map(sale => {
      const remainingAmount = sale.remainingAmount || (sale.totalAmount - (sale.amountPaid || 0));
      return [
        sale.createdAt ? format(parseISO(sale.createdAt), 'dd/MM/yyyy HH:mm') : '-',
        sale.orderCode,
        sale.patientName || sale.customerName || 'Client comptoir',
        sale.items?.length || 0,
        sale.totalAmount?.toFixed(2),
        sale.amountPaid?.toFixed(2) || '0.00',
        remainingAmount > 0 ? remainingAmount.toFixed(2) : '0.00',
        getPaymentStatusLabel(sale)
      ];
    });
    
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ventes_${startDate}_${endDate}.csv`;
    link.click();
    toast.success('Export CSV réussi !');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-4xl border-none shadow-2xl rounded-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-3 sticky top-0 bg-card z-10 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Printer className="w-5 h-5 text-primary" />
                Export des Ventes
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {sales.length} vente{sales.length > 1 ? 's' : ''} · Période : {startDate} au {endDate}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6 p-6">
          {/* Aperçu du contenu */}
          <div className="bg-muted rounded-xl p-6">
            <h3 className="text-center text-xl font-black text-primary mb-2">RAPPORT DES VENTES</h3>
            <p className="text-center text-sm text-muted-foreground mb-6">
              Période : {startDate} au {endDate}
            </p>

            {/* Résumé */}
            <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-card rounded-xl shadow-sm border">
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase">Total des ventes</p>
                <p className="text-xl font-black text-emerald-600">${totalSales.toFixed(2)}</p>
              </div>
              <div className="text-center border-x">
                <p className="text-xs text-muted-foreground uppercase">Nombre de ventes</p>
                <p className="text-xl font-black text-blue-600">{sales.length}</p>
              </div>
              <div className="text-center border-r">
                <p className="text-xs text-muted-foreground uppercase">Articles vendus</p>
                <p className="text-xl font-black text-purple-600">{totalItems}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-red-500 uppercase font-bold">Total Dettes</p>
                <p className="text-xl font-black text-red-600">
                  ${sales.reduce((sum, s) => sum + (s.remainingAmount || (s.totalAmount - (s.amountPaid || 0))), 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Tableau */}
            <div className="bg-card rounded-xl shadow-sm overflow-hidden border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold text-foreground">Date</th>
                    <th className="px-3 py-2 text-left font-bold text-foreground">N° Commande</th>
                    <th className="px-3 py-2 text-left font-bold text-foreground">Client</th>
                    <th className="px-3 py-2 text-center font-bold text-foreground">Articles</th>
                    <th className="px-3 py-2 text-right font-bold text-foreground">Total</th>
                    <th className="px-3 py-2 text-right font-bold text-foreground">Payé</th>
                    <th className="px-3 py-2 text-right font-bold text-red-600">Dette</th>
                    <th className="px-3 py-2 text-center font-bold text-foreground">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sales.slice(0, 5).map((sale, index) => {
                    const remainingAmount = sale.remainingAmount || (sale.totalAmount - (sale.amountPaid || 0));
                    return (
                      <tr key={sale.id} className={index % 2 === 0 ? 'bg-card' : 'bg-muted/50'}>
                        <td className="px-3 py-2 text-xs">
                          {sale.createdAt ? format(parseISO(sale.createdAt), 'dd/MM/yyyy HH:mm') : '-'}
                        </td>
                        <td className="px-3 py-2 text-xs font-mono">{sale.orderCode}</td>
                        <td className="px-3 py-2 text-xs">
                          {sale.patientName || sale.customerName || 'Client comptoir'}
                        </td>
                        <td className="px-3 py-2 text-xs text-center">{sale.items?.length || 0}</td>
                        <td className="px-3 py-2 text-xs text-right font-bold text-emerald-600">
                          ${sale.totalAmount?.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-xs text-right font-bold text-blue-600">
                          ${sale.amountPaid?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-3 py-2 text-xs text-right font-bold text-red-600">
                          {remainingAmount > 0 ? `$${remainingAmount.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-3 py-2 text-xs text-center">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs ${
                            sale.status === 'PAYEE' && remainingAmount > 0 ? 'bg-yellow-100 text-yellow-700' :
                            sale.status === 'PAYEE' ? 'bg-emerald-100 text-emerald-700' :
                            sale.status === 'LIVREE' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {getPaymentStatusLabel(sale)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {sales.length > 5 && (
                <div className="p-2 text-center text-xs text-muted-foreground border-t">
                  ... et {sales.length - 5} ventes supplémentaires
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-xl font-bold"
            >
              Fermer
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="flex-1 rounded-xl font-bold border-emerald-200 hover:bg-emerald-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={handleGeneratePDF}
              className="flex-1 rounded-xl font-bold bg-primary hover:bg-primary/90"
            >
              <Printer className="w-4 h-4 mr-2" />
              Générer PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PharmacySalesHistory;
