import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { openPrintWindow, loadHospitalConfig } from '../../utils/printUtils';
import { API_BASE_URL } from '../../config/environment.js';
import { useTranslation } from 'react-i18next';
import {
  Pill, DollarSign, Lock, Unlock, AlertCircle,
  Search, Loader2, RefreshCw, Users, ArrowUpDown,
  ChevronRight, Package, ShieldCheck, Receipt,
  Filter, CheckCircle2, Clock, X, Printer, CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import financeApi from '../../services/financeApi/financeApi.js';
import { getPendingPaymentsForFinance, confirmPharmacyPayment } from '../../services/pharmacyApi/pharmacyApi.js';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const API = `${BACKEND_URL}/api/finance`;

const formatCurrency = (amount, currency = 'USD') =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: currency, minimumFractionDigits: 0,
  }).format(amount || 0);

const formatTime = (date) => {
  if (!date) return '--:--';
  try { return format(new Date(date), 'HH:mm'); } catch { return '--:--'; }
};

const formatFullDate = (date) => {
  if (!date) return '-';
  try { return format(new Date(date), 'dd MMM yyyy, HH:mm', { locale: fr }); } catch { return '-'; }
};

const STATUS_CONFIG = {
  'EN_ATTENTE_PAIEMENT': { label: '⏳ À payer', color: 'red', icon: Lock, paid: false },
  'PAYEE': { label: '✅ Payé', color: 'emerald', icon: Unlock, paid: true },
  'LIVREE': { label: '📦 Délivré', color: 'blue', icon: Package, paid: true },
};

const getStatusConfig = (status) => STATUS_CONFIG[status] || { label: status, color: 'gray', icon: Clock, paid: false };

