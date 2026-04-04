import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Wallet,
  CreditCard,
  Clock,
  Receipt,
  Search,
  Eye,
  Loader2,
  RefreshCw,
  Users,
  ArrowRight,
  HelpCircle,
  AlertTriangle,
  Package,
  CheckCircle,
  XCircle
} from 'lucide-react';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format, startOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  getDashboardStats, 
  getPendingOrders, 
  getStockAlerts,
  getUnpaidOrders,
  processPayment
} from '../../services/pharmacyApi/pharmacyApi.js';

/* ═══════════════════════════════════════════
   COMPOSANT STAT CARD
   ═══════════════════════════════════════════ */
const StatCard = ({ label, value, icon: Icon, color, trend, trendUp }) => (
  <Card className="border-none shadow-sm bg-card overflow-hidden">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <h3 className="text-3xl font-black text-foreground">{value}</h3>
          {trend !== undefined && trend !== null && (
            <div className="flex items-center gap-1 pt-1">
              {trendUp
                ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
              <span className={cn(
                "text-xs font-bold",
                trendUp ? "text-emerald-500" : "text-red-500"
              )}>
                {trend}
              </span>
            </div>
          )}
        </div>
        <div
          className="p-4 rounded-2xl transition-transform hover:scale-110"
          style={{ backgroundColor: `${color}15`, color }}
        >
          <Icon size={28} strokeWidth={2.5} />
        </div>
      </div>
    </CardContent>
  </Card>
);

/* ═══════════════════════════════════════════
   DASHBOARD PHARMACIE — 100% DONNÉES RÉELLES
   ═══════════════════════════════════════════ */
const PharmacyDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [pendingOrders, setPendingOrders] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);
  const [unpaidOrders, setUnpaidOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // ═══════════════════════════════════════
  // MODAL DE PAIEMENT
  // ═══════════════════════════════════════
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [allowPartialPayment, setAllowPartialPayment] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // ═══════════════════════════════════════
  // FORMATAGE MONÉTAIRE — USD ($)
  // ═══════════════════════════════════════
  const formatCurrency = useCallback((amount) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'USD', minimumFractionDigits: 0,
    }).format(amount || 0), []);

  // ═══════════════════════════════════════
  // CHARGEMENT DES DONNÉES RÉELLES
  // ═══════════════════════════════════════
  const loadDashboard = async () => {
    try {
      setLoading(true);

      // 1️⃣ Charger les stats du dashboard
      let dashboardStats = null;
      try {
        const response = await getDashboardStats();
        dashboardStats = response.data;
      } catch {
        console.warn('Dashboard stats endpoint not available');
      }

      // 2️⃣ Charger les commandes en attente
      let ordersData = [];
      try {
        const response = await getPendingOrders();
        ordersData = response.data || [];
      } catch (err) {
        console.warn('Could not load pending orders:', err);
      }

      // 3️⃣ Charger les alertes de stock
      let alertsData = [];
      try {
        const response = await getStockAlerts();
        alertsData = response.data || [];
      } catch (err) {
        console.warn('Could not load stock alerts:', err);
      }

      // 4️⃣ Charger les commandes impayées
      let unpaidData = [];
      try {
        const response = await getUnpaidOrders();
        unpaidData = response.data || [];
      } catch (err) {
        console.warn('Could not load unpaid orders:', err);
      }

      // 5️⃣ Mettre à jour les états
      setStats(dashboardStats || {});
      setPendingOrders(ordersData);
      setStockAlerts(alertsData);
      setUnpaidOrders(unpaidData);

    } catch (err) {
      console.error('Error loading dashboard:', err);
      toast.error('Erreur lors du chargement du tableau de bord');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  // ═══════════════════════════════════════
  // GESTION DU PAIEMENT
  // ═══════════════════════════════════════
  const openPaymentModal = (order) => {
    setSelectedOrder(order);
    // Pré-remplir avec le montant restant ou le montant total
    const remaining = order.remainingAmount || (order.totalAmount - (order.amountPaid || 0));
    setPaymentAmount(remaining > 0 ? remaining.toString() : (order.totalAmount || 0).toString());
    setPaymentMethod('CASH');
    setAllowPartialPayment(false);
    setPaymentModalOpen(true);
  };

  const handlePayment = async () => {
    if (!selectedOrder || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }

    try {
      setProcessingPayment(true);
      
      const paymentData = {
        amountPaid: parseFloat(paymentAmount),
        paymentMethod: paymentMethod,
        allowPartialPayment: allowPartialPayment
      };

      await processPayment(selectedOrder.id, paymentData);
      
      toast.success(allowPartialPayment 
        ? 'Paiement partiel validé avec dette' 
        : 'Paiement effectué avec succès');
      
      setPaymentModalOpen(false);
      loadDashboard(); // Rafraîchir les données
    } catch (err) {
      console.error('Erreur paiement:', err);
      toast.error('Erreur lors du paiement');
    } finally {
      setProcessingPayment(false);
    }
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setSelectedOrder(null);
    setPaymentAmount('');
    setAllowPartialPayment(false);
  };

  // ═══════════════════════════════════════
  // FILTRAGE & HELPERS
  // ═══════════════════════════════════════
  const filteredOrders = pendingOrders
    .filter((order) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (order.patientName || '').toLowerCase().includes(q) ||
        (order.orderCode || '').toLowerCase().includes(q) ||
        (order.status || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const da = new Date(a.createdAt || 0).getTime();
      const db = new Date(b.createdAt || 0).getTime();
      return db - da;
    });

  const getOrderStatusBadge = (status) => {
    const statusMap = {
      'EN_ATTENTE': { color: '#F59E0B', label: 'En attente' },
      'EN_PREPARATION': { color: '#3B82F6', label: 'En préparation' },
      'PAYEE': { color: '#10B981', label: 'Payée' },
      'LIVREE': { color: '#8B5CF6', label: 'Livrée' },
      'ANNULEE': { color: '#EF4444', label: 'Annulée' }
    };
    
    const config = statusMap[status] || { color: '#6B7280', label: status };
    
    return (
      <span
        className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
        style={{ backgroundColor: `${config.color}15`, color: config.color }}
      >
        {config.label}
      </span>
    );
  };

  const getStockAlertBadge = (alertLevel) => {
    const alertMap = {
      'LOW': { color: '#F59E0B', label: 'Bas', icon: AlertTriangle },
      'CRITICAL': { color: '#EF4444', label: 'Critique', icon: XCircle },
      'OUT_OF_STOCK': { color: '#DC2626', label: 'Rupture', icon: XCircle }
    };
    
    const config = alertMap[alertLevel] || alertMap['LOW'];
    const Icon = config.icon;
    
    return (
      <div className="flex items-center gap-1">
        <Icon className="w-3 h-3" style={{ color: config.color }} />
        <span
          className="px-2 py-1 rounded text-[9px] font-bold"
          style={{ backgroundColor: `${config.color}15`, color: config.color }}
        >
          {config.label}
        </span>
      </div>
    );
  };

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4'];

  // ═══════════════════════════════════════
  // STAT CARDS — Données réelles
  // ═══════════════════════════════════════
  const statCards = [
    {
      label: "Prescriptions en attente",
      value: stats.pendingPrescriptions || 0,
      icon: FileText,
      color: '#F59E0B',
      trend: null,
      trendUp: false
    },
    {
      label: "Revenus du jour",
      value: formatCurrency(stats.todaySalesAmount || 0),
      icon: DollarSign,
      color: '#10B981',
      trend: null,
      trendUp: true
    },
    {
      label: 'Alertes de stock',
      value: stats.lowStockAlerts || 0,
      icon: AlertTriangle,
      color: '#EF4444',
      trend: null,
      trendUp: false
    },
    {
      label: 'Ventes du jour',
      value: stats.totalOrdersToday || 0,
      icon: Package,
      color: '#3B82F6',
      trend: null,
      trendUp: true
    },
    {
      label: 'Revenus mensuels',
      value: formatCurrency(stats.monthlySalesAmount || 0),
      icon: TrendingUp,
      color: '#8B5CF6',
      trend: null,
      trendUp: true
    },
    {
      label: 'Ventes impayées',
      value: stats.unpaidOrders || 0,
      icon: CreditCard,
      color: '#EF4444',
      trend: null,
      trendUp: false
    },
  ];

  /* ── LOADING STATE ── */
  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  /* ── RENDU PRINCIPAL ── */
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge className="bg-blue-500/10 text-blue-600 border-none mb-3 px-3 py-1 font-bold">
            PHARMACIE TEMPS RÉEL
          </Badge>
          <h1 className="text-4xl font-black tracking-tight text-foreground">
            Tableau de bord
          </h1>
          <p className="text-muted-foreground font-medium mt-1 uppercase text-sm tracking-widest">
            {format(new Date(), 'EEEE dd MMMM yyyy', { locale: fr })}
          </p>
        </div>
        <Button
          onClick={loadDashboard}
          variant="outline"
          size="sm"
          className="rounded-xl font-bold border-2"
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Synchroniser
        </Button>
      </div>

      {/* ═══ STATS CARDS ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* ═══ ALERTS & QUICK ACTIONS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Stock Alerts */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm bg-card overflow-hidden rounded-2xl">
            <div className="p-6 border-b border-border/50">
              <h2 className="text-xl font-black uppercase tracking-tight">
                Alertes de Stock
              </h2>
              <p className="text-sm text-muted-foreground font-medium mt-1">
                Médicaments nécessitant une attention
              </p>
            </div>
            <CardContent className="p-6">
              {stockAlerts.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-emerald-600">
                    Aucune alerte de stock
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stockAlerts.slice(0, 5).map((alert, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-bold text-sm">{alert.medicationName}</p>
                          <p className="text-xs text-muted-foreground">
                            Stock: {alert.currentStock} / Min: {alert.minimumStock}
                          </p>
                        </div>
                      </div>
                      {getStockAlertBadge(alert.alertLevel)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions Rapides */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-card rounded-2xl p-6">
            <h2 className="text-xl font-black uppercase tracking-tight mb-4">
              Actions rapides
            </h2>
            <div className="space-y-3">
              <Button
                variant="ghost"
                onClick={() => navigate('/pharmacy/orders')}
                className="w-full justify-between h-14 rounded-xl hover:bg-blue-500/10 group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: '#3B82F615', color: '#3B82F6' }}>
                    <FileText size={18} strokeWidth={2.5} />
                  </div>
                  <span className="font-bold text-sm">Gérer ventes</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
              </Button>

              <Button
                variant="ghost"
                onClick={() => navigate('/pharmacy/inventory')}
                className="w-full justify-between h-14 rounded-xl hover:bg-emerald-500/10 group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: '#10B98115', color: '#10B981' }}>
                    <Package size={18} strokeWidth={2.5} />
                  </div>
                  <span className="font-bold text-sm">Gérer stock</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
              </Button>

              <Button
                variant="ghost"
                onClick={() => navigate('/pharmacy/suppliers')}
                className="w-full justify-between h-14 rounded-xl hover:bg-purple-500/10 group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: '#8B5CF615', color: '#8B5CF6' }}>
                    <Users size={18} strokeWidth={2.5} />
                  </div>
                  <span className="font-bold text-sm">Fournisseurs</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-500 transition-colors" />
              </Button>
            </div>
          </Card>

          {/* Help Card */}
          <Card className="border-none bg-blue-600 p-6 rounded-2xl text-white shadow-xl shadow-blue-500/20">
            <h3 className="font-black text-lg leading-tight mb-2">
              Besoin d'aide ?
            </h3>
            <p className="text-blue-100 text-xs font-medium mb-4 opacity-80">
              Consultez le guide pharmacie ou contactez l'administrateur système.
            </p>
            <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 font-black rounded-xl border-none shadow-lg">
              SUPPORT TECHNIQUE
            </Button>
          </Card>
        </div>
      </div>

      {/* ═══ VENTES EN ATTENTE ═══ */}
      <Card className="border-none shadow-sm bg-card overflow-hidden rounded-2xl">
        <div className="p-6 border-b border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">
              Ventes en attente
            </h2>
            <p className="text-sm text-muted-foreground font-medium mt-1">
              {filteredOrders.length} vente{filteredOrders.length > 1 ? 's' : ''} en attente
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une vente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl border-muted bg-muted/20 focus:bg-background transition-all"
              />
            </div>
            <Badge className="bg-blue-500/10 text-blue-600 border-none font-bold px-3">
              LIVE
            </Badge>
          </div>
        </div>

        <CardContent className="p-0">
          {filteredOrders.length === 0 ? (
            <div className="py-24 text-center">
              <div className="inline-flex p-4 rounded-full bg-muted mb-4">
                <FileText className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-medium italic">
                {searchQuery
                  ? `Aucun résultat pour "${searchQuery}"`
                  : 'Aucune vente en attente'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredOrders.slice(0, 20).map((order) => (
                <div
                  key={order.id}
                  className="group flex items-center justify-between p-5 hover:bg-muted/30 transition-all"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg bg-blue-500">
                      {(order.patientName || '?').charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-lg">
                        {order.patientName || 'Patient'}
                      </p>
                      <p className="text-xs font-medium text-muted-foreground">
                        {order.orderCode || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="hidden md:block text-right">
                      <p className="text-[10px] font-black text-muted-foreground uppercase">
                        Montant
                      </p>
                      <p className="text-sm font-black text-foreground">
                        {formatCurrency(order.totalAmount || 0)}
                      </p>
                      {/* Affichage de la dette restante */}
                      {(order.remainingAmount > 0 || (order.totalAmount > order.amountPaid)) && (
                        <p className="text-xs text-red-500 font-medium">
                          Reste: {formatCurrency(order.remainingAmount || (order.totalAmount - (order.amountPaid || 0)))}
                        </p>
                      )}
                      {(order.amountPaid > 0) && (
                        <p className="text-xs text-emerald-600">
                          Payé: {formatCurrency(order.amountPaid)}
                        </p>
                      )}
                    </div>
                    <div className="hidden sm:block text-right">
                      <p className="text-[10px] font-black text-muted-foreground uppercase">
                        Date
                      </p>
                      <p className="text-sm font-black">
                        {order.createdAt
                          ? format(new Date(order.createdAt), 'dd/MM HH:mm', { locale: fr })
                          : '--'}
                      </p>
                    </div>
                    {getOrderStatusBadge(order.status)}
                    
                    {/* Bouton Payer - visible si commande non complètement payée */}
                    {(!order.isFullyPaid && order.status !== 'ANNULEE') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPaymentModal(order)}
                        className="rounded-xl hover:bg-emerald-500 hover:text-white transition-all bg-emerald-500/10 text-emerald-600"
                      >
                        <CreditCard className="w-4 h-4 mr-1" />
                        Payer
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/pharmacy/orders/${order.id}`)}
                      className="rounded-xl hover:bg-blue-500 hover:text-white transition-all"
                    >
                      <Eye className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ MODAL DE PAIEMENT ═══ */}

      {/* ═══ VENTES IMPAYÉES (DETTES) ═══ */}
      <Card className="border-none shadow-sm bg-card overflow-hidden rounded-2xl border-l-4 border-l-red-500">
        <div className="p-6 border-b border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4 bg-red-50/50">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-red-700">
              Ventes impayées ({unpaidOrders.length})
            </h2>
            <p className="text-sm text-red-600 font-medium mt-1">
              {unpaidOrders.length > 0 
                ? `${unpaidOrders.length} vente${unpaidOrders.length > 1 ? 's' : ''} avec dette à récupérer`
                : 'Aucune vente avec dette'}
            </p>
          </div>
          <Badge className="bg-red-500 text-white border-none font-bold px-3">
            DETTES
          </Badge>
        </div>

        <CardContent className="p-0">
          {unpaidOrders.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-emerald-600 font-medium">
                Aucune dette à récupérer
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {unpaidOrders.slice(0, 10).map((order) => (
                <div
                  key={order.id}
                  className="group flex items-center justify-between p-5 hover:bg-red-50/30 transition-all"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg bg-red-500">
                      {(order.patientName || '?').charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-lg">
                        {order.patientName || 'Patient'}
                      </p>
                      <p className="text-xs font-medium text-muted-foreground">
                        {order.orderCode || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="hidden md:block text-right">
                      <p className="text-[10px] font-black text-muted-foreground uppercase">
                        Total
                      </p>
                      <p className="text-sm font-black text-foreground">
                        {formatCurrency(order.totalAmount || 0)}
                      </p>
                    </div>
                    <div className="hidden md:block text-right">
                      <p className="text-[10px] font-black text-emerald-600 uppercase">
                        Payé
                      </p>
                      <p className="text-sm font-bold text-emerald-600">
                        {formatCurrency(order.amountPaid || 0)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-red-600 uppercase">
                        Reste
                      </p>
                      <p className="text-lg font-black text-red-600">
                        {formatCurrency(order.remainingAmount || (order.totalAmount - (order.amountPaid || 0)))}
                      </p>
                    </div>
                    <div className="hidden sm:block text-right">
                      <p className="text-[10px] font-black text-muted-foreground uppercase">
                        Date
                      </p>
                      <p className="text-sm font-black">
                        {order.createdAt
                          ? format(new Date(order.createdAt), 'dd/MM HH:mm', { locale: fr })
                          : '--'}
                      </p>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openPaymentModal(order)}
                      className="rounded-xl hover:bg-emerald-500 hover:text-white transition-all bg-emerald-500/10 text-emerald-600"
                    >
                      <CreditCard className="w-4 h-4 mr-1" />
                      Payer
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/pharmacy/orders/${order.id}`)}
                      className="rounded-xl hover:bg-blue-500 hover:text-white transition-all"
                    >
                      <Eye className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ MODAL DE PAIEMENT ═══ */}
      <Dialog open={paymentModalOpen} onOpenChange={closePaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Effectuer un paiement</DialogTitle>
            <DialogDescription>
              {selectedOrder && (
                <div className="mt-2 space-y-1">
                  <p><strong>Commande:</strong> {selectedOrder.orderCode}</p>
                  <p><strong>Patient:</strong> {selectedOrder.patientName}</p>
                  <p><strong>Montant total:</strong> {formatCurrency(selectedOrder.totalAmount)}</p>
                  {(selectedOrder.amountPaid > 0 || selectedOrder.remainingAmount > 0) && (
                    <p><strong>Déjà payé:</strong> {formatCurrency(selectedOrder.amountPaid || (selectedOrder.totalAmount - selectedOrder.remainingAmount))}</p>
                  )}
                  <p className="text-red-600 font-bold">
                    <strong>Reste à payer:</strong> {formatCurrency(selectedOrder.remainingAmount || (selectedOrder.totalAmount - (selectedOrder.amountPaid || 0)))}
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Montant */}
            <div className="space-y-2">
              <Label htmlFor="amount">Montant payé</Label>
              <Input
                id="amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Entrez le montant"
                className="text-lg font-bold"
              />
            </div>

            {/* Méthode de paiement */}
            <div className="space-y-2">
              <Label htmlFor="method">Méthode de paiement</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Espèces</SelectItem>
                  <SelectItem value="CARD">Carte bancaire</SelectItem>
                  <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Virement bancaire</SelectItem>
                  <SelectItem value="CHECK">Chèque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Option paiement partiel avec dette */}
            <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <Checkbox
                id="partial"
                checked={allowPartialPayment}
                onCheckedChange={setAllowPartialPayment}
              />
              <div className="space-y-1">
                <Label htmlFor="partial" className="font-bold text-yellow-800 cursor-pointer">
                  Valider avec dette (paiement partiel)
                </Label>
                <p className="text-xs text-yellow-700">
                  Cochez cette case si le patient paie partiellement et reviendra payer le solde plus tard.
                  La commande sera validée mais restera avec un solde dû.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closePaymentModal}>
              Annuler
            </Button>
            <Button
              onClick={handlePayment}
              disabled={processingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
              className={allowPartialPayment ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-emerald-600 hover:bg-emerald-700'}
            >
              {processingPayment ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Traitement...
                </>
              ) : allowPartialPayment ? (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Valider avec dette
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Confirmer le paiement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PharmacyDashboard;