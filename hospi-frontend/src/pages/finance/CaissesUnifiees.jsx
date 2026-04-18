import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import financeApi from '../../services/financeApi/financeApi.js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  UserCheck,
  Microscope,
  Pill,
  Wallet,
  TrendingUp,
  Users,
  FlaskConical,
  Package,
  Receipt,
  Search,
  Loader2,
  RefreshCw,
  Clock,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  ArrowLeft,
  LayoutGrid,
  CreditCard,
  Banknote,
  Smartphone,
  FileText,
  Shield,
  X,
  Filter,
  Calendar,
  ChevronRight,
  ChevronDown,
  Stethoscope,
  AlertCircle,
  Ban
} from 'lucide-react';
import { toast } from 'sonner';

// ═══════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════
const formatCurrency = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount || 0);

const formatDate = (date) => {
  if (!date) return '-';
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: fr });
};

// ═══════════════════════════════════════
// STATUT CONFIG
// ═══════════════════════════════════════
const STATUS_CONFIG = {
  WAITING_PAYMENT: { 
    label: 'À payer', 
    color: 'bg-amber-500', 
    text: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    icon: Clock 
  },
  PENDING: { 
    label: 'En attente', 
    color: 'bg-amber-500', 
    text: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    icon: Clock 
  },
  EN_ATTENTE: { 
    label: 'En attente', 
    color: 'bg-amber-500', 
    text: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    icon: Clock 
  },
  PAID: { 
    label: 'Payé', 
    color: 'bg-emerald-500', 
    text: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    icon: CheckCircle2 
  },
  PAYEE: { 
    label: 'Payé', 
    color: 'bg-emerald-500', 
    text: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    icon: CheckCircle2 
  },
};

