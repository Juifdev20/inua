import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
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
  XCircle,
  Plus,
  Edit,
  Trash2,
  Filter,
  Download,
  Calendar,
  User,
  ShoppingCart,
  Pill,
  Stethoscope
} from 'lucide-react';
import { format, startOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  getOrdersByStatus,
  getPendingOrders,
  getOrderById,
  updateOrderStatus,
  processPayment,
  dispenseOrder,
  validateOrder,
  cancelOrder,
  searchOrders
} from '../../services/pharmacyApi/pharmacyApi.js';
import OrderPaymentModal from '../../components/modals/OrderPaymentModal.jsx';

/* =========================================
   COMPOSANT ORDER CARD
   ========================================= */
const OrderCard = ({ order, onView, onStatusChange, onPayment, onDispense, onValidate, onCancel }) => {
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'USD', minimumFractionDigits: 0,
    }).format(amount || 0);

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

  const canValidate = order.status === 'EN_ATTENTE';
  const canPay = order.status === 'EN_PREPARATION' && (order.totalAmount > (order.amountPaid || 0));
  const canDispense = order.status === 'PAYEE';
  const canCancel = ['EN_ATTENTE', 'EN_PREPARATION'].includes(order.status);

  return (
    <Card className="border-none shadow-sm bg-card overflow-hidden rounded-2xl hover:shadow-md transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg bg-blue-500">
              {(order.patientName || '?').charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">
                {order.patientName || 'Patient'}
              </h3>
              <p className="text-xs font-medium text-muted-foreground">
                {order.orderCode || 'N/A'}
              </p>
            </div>
          </div>
          {getOrderStatusBadge(order.status)}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase">
              Montant total
            </p>
            <p className="text-lg font-black text-foreground">
              {formatCurrency(order.totalAmount || 0)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase">
              Montant payé
            </p>
            <p className="text-lg font-black text-foreground">
              {formatCurrency(order.amountPaid || 0)}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">
            Date de création
          </p>
          <p className="text-sm font-medium">
            {order.createdAt
              ? format(new Date(order.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })
              : '--'}
          </p>
        </div>

        {order.notes && (
          <div className="mb-4">
            <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">
              Notes
            </p>
            <p className="text-sm text-muted-foreground italic">
              {order.notes}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(order.id)}
            className="rounded-lg hover:bg-blue-500/10"
          >
            <Eye className="w-4 h-4 mr-1" />
            Voir
          </Button>

          {canValidate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onValidate(order.id)}
              className="rounded-lg hover:bg-emerald-500/10 text-emerald-600"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Valider
            </Button>
          )}

          {canPay && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPayment(order.id)}
              className="rounded-lg hover:bg-blue-500/10 text-blue-600"
            >
              <CreditCard className="w-4 h-4 mr-1" />
              Payer
            </Button>
          )}

          {canDispense && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDispense(order.id)}
              className="rounded-lg hover:bg-purple-500/10 text-purple-600"
            >
              <Package className="w-4 h-4 mr-1" />
              Dispenser
            </Button>
          )}

          {canCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCancel(order.id)}
              className="rounded-lg hover:bg-red-500/10 text-red-600"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Annuler
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/* =========================================
   PAGE ORDRES PHARMACIE
   ========================================= */
