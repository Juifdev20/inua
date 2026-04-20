import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import financeApi from '../../services/financeApi/financeApi.js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Receipt,
  Search,
  Loader2,
  RefreshCw,
  Users,
  Clock,
  CheckCircle2,
  DollarSign,
  Send,
  CreditCard,
  Banknote,
  Smartphone,
  User,
  Stethoscope,
  X,
  ChevronRight,
  Shield,
  AlertTriangle,
  Wallet,
  Activity,
  FileText,
  Timer,
  TrendingUp,
  Trash2,
  Archive,
  RotateCcw,
  Inbox,
  Filter,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

// ═══════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════
const PAYMENT_METHODS = [
  { value: 'ESPECES', label: 'Espèces', icon: Banknote, color: '#10B981' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money', icon: Smartphone, color: '#3B82F6' },
  { value: 'CARTE_BANCAIRE', label: 'Carte', icon: CreditCard, color: '#8B5CF6' },
  { value: 'VIREMENT', label: 'Virement', icon: DollarSign, color: '#F59E0B' },
  { value: 'CHEQUE', label: 'Chèque', icon: FileText, color: '#6B7280' },
  { value: 'ASSURANCE', label: 'Assurance', icon: Shield, color: '#14B8A6' },
];

const STATUS_CONFIG = {
  ARRIVED: { label: 'À payer', color: '#F59E0B', bg: 'bg-amber-500', text: 'text-amber-600', icon: Clock, gradient: 'from-amber-500 to-amber-600' },
  PENDING: { label: 'En attente', color: '#F59E0B', bg: 'bg-amber-500', text: 'text-amber-600', icon: Clock, gradient: 'from-amber-500 to-amber-600' },
  EN_ATTENTE: { label: 'En attente', color: '#F59E0B', bg: 'bg-amber-500', text: 'text-amber-600', icon: Clock, gradient: 'from-amber-500 to-amber-600' },
  WAITING_PAYMENT: { label: 'À payer', color: '#F59E0B', bg: 'bg-amber-500', text: 'text-amber-600', icon: Clock, gradient: 'from-amber-500 to-amber-600' },
  PAID: { label: 'Payé', color: '#10B981', bg: 'bg-emerald-500', text: 'text-emerald-600', icon: CheckCircle2, gradient: 'from-emerald-500 to-emerald-600' },
  PAYEE: { label: 'Payé', color: '#10B981', bg: 'bg-emerald-500', text: 'text-emerald-600', icon: CheckCircle2, gradient: 'from-emerald-500 to-emerald-600' },
  EN_COURS: { label: 'Consultation', color: '#3B82F6', bg: 'bg-blue-500', text: 'text-blue-600', icon: Stethoscope, gradient: 'from-blue-500 to-blue-600' },
  WITH_DOCTOR: { label: 'Consultation', color: '#3B82F6', bg: 'bg-blue-500', text: 'text-blue-600', icon: Stethoscope, gradient: 'from-blue-500 to-blue-600' },
  SENT_TO_DOCTOR: { label: 'Consultation', color: '#3B82F6', bg: 'bg-blue-500', text: 'text-blue-600', icon: Stethoscope, gradient: 'from-blue-500 to-blue-600' },
  TERMINE: { label: 'Terminé', color: '#10B981', bg: 'bg-emerald-500', text: 'text-emerald-600', icon: CheckCircle2, gradient: 'from-emerald-500 to-emerald-600' },
  COMPLETED: { label: 'Terminé', color: '#10B981', bg: 'bg-emerald-500', text: 'text-emerald-600', icon: CheckCircle2, gradient: 'from-emerald-500 to-emerald-600' },
};

const FILTERS = [
  { value: 'ALL', label: 'Tous' },
  { value: 'TO_PAY', label: 'À payer' },
  { value: 'PAID', label: 'Payés' },
];

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount || 0);

