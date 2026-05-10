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
  TrendingUp,
  Clock
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
import WebSocketService from '../../services/WebSocketService.js';

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
      "border-none shadow-sm overflow-hidden cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
      !inStock && "opacity-50 grayscale"
    )}>
      <CardContent className="p-2.5 sm:p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground truncate leading-tight">{medication.name}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{medication.medicationCode}</p>
          </div>
          <Badge
            className={cn(
              "text-[10px] sm:text-xs px-1.5 py-0.5 flex-shrink-0",
              inStock ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
            )}
          >
            {inStock ? `${medication.stockQuantity} disp.` : 'Rupture'}
          </Badge>
        </div>

        <div className="flex items-center justify-between mt-2 sm:mt-3">
          <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
            ${(medication.unitPrice || medication.price || 0).toFixed(2)}
          </p>
          <Button
            size="sm"
            onClick={() => onAdd(medication)}
            disabled={!inStock}
            className="rounded-lg font-bold bg-emerald-600 hover:bg-emerald-700 h-7 sm:h-8 px-2 sm:px-3"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" />
            <span className="hidden sm:inline">Ajouter</span>
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
  
  // 💰 NOUVEAU: États pour le flux Finance
  const [activeTab, setActiveTab] = useState('recent');
  const [pendingOrders, setPendingOrders] = useState([]);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

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
      const orders = response.data || [];
      setRecentSales(orders.slice(0, 5));
      
      // Séparer les commandes en attente de paiement
      const pending = orders.filter(o => o.status === 'EN_ATTENTE_PAIEMENT');
      setPendingOrders(pending);
      setPendingOrdersCount(pending.length);
    } catch (error) {
      console.error('Error loading recent sales:', error);
    }
  }, []);
  
  // 💰 NOUVEAU: Charger les commandes en attente de paiement
  const loadPendingOrders = useCallback(async () => {
    try {
      const response = await getPendingOrders();
      const orders = response.data || [];
      const pending = orders.filter(o => o.status === 'EN_ATTENTE_PAIEMENT');
      setPendingOrders(pending);
      setPendingOrdersCount(pending.length);
    } catch (error) {
      console.error('Error loading pending orders:', error);
    }
  }, []);

  useEffect(() => {
    loadMedications();
    loadRecentSales();
    
    // Rafraîchir les commandes en attente toutes les 30 secondes
    const interval = setInterval(() => {
      loadPendingOrders();
    }, 30000);
    
    // 💰 CONNEXION WEBSOCKET pour notifications temps réel
    WebSocketService.connect();
    
    // Souscription aux notifications de paiement confirmé
    const subscribeToPayments = () => {
      WebSocketService.subscribeToPharmacyPayments((notification) => {
        console.log('💰💊 [PHARMACY] Notification reçue:', notification);
        
        // Mettre à jour la liste des commandes en attente
        loadPendingOrders();
        
        // Afficher une notification visuelle
        toast.success(
          <div>
            <p className="font-bold">✅ Paiement confirmé !</p>
            <p className="text-sm">Commande {notification.orderCode}</p>
            <p className="text-xs text-gray-500">
              {notification.customerName} - {notification.amount?.toFixed(2)} $
            </p>
            <p className="text-[10px] text-emerald-600 mt-1">
              Prêt pour délivrance
            </p>
          </div>,
          { duration: 6000 }
        );
        
        // Jouer un son si le navigateur le supporte
        try {
          const audio = new Audio('/notification-sound.mp3');
          audio.play().catch(() => {});
        } catch (e) {}
      });
    };
    
    // Attendre un peu que la connexion soit établie
    const wsTimeout = setTimeout(subscribeToPayments, 2000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(wsTimeout);
      WebSocketService.disconnect();
    };
  }, [loadMedications, loadRecentSales, loadPendingOrders]);

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

  // 💰 NOUVEAU: Envoyer vers la Finance pour validation
  const sendToFinance = async () => {
    if (cart.length === 0) {
      toast.error('Le panier est vide');
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
        amountPaid: 0, // Pas encore payé
        paymentMethod: null,
        notes: `Bon envoyé à la finance - Total: ${total.toFixed(2)} $`,
        status: 'EN_ATTENTE_PAIEMENT', // ⏳ En attente de validation finance
        allowPartialPayment: false
      };

      console.log('🔴 [PharmacySales] Envoi vers Finance:', JSON.stringify(saleData, null, 2));

      const result = await createOrder(saleData);
      
      toast.success(
        <div>
          <p className="font-bold">✅ Bon envoyé à la Finance !</p>
          <p className="text-sm">N° {result?.orderCode || '---'}</p>
          <p className="text-xs text-gray-500">Le patient doit payer à la caisse</p>
        </div>,
        { duration: 5000 }
      );
      
      // Print bon de commande (pas de reçu car pas encore payé)
      printOrderSlip(result?.orderCode);
      
      // Clear and refresh
      clearCart();
      loadRecentSales();
      
    } catch (error) {
      console.error('Error sending to finance:', error);
      toast.error('Erreur lors de l\'envoi à la finance');
    } finally {
      setSubmitting(false);
    }
  };

  // 🖨️ Imprimer le bon de commande (à présenter à la finance)
  const printOrderSlip = (orderCode) => {
    const slipContent = `
      <div style="font-family: monospace; max-width: 300px; margin: 0 auto; padding: 20px;">
        <h2 style="text-align: center; margin-bottom: 10px;">🧾 BON DE COMMANDE</h2>
        <p style="text-align: center; font-size: 11px; color: #666; margin-bottom: 5px;">
          Présenter ce bon à la caisse
        </p>
        <p style="text-align: center; font-size: 10px; margin-bottom: 15px;">
          ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })}
        </p>
        <hr style="border: 1px dashed #999; margin: 10px 0;" />
        <p><strong>N° Bon:</strong> ${orderCode || '---'}</p>
        <p><strong>Client:</strong> ${customerName || 'Client comptoir'}</p>
        <hr style="border: 1px dashed #ccc; margin: 10px 0;" />
        ${cart.map(item => `
          <div style="display: flex; justify-content: space-between; margin: 5px 0; font-size: 11px;">
            <span>${item.medicationName} x${item.quantity}</span>
            <span>$${(item.unitPrice * item.quantity).toFixed(2)}</span>
          </div>
        `).join('')}
        <hr style="border: 1px dashed #ccc; margin: 10px 0;" />
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; color: #d9534f;">
          <span>TOTAL À PAYER</span>
          <span>$${total.toFixed(2)}</span>
        </div>
        <hr style="border: 1px dashed #999; margin: 15px 0;" />
        <p style="text-align: center; font-size: 12px; color: #d9534f; font-weight: bold; margin: 10px 0;">
          ⚠️ EN ATTENTE DE PAIEMENT
        </p>
        <p style="text-align: center; font-size: 9px; color: #666; margin-top: 15px;">
          Direction de la caisse pour validation<br/>
          Merci de votre confiance
        </p>
      </div>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>Bon de Commande - ${orderCode}</title></head>
      <body>${slipContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Print receipt
  const printReceipt = () => {
    const receiptContent = `
      <div style="font-family: monospace; max-width: 300px; margin: 0 auto; padding: 20px;">
        <h2 style="text-align: center; margin-bottom: 10px;">INUA AFYA PHARMACIE</h2>
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
    <div className="h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ======== HEADER ======== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
        <div className="min-w-0">
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none mb-1.5 px-2.5 py-1 font-bold text-xs">
            POINT DE VENTE
          </Badge>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-foreground truncate">
            Ventes Pharmacie
          </h1>
          <p className="text-muted-foreground font-medium mt-0.5 text-sm truncate">
            {cart.length} article{cart.length > 1 ? 's' : ''} • Total: <span className="font-bold text-emerald-600">${total.toFixed(2)}</span>
          </p>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="outline"
            onClick={clearCart}
            disabled={cart.length === 0}
            className="rounded-xl font-bold h-9 px-3"
            size="sm"
          >
            <Trash2 className="w-4 h-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Vider</span>
          </Button>
          <Button
            onClick={sendToFinance}
            disabled={cart.length === 0 || submitting}
            className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700 h-9 px-3"
            size="sm"
          >
            {submitting ? (
              <>
                <span className="animate-spin mr-1">⏳</span>
                <span className="hidden sm:inline">Envoi...</span>
              </>
            ) : (
              <>
                <span className="mr-1">🏦</span>
                <span className="hidden sm:inline">Caisse</span>
                <span className="sm:hidden">${total.toFixed(0)}</span>
                <span className="hidden sm:inline"> ${total.toFixed(2)}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-4 min-h-0">
        {/* ======== LEFT: MEDICATIONS CATALOG ======== */}
        <div className="xl:col-span-8 flex flex-col gap-3 min-h-0">
          {/* Search */}
          <Card className="border-none shadow-sm bg-card rounded-2xl p-3 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un médicament..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl h-10"
              />
            </div>
          </Card>

          {/* Medications Grid - Responsive */}
          <div className="flex-1 overflow-y-auto pr-1 min-h-0">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4 gap-3 content-start">
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
        </div>

        {/* ======== RIGHT: CART & CHECKOUT ======== */}
        <div className="xl:col-span-4 flex flex-col gap-3 min-h-0">
          {/* Customer Info - Compact */}
          <Card className="border-none shadow-sm bg-card rounded-2xl flex-shrink-0">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Input
                  placeholder="Nom du client (optionnel)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="rounded-xl h-9 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Cart */}
          <Card className="border-none shadow-sm bg-card rounded-2xl flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-2 pt-3 px-4 flex-shrink-0">
              <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Panier ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 overflow-y-auto flex-1 px-3 pb-3">
              {cart.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
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
          <Card className="border-none shadow-sm bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 rounded-2xl flex-shrink-0">
            <CardContent className="p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sous-total</span>
                <span className="font-bold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-emerald-700 dark:text-emerald-400">
                <span>TOTAL</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Pending Orders & Recent Sales Tabs */}
          <Card className="border-none shadow-sm bg-card rounded-2xl flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-2 pt-3 px-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-black uppercase flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  Historique
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant={activeTab === 'recent' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('recent')}
                    className="text-xs rounded-lg h-7 px-2"
                  >
                    Récentes
                  </Button>
                  <Button
                    variant={activeTab === 'pending' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('pending')}
                    className="text-xs rounded-lg h-7 px-2"
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">En attente</span>
                    <span className="sm:hidden">...</span>
                    {pendingOrdersCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">
                        {pendingOrdersCount}
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 overflow-y-auto flex-1 px-3 pb-3">
              {activeTab === 'recent' ? (
                recentSales.length > 0 ? (
                  recentSales.map((sale, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{sale.patientName || sale.customerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(sale.createdAt), 'HH:mm', { locale: fr })}
                        </p>
                      </div>
                      <Badge className={sale.status === 'EN_ATTENTE_PAIEMENT' ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'}>
                        ${(sale.totalAmount || 0).toFixed(2)}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">Aucune vente récente</p>
                )
              ) : (
                pendingOrders.length > 0 ? (
                  pendingOrders.map((order, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{order.customerName || 'Client comptoir'}</p>
                        <p className="text-xs text-yellow-600">
                          {order.orderCode} • {format(new Date(order.createdAt), 'HH:mm', { locale: fr })}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-yellow-100 text-yellow-700">
                          ${(order.totalAmount || 0).toFixed(2)}
                        </Badge>
                        <p className="text-[10px] text-yellow-600 mt-1">⏳ En attente caisse</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Aucune commande en attente</p>
                    <p className="text-[10px] text-emerald-600 mt-1">Tous les paiements sont à jour !</p>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile Cart Summary - Fixed bottom on small screens */}
      <div className="xl:hidden flex-shrink-0">
        <Card className="border-none shadow-lg bg-emerald-600 text-white rounded-2xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-emerald-100">{cart.length} article{cart.length > 1 ? 's' : ''}</p>
                  <p className="text-lg font-black">${total.toFixed(2)}</p>
                </div>
              </div>
              <Button
                onClick={sendToFinance}
                disabled={cart.length === 0 || submitting}
                className="bg-white text-emerald-700 hover:bg-emerald-50 rounded-xl font-bold h-10 px-4"
                size="sm"
              >
                {submitting ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <>
                    <span className="mr-1">🏦</span>
                    Caisse
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
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