const PharmacyOrders = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const statusOptions = [
    { value: 'ALL', label: 'Tous', color: '#6B7280' },
    { value: 'EN_ATTENTE', label: 'En attente', color: '#F59E0B' },
    { value: 'EN_PREPARATION', label: 'En préparation', color: '#3B82F6' },
    { value: 'PAYEE', label: 'Payée', color: '#10B981' },
    { value: 'LIVREE', label: 'Livrée', color: '#8B5CF6' },
    { value: 'ANNULEE', label: 'Annulée', color: '#EF4444' }
  ];

  // ========================================
  // CHARGEMENT DES DONNÉES
  // ========================================
  const loadOrders = async () => {
    try {
      setLoading(true);

      let response;
      if (searchQuery) {
        response = await searchOrders(searchQuery, currentPage, 20);
      } else if (statusFilter === 'ALL') {
        response = await getOrdersByStatus(['EN_ATTENTE', 'EN_PREPARATION', 'PAYEE', 'LIVREE'], currentPage, 20);
      } else {
        response = await getOrdersByStatus([statusFilter], currentPage, 20);
      }

      setOrders(response.data.content || []);
      setTotalPages(response.data.totalPages || 0);

    } catch (err) {
      console.error('Error loading orders:', err);
      toast.error('Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, [currentPage, statusFilter, searchQuery]);

  // ========================================
  // HANDLERS
  // ========================================
  const handleViewOrder = (orderId) => {
    navigate(`/pharmacy/orders/${orderId}`);
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success('Statut mis à jour avec succès');
      loadOrders();
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const handlePayment = async (orderId) => {
    setSelectedOrderId(orderId);
    setShowPaymentModal(true);
  };

  const handlePaymentComplete = () => {
    loadOrders();
    setShowPaymentModal(false);
    setSelectedOrderId(null);
  };

  const handleDispense = async (orderId) => {
    try {
      // TODO: Get current user ID
      await dispenseOrder(orderId, 1); // Replace with actual pharmacist ID
      toast.success('Commande dispensée avec succès');
      loadOrders();
    } catch (err) {
      console.error('Error dispensing order:', err);
      toast.error('Erreur lors de la dispensation');
    }
  };

  const handleValidate = async (orderId) => {
    try {
      await validateOrder(orderId);
      toast.success('Commande validée avec succès');
      loadOrders();
    } catch (err) {
      console.error('Error validating order:', err);
      toast.error('Erreur lors de la validation');
    }
  };

  const handleCancel = async (orderId) => {
    const reason = prompt('Raison de l\'annulation:');
    if (reason) {
      try {
        await cancelOrder(orderId, reason);
        toast.success('Commande annulée avec succès');
        loadOrders();
      } catch (err) {
        console.error('Error cancelling order:', err);
        toast.error('Erreur lors de l\'annulation');
      }
    }
  };

  /* ── LOADING STATE ── */
  if (loading && orders.length === 0) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-72" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  /* ── RENDU PRINCIPAL ── */
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ======== HEADER ======== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge className="bg-blue-500/10 text-blue-600 border-none mb-3 px-3 py-1 font-bold">
            GESTION DES ORDONNANCES
          </Badge>
          <h1 className="text-4xl font-black tracking-tight text-foreground">
            Commandes Pharmacie
          </h1>
          <p className="text-muted-foreground font-medium mt-1 uppercase text-sm tracking-widest">
            {orders.length} commande{orders.length > 1 ? 's' : ''} trouvée{orders.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => navigate('/pharmacy/orders/new')}
            className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle commande
          </Button>
          <Button
            onClick={loadOrders}
            variant="outline"
            size="sm"
            className="rounded-xl font-bold border-2"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* ======== FILTERS ======== */}
      <Card className="border-none shadow-sm bg-card rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une commande..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl border-muted bg-muted/20 focus:bg-background transition-all"
              />
            </div>
          </div>
          <div className="flex gap-2">
            {statusOptions.map((status) => (
              <Button
                key={status.value}
                variant={statusFilter === status.value ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status.value)}
                className={cn(
                  "rounded-xl font-bold",
                  statusFilter === status.value && "border-none",
                  statusFilter === status.value && {
                    backgroundColor: `${status.color}15`,
                    color: status.color
                  }
                )}
              >
                {status.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* ======== ORDERS GRID ======== */}
      {orders.length === 0 ? (
        <Card className="border-none shadow-sm bg-card rounded-2xl">
          <CardContent className="py-24 text-center">
            <div className="inline-flex p-4 rounded-full bg-muted mb-4">
              <FileText className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium italic">
              {searchQuery
                ? `Aucun résultat pour "${searchQuery}"`
                : 'Aucune commande trouvée'}
            </p>
            <Button
              onClick={() => navigate('/pharmacy/orders/new')}
              className="mt-4 rounded-xl bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer une commande
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onView={handleViewOrder}
              onStatusChange={handleStatusChange}
              onPayment={handlePayment}
              onDispense={handleDispense}
              onValidate={handleValidate}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}

      {/* ======== PAGINATION ======== */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="rounded-xl"
          >
            Précédent
          </Button>
          <span className="text-sm font-medium text-muted-foreground">
            Page {currentPage + 1} sur {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
            className="rounded-xl"
          >
            Suivant
          </Button>
        </div>
      )}

      {/* ======== PAYMENT MODAL ======== */}
      <OrderPaymentModal
        orderId={selectedOrderId}
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedOrderId(null);
        }}
        onPaymentComplete={handlePaymentComplete}
      />
    </div>
  );
};

export default PharmacyOrders;