const CaissePharmacyQueue = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('EN_ATTENTE_PAIEMENT');
  const [sortOrder, setSortOrder] = useState('desc');
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  // Load pending pharmacy orders
  const loadPendingOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getPendingPaymentsForFinance(0, 50);
      
      const data = response.data;
      if (data.success) {
        setOrders(data.content || []);
        console.log('📋 [CAISSE-PHARMA] Commandes chargées:', data.content?.length);
      }
    } catch (error) {
      console.error('Error loading pharmacy orders:', error);
      toast.error('Erreur chargement commandes pharmacie');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPendingOrders();
    // Refresh every 30 seconds
    const interval = setInterval(loadPendingOrders, 30000);
    return () => clearInterval(interval);
  }, [loadPendingOrders]);

  // Confirm payment
  const confirmPayment = async (order) => {
    try {
      setConfirmingPayment(true);
      
      const response = await confirmPharmacyPayment(order.id, {
        amountPaid: order.totalAmount,
        paymentMethod: paymentMethod
      });
      
      const data = response.data;
      if (data.success) {
        toast.success(
          <div>
            <p className="font-bold">✅ Paiement confirmé !</p>
            <p className="text-sm">Stock décrémenté automatiquement</p>
            <p className="text-xs text-muted-foreground/70">Commande: {order.orderCode}</p>
          </div>,
          { duration: 5000 }
        );
        
        // Print receipt
        printReceipt(data.order);
        
        // Refresh list
        loadPendingOrders();
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('Erreur lors de la confirmation du paiement');
    } finally {
      setConfirmingPayment(false);
    }
  };

  // Print receipt
  const printReceipt = async (order) => {
    const hospitalConfig = await loadHospitalConfig();
    const receiptContent = `
      <div style="font-family: monospace; max-width: 300px; margin: 0 auto;">
        <h2 style="text-align: center; margin-bottom: 10px;">REÇU DE PAIEMENT</h2>
        <p style="text-align: center; font-size: 10px; margin-bottom: 15px;">
          ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })}
        </p>
        <hr style="border: 1px dashed #ccc; margin: 10px 0;" />
        <p><strong>N° Commande:</strong> ${order?.orderCode || '---'}</p>
        <p><strong>Client:</strong> ${order?.customerName || 'Client comptoir'}</p>
        <hr style="border: 1px dashed #ccc; margin: 10px 0;" />
        <p style="font-size: 11px; color: #666;">Médicaments:</p>
        ${order?.items?.map(item => `
          <div style="display: flex; justify-content: space-between; margin: 3px 0; font-size: 10px;">
            <span>${item.medicationName} x${item.quantity}</span>
            <span>$${item.totalPrice?.toFixed(2)}</span>
          </div>
        `).join('') || '<p style="font-size: 10px; color: #999;">Détails non disponibles</p>'}
        <hr style="border: 1px dashed #ccc; margin: 10px 0;" />
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
          <span>TOTAL PAYÉ</span>
          <span>$${order?.totalAmount?.toFixed(2) || '0.00'}</span>
        </div>
        <p style="text-align: center; font-size: 10px; margin-top: 10px;">
          <strong>Mode:</strong> ${paymentMethod === 'CASH' ? 'Espèces' : 'Carte'}
        </p>
        <hr style="border: 1px dashed #999; margin: 15px 0;" />
        <p style="text-align: center; font-size: 10px; color: #059669; font-weight: bold;">
          ✅ PAIEMENT CONFIRMÉ
        </p>
        <p style="text-align: center; font-size: 9px; color: #666; margin-top: 15px;">
          Merci pour votre confiance !<br/>
          Les médicaments sont prêts à être délivrés.
        </p>
      </div>
    `;
    
    await openPrintWindow({
      title: `Reçu - ${order?.orderCode}`,
      documentTitle: 'REÇU PHARMACIE',
      bodyContent: receiptContent,
      config: hospitalConfig,
      apiBaseUrl: API_BASE_URL,
    });
  };

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    let result = [...orders];
    
    // Filter by status
    if (filterStatus !== 'ALL') {
      result = result.filter(o => o.status === filterStatus);
    }
    
    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => 
        (o.orderCode?.toLowerCase() || '').includes(q) ||
        (o.customerName?.toLowerCase() || '').includes(q)
      );
    }
    
    // Sort by date
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    return result;
  }, [orders, searchQuery, filterStatus, sortOrder]);

  // Calculate stats
  const stats = useMemo(() => {
    const pending = orders.filter(o => o.status === 'EN_ATTENTE_PAIEMENT');
    const totalPending = pending.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);
    return {
      count: pending.length,
      totalAmount: totalPending
    };
  }, [orders]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Pill className="w-5 h-5 text-white" />
              </div>
              Caisse - Paiements Pharmacie
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Validation des paiements et déclenchement du déstockage
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={loadPendingOrders}
              variant="outline"
              className="rounded-xl font-bold border-2"
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
              Actualiser
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-none shadow-sm rounded-2xl bg-gradient-to-br from-red-500/10 to-red-500/5 dark:from-red-500/20 dark:to-red-500/10 border-red-200/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">En attente</p>
                  <p className="text-2xl font-black text-red-700 dark:text-red-300">{stats.count}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-sm rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 dark:from-emerald-500/20 dark:to-emerald-500/10 border-emerald-200/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Montant total</p>
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(stats.totalAmount)}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-sm rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 dark:from-blue-500/20 dark:to-blue-500/10 border-blue-200/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Flux</p>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Pharmacie → Finance</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="max-w-7xl mx-auto mb-4">
        <Card className="border-none shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <Input
                  placeholder="Rechercher par N° commande ou client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant={filterStatus === 'EN_ATTENTE_PAIEMENT' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('EN_ATTENTE_PAIEMENT')}
                  className="rounded-xl font-bold"
                  size="sm"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  À payer
                </Button>
                <Button
                  variant={filterStatus === 'ALL' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('ALL')}
                  className="rounded-xl font-bold"
                  size="sm"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Tous
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  className="rounded-xl"
                  size="sm"
                >
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  {sortOrder === 'desc' ? 'Récent' : 'Ancien'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Grid */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="ml-3 text-muted-foreground">Chargement...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className="border-none shadow-sm rounded-2xl">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-lg font-bold text-foreground">Aucune commande en attente</p>
              <p className="text-sm text-muted-foreground mt-1">
                Les paiements pharmacie apparaîtront ici
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredOrders.map((order) => {
              const status = getStatusConfig(order.status);
              const StatusIcon = status.icon;
              
              return (
                <Card 
                  key={order.id} 
                  className={cn(
                    "border-none shadow-sm rounded-2xl cursor-pointer transition-all hover:shadow-md",
                    selectedOrder?.id === order.id ? "ring-2 ring-emerald-500" : ""
                  )}
                  onClick={() => setSelectedOrder(order)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "rounded-lg font-bold",
                              status.color === 'red' && "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30",
                              status.color === 'emerald' && "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30",
                            )}
                          >
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground/70">{formatTime(order.createdAt)}</span>
                        </div>
                        
                        <p className="font-bold text-foreground truncate">{order.orderCode}</p>
                        <p className="text-sm text-muted-foreground truncate">{order.customerName || 'Client comptoir'}</p>

                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground/80">
                          <span className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {order.itemCount || 0} article(s)
                          </span>
                          <span>{formatFullDate(order.createdAt)}</span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(order.totalAmount)}
                        </p>
                        
                        {order.status === 'EN_ATTENTE_PAIEMENT' && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                            }}
                            size="sm"
                            className="mt-2 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700"
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Confirmer
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {selectedOrder && selectedOrder.status === 'EN_ATTENTE_PAIEMENT' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md border-none shadow-2xl rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Confirmer le paiement</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-full h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-4 mb-4">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase">Montant à payer</p>
                <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(selectedOrder.totalAmount)}
                </p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                  {selectedOrder.customerName || 'Client comptoir'}
                </p>
                <p className="text-xs text-emerald-500 dark:text-emerald-500/70">
                  {selectedOrder.orderCode}
                </p>
              </div>
              
              <div className="space-y-3 mb-6">
                <p className="text-sm font-bold">Mode de paiement</p>
                <div className="flex gap-2">
                  <Button
                    variant={paymentMethod === 'CASH' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('CASH')}
                    className="flex-1 rounded-xl"
                  >
                    Espèces
                  </Button>
                  <Button
                    variant={paymentMethod === 'CARD' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('CARD')}
                    className="flex-1 rounded-xl"
                  >
                    Carte
                  </Button>
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 mb-4">
                <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Le stock sera décrémenté automatiquement après confirmation
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 rounded-xl font-bold"
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => confirmPayment(selectedOrder)}
                  disabled={confirmingPayment}
                  className="flex-1 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700"
                >
                  {confirmingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirmer & Imprimer
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CaissePharmacyQueue;
