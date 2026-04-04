import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Printer,
  CreditCard,
  Cash,
  Smartphone,
  Calendar,
  User,
  TrendingUp,
  Loader2,
  RefreshCw
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import prescriptionInvoiceApi from '../../services/prescriptionInvoiceApi.js';

const CaissePharmacieEnhanced = () => {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [stats, setStats] = useState({
    pendingCount: 0,
    pendingAmount: 0,
    todayRevenue: 0
  });

  // Charger les factures en attente
  const loadPendingInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const data = await prescriptionInvoiceApi.getPendingInvoices();
      setInvoices(data);
    } catch (error) {
      console.error('Erreur lors du chargement des factures:', error);
      toast.error('Erreur lors du chargement des factures');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger les statistiques
  const loadStats = useCallback(async () => {
    try {
      const data = await prescriptionInvoiceApi.getPharmacyStats();
      setStats(data);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  }, []);

  useEffect(() => {
    loadPendingInvoices();
    loadStats();
  }, [loadPendingInvoices, loadStats]);

  // Traiter le paiement
  const handleProcessPayment = async (invoiceId) => {
    if (!paymentMethod) {
      toast.error('Veuillez sélectionner une méthode de paiement');
      return;
    }

    try {
      setProcessingPayment(invoiceId);
      const updatedInvoice = await prescriptionInvoiceApi.processPayment(invoiceId, paymentMethod);
      
      toast.success('Paiement traité avec succès!');
      
      // Retirer la facture de la liste
      setInvoices(invoices.filter(inv => inv.id !== invoiceId));
      
      // Mettre à jour les statistiques
      loadStats();
      
      // Imprimer le reçu
      await printReceipt(updatedInvoice);
      
      setShowPaymentDialog(false);
      setPaymentMethod('');
      setSelectedInvoice(null);
    } catch (error) {
      console.error('Erreur lors du paiement:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors du traitement du paiement';
      toast.error(errorMessage);
    } finally {
      setProcessingPayment(null);
    }
  };

  // Imprimer le reçu (format 80mm)
  const printReceipt = async (invoice) => {
    const printContent = `
      <div style="font-family: monospace; padding: 10px; max-width: 300px; margin: 0 auto; font-size: 12px;">
        <div style="text-align: center; margin-bottom: 15px;">
          <h2 style="margin: 0; font-size: 16px; font-weight: bold;">HÔPITAL INUA AFIA</h2>
          <p style="margin: 3px 0; font-size: 10px;">Pharmacie - Reçu de paiement</p>
          <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 5px 0; margin: 8px 0;">
            <p style="margin: 0; font-weight: bold; font-size: 12px;">${invoice.invoiceCode}</p>
          </div>
        </div>
        
        <div style="margin-bottom: 12px;">
          <p style="margin: 2px 0;"><strong>Patient:</strong> ${invoice.patientName}</p>
          <p style="margin: 2px 0;"><strong>Date:</strong> ${new Date(invoice.paidAt).toLocaleDateString('fr-FR')}</p>
          <p style="margin: 2px 0;"><strong>Heure:</strong> ${new Date(invoice.paidAt).toLocaleTimeString('fr-FR')}</p>
          <p style="margin: 2px 0;"><strong>Méthode:</strong> ${getPaymentMethodLabel(paymentMethod)}</p>
        </div>
        
        <div style="margin-bottom: 12px;">
          <h4 style="margin: 0 0 5px 0; font-size: 11px; border-bottom: 1px dotted #000; padding-bottom: 2px;">Médicaments:</h4>
          ${invoice.prescription?.items?.map(item => `
            <div style="font-size: 10px; margin-bottom: 2px; display: flex; justify-content: space-between;">
              <span>${item.medicationName} x${item.quantity}</span>
              <span>${(item.unitPrice * item.quantity).toFixed(2)} $</span>
            </div>
          `).join('') || ''}
        </div>
        
        <div style="border-top: 1px solid #000; padding-top: 8px; text-align: center; margin-top: 10px;">
          <p style="margin: 3px 0; font-size: 14px; font-weight: bold;">TOTAL: ${invoice.totalAmount.toFixed(2)} $</p>
          <p style="margin: 5px 0; font-size: 9px;">*** Merci de votre visite ***</p>
          <p style="margin: 0; font-size: 8px;">Médicaments dispensés sous responsabilité</p>
        </div>
      </div>
    `;
    
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Reçu - ${invoice.invoiceCode}</title>
          <style>
            body { margin: 0; padding: 5px; font-family: monospace; }
            @media print {
              body { margin: 0; padding: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // Ouvrir le dialogue de paiement
  const openPaymentDialog = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentDialog(true);
  };

  // Formater la date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Obtenir le libellé de la méthode de paiement
  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case 'CASH': return 'Espèces';
      case 'CARD': return 'Carte bancaire';
      case 'MOBILE_MONEY': return 'Mobile Money';
      default: return method;
    }
  };

  // Obtenir l'icône de la méthode de paiement
  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'CASH': return <Cash className="w-4 h-4" />;
      case 'CARD': return <CreditCard className="w-4 h-4" />;
      case 'MOBILE_MONEY': return <Smartphone className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec bouton de rafraîchissement */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Caisse Pharmacie</h1>
          <p className="text-muted-foreground">Gestion des paiements des prescriptions</p>
        </div>
        <Button onClick={loadPendingInvoices} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Factures en attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Montant en attente</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingAmount?.toFixed(2) || '0.00'} $</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus du jour</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayRevenue?.toFixed(2) || '0.00'} $</div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des factures en attente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Factures en attente de paiement
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune facture en attente de paiement</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{invoice.invoiceCode}</h4>
                        <Badge variant="outline">EN_ATTENTE</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>Patient: {invoice.patientName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(invoice.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-semibold text-foreground">{invoice.totalAmount.toFixed(2)} $</span>
                        </div>
                      </div>
                      {invoice.prescription?.items && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {invoice.prescription.items.length} médicament(s) - 
                          {invoice.prescription.items.slice(0, 3).map(item => item.medicationName).join(', ')}
                          {invoice.prescription.items.length > 3 && '...'}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => openPaymentDialog(invoice)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Traiter paiement
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogue de paiement */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Traiter le paiement</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm"><strong>Facture:</strong> {selectedInvoice.invoiceCode}</p>
                <p className="text-sm"><strong>Patient:</strong> {selectedInvoice.patientName}</p>
                <p className="text-sm"><strong>Montant:</strong> {selectedInvoice.totalAmount.toFixed(2)} $</p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Méthode de paiement</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une méthode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">
                      <div className="flex items-center gap-2">
                        <Cash className="w-4 h-4" />
                        Espèces
                      </div>
                    </SelectItem>
                    <SelectItem value="CARD">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Carte bancaire
                      </div>
                    </SelectItem>
                    <SelectItem value="MOBILE_MONEY">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        Mobile Money
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentDialog(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => handleProcessPayment(selectedInvoice.id)}
                  disabled={processingPayment === selectedInvoice.id || !paymentMethod}
                  className="flex-1"
                >
                  {processingPayment === selectedInvoice.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <DollarSign className="w-4 h-4 mr-2" />
                  )}
                  Confirmer le paiement
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CaissePharmacieEnhanced;
