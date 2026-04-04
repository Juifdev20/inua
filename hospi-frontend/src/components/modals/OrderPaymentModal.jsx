import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  X, 
  CreditCard, 
  DollarSign, 
  User,
  Calendar,
  Wallet,
  CheckCircle,
  AlertCircle,
  Receipt
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { 
  getOrderById, 
  processPayment 
} from '../../services/pharmacyApi/pharmacyApi.js';

const OrderPaymentModal = ({ 
  orderId, 
  isOpen, 
  onClose, 
  onPaymentComplete 
}) => {
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountPaid, setAmountPaid] = useState('');
  const [allowPartialPayment, setAllowPartialPayment] = useState(false);

  useEffect(() => {
    if (isOpen && orderId) {
      loadOrder();
    }
  }, [isOpen, orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const response = await getOrderById(orderId);
      setOrder(response.data);
      // Pre-fill with remaining amount
      const remaining = (response.data.totalAmount || 0) - (response.data.amountPaid || 0);
      setAmountPaid(remaining.toString());
      setAllowPartialPayment(false);
    } catch (error) {
      console.error('Error loading order:', error);
      toast.error('Erreur lors du chargement de la commande');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePayment = async () => {
    console.log('[DEBUG] handlePayment called', { amountPaid, allowPartialPayment, changeAmount });
    
    if (!amountPaid || parseFloat(amountPaid) <= 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }

    try {
      setLoading(true);
      console.log('[DEBUG] Calling processPayment', { orderId, amountPaid, paymentMethod, allowPartialPayment });
      
      await processPayment(orderId, {
        amountPaid: parseFloat(amountPaid),
        paymentMethod: paymentMethod,
        allowPartialPayment: allowPartialPayment
      });
      
      toast.success(allowPartialPayment ? 'Paiement partiel validé avec dette !' : 'Paiement effectué avec succès !');
      onPaymentComplete?.();
      onClose();
    } catch (error) {
      console.error('[DEBUG] Error processing payment:', error);
      toast.error('Erreur lors du paiement: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const remainingAmount = order 
    ? (order.totalAmount || 0) - (order.amountPaid || 0)
    : 0;

  const changeAmount = parseFloat(amountPaid || 0) - remainingAmount;
  
  // Debug logs
  console.log('[DEBUG] Render state:', { amountPaid, remainingAmount, changeAmount, allowPartialPayment, loading });
  console.log('[DEBUG] Button disabled?', loading || parseFloat(amountPaid || 0) <= 0 || (changeAmount < 0 && !allowPartialPayment));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-card border border-border w-full max-w-lg max-h-[90vh] overflow-hidden rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Badge className="bg-blue-500/10 text-blue-600 border-none px-2 py-1 font-bold text-xs">
                {order?.orderCode || 'N/A'}
              </Badge>
              <Badge className="bg-emerald-500/10 text-emerald-600 border-none px-2 py-1 font-bold text-xs">
                {order?.status}
              </Badge>
            </div>
            <h3 className="text-xl font-black tracking-tighter uppercase text-foreground mb-1">
              Paiement Commande
            </h3>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{order?.patientName || 'Non spécifié'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{order?.createdAt ? formatDate(order.createdAt) : '--'}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-muted rounded-full transition-colors text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Order Summary */}
          <Card className="mb-6 border-none shadow-sm bg-muted/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Résumé de la commande
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Montant total</span>
                <span className="text-lg font-black text-foreground">
                  {formatCurrency(order?.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Déjà payé</span>
                <span className="text-sm font-bold text-emerald-600">
                  {formatCurrency(order?.amountPaid)}
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-foreground">Reste à payer</span>
                <span className="text-xl font-black text-red-600">
                  {formatCurrency(remainingAmount)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card className="border-none shadow-sm bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Détails du paiement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Payment Method */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">
                  Mode de paiement
                </label>
                <Select 
                  value={paymentMethod} 
                  onValueChange={setPaymentMethod}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4" />
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
                        <DollarSign className="w-4 h-4" />
                        Mobile Money
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">
                  Montant payé
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="pl-10 rounded-xl text-lg font-bold"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Change Display */}
              {changeAmount > 0 && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-bold text-emerald-700">
                      Monnaie à rendre
                    </span>
                  </div>
                  <span className="text-lg font-black text-emerald-600">
                    {formatCurrency(changeAmount)}
                  </span>
                </div>
              )}

              {changeAmount < 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-bold text-amber-700">
                    Montant insuffisant
                  </span>
                </div>
              )}

              {/* Option paiement partiel avec dette */}
              {changeAmount < 0 && (
                <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-xl border-2 border-yellow-300">
                  <Checkbox
                    id="partial"
                    checked={allowPartialPayment}
                    onCheckedChange={setAllowPartialPayment}
                    className="mt-1 data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600"
                  />
                  <div className="space-y-1">
                    <label htmlFor="partial" className="font-bold text-yellow-900 cursor-pointer text-sm block">
                      Valider avec dette (paiement partiel)
                    </label>
                    <p className="text-xs text-yellow-800 leading-relaxed">
                      Cochez cette case si le patient paie partiellement et reviendra payer le solde plus tard.
                      La commande sera validée avec une dette de {formatCurrency(Math.abs(changeAmount))}.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/20">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-xl font-bold"
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              onClick={handlePayment}
              disabled={loading || parseFloat(amountPaid || 0) <= 0 || (changeAmount < 0 && !allowPartialPayment)}
              className={`flex-1 rounded-xl font-bold disabled:opacity-50 ${
                allowPartialPayment 
                  ? 'bg-yellow-600 hover:bg-yellow-700' 
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {loading ? (
                'Traitement...'
              ) : allowPartialPayment ? (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Valider avec dette
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmer le paiement
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderPaymentModal;
