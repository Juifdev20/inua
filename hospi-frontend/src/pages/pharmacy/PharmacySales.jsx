import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  User,
  DollarSign,
  Receipt,
  Printer,
  CreditCard,
  Wallet,
  CheckCircle,
  AlertCircle,
  X,
  Package,
  Save,
  History,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { medicationAPI } from '../../api/medication.js';
import { 
  createOrder,
  getPendingOrders 
} from '../../services/pharmacyApi/pharmacyApi.js';

/* =========================================
   COMPOSANT CART ITEM
   ========================================= */
const CartItem = ({ item, onUpdateQuantity, onRemove }) => {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-foreground truncate">{item.medicationName}</p>
        <p className="text-xs text-muted-foreground">${item.unitPrice.toFixed(2)} / unité</p>
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onUpdateQuantity(item.medicationId, item.quantity - 1)}
          disabled={item.quantity <= 1}
          className="w-7 h-7 p-0 rounded"
        >
          <Minus className="w-3 h-3" />
        </Button>
        <Input
          type="number"
          value={item.quantity}
          onChange={(e) => onUpdateQuantity(item.medicationId, parseInt(e.target.value) || 1)}
          className="w-14 h-7 text-center text-sm font-bold p-0"
          min="1"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => onUpdateQuantity(item.medicationId, item.quantity + 1)}
          className="w-7 h-7 p-0 rounded"
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      
      <p className="text-sm font-bold text-foreground w-16 text-right">
        ${(item.unitPrice * item.quantity).toFixed(2)}
      </p>
      
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onRemove(item.medicationId)}
        className="text-red-500 hover:text-red-600 h-7 w-7 p-0"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

/* =========================================
   COMPOSANT MEDICATION CARD
   ========================================= */