// ═══════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════
const CaisseAdmissions = () => {
  const { t } = useTranslation();

  const [admissions, setAdmissions] = useState([]);
  const [archivedAdmissions, setArchivedAdmissions] = useState([]);
  const [showTrash, setShowTrash] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, paid: 0, pendingAmount: 0, paidAmount: 0 });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('ESPECES');
  const [amountReceived, setAmountReceived] = useState('');

  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [admissionToArchive, setAdmissionToArchive] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [admissionToDelete, setAdmissionToDelete] = useState(null);

  const [selectedItems, setSelectedItems] = useState([]);
  const [showBulkArchiveConfirm, setShowBulkArchiveConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const intervalRef = useRef(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    loadArchivedAdmissions();
  }, []);

  useEffect(() => {
    loadAdmissions();
    loadAvailableDoctors();
    intervalRef.current = setInterval(() => {
      loadAdmissions();
    }, 15000);

    const doctorsInterval = setInterval(loadAvailableDoctors, 30000);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(doctorsInterval);
    };
  }, []);

  // Recharger les admissions quand la date change
  useEffect(() => {
    loadAdmissions();
  }, [selectedDate]);

  const loadArchivedAdmissions = () => {
    const saved = localStorage.getItem('archivedAdmissions');
    if (saved) {
      try {
        setArchivedAdmissions(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading archived admissions:', e);
      }
    }
  };

  const saveArchivedAdmissions = (list) => {
    localStorage.setItem('archivedAdmissions', JSON.stringify(list));
    setArchivedAdmissions(list);
  };

  const handleArchive = async (admission) => {
    try {
      console.log('🗃️ [DEBUG] Archivage de l\'admission:', admission.id, admission.patientName);
      setProcessing(true);
      
      // Appeler l'API backend pour archiver
      await financeApi.archiveAdmission(admission.id);
      
      console.log('✅ [DEBUG] Archive réussie, mise à jour de l\'état local');
      
      // Mettre à jour l'état local en retirant l'admission archivée
      setAdmissions(prev => {
        console.log('📋 [DEBUG] Admissions avant archivage:', prev.map(a => a.id));
        const newList = prev.filter(a => a.id !== admission.id);
        console.log('📋 [DEBUG] Admissions après archivage:', newList.map(a => a.id));
        return newList;
      });
      
      toast.success(`${admission.patientName || 'Admission'} archivée`);
      setShowArchiveConfirm(false);
      setAdmissionToArchive(null);
      
      if (selectedAdmission?.id === admission.id) {
        setSelectedAdmission(null);
      }
    } catch (error) {
      console.error('❌ [DEBUG] Erreur archivage:', error);
      toast.error(error?.response?.data?.error || 'Erreur lors de l\'archivage');
    } finally {
      setProcessing(false);
    }
  };

  const handleRestore = async (admission) => {
    try {
      setProcessing(true);
      
      // Appeler l'API backend pour restaurer (non implémenté pour l'instant)
      // await financeApi.restoreAdmission(admission.id);
      
      // Pour l'instant, on retire simplement de la corbeille locale
      const newArchived = archivedAdmissions.filter(a => a.id !== admission.id);
      saveArchivedAdmissions(newArchived);
      setAdmissions(prev => [admission, ...prev]);
      
      toast.success(`${admission.patientName || 'Admission'} restaurée`);
    } catch (error) {
      console.error('Erreur restauration:', error);
      toast.error('Erreur lors de la restauration');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeletePermanent = (admission) => {
    const newArchived = archivedAdmissions.filter(a => a.id !== admission.id);
    saveArchivedAdmissions(newArchived);
    toast.success(`${admission.patientName || 'Admission'} supprimée définitivement`);
    setShowDeleteConfirm(false);
    setAdmissionToDelete(null);
  };

  // ═══════════════════════════════════════
  // SÉLECTION MULTIPLE
  // ═══════════════════════════════════════
  const toggleSelection = (admissionId) => {
    setSelectedItems(prev =>
      prev.includes(admissionId)
        ? prev.filter(id => id !== admissionId)
        : [...prev, admissionId]
    );
  };

  const clearSelection = () => setSelectedItems([]);

  const loadAdmissions = async () => {
    try {
      console.log('🔄 [DEBUG] Chargement des admissions...');
      const params = { date: selectedDate };
      const response = await financeApi.getAdmissionsQueue(params);
      // Le backend retourne { success: true, data: [...], count: X }
      const arr = response?.data || response?.content || response || [];
      const list = Array.isArray(arr) ? arr : [];
      
      console.log('📋 [DEBUG] Données reçues du backend:', list.length, 'admissions');
      console.log('📋 [DEBUG] IDs reçus:', list.map(a => a.id));
      console.log('📅 [DEBUG] Date filtrée:', selectedDate);
      
      // Le backend filtre déjà les archivés, plus besoin de filtrer localement
      setAdmissions(list);

      const pending = list.filter(a => !isPaidStatus(a.status));
      const paid = list.filter(a => isPaidStatus(a.status));

      console.log('📊 [DEBUG] Stats calculées - Total:', list.length, 'Pending:', pending.length, 'Paid:', paid.length);

      setStats({
        total: list.length,
        pending: pending.length,
        paid: paid.length,
        pendingAmount: pending.reduce((s, a) => s + (a.totalAmount || a.amount || 0), 0),
        paidAmount: paid.reduce((s, a) => s + (a.totalAmount || a.amount || 0), 0),
      });

      if (selectedAdmission) {
        const updated = list.find(a => a.id === selectedAdmission.id);
        if (updated) setSelectedAdmission(updated);
      }
    } catch (error) {
      console.error('❌ [DEBUG] Erreur loadAdmissions:', error);
      if (admissions.length === 0) {
        toast.error('Erreur de chargement des admissions');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableDoctors = async () => {
    try {
      setLoadingDoctors(true);
      const data = await financeApi.getAvailableDoctors();
      const rawList = Array.isArray(data) ? data : (data?.content || data?.data || []);

      const normalizedDoctors = rawList.map(doc => ({
        id: doc.id,
        prenom: doc.prenom || doc.firstName || '',
        nom: doc.nom || doc.lastName || '',
        fullName: doc.fullName || doc.displayName || `${doc.firstName || doc.prenom || ''} ${doc.lastName || doc.nom || ''}`.trim(),
        specialite: doc.specialite || doc.specialty || doc.speciality || 'Médecin généraliste',
        online: doc.online ?? doc.isConnected ?? doc.isOnline ?? false,
        isConnected: doc.isConnected ?? doc.online ?? doc.isOnline ?? false,
        isOnDuty: doc.isOnDuty ?? doc.onDuty ?? true,
      }));

      setAvailableDoctors(normalizedDoctors);
    } catch (error) {
      console.error('Error loading doctors:', error);
      setAvailableDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const isPaidStatus = (status) =>
    ['PAID', 'PAYEE', 'SENT_TO_DOCTOR', 'WITH_DOCTOR', 'EN_COURS'].includes(status);

  const isNeedPayment = (status) =>
    ['ARRIVED', 'PENDING', 'EN_ATTENTE', 'WAITING_PAYMENT'].includes(status) || !status;

  const currentList = showTrash ? archivedAdmissions : admissions;

  const filteredAdmissions = currentList
    .filter(a => {
      if (showTrash) return true; // Dans la corbeille, on montre tout
      if (activeFilter === 'TO_PAY') return isNeedPayment(a.status);
      if (activeFilter === 'PAID') return isPaidStatus(a.status);
      return true;
    })
    .filter(a => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (a.patientName || '').toLowerCase().includes(q) ||
        (a.patientId || '').toString().includes(q) ||
        (a.consultationType || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (showTrash) {
        return new Date(b.archivedAt || b.createdAt || 0) - new Date(a.archivedAt || a.createdAt || 0);
      }
      const aIsPaid = isPaidStatus(a.status);
      const bIsPaid = isPaidStatus(b.status);
      if (aIsPaid !== bIsPaid) return aIsPaid ? 1 : -1;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

  // ═══════════════════════════════════════
  // FONCTIONS DE SÉLECTION (après filteredAdmissions)
  // ═══════════════════════════════════════
  const toggleSelectAll = () => {
    const allIds = filteredAdmissions.map(a => a.id);
    const allSelected = allIds.every(id => selectedItems.includes(id));
    if (allSelected) {
      setSelectedItems(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedItems(prev => [...new Set([...prev, ...allIds])]);
    }
  };

  const isItemSelected = (admissionId) => selectedItems.includes(admissionId);
  const isAllSelected = filteredAdmissions.length > 0 && filteredAdmissions.every(a => selectedItems.includes(a.id));
  const hasSelection = selectedItems.length > 0;

  const handleBulkArchive = () => {
    const itemsToArchive = filteredAdmissions.filter(a => selectedItems.includes(a.id));
    const archivedWithDate = itemsToArchive.map(a => ({ ...a, archivedAt: new Date().toISOString() }));
    const newArchived = [...archivedWithDate, ...archivedAdmissions];
    saveArchivedAdmissions(newArchived);
    setAdmissions(prev => prev.filter(a => !selectedItems.includes(a.id)));
    toast.success(`${itemsToArchive.length} admission(s) archivée(s)`);
    setShowBulkArchiveConfirm(false);
    clearSelection();
  };

  const handleBulkDelete = () => {
    const newArchived = archivedAdmissions.filter(a => !selectedItems.includes(a.id));
    saveArchivedAdmissions(newArchived);
    toast.success(`${selectedItems.length} admission(s) supprimée(s) définitivement`);
    setShowBulkDeleteConfirm(false);
    clearSelection();
  };

  const handleBulkRestore = () => {
    const itemsToRestore = archivedAdmissions.filter(a => selectedItems.includes(a.id));
    const newArchived = archivedAdmissions.filter(a => !selectedItems.includes(a.id));
    saveArchivedAdmissions(newArchived);
    setAdmissions(prev => [...itemsToRestore, ...prev]);
    toast.success(`${itemsToRestore.length} admission(s) restaurée(s)`);
    clearSelection();
  };

  const openPaymentModal = () => {
    if (!selectedAdmission) return;
    setAmountReceived('');
    setPaymentMethod('ESPECES');
    setShowPaymentModal(true);
  };

  const getRequiredAmount = () =>
    selectedAdmission?.totalAmount || selectedAdmission?.amount || 0;

  const isExactAmount = () => {
    const received = parseFloat(amountReceived) || 0;
    return received === getRequiredAmount();
  };

  const handlePayment = async () => {
    if (!selectedAdmission) return;

    const totalAmount = getRequiredAmount();
    const received = parseFloat(amountReceived) || 0;

    if (received !== totalAmount) {
      toast.error(
        `Le montant doit être exactement ${formatCurrency(totalAmount)}. Vous avez saisi ${formatCurrency(received)}.`
      );
      return;
    }

    try {
      setProcessing(true);
      const invoiceId = selectedAdmission.invoiceId || selectedAdmission.id;

      await financeApi.payInvoice(invoiceId, {
        paymentMethod,
        amountPaid: received,
      });

      toast.success('Paiement enregistré avec succès !');
      setShowPaymentModal(false);
      setAmountReceived('');

      setStats(prev => ({
        ...prev,
        paid: prev.paid + 1,
        paidAmount: prev.paidAmount + totalAmount,
        pending: prev.pending - 1,
        pendingAmount: prev.pendingAmount - totalAmount
      }));

      setSelectedAdmission(prev => ({ ...prev, status: 'PAYEE' }));
      setAdmissions(prev => prev.map(patient =>
        patient.id === selectedAdmission.id ? { ...patient, status: 'PAYEE' } : patient
      ));
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error?.message || 'Erreur lors du paiement');
    } finally {
      setProcessing(false);
    }
  };

  const handleSendToDoctor = async () => {
    if (!selectedAdmission || !selectedDoctor) return;

    try {
      setProcessing(true);
      await financeApi.sendToDoctor(selectedAdmission.id, { doctorId: selectedDoctor.id });

      const doctorDisplayName = selectedDoctor.fullName
        || `${selectedDoctor.prenom || ''} ${selectedDoctor.nom || ''}`.trim()
        || 'Médecin';

      toast.success(`${selectedAdmission.patientName || 'Patient'} envoyé(e) chez Dr ${doctorDisplayName}`);

      setSelectedAdmission(prev => ({ ...prev, status: 'EN_COURS', doctor: selectedDoctor }));
      setAdmissions(prev => prev.map(patient =>
        patient.id === selectedAdmission.id ? { ...patient, status: 'EN_COURS', doctor: selectedDoctor } : patient
      ));

      setStats(prev => ({
        ...prev,
        pending: prev.pending - 1,
        pendingAmount: prev.pendingAmount - (selectedAdmission.totalAmount || 0)
      }));

      setSelectedDoctor(null);
    } catch (error) {
      console.error('Send to doctor error:', error);
      const errorMessage = error.response?.data?.error || error.message || "Erreur inconnue";
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;

  const canSendToDoctor =
    selectedAdmission &&
    selectedAdmission.status === 'PAYEE' &&
    selectedDoctor !== null;

  const isAlreadyWithDoctor = (status) =>
    ['SENT_TO_DOCTOR', 'WITH_DOCTOR', 'EN_COURS'].includes(status);

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3"><Skeleton className="h-[500px] rounded-2xl" /></div>
          <div className="lg:col-span-2"><Skeleton className="h-[500px] rounded-2xl" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ══════ HEADER ══════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Wallet className="w-7 h-7 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              {showTrash ? 'Corbeille' : 'Caisse Admissions'}
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              {showTrash 
                ? `${archivedAdmissions.length} admission(s) archivée(s)`
                : format(new Date(), "EEEE dd MMMM — HH:mm", { locale: fr })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showTrash ? (
            <Button
              onClick={() => setShowTrash(false)}
              variant="outline"
              size="sm"
              className="rounded-xl font-bold border-2 gap-1.5"
            >
              <Inbox className="w-4 h-4" />
              Retour aux admissions
            </Button>
          ) : (
            <>
              <Button
                onClick={() => setShowTrash(true)}
                variant="outline"
                size="sm"
                className={cn(
                  "rounded-xl font-bold border-2 gap-1.5",
                  archivedAdmissions.length > 0 && "border-amber-500/50 text-amber-600"
                )}
              >
                <Archive className="w-4 h-4" />
                Corbeille
                {archivedAdmissions.length > 0 && (
                  <span className="ml-1 bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    {archivedAdmissions.length}
                  </span>
                )}
              </Button>
              <Button
                onClick={() => { loadAdmissions(); loadAvailableDoctors(); }}
                variant="outline"
                size="sm"
                className="rounded-xl font-bold border-2 gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Actualiser
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ══════ BANDEAU STATS (caché en mode corbeille) ══════ */}
      {!showTrash && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-500 to-slate-600 p-6 text-white shadow-lg shadow-slate-500/20 group hover:shadow-xl hover:shadow-slate-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users className="w-20 h-20" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-100">Total Patients</p>
              </div>
              <p className="text-4xl font-black">{stats.total}</p>
              <p className="text-xs text-slate-200 mt-2 font-medium opacity-80">
                {stats.total > 0 ? `${stats.pending} en attente • ${stats.paid} payés` : 'Aucune admission'}
              </p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20" />
          </div>

          {/* Card 2: En attente */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-white shadow-lg shadow-amber-500/20 group hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Clock className="w-20 h-20" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-100">En Attente</p>
              </div>
              <p className="text-4xl font-black">{stats.pending}</p>
              <p className="text-lg font-bold mt-1">{formatCurrency(stats.pendingAmount)}</p>
              <p className="text-xs text-amber-100 mt-1 font-medium opacity-80">Montant à encaisser</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20" />
          </div>

          {/* Card 3: Encaissés */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-6 text-white shadow-lg shadow-emerald-500/20 group hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp className="w-20 h-20" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">Revenus</p>
              </div>
              <p className="text-4xl font-black">{stats.paid}</p>
              <p className="text-lg font-bold mt-1">{formatCurrency(stats.paidAmount)}</p>
              <p className="text-xs text-emerald-100 mt-1 font-medium opacity-80">Total encaissé aujourd'hui</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20" />
          </div>
        </div>
      )}

      {/* ══════ SEARCH + FILTRES ══════ */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={showTrash ? "Rechercher dans la corbeille..." : "Rechercher un patient..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl border-muted bg-muted/30 focus:bg-background transition-all text-sm h-11"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-muted p-1 rounded-full transition-colors">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        {!showTrash && (
          <>
            <div className="flex items-center gap-2 bg-muted rounded-xl p-1">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-sm font-medium focus:outline-none cursor-pointer"
              />
              {selectedDate !== format(new Date(), 'yyyy-MM-dd') && (
                <button
                  onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted/50 transition-colors"
                  title="Réinitialiser à aujourd'hui"
                >
                  Aujourd'hui
                </button>
              )}
            </div>
            <div className="flex bg-muted rounded-xl p-1 gap-1">
              {FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setActiveFilter(f.value)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                    activeFilter === f.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ══════ INDICATEUR DE DATE ══════ */}
      {!showTrash && (
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>
              {selectedDate === format(new Date(), 'yyyy-MM-dd') 
                ? "Aujourd'hui" 
                : format(new Date(selectedDate), 'dd MMMM yyyy', { locale: fr })
              }
            </span>
          </div>
          <span className="font-medium">
            {filteredAdmissions.length} admission{filteredAdmissions.length !== 1 ? 's' : ''} trouvée{filteredAdmissions.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* ══════ BARRE D'ACTIONS MASSE ══════ */}
      {hasSelection && (
        <div className="flex items-center justify-between gap-4 p-3 bg-gradient-to-r from-slate-500 to-slate-600 rounded-xl shadow-lg animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-sm">
              {selectedItems.length} sélectionné(s)
            </span>
            <button
              onClick={clearSelection}
              className="text-xs text-white/80 hover:text-white underline font-medium"
            >
              Annuler
            </button>
          </div>
          <div className="flex items-center gap-2">
            {showTrash ? (
              <>
                <Button
                  onClick={handleBulkRestore}
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-bold border-white/30 text-white hover:bg-white/20 hover:text-white bg-transparent h-9 gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restaurer
                </Button>
                <Button
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-bold border-red-300 text-red-100 hover:bg-red-500/20 hover:text-white bg-red-500/30 h-9 gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setShowBulkArchiveConfirm(true)}
                variant="outline"
                size="sm"
                className="rounded-xl font-bold border-amber-300 text-amber-100 hover:bg-amber-500/20 hover:text-white bg-amber-500/30 h-9 gap-1.5"
              >
                <Archive className="w-4 h-4" />
                Archiver
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ══════ LAYOUT PRINCIPAL ══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" style={{ minHeight: '500px' }}>
        {/* ──── LISTE DES PATIENTS ──── */}
        <div className="lg:col-span-3">
          <Card className="border shadow-sm bg-card rounded-2xl overflow-hidden h-full">
            {filteredAdmissions.length === 0 ? (
              <CardContent className="py-20 text-center">
                <div className="inline-flex p-6 rounded-full bg-muted mb-4">
                  {showTrash ? (
                    <Archive className="w-12 h-12 text-muted-foreground/40" />
                  ) : (
                    <Activity className="w-12 h-12 text-muted-foreground/40" />
                  )}
                </div>
                <p className="text-muted-foreground font-medium text-lg">
                  {showTrash 
                    ? 'La corbeille est vide'
                    : searchQuery 
                      ? `Aucun résultat pour "${searchQuery}"`
                      : selectedDate !== format(new Date(), 'yyyy-MM-dd')
                        ? `Aucune admission trouvée pour le ${format(new Date(selectedDate), 'dd MMMM yyyy', { locale: fr })}`
                        : 'Aucune admission en attente'}
                </p>
                {!showTrash && !searchQuery && selectedDate !== format(new Date(), 'yyyy-MM-dd') && (
                  <button
                    onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Voir les admissions d'aujourd'hui
                  </button>
                )}
                <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                  {showTrash
                    ? 'Les admissions archivées apparaîtront ici'
                    : 'Les patients apparaîtront ici après leur enregistrement à la réception'}
                </p>
              </CardContent>
            ) : (
              <div className="divide-y divide-border/40 max-h-[600px] overflow-y-auto">
                {/* ──── HEADER AVEC SELECT ALL ──── */}
                <div className="flex items-center gap-3 px-5 py-3 bg-muted/50 border-b border-border/40">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-muted-foreground/30 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {isAllSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {filteredAdmissions.length} admission(s)
                  </span>
                </div>
                {filteredAdmissions.map((admission) => {
                  const statusConf = getStatusConfig(admission.status);
                  const isItemSelectedLocal = isItemSelected(admission.id);
                  const isRowSelected = selectedAdmission?.id === admission.id;
                  const paid = isPaidStatus(admission.status);

                  return (
                    <div
                      key={`${showTrash ? 'archived-' : ''}${admission.id}`}
                      className={cn(
                        "group flex items-center gap-3 px-5 py-3.5 text-left transition-all duration-200",
                        isRowSelected
                          ? "bg-gradient-to-r from-emerald-500/5 to-transparent border-l-4 border-emerald-500"
                          : "hover:bg-muted/40 border-l-4 border-transparent",
                        isItemSelectedLocal && "bg-slate-100/50"
                      )}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isItemSelectedLocal}
                        onChange={() => toggleSelection(admission.id)}
                        className="w-4 h-4 rounded border-muted-foreground/30 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                      />

                      {/* Avatar */}
                      <button
                        onClick={() => { setSelectedAdmission(admission); setSelectedDoctor(null); }}
                        className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-base shrink-0 shadow-sm transition-transform hover:scale-105",
                          paid
                            ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
                            : "bg-gradient-to-br from-amber-500 to-orange-500"
                        )}
                      >
                        {(admission.patientName || '?').charAt(0).toUpperCase()}
                      </button>

                      {/* Infos */}
                      <button
                        onClick={() => { setSelectedAdmission(admission); setSelectedDoctor(null); }}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-foreground truncate">
                            {admission.patientName || 'Patient'}
                          </p>
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {admission.consultationType || 'Consultation'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {admission.createdAt
                              ? format(new Date(admission.createdAt), 'HH:mm, dd MMM', { locale: fr })
                              : '--:--'}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className={cn("text-xs font-medium", statusConf.text)}>
                            {statusConf.label}
                          </span>
                        </div>
                      </button>

                      {/* Montant */}
                      <button
                        onClick={() => { setSelectedAdmission(admission); setSelectedDoctor(null); }}
                        className="text-right shrink-0"
                      >
                        <p className={cn("text-sm font-black", paid ? "text-emerald-600" : "text-foreground")}>
                          {formatCurrency(admission.totalAmount || admission.amount)}
                        </p>
                      </button>

                      {/* Actions */}
                      {showTrash ? (
                        // Mode Corbeille : Restaurer ou Supprimer définitivement
                        <div className="flex items-center gap-1 shrink-0 opacity-100">
                          <button
                            onClick={() => handleRestore(admission)}
                            className="p-2 rounded-lg hover:bg-emerald-500/10 text-emerald-600 transition-colors"
                            title="Restaurer"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setAdmissionToDelete(admission); setShowDeleteConfirm(true); }}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                            title="Supprimer définitivement"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        // Mode Normal : Archiver (visible au hover)
                        <>
                          <button
                            onClick={() => { setSelectedAdmission(admission); setSelectedDoctor(null); }}
                            className="shrink-0"
                          >
                            <ChevronRight className={cn(
                              "w-5 h-5 transition-all duration-200",
                              isRowSelected ? "text-emerald-500 translate-x-0.5" : "text-muted-foreground/30 group-hover:text-muted-foreground/60"
                            )} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setAdmissionToArchive(admission); setShowArchiveConfirm(true); }}
                            className="p-2 rounded-lg hover:bg-amber-500/10 text-amber-600 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                            title="Archiver (mettre à la corbeille)"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* ──── PANNEAU DÉTAILS ──── */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedAdmission ? (
            <Card className="border shadow-sm bg-card rounded-2xl h-full">
              <CardContent className="py-20 text-center flex flex-col items-center justify-center h-full">
                <div className="inline-flex p-6 rounded-full bg-gradient-to-br from-muted to-muted/50 mb-4 shadow-inner">
                  <Receipt className="w-12 h-12 text-muted-foreground/40" />
                </div>
                <h3 className="font-bold text-foreground mb-2 text-lg">
                  {showTrash ? 'Sélectionnez une admission archivée' : 'Sélectionnez un patient'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-[240px]">
                  {showTrash 
                    ? 'Cliquez sur une admission pour la restaurer ou la supprimer'
                    : 'Cliquez sur un patient pour afficher les détails et procéder au paiement'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* ── CARTE PATIENT ── */}
              <Card className="border shadow-sm bg-card rounded-2xl overflow-hidden">
                <div className="p-6 space-y-5">
                  {/* Header */}
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl shrink-0 shadow-lg",
                      isPaidStatus(selectedAdmission.status)
                        ? "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/25"
                        : "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/25"
                    )}>
                      {(selectedAdmission.patientName || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-black text-foreground truncate">
                        {selectedAdmission.patientName || 'Patient'}
                      </h2>
                      <p className="text-sm text-muted-foreground font-medium mt-0.5">
                        ID: {selectedAdmission.patientId || selectedAdmission.id}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs font-bold">
                          {selectedAdmission.consultationType || 'Consultation'}
                        </Badge>
                        {showTrash && (
                          <Badge variant="secondary" className="text-[10px] font-bold bg-amber-500/10 text-amber-600">
                            Archivée
                          </Badge>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => { setSelectedAdmission(null); setSelectedDoctor(null); }}
                      className="p-2 rounded-xl hover:bg-muted transition-colors"
                    >
                      <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Info Rows */}
                  <div className="space-y-3 bg-muted/30 rounded-xl p-4">
                    <InfoRow
                      icon={Clock}
                      label="Arrivée"
                      value={selectedAdmission.createdAt
                        ? format(new Date(selectedAdmission.createdAt), 'HH:mm — dd MMM yyyy', { locale: fr })
                        : '--'}
                    />
                    <InfoRow
                      icon={Activity}
                      label="Statut"
                      value={getStatusConfig(selectedAdmission.status).label}
                      color={getStatusConfig(selectedAdmission.status).color}
                      isStatus
                    />
                  </div>

                  {/* Facture */}
                  <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-4 space-y-3 border border-border/50">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                        Détails de la facture
                      </p>
                    </div>

                    {(selectedAdmission.items || selectedAdmission.services || []).length > 0 ? (
                      (selectedAdmission.items || selectedAdmission.services).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm py-1">
                          <span className="text-muted-foreground">{item.name || item.serviceName}</span>
                          <span className="font-bold">{formatCurrency(item.amount || item.price)}</span>
                        </div>
                      ))
                    ) : (
                      <>
                        {(selectedAdmission.ficheAmountDue > 0) && (
                          <div className="flex justify-between items-center text-sm py-1">
                            <span className="text-muted-foreground">Frais de dossier</span>
                            <span className="font-bold">{formatCurrency(selectedAdmission.ficheAmountDue)}</span>
                          </div>
                        )}
                        {(selectedAdmission.consulAmountDue > 0) && (
                          <div className="flex justify-between items-center text-sm py-1">
                            <span className="text-muted-foreground">Consultation médicale</span>
                            <span className="font-bold">{formatCurrency(selectedAdmission.consulAmountDue)}</span>
                          </div>
                        )}
                        {(!selectedAdmission.ficheAmountDue && !selectedAdmission.consulAmountDue) && (
                          <div className="flex justify-between items-center text-sm py-1">
                            <span className="text-muted-foreground">Consultation</span>
                            <span className="font-bold">
                              {formatCurrency(selectedAdmission.totalAmount || selectedAdmission.amount)}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    <div className="border-t border-border/60 pt-3 mt-3 flex justify-between items-center">
                      <span className="font-black text-sm">TOTAL À PAYER</span>
                      <span className="font-black text-xl text-emerald-600">
                        {formatCurrency(selectedAdmission.totalAmount || selectedAdmission.amount)}
                      </span>
                    </div>
                  </div>

                  {/* Actions selon le mode */}
                  {showTrash ? (
                    // Mode Corbeille : Actions de restauration/suppression
                    <div className="space-y-3">
                      <Button
                        onClick={() => handleRestore(selectedAdmission)}
                        className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black h-12 text-base gap-2 shadow-lg shadow-emerald-500/25"
                      >
                        <RotateCcw className="w-5 h-5" />
                        Restaurer l'admission
                      </Button>
                      <Button
                        onClick={() => setShowDeleteConfirm(true)}
                        variant="outline"
                        className="w-full rounded-xl border-red-300 text-red-600 hover:bg-red-50 font-bold h-11 gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Supprimer définitivement
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Bouton Paiement (si non payé) */}
                      {!isPaidStatus(selectedAdmission.status) && (
                        <Button
                          onClick={openPaymentModal}
                          disabled={processing}
                          className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black h-14 text-base gap-2 shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30"
                        >
                          {processing ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <DollarSign className="w-5 h-5" />
                          )}
                          Encaisser {formatCurrency(selectedAdmission.totalAmount || selectedAdmission.amount)}
                        </Button>
                      )}

                      {/* Statut consultation */}
                      {isAlreadyWithDoctor(selectedAdmission.status) && (
                        <div className="flex items-center justify-center gap-3 py-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20">
                          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <Stethoscope className="w-5 h-5 text-blue-500" />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-blue-600 text-sm">En consultation</p>
                            <p className="text-xs text-blue-500/80">Patient chez le médecin</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Card>

              {/* ── SÉLECTION MÉDECIN ── */}
              {!showTrash && isPaidStatus(selectedAdmission.status) && !isAlreadyWithDoctor(selectedAdmission.status) && (
                <Card className="border shadow-sm bg-card rounded-2xl overflow-hidden">
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                        <Stethoscope className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-black text-base text-foreground">
                          Assigner un médecin
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Sélectionnez le médecin de garde
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={loadAvailableDoctors}
                        className="rounded-lg w-9 h-9 hover:bg-muted"
                      >
                        <RefreshCw className={cn("w-4 h-4", loadingDoctors && "animate-spin")} />
                      </Button>
                    </div>

                    {loadingDoctors ? (
                      <div className="py-8 flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">Chargement des médecins...</p>
                      </div>
                    ) : availableDoctors.length === 0 ? (
                      <div className="py-6 text-center bg-amber-500/5 rounded-xl border border-amber-500/10">
                        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                        <p className="text-sm font-bold text-amber-600">Aucun médecin disponible</p>
                        <p className="text-xs text-muted-foreground mt-1 px-4">
                          Vérifiez qu'au moins un médecin est enregistré dans le système
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={loadAvailableDoctors}
                          className="mt-4 rounded-xl text-xs font-bold gap-1.5"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Réessayer
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {availableDoctors.map((doctor) => {
                          const isSelected = selectedDoctor?.id === doctor.id;
                          const doctorInitial = (doctor.prenom || doctor.nom || '?').charAt(0).toUpperCase();
                          const doctorName = doctor.fullName || `${doctor.prenom} ${doctor.nom}`.trim();

                          return (
                            <button
                              key={doctor.id}
                              onClick={() => setSelectedDoctor(isSelected ? null : doctor)}
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all border-2",
                                isSelected
                                  ? "border-blue-500 bg-gradient-to-r from-blue-500/10 to-blue-600/5 shadow-md"
                                  : "border-transparent bg-muted/40 hover:bg-muted/60 hover:border-muted"
                              )}
                            >
                              <div className="relative shrink-0">
                                <div className={cn(
                                  "w-11 h-11 rounded-xl flex items-center justify-center font-black text-base shadow-sm",
                                  isSelected
                                    ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                                    : "bg-muted text-foreground"
                                )}>
                                  {doctorInitial}
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-background flex items-center justify-center border-2 border-background">
                                  <div className={cn(
                                    "w-2.5 h-2.5 rounded-full",
                                    doctor.isConnected ? "bg-emerald-500" : "bg-amber-500"
                                  )} />
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-foreground truncate">
                                  Dr {doctorName}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate leading-tight">
                                  {doctor.specialite}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  {doctor.isConnected && (
                                    <span className="text-[10px] font-medium text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                      En ligne
                                    </span>
                                  )}
                                  {doctor.isOnDuty && (
                                    <span className="text-[10px] font-medium text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                      De garde
                                    </span>
                                  )}
                                </div>
                              </div>

                              {isSelected && (
                                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                                  <CheckCircle2 className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <Button
                      onClick={handleSendToDoctor}
                      disabled={!canSendToDoctor || processing}
                      className={cn(
                        "w-full rounded-xl font-black h-14 text-base gap-2 transition-all",
                        canSendToDoctor
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                      )}
                    >
                      {processing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                      {canSendToDoctor
                        ? `Envoyer chez Dr ${selectedDoctor?.fullName || `${selectedDoctor?.prenom || ''} ${selectedDoctor?.nom || ''}`.trim()}`
                        : 'Sélectionnez un médecin'}
                    </Button>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* ══════ MODAL PAIEMENT ══════ */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-white flex items-center gap-2">
                <Wallet className="w-6 h-6" />
                Encaisser le paiement
              </DialogTitle>
              <DialogDescription className="text-emerald-50">
                Enregistrer le paiement pour cette admission
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-5 flex-1 overflow-y-auto">
            <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-xl border border-border/50">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-black text-lg shadow-md">
                {(selectedAdmission?.patientName || '?').charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground truncate">{selectedAdmission?.patientName}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedAdmission?.consultationType || 'Consultation'}
                </p>
              </div>
              <p className="font-black text-emerald-600 text-xl">
                {formatCurrency(getRequiredAmount())}
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Méthode de paiement
              </Label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {PAYMENT_METHODS.map(method => {
                  const Icon = method.icon;
                  const isActive = paymentMethod === method.value;
                  return (
                    <button
                      key={method.value}
                      onClick={() => setPaymentMethod(method.value)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-xs font-bold",
                        isActive
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 shadow-sm"
                          : "border-border/60 text-muted-foreground hover:border-emerald-500/30 hover:bg-muted/30"
                      )}
                    >
                      <Icon className="w-6 h-6" style={{ color: isActive ? method.color : undefined }} />
                      <span className="text-center leading-tight">{method.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Montant reçu (USD)
              </Label>
              <div className="relative max-w-sm mx-auto">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="1"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder={getRequiredAmount().toString()}
                  className={cn(
                    "rounded-xl text-3xl font-black h-18 text-center pl-12 pr-4 transition-all",
                    amountReceived && !isExactAmount()
                      ? "border-red-500 focus-visible:ring-red-500 bg-red-500/5"
                      : amountReceived && isExactAmount()
                        ? "border-emerald-500 focus-visible:ring-emerald-500 bg-emerald-500/5"
                        : "border-border/60"
                  )}
                  autoFocus
                />
              </div>

              {amountReceived && !isExactAmount() && (
                <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-sm font-bold text-red-600">
                    Montant exact requis: {formatCurrency(getRequiredAmount())}
                  </p>
                </div>
              )}

              {amountReceived && isExactAmount() && (
                <div className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <p className="text-sm font-bold text-emerald-600">
                    Montant exact — prêt pour l'encaissement
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border border-border/40">
              <Shield className="w-5 h-5 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground font-medium">
                Transaction sécurisée et traçable dans le système financier
              </p>
            </div>
          </div>

          <DialogFooter className="p-6 pt-0 gap-4 border-t border-border/40 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPaymentModal(false)}
              className="rounded-xl font-bold border-2 h-14 flex-1 text-sm hover:bg-muted/50 transition-all"
            >
              Annuler
            </Button>
            <Button
              onClick={handlePayment}
              disabled={processing || !amountReceived || !isExactAmount()}
              className={cn(
                "rounded-xl font-black gap-2 h-14 flex-1 shadow-lg transition-all text-sm",
                isExactAmount()
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-500/25 hover:shadow-emerald-500/40"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {processing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════ MODAL CONFIRMATION ARCHIVAGE ══════ */}
      <Dialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
        <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
                <Archive className="w-5 h-5" />
                Archiver l'admission
              </DialogTitle>
              <DialogDescription className="text-amber-50">
                Cette admission sera archivée et pourra être restaurée plus tard
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Vous êtes sur le point d'archiver <strong className="text-foreground">{admissionToArchive?.patientName || 'cette admission'}</strong>.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700">
                L'admission sera déplacée vers la corbeille. Vous pourrez la restaurer à tout moment.
              </p>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => { setShowArchiveConfirm(false); setAdmissionToArchive(null); }}
                className="rounded-xl font-bold border-2 h-10 flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={() => admissionToArchive && handleArchive(admissionToArchive)}
                className="rounded-xl font-black h-10 flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              >
                <Archive className="w-4 h-4 mr-2" />
                Archiver
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════ MODAL CONFIRMATION SUPPRESSION ══════ */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Suppression définitive
              </DialogTitle>
              <DialogDescription className="text-red-50">
                Cette admission sera supprimée définitivement et ne pourra pas être récupérée
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Vous êtes sur le point de supprimer définitivement <strong className="text-foreground">{admissionToDelete?.patientName || 'cette admission'}</strong>.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-700 font-medium">
                ⚠️ Cette action est irréversible. L'admission sera supprimée de manière permanente.
              </p>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => { setShowDeleteConfirm(false); setAdmissionToDelete(null); }}
                className="rounded-xl font-bold border-2 h-10 flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={() => admissionToDelete && handleDeletePermanent(admissionToDelete)}
                className="rounded-xl font-black h-10 flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      {/* ══════ MODAL CONFIRMATION ARCHIVAGE EN MASSE ══════ */}
      <Dialog open={showBulkArchiveConfirm} onOpenChange={setShowBulkArchiveConfirm}>
        <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
                <Archive className="w-5 h-5" />
                Archiver les admissions
              </DialogTitle>
              <DialogDescription className="text-amber-50">
                Les admissions sélectionnées seront archivées et pourront être restaurées plus tard
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Vous êtes sur le point d'archiver <strong className="text-foreground">{selectedItems.length} admission(s)</strong>.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700">
                Les admissions seront déplacées vers la corbeille. Vous pourrez les restaurer à tout moment.
              </p>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowBulkArchiveConfirm(false)}
                className="rounded-xl font-bold border-2 h-10 flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleBulkArchive}
                className="rounded-xl font-black h-10 flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              >
                <Archive className="w-4 h-4 mr-2" />
                Archiver ({selectedItems.length})
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════ MODAL CONFIRMATION SUPPRESSION EN MASSE ══════ */}
      <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Suppression définitive
              </DialogTitle>
              <DialogDescription className="text-red-50">
                Les admissions sélectionnées seront supprimées définitivement et ne pourront pas être récupérées
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Vous êtes sur le point de supprimer définitivement <strong className="text-foreground">{selectedItems.length} admission(s)</strong>.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-700 font-medium">
                ⚠️ Cette action est irréversible. Les admissions seront supprimées de manière permanente de l'interface.
              </p>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="rounded-xl font-bold border-2 h-10 flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleBulkDelete}
                className="rounded-xl font-black h-10 flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer ({selectedItems.length})
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const InfoRow = ({ icon: Icon, label, value, color, isStatus }) => (
  <div className="flex items-center gap-3">
    <div className={cn(
      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
      isStatus ? "bg-white shadow-sm" : "bg-muted"
    )}>
      <Icon className="w-4 h-4 text-muted-foreground" style={color ? { color } : {}} />
    </div>
    <div className="flex-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-bold" style={color ? { color } : {}}>{value}</p>
    </div>
  </div>
);

export default CaisseAdmissions;
