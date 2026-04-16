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
  const handlePrintPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // En-tête
      doc.setFontSize(20);
      doc.setTextColor(16, 185, 129);
      doc.text('REÇU DE VENTE', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });

      // Numéro de commande
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Commande: ${sale.orderCode}`, doc.internal.pageSize.getWidth() / 2, 30, { align: 'center' });

      // Ligne séparatrice
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.5);
      doc.line(20, 35, doc.internal.pageSize.getWidth() - 20, 35);

      // Informations générales
      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81);
      
      const clientName = sale.patientName || sale.customerName || 'Client comptoir';
      const leftX = 20;
      let currentY = 45;

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
      doc.setTextColor(16, 185, 129);
      doc.setFont(undefined, 'bold');
      doc.text('TOTAL:', 120, currentY);
      doc.text(`${formatCurrencyPDF(sale.totalAmount)}`, 180, currentY, { align: 'right' });

      if (sale.amountPaid) {
        currentY += 8;
        doc.setFontSize(10);
        doc.setTextColor(16, 185, 129);
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

  // Load sales history
  const loadSalesHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/pharmacy/sales/history', {
        params: {
          startDate,
          endDate,
          page,
          size: 20
        }
      });
      
      const data = response.data;
      setSales(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
    } catch (error) {
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

      {/* ======== STATS CARDS ======== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600 font-bold uppercase">Total des ventes</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">
                  ${totalSales.toFixed(2)}
                </p>
              </div>
              <div className="w-10 h-10 bg-emerald-200 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-700" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-bold uppercase">Nombre de ventes</p>
                <p className="text-2xl font-black text-blue-700 mt-1">
                  {filteredSales.length}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-200 rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600 font-bold uppercase">Articles vendus</p>
                <p className="text-2xl font-black text-purple-700 mt-1">
                  {totalItems}
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-200 rounded-xl flex items-center justify-center">
                <Receipt className="w-5 h-5 text-purple-700" />
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
        <CardContent className="p-0">
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
                        <p className="font-bold">{sale.orderCode}</p>
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
  const handleGeneratePDF = () => {
    try {
      // Créer un nouveau PDF en format paysage pour plus d'espace
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // En-tête
      doc.setFontSize(18);
      doc.setTextColor(16, 185, 129);
      doc.text('RAPPORT DES VENTES', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });

      // Période
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Période : ${startDate} au ${endDate}`, doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });
      
      // Date de génération
      doc.setFontSize(10);
      doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm')}`, doc.internal.pageSize.getWidth() / 2, 34, { align: 'center' });

      // Ligne séparatrice
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.5);
      doc.line(14, 40, doc.internal.pageSize.getWidth() - 14, 40);

      // Résumé en 4 colonnes
      const pageWidth = doc.internal.pageSize.getWidth();
      const colWidth = (pageWidth - 40) / 4;
      const startX = 20;

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      
      // Colonne 1: Total
      doc.text('TOTAL DES VENTES', startX + colWidth/2, 45, { align: 'center' });
      doc.setFontSize(16);
      doc.setTextColor(16, 185, 129);
      doc.text(`$${totalSales.toFixed(2)}`, startX + colWidth/2, 53, { align: 'center' });

      // Colonne 2: Nombre
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('NOMBRE DE VENTES', startX + colWidth + colWidth/2, 45, { align: 'center' });
      doc.setFontSize(16);
      doc.setTextColor(59, 130, 246);
      doc.text(`${sales.length}`, startX + colWidth + colWidth/2, 53, { align: 'center' });

      // Colonne 3: Articles
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('ARTICLES VENDUS', startX + 2*colWidth + colWidth/2, 45, { align: 'center' });
      doc.setFontSize(16);
      doc.setTextColor(139, 92, 246);
      doc.text(`${totalItems}`, startX + 2*colWidth + colWidth/2, 53, { align: 'center' });

      // Colonne 4: Total Dettes
      const totalDettes = sales.reduce((sum, s) => sum + Math.max(0, s.remainingAmount || (s.totalAmount - (s.amountPaid || 0))), 0);
      doc.setFontSize(10);
      doc.setTextColor(239, 68, 68);
      doc.text('TOTAL DETTES', startX + 3*colWidth + colWidth/2, 45, { align: 'center' });
      doc.setFontSize(16);
      doc.setTextColor(239, 68, 68);
      doc.text(`$${totalDettes.toFixed(2)}`, startX + 3*colWidth + colWidth/2, 53, { align: 'center' });

      // Préparer les données pour le tableau
      const tableData = sales.map(sale => {
        const remainingAmount = Math.max(0, sale.remainingAmount || (sale.totalAmount - (sale.amountPaid || 0)));
        return [
          sale.createdAt ? format(parseISO(sale.createdAt), 'dd/MM/yyyy HH:mm') : '-',
          sale.orderCode,
          sale.patientName || sale.customerName || 'Client comptoir',
          (sale.items?.length || 0).toString(),
          `$${sale.totalAmount?.toFixed(2)}`,
          `$${sale.amountPaid?.toFixed(2) || '0.00'}`,
          remainingAmount > 0 ? `$${remainingAmount.toFixed(2)}` : '-',
          getPaymentStatusLabel(sale)
        ];
      });

      // Générer le tableau avec autoTable
      autoTable(doc, {
        startY: 60,
        head: [['Date', 'N° Commande', 'Client', 'Articles', 'Total', 'Payé', 'Dette', 'Statut']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [243, 244, 246],
          textColor: [55, 65, 81],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          valign: 'middle'
        },
        bodyStyles: {
          fontSize: 7,
          textColor: [75, 85, 99],
          valign: 'middle',
          overflow: 'linebreak'
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251]
        },
        columnStyles: {
          0: { cellWidth: 32, halign: 'center' },
          1: { cellWidth: 45, font: 'courier', halign: 'center' },
          2: { cellWidth: 50, halign: 'left' },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 28, halign: 'right' },
          5: { cellWidth: 28, halign: 'right' },
          6: { cellWidth: 28, halign: 'right', textColor: [239, 68, 68] },
          7: { cellWidth: 60, halign: 'left' }
        },
        styles: {
          overflow: 'linebreak',
          cellPadding: 3,
          fontSize: 8
        },
        margin: { top: 60, left: 14, right: 14, bottom: 20 },
        pageBreak: 'auto',
        showHead: 'everyPage',
        tableWidth: 'auto',
        didDrawPage: function(data) {
          // Footer avec numéro de page pour traçabilité
          const str = 'Page ' + doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(str, data.settings.margin.left, doc.internal.pageSize.getHeight() - 15);
          
          // Ligne de pied de page
          doc.text('Document généré par le système de gestion hospitalière - Traçable', 
            doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, 
            { align: 'center' }
          );
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
        <CardHeader className="pb-3 sticky top-0 bg-white z-10 border-b">
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
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-center text-xl font-black text-primary mb-2">RAPPORT DES VENTES</h3>
            <p className="text-center text-sm text-gray-600 mb-6">
              Période : {startDate} au {endDate}
            </p>

            {/* Résumé */}
            <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-white rounded-xl shadow-sm">
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase">Total des ventes</p>
                <p className="text-xl font-black text-emerald-600">${totalSales.toFixed(2)}</p>
              </div>
              <div className="text-center border-x border-gray-200">
                <p className="text-xs text-gray-500 uppercase">Nombre de ventes</p>
                <p className="text-xl font-black text-blue-600">{sales.length}</p>
              </div>
              <div className="text-center border-r border-gray-200">
                <p className="text-xs text-gray-500 uppercase">Articles vendus</p>
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
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold text-gray-700">Date</th>
                    <th className="px-3 py-2 text-left font-bold text-gray-700">N° Commande</th>
                    <th className="px-3 py-2 text-left font-bold text-gray-700">Client</th>
                    <th className="px-3 py-2 text-center font-bold text-gray-700">Articles</th>
                    <th className="px-3 py-2 text-right font-bold text-gray-700">Total</th>
                    <th className="px-3 py-2 text-right font-bold text-gray-700">Payé</th>
                    <th className="px-3 py-2 text-right font-bold text-gray-700 text-red-600">Dette</th>
                    <th className="px-3 py-2 text-center font-bold text-gray-700">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sales.slice(0, 5).map((sale, index) => {
                    const remainingAmount = sale.remainingAmount || (sale.totalAmount - (sale.amountPaid || 0));
                    return (
                      <tr key={sale.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
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
                <div className="p-2 text-center text-xs text-gray-400 border-t">
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