const MedicationCard = ({ medication, onAdd }) => {
  const inStock = (medication.stockQuantity || 0) > 0;
  
  return (
    <Card className={cn(
      "border-none shadow-sm overflow-hidden cursor-pointer transition-all hover:shadow-md",
      !inStock && "opacity-60"
    )}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground truncate">{medication.name}</p>
            <p className="text-xs text-muted-foreground">{medication.medicationCode}</p>
          </div>
          <Badge 
            className={cn(
              "text-xs",
              inStock ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
            )}
          >
            {inStock ? `${medication.stockQuantity} disp.` : 'Rupture'}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <p className="text-lg font-black text-primary">
            ${(medication.unitPrice || medication.price || 0).toFixed(2)}
          </p>
          <Button
            size="sm"
            onClick={() => onAdd(medication)}
            disabled={!inStock}
            className="rounded-lg font-bold bg-primary hover:bg-primary/90 h-8"
          >
            <Plus className="w-4 h-4 mr-1" />
            Ajouter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

/* =========================================
   PAGE VENTES / POS PHARMACIE
   ========================================= */
const PharmacySales = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // States
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountPaid, setAmountPaid] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recentSales, setRecentSales] = useState([]);
  const [allowPartialPayment, setAllowPartialPayment] = useState(false);

  // Load medications
  const loadMedications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await medicationAPI.getMedications();
      const meds = response?.data || response || [];
      setMedications(meds);
    } catch (error) {
      console.error('Error loading medications:', error);
      toast.error('Erreur lors du chargement des médicaments');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load recent sales
  const loadRecentSales = useCallback(async () => {
    try {
      const response = await getPendingOrders();
      setRecentSales(response.data?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error loading recent sales:', error);
    }
  }, []);

  useEffect(() => {
    loadMedications();
    loadRecentSales();
  }, [loadMedications, loadRecentSales]);

  // Filter medications
  const filteredMedications = medications.filter(med => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      med.name?.toLowerCase().includes(query) ||
      med.medicationCode?.toLowerCase().includes(query) ||
      med.genericName?.toLowerCase().includes(query)
    );
  });

  // Add to cart
  const addToCart = (medication) => {
    const existingItem = cart.find(item => item.medicationId === medication.id);
    
    if (existingItem) {
      updateQuantity(medication.id, existingItem.quantity + 1);
      return;
    }
    
    const newItem = {
      medicationId: medication.id,
      medicationName: medication.name,
      medicationCode: medication.medicationCode,
      quantity: 1,
      unitPrice: medication.unitPrice || medication.price || 0,
      stockQuantity: medication.stockQuantity || 0
    };
    
    setCart([...cart, newItem]);
    toast.success(`${medication.name} ajouté`);
  };

  // Update quantity
  const updateQuantity = (medicationId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(medicationId);
      return;
    }
    
    const item = cart.find(i => i.medicationId === medicationId);
    if (item && newQuantity > item.stockQuantity) {
      toast.error('Stock insuffisant');
      return;
    }
    
    setCart(cart.map(item => 
      item.medicationId === medicationId 
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  // Remove from cart
  const removeFromCart = (medicationId) => {
    setCart(cart.filter(item => item.medicationId !== medicationId));
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const tax = subtotal * 0.0; // No tax for now
  const total = subtotal + tax;
  const change = parseFloat(amountPaid || 0) - total;

  // Clear cart
  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setAmountPaid('');
    setShowPayment(false);
  };

  // Process sale
  const processSale = async () => {
    if (cart.length === 0) {
      toast.error('Le panier est vide');
      return;
    }
    
    // Vérifier le montant (autoriser si paiement partiel est coché)
    if (!allowPartialPayment && parseFloat(amountPaid || 0) < total) {
      toast.error('Montant payé insuffisant');
      return;
    }

    try {
      setSubmitting(true);
      
      const saleData = {
        customerName: customerName.trim() || 'Client comptoir',
        orderType: 'VENTE_DIRECTE',
        items: cart.map(item => ({
          medicationId: item.medicationId,
          medicationName: item.medicationName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity
        })),
        totalAmount: total,
        amountPaid: parseFloat(amountPaid || 0),
        paymentMethod: paymentMethod,
        notes: allowPartialPayment ? `[DETTE] Paiement partiel - Reste: ${Math.abs(change).toFixed(2)} FC` : '',
        status: allowPartialPayment ? 'PAYEE' : 'PAYEE', // Toujours PAYEE mais avec dette si partiel
        allowPartialPayment: allowPartialPayment
      };

      console.log('🔴 [PharmacySales] Envoi:', JSON.stringify(saleData, null, 2));

      await createOrder(saleData);
      
      toast.success(allowPartialPayment ? 'Vente avec dette validée !' : 'Vente effectuée avec succès !', {
        icon: allowPartialPayment ? '⚠️' : '💰',
        duration: 3000
      });
      
      // Print receipt option
      printReceipt();
      
      // Clear and refresh
      clearCart();
      loadRecentSales();
      
    } catch (error) {
      console.error('Error processing sale:', error);
      toast.error('Erreur lors de la vente');
    } finally {
      setSubmitting(false);
    }
  };

  // Print receipt
  const printReceipt = () => {
    const receiptContent = `
      <div style="font-family: monospace; max-width: 300px; margin: 0 auto; padding: 20px;">
        <h2 style="text-align: center; margin-bottom: 10px;">INUA AFIA PHARMACIE</h2>
        <p style="text-align: center; font-size: 12px; margin-bottom: 20px;">
          ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })}
        </p>
        <hr style="border: 1px dashed #ccc; margin: 10px 0;" />
        <p><strong>Client:</strong> ${customerName || 'Client comptoir'}</p>
        <hr style="border: 1px dashed #ccc; margin: 10px 0;" />
        ${cart.map(item => `
          <div style="display: flex; justify-content: space-between; margin: 5px 0; font-size: 12px;">
            <span>${item.medicationName} x${item.quantity}</span>
            <span>$${(item.unitPrice * item.quantity).toFixed(2)}</span>
          </div>
        `).join('')}
        <hr style="border: 1px dashed #ccc; margin: 10px 0;" />
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
          <span>TOTAL</span>
          <span>$${total.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 5px;">
          <span>Payé (${paymentMethod === 'CASH' ? 'Espèces' : 'Carte'})</span>
          <span>$${parseFloat(amountPaid).toFixed(2)}</span>
        </div>
        ${change > 0 ? `
          <div style="display: flex; justify-content: space-between; color: green;">
            <span>Monnaie</span>
            <span>$${change.toFixed(2)}</span>
          </div>
        ` : ''}
        <hr style="border: 1px dashed #ccc; margin: 10px 0;" />
        <p style="text-align: center; font-size: 10px; margin-top: 20px;">
          Merci pour votre confiance !<br>
          Les médicaments ne sont ni repris ni échangés
        </p>
      </div>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head><title>Ticket - ${format(new Date(), 'dd-MM-yyyy')}</title></head>
        <body onload="window.print(); window.close();">${receiptContent}</body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ======== HEADER ======== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge className="bg-emerald-500/10 text-emerald-600 border-none mb-2 px-3 py-1 font-bold">
            POINT DE VENTE
          </Badge>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Ventes Pharmacie
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            {cart.length} article{cart.length > 1 ? 's' : ''} dans le panier | Total: ${total.toFixed(2)}
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={clearCart}
            disabled={cart.length === 0}
            className="rounded-xl font-bold"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Vider
          </Button>
          <Button
            onClick={() => {
              setShowPayment(true);
              setAllowPartialPayment(false);
            }}
            disabled={cart.length === 0}
            className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Payer ${total.toFixed(2)}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ======== LEFT: MEDICATIONS CATALOG ======== */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <Card className="border-none shadow-sm bg-card rounded-2xl p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un médicament..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>
          </Card>

          {/* Medications Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredMedications.map((med) => (
                <MedicationCard
                  key={med.id}
                  medication={med}
                  onAdd={addToCart}
                />
              ))}
            </div>
          )}
          
          {!loading && filteredMedications.length === 0 && (
            <Card className="border-none shadow-sm bg-card rounded-2xl py-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun médicament trouvé</p>
            </Card>
          )}
        </div>

        {/* ======== RIGHT: CART & CHECKOUT ======== */}
        <div className="space-y-4">
          {/* Customer Info */}
          <Card className="border-none shadow-sm bg-card rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                <User className="w-4 h-4" />
                Client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Nom du client (optionnel)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="rounded-xl"
              />
            </CardContent>
          </Card>

          {/* Cart */}
          <Card className="border-none shadow-sm bg-card rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Panier ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-80 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Panier vide</p>
                  <p className="text-xs">Ajoutez des médicaments</p>
                </div>
              ) : (
                cart.map((item) => (
                  <CartItem
                    key={item.medicationId}
                    item={item}
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeFromCart}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Total Summary */}
          <Card className="border-none shadow-sm bg-emerald-50 border-emerald-200 rounded-2xl">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sous-total</span>
                <span className="font-bold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-black text-emerald-700">
                <span>TOTAL</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Sales */}
          {recentSales.length > 0 && (
            <Card className="border-none shadow-sm bg-card rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Ventes récentes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentSales.map((sale, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{sale.patientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(sale.createdAt), 'HH:mm', { locale: fr })}
                      </p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700">
                      ${(sale.totalAmount || 0).toFixed(2)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ======== PAYMENT MODAL ======== */}
      {showPayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-md border-none shadow-2xl rounded-2xl animate-in zoom-in-95 duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  Paiement
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPayment(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Total */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <p className="text-sm text-emerald-600 font-bold mb-1">Total à payer</p>
                <p className="text-3xl font-black text-emerald-700">${total.toFixed(2)}</p>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <label className="text-sm font-bold">Mode de paiement</label>
                <div className="flex gap-2">
                  <Button
                    variant={paymentMethod === 'CASH' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('CASH')}
                    className="flex-1 rounded-xl"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Espèces
                  </Button>
                  <Button
                    variant={paymentMethod === 'CARD' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('CARD')}
                    className="flex-1 rounded-xl"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Carte
                  </Button>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <label className="text-sm font-bold">Montant reçu</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder={total.toFixed(2)}
                    className="pl-10 rounded-xl text-lg font-bold"
                    autoFocus
                  />
                </div>
              </div>

              {/* Change */}
              {change >= 0 && parseFloat(amountPaid || 0) > 0 && (
                <div className={cn(
                  "p-4 rounded-xl flex items-center justify-between",
                  change > 0 ? "bg-emerald-50 border border-emerald-200" : "bg-blue-50 border border-blue-200"
                )}>
                  <span className={cn(
                    "font-bold",
                    change > 0 ? "text-emerald-700" : "text-blue-700"
                  )}>
                    {change > 0 ? 'Monnaie à rendre' : 'Paiement exact'}
                  </span>
                  <span className={cn(
                    "text-xl font-black",
                    change > 0 ? "text-emerald-600" : "text-blue-600"
                  )}>
                    ${change.toFixed(2)}
                  </span>
                </div>
              )}

              {change < -0.01 && parseFloat(amountPaid || 0) > 0 && (
                <div className="space-y-3">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-600 font-bold text-center">
                      Montant insuffisant (manque ${Math.abs(change).toFixed(2)})
                    </p>
                  </div>
                  
                  {/* Option paiement partiel avec dette */}
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
                        Cochez cette case si le client paie partiellement et reviendra payer le solde plus tard.
                        La vente sera validée avec une dette de ${Math.abs(change).toFixed(2)}.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowPayment(false)}
                  className="flex-1 rounded-xl font-bold"
                  disabled={submitting}
                >
                  Annuler
                </Button>
                <Button
                  onClick={processSale}
                  disabled={submitting || (change < -0.01 && !allowPartialPayment) || !amountPaid}
                  className={`flex-1 rounded-xl font-bold ${
                    allowPartialPayment 
                      ? 'bg-yellow-600 hover:bg-yellow-700' 
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {submitting ? (
                    <>
                      <Save className="w-4 h-4 mr-2 animate-spin" />
                      Traitement...
                    </>
                  ) : allowPartialPayment ? (
                    <>
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Valider avec dette
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Valider
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

export default PharmacySales;