// ═══════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════
const CaissesUnifiees = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get('tab') || 'admissions';

  // États
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    admissions: { count: 0, total: 0, currency: 'USD' },
    laboratoire: { count: 0, total: 0, currency: 'USD' },
    pharmacie: { count: 0, total: 0, currency: 'USD' },
  });
  
  // Données par section
  const [admissions, setAdmissions] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [pharmaInvoices, setPharmaInvoices] = useState([]);
  
  // Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Paiement modal
  const [selectedItem, setSelectedItem] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('ESPECES');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Méthodes de paiement
  const PAYMENT_METHODS = [
    { value: 'ESPECES', label: 'Espèces', icon: Banknote },
    { value: 'MOBILE_MONEY', label: 'Mobile Money', icon: Smartphone },
    { value: 'CARTE_BANCAIRE', label: 'Carte Bancaire', icon: CreditCard },
    { value: 'VIREMENT', label: 'Virement', icon: FileText },
    { value: 'CHEQUE', label: 'Chèque', icon: FileText },
    { value: 'ASSURANCE', label: 'Assurance', icon: Shield },
  ];

  // Chargement des données
  useEffect(() => {
    loadAllData();
  }, [selectedDate]);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Charger toutes les données en parallèle
      const [admissionsRes, labRes, pharmaRes] = await Promise.all([
        financeApi.getAdmissionsQueue({ date: selectedDate }).catch(() => ({ data: [] })),
        financeApi.getLaboratoryQueue().catch(() => ({ data: [] })),
        financeApi.getPharmacyQueue().catch(() => ({ data: [] })),
      ]);

      const admissionsData = admissionsRes.data || [];
      const labData = labRes.data || [];
      const pharmaData = pharmaRes.data || [];

      setAdmissions(admissionsData);
      setLabTests(labData);
      setPharmaInvoices(pharmaData);

      // Calculer les statistiques
      const admissionsPending = admissionsData.filter(a => 
        ['WAITING_PAYMENT', 'PENDING', 'EN_ATTENTE'].includes(a.paymentStatus || a.status)
      );
      const labPending = labData.filter(t => t.status === 'EN_ATTENTE' || !t.paid);
      const pharmaPending = pharmaData.filter(i => i.status === 'EN_ATTENTE');

      setStats({
        admissions: {
          count: admissionsPending.length,
          total: admissionsPending.reduce((sum, a) => sum + (a.totalAmount || a.amount || 0), 0),
          currency: admissionsPending[0]?.currency || 'USD',
        },
        laboratoire: {
          count: labPending.length,
          total: labPending.reduce((sum, t) => sum + (t.price || t.total || 0), 0),
          currency: labPending[0]?.currency || 'USD',
        },
        pharmacie: {
          count: pharmaPending.length,
          total: pharmaPending.reduce((sum, i) => sum + (i.totalAmount || i.total || 0), 0),
          currency: pharmaPending[0]?.currency || 'USD',
        },
      });
    } catch (err) {
      console.error('Erreur chargement caisses:', err);
      setError('Impossible de charger les données des caisses');
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  // Changement de tab
  const setTab = (tab) => {
    setSearchParams({ tab });
    setSearchQuery('');
  };

  // Paiement
  const handlePayment = async () => {
    if (!selectedItem || !paymentMethod) return;
    
    setProcessingPayment(true);
    try {
      let response;
      
      // Utiliser payInvoice pour tous les types - c'est la méthode existante
      const amount = selectedItem.totalAmount || selectedItem.amount || selectedItem.montant || 0;
      response = await financeApi.payInvoice(selectedItem.id, {
        amountPaid: amount,
        paymentMethod: paymentMethod,
      });

      if (response?.data?.success) {
        toast.success('Paiement effectué avec succès !');
        setSelectedItem(null);
        loadAllData(); // Recharger
      } else {
        throw new Error(response?.data?.message || 'Erreur de paiement');
      }
    } catch (err) {
      console.error('Erreur paiement:', err);
      toast.error(err.message || 'Erreur lors du paiement');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Filtrer les données selon la recherche
  const getFilteredData = () => {
    const query = searchQuery.toLowerCase();
    
    switch (activeTab) {
      case 'admissions':
        return admissions.filter(a => 
          (a.patientName || a.patient?.name || '').toLowerCase().includes(query) ||
          (a.patientCode || a.code || '').toLowerCase().includes(query) ||
          (a.service || a.department || '').toLowerCase().includes(query)
        );
      case 'laboratoire':
        return labTests.filter(t => 
          (t.patientName || t.patient?.name || '').toLowerCase().includes(query) ||
          (t.testName || t.examName || '').toLowerCase().includes(query) ||
          (t.patientCode || '').toLowerCase().includes(query)
        );
      case 'pharmacie':
        return pharmaInvoices.filter(i => 
          (i.patientName || i.patient?.name || '').toLowerCase().includes(query) ||
          (i.prescriptionCode || i.code || '').toLowerCase().includes(query)
        );
      default:
        return [];
    }
  };

  const filteredData = getFilteredData();
  const pendingCount = filteredData.filter(item => 
    ['WAITING_PAYMENT', 'PENDING', 'EN_ATTENTE'].includes(item.paymentStatus || item.status)
  ).length;

  // Rendu des statistiques
  const StatCard = ({ icon: Icon, title, count, total, currency, color, active, onClick }) => (
    <Card 
      className={cn(
        'cursor-pointer transition-all duration-300 hover:shadow-lg',
        active 
          ? 'ring-2 ring-offset-2 ring-offset-background ring-' + color.split('-')[1] + '-500 shadow-lg' 
          : 'hover:scale-[1.02]',
        'bg-card'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className={cn('p-3 rounded-xl', color.replace('text-', 'bg-') + '/10')}>
            <Icon className={cn('w-6 h-6 sm:w-8 sm:h-8', color)} />
          </div>
          {active && (
            <Badge variant="outline" className="bg-primary/10 text-primary">
              Actif
            </Badge>
          )}
        </div>
        <div className="mt-4">
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <h3 className="text-2xl sm:text-3xl font-bold mt-1">
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              count
            )}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <span className={cn('font-semibold', color)}>
                {formatCurrency(total, currency)}
              </span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  // Rendu d'une ligne d'admission
  const AdmissionRow = ({ admission }) => {
    const status = STATUS_CONFIG[admission.paymentStatus || admission.status] || STATUS_CONFIG.PENDING;
    const StatusIcon = status.icon;
    
    return (
      <div className="group flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-all">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={cn('w-12 h-12 rounded-full flex items-center justify-center shrink-0', status.bg)}>
            <UserCheck className={cn('w-6 h-6', status.text)} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold truncate">
              {admission.patientName || admission.patient?.name || 'Patient'}
            </h4>
            <p className="text-sm text-muted-foreground">
              {admission.patientCode || admission.code || 'N/A'} • {admission.service || admission.department || 'Admission'}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className={cn(status.bg, status.text)}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Calendar className="w-3 h-3 mr-1" />
                {formatDate(admission.createdAt || admission.date)}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-4">
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(admission.totalAmount || admission.amount, admission.currency)}
            </p>
            <p className="text-xs text-muted-foreground">{admission.currency}</p>
          </div>
          {['WAITING_PAYMENT', 'PENDING', 'EN_ATTENTE'].includes(admission.paymentStatus || admission.status) && (
            <Button 
              onClick={() => setSelectedItem(admission)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Encaisser
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Rendu d'une ligne labo
  const LabRow = ({ test }) => {
    const status = STATUS_CONFIG[test.status] || STATUS_CONFIG.PENDING;
    const StatusIcon = status.icon;
    
    return (
      <div className="group flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-all">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={cn('w-12 h-12 rounded-full flex items-center justify-center shrink-0', status.bg)}>
            <FlaskConical className={cn('w-6 h-6', status.text)} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold truncate">
              {test.patientName || test.patient?.name || 'Patient'}
            </h4>
            <p className="text-sm text-muted-foreground">
              {test.testName || test.examName || 'Examen laboratoire'} • {test.patientCode || 'N/A'}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className={cn(status.bg, status.text)}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-4">
          <div className="text-right">
            <p className="text-2xl font-bold text-accent">
              {formatCurrency(test.price || test.total, test.currency)}
            </p>
            <p className="text-xs text-muted-foreground">{test.currency}</p>
          </div>
          {(test.status === 'EN_ATTENTE' || !test.paid) && (
            <Button 
              onClick={() => setSelectedItem(test)}
              className="bg-accent hover:bg-accent/90 text-white shrink-0"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Payer
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Rendu d'une ligne pharmacie
  const PharmaRow = ({ invoice }) => {
    const status = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.PENDING;
    const StatusIcon = status.icon;
    
    return (
      <div className="group flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-all">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={cn('w-12 h-12 rounded-full flex items-center justify-center shrink-0', status.bg)}>
            <Pill className={cn('w-6 h-6', status.text)} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold truncate">
              {invoice.patientName || invoice.patient?.name || 'Patient'}
            </h4>
            <p className="text-sm text-muted-foreground">
              Ordonnance {invoice.prescriptionCode || invoice.code || 'N/A'} • {invoice.medicationCount || 1} médicament(s)
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className={cn(status.bg, status.text)}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-4">
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(invoice.totalAmount || invoice.total, invoice.currency)}
            </p>
            <p className="text-xs text-muted-foreground">{invoice.currency}</p>
          </div>
          {invoice.status === 'EN_ATTENTE' && (
            <Button 
              onClick={() => setSelectedItem(invoice)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Encaisser
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Modal de paiement
  const PaymentModal = () => {
    if (!selectedItem) return null;
    
    const amount = selectedItem.totalAmount || selectedItem.amount || selectedItem.price || selectedItem.total || 0;
    const currency = selectedItem.currency || 'USD';
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Wallet className="w-6 h-6 text-primary" />
                Encaissement
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedItem(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Montant */}
            <div className="text-center p-6 bg-primary/5 rounded-xl">
              <p className="text-muted-foreground text-sm mb-2">Montant à payer</p>
              <p className="text-4xl font-bold text-primary">
                {formatCurrency(amount, currency)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{currency}</p>
            </div>
            
            {/* Méthodes de paiement */}
            <div>
              <label className="block text-sm font-medium mb-3">Méthode de paiement</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.value}
                      onClick={() => setPaymentMethod(method.value)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                        paymentMethod === method.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50 hover:bg-accent/50'
                      )}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="text-xs font-medium text-center">{method.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-border flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setSelectedItem(null)}
            >
              Annuler
            </Button>
            <Button 
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handlePayment}
              disabled={processingPayment}
            >
              {processingPayment ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmer le paiement
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Wallet className="w-7 h-7 text-primary" />
                </div>
                Gestion des Caisses
              </h1>
              <p className="text-muted-foreground mt-1 ml-14">
                Admissions • Laboratoire • Pharmacie
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={loadAllData}
                disabled={loading}
              >
                <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Cartes de statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <StatCard
            icon={UserCheck}
            title="Caisse Admissions"
            count={stats.admissions.count}
            total={stats.admissions.total}
            currency={stats.admissions.currency}
            color="text-primary"
            active={activeTab === 'admissions'}
            onClick={() => setTab('admissions')}
          />
          <StatCard
            icon={Microscope}
            title="Caisse Laboratoire"
            count={stats.laboratoire.count}
            total={stats.laboratoire.total}
            currency={stats.laboratoire.currency}
            color="text-accent"
            active={activeTab === 'laboratoire'}
            onClick={() => setTab('laboratoire')}
          />
          <StatCard
            icon={Pill}
            title="Caisse Pharmacie"
            count={stats.pharmacie.count}
            total={stats.pharmacie.total}
            currency={stats.pharmacie.currency}
            color="text-secondary"
            active={activeTab === 'pharmacie'}
            onClick={() => setTab('pharmacie')}
          />
        </div>

        {/* Barre d'outils */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl">
            <button
              onClick={() => setTab('admissions')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === 'admissions'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Admissions</span>
              {stats.admissions.count > 0 && (
                <Badge variant="secondary" className="ml-1 bg-white/20">
                  {stats.admissions.count}
                </Badge>
              )}
            </button>
            <button
              onClick={() => setTab('laboratoire')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === 'laboratoire'
                  ? 'bg-accent text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Microscope className="w-4 h-4" />
              <span className="hidden sm:inline">Laboratoire</span>
              {stats.laboratoire.count > 0 && (
                <Badge variant="secondary" className="ml-1 bg-white/20">
                  {stats.laboratoire.count}
                </Badge>
              )}
            </button>
            <button
              onClick={() => setTab('pharmacie')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === 'pharmacie'
                  ? 'bg-secondary text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Pill className="w-4 h-4" />
              <span className="hidden sm:inline">Pharmacie</span>
              {stats.pharmacie.count > 0 && (
                <Badge variant="secondary" className="ml-1 bg-white/20">
                  {stats.pharmacie.count}
                </Badge>
              )}
            </button>
          </div>

          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full sm:w-72"
            />
          </div>
        </div>

        {/* Contenu principal */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {activeTab === 'admissions' && <UserCheck className="w-5 h-5 text-primary" />}
              {activeTab === 'laboratoire' && <Microscope className="w-5 h-5 text-accent" />}
              {activeTab === 'pharmacie' && <Pill className="w-5 h-5 text-secondary" />}
              <h2 className="font-semibold">
                {activeTab === 'admissions' && 'Paiements Admissions'}
                {activeTab === 'laboratoire' && 'Paiements Laboratoire'}
                {activeTab === 'pharmacie' && 'Paiements Pharmacie'}
              </h2>
              {pendingCount > 0 && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  {pendingCount} en attente
                </Badge>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <p className="text-muted-foreground">{error}</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={loadAllData}
                >
                  Réessayer
                </Button>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Aucun paiement en attente</h3>
                <p className="text-muted-foreground mt-1">
                  Tous les paiements {activeTab} sont à jour pour cette date.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredData.map((item) => {
                  if (activeTab === 'admissions') return <AdmissionRow key={item.id} admission={item} />;
                  if (activeTab === 'laboratoire') return <LabRow key={item.id} test={item} />;
                  if (activeTab === 'pharmacie') return <PharmaRow key={item.id} invoice={item} />;
                  return null;
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Modal de paiement */}
      {selectedItem && <PaymentModal />}
    </div>
  );
};

export default CaissesUnifiees;
