import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  CircleDot,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

// ═══════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════
const PAYMENT_METHODS = [
  // ★ CORRIGÉ : Correspond aux ENUMs Java
  { value: 'ESPECES', label: 'Espèces', icon: Banknote, color: '#10B981' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money', icon: Smartphone, color: '#3B82F6' },
  { value: 'CARTE_BANCAIRE', label: 'Carte bancaire', icon: CreditCard, color: '#8B5CF6' },
  { value: 'VIREMENT', label: 'Virement', icon: DollarSign, color: '#F59E0B' },
  { value: 'CHEQUE', label: 'Chèque', icon: DollarSign, color: '#6B7280' },
  { value: 'ASSURANCE', label: 'Assurance', icon: Shield, color: '#14B8A6' },
];

// ★ CORRIGÉ : Mise à jour des statuts pour inclure les valeurs backend (PAYEE, EN_COURS)
const STATUS_CONFIG = {
  ARRIVED: { label: 'À payer', color: '#F59E0B', bg: 'bg-amber-500/10', text: 'text-amber-600', icon: Clock },
  PENDING: { label: 'En attente', color: '#F59E0B', bg: 'bg-amber-500/10', text: 'text-amber-600', icon: Clock },
  EN_ATTENTE: { label: 'En attente', color: '#F59E0B', bg: 'bg-amber-500/10', text: 'text-amber-600', icon: Clock },
  WAITING_PAYMENT: { label: 'À payer', color: '#F59E0B', bg: 'bg-amber-500/10', text: 'text-amber-600', icon: Clock },
  PAID: { label: 'Payé', color: '#10B981', bg: 'bg-emerald-500/10', text: 'text-emerald-600', icon: CheckCircle2 },
  PAYEE: { label: 'Payé', color: '#10B981', bg: 'bg-emerald-500/10', text: 'text-emerald-600', icon: CheckCircle2 },
  EN_COURS: { label: 'Chez le médecin', color: '#3B82F6', bg: 'bg-blue-500/10', text: 'text-blue-600', icon: Stethoscope },
  WITH_DOCTOR: { label: 'Chez le médecin', color: '#3B82F6', bg: 'bg-blue-500/10', text: 'text-blue-600', icon: Stethoscope },
  SENT_TO_DOCTOR: { label: 'Chez le médecin', color: '#3B82F6', bg: 'bg-blue-500/10', text: 'text-blue-600', icon: Stethoscope },
  TERMINE: { label: 'Terminé', color: '#10B981', bg: 'bg-emerald-500/10', text: 'text-emerald-600', icon: CheckCircle2 },
  COMPLETED: { label: 'Terminé', color: '#10B981', bg: 'bg-emerald-500/10', text: 'text-emerald-600', icon: CheckCircle2 },
};

const FILTERS = [
  { value: 'ALL', label: 'Tous' },
  { value: 'TO_PAY', label: 'À payer' },
  { value: 'PAID', label: 'Payés' },
];

const formatCurrency = (amount) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'CDF', // ★ CORRIGÉ : Utiliser CDF au lieu de USD
    minimumFractionDigits: 0,
  }).format(amount || 0);

// ═══════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════
const CaisseAdmissions = () => {
  const { t } = useTranslation();

  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, paid: 0, pendingAmount: 0, paidAmount: 0 });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('ESPECES'); // ★ CORRIGÉ : Initialisé à ESPECES
  const [amountReceived, setAmountReceived] = useState('');

  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  const intervalRef = useRef(null);

  useEffect(() => {
    loadAdmissions();
    loadAvailableDoctors();
    intervalRef.current = setInterval(() => {
      loadAdmissions();
      // ★ Médecins : rafraîchir moins souvent (toutes les 30s, pas 15s)
    }, 15000);

    // ★ Rafraîchir les médecins séparément, moins fréquemment
    const doctorsInterval = setInterval(loadAvailableDoctors, 30000);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(doctorsInterval);
    };
  }, []);

  // ═══════════════════════════════════════
  // CHARGEMENT DES ADMISSIONS
  // ═══════════════════════════════════════
  const loadAdmissions = async () => {
    try {
      const data = await financeApi.getAdmissionsQueue();
      const arr = data?.content || data || [];
      const list = Array.isArray(arr) ? arr : [];
      setAdmissions(list);

      const pending = list.filter(a => !isPaidStatus(a.status));
      const paid = list.filter(a => isPaidStatus(a.status));

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
      console.error('Error loading admissions:', error);
      if (admissions.length === 0) {
        toast.error('Erreur de chargement des admissions');
      }
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════
  // ★ CHARGEMENT DES MÉDECINS — CORRIGÉ
  // ═══════════════════════════════════════
  const loadAvailableDoctors = async () => {
    try {
      setLoadingDoctors(true);

      // ★ financeApi.getAvailableDoctors() utilise maintenant /v1/users/doctors
      const data = await financeApi.getAvailableDoctors();

      // ★ Normaliser : le résultat peut être un tableau direct ou nested
      const rawList = Array.isArray(data) ? data : (data?.content || data?.data || []);

      // ★ Mapper les champs pour compatibilité avec l'affichage
      // Backend /v1/users/doctors renvoie: { id, firstName, lastName, fullName, specialty, ... }
      // Le composant attend: { id, prenom, nom, specialite, online, isConnected, isOnDuty }
      const normalizedDoctors = rawList.map(doc => ({
        id: doc.id,
        // ★ Supporter les deux formats de nommage
        prenom: doc.prenom || doc.firstName || '',
        nom: doc.nom || doc.lastName || '',
        fullName: doc.fullName || doc.displayName || `${doc.firstName || doc.prenom || ''} ${doc.lastName || doc.nom || ''}`.trim(),
        specialite: doc.specialite || doc.specialty || doc.speciality || 'Médecin généraliste',
        online: doc.online ?? doc.isConnected ?? doc.isOnline ?? false,
        isConnected: doc.isConnected ?? doc.online ?? doc.isOnline ?? false,
        isOnDuty: doc.isOnDuty ?? doc.onDuty ?? true, // ★ Par défaut considéré comme de garde
      }));

      setAvailableDoctors(normalizedDoctors);
      console.log(`✅ ${normalizedDoctors.length} médecin(s) chargé(s)`);

    } catch (error) {
      console.error('Error loading doctors:', error);
      // ★ Ne pas spammer le toast — juste logguer
      if (availableDoctors.length === 0) {
        console.warn('⚠️ Impossible de charger les médecins');
      }
      setAvailableDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  // ═══════════════════════════════════════
  // FILTRAGE
  // ═══════════════════════════════════════
  // ★ CORRIGÉ : inclut ARRIVED et les statuts backend réels
  const isPaidStatus = (status) =>
    ['PAID', 'PAYEE', 'SENT_TO_DOCTOR', 'WITH_DOCTOR', 'EN_COURS'].includes(status);

  const isNeedPayment = (status) =>
    ['ARRIVED', 'PENDING', 'EN_ATTENTE', 'WAITING_PAYMENT'].includes(status) || !status;

  const filteredAdmissions = admissions
    .filter(a => {
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
      const aIsPaid = isPaidStatus(a.status);
      const bIsPaid = isPaidStatus(b.status);
      if (aIsPaid !== bIsPaid) return aIsPaid ? 1 : -1;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

  // ═══════════════════════════════════════
  // PAIEMENT
  // ═══════════════════════════════════════
  const openPaymentModal = () => {
    if (!selectedAdmission) return;
    setAmountReceived('');
    setPaymentMethod('ESPECES'); // ★ Initialisé à ESPECES par défaut
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

      // ★ MISE À JOUR IMMÉDIATE DE L'ÉTAT LOCAL POUR LES STATS
      // Cela évite d'attendre le prochain loadAdmissions()
      setStats(prev => ({
        ...prev,
        paid: prev.paid + 1,
        paidAmount: prev.paidAmount + totalAmount,
        pending: prev.pending - 1,
        pendingAmount: prev.pendingAmount - totalAmount
      }));

      // ★ Mise à jour de l'état local pour afficher la section médecin
      setSelectedAdmission(prev => ({
        ...prev,
        status: 'PAYEE'
      }));

      setAdmissions(prev => prev.map(patient => 
        patient.id === selectedAdmission.id 
          ? { ...patient, status: 'PAYEE' } 
          : patient
      ));

      // ★ Ne pas faire de loadAdmissions() ici pour ne pas écraser notre statut "PAYEE"
      // pendant que le serveur finit de l'écrire.

    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error?.message || 'Erreur lors du paiement');
    } finally {
      setProcessing(false);
    }
  };

  // ═══════════════════════════════════════
  // ★ ENVOYER CHEZ LE MÉDECIN — CORRIGÉ
  // ═══════════════════════════════════════
  const handleSendToDoctor = async () => {
    if (!selectedAdmission || !selectedDoctor) return;

    try {
      setProcessing(true);

      await financeApi.sendToDoctor(selectedAdmission.id, {
        doctorId: selectedDoctor.id,
      });

      // ★ Utiliser les champs normalisés
      const doctorDisplayName = selectedDoctor.fullName
        || `${selectedDoctor.prenom || ''} ${selectedDoctor.nom || ''}`.trim()
        || 'Médecin';

      toast.success(
        `${selectedAdmission.patientName || 'Patient'} envoyé(e) chez Dr ${doctorDisplayName}`
      );

      // ★ Mettre à jour l'état local pour afficher "Patient en salle de consultation"
      setSelectedAdmission(prev => ({
        ...prev,
        status: 'EN_COURS',
        doctor: selectedDoctor // ★ Optionnel : stocker le médecin pour l'affichage
      }));

      setAdmissions(prev => prev.map(patient => 
        patient.id === selectedAdmission.id 
          ? { ...patient, status: 'EN_COURS', doctor: selectedDoctor } 
          : patient
      ));

      // ★ Mise à jour des stats : si vous voulez que "En attente" diminue quand on envoie chez le médecin
      setStats(prev => ({
        ...prev,
        pending: prev.pending - 1,
        pendingAmount: prev.pendingAmount - (selectedAdmission.totalAmount || 0)
      }));

      setSelectedDoctor(null);
      // ★ loadAdmissions() n'est plus nécessaire ici car on a mis à jour localement
    } catch (error) {
      console.error('Send to doctor error:', error);
      // ★ Meilleure gestion de l'erreur du backend
      const errorMessage = error.response?.data?.error || error.message || "Erreur inconnue";
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  // ═══════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════
  const getStatusConfig = (status) =>
    STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;

  // ★ CORRIGÉ : canSendToDoctor vérifie que le statut est 'PAYEE' (payé mais pas encore envoyé)
  const canSendToDoctor =
    selectedAdmission &&
    selectedAdmission.status === 'PAYEE' && 
    selectedDoctor !== null;

  // ★ Helper : l'admission est déjà chez le médecin ?
  const isAlreadyWithDoctor = (status) =>
    ['SENT_TO_DOCTOR', 'WITH_DOCTOR', 'EN_COURS'].includes(status);

  // ═══════════════════════════════════════
  // LOADING SKELETON
  // ═══════════════════════════════════════
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
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3"><Skeleton className="h-[500px] rounded-2xl" /></div>
          <div className="lg:col-span-2"><Skeleton className="h-[500px] rounded-2xl" /></div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ══════ HEADER ══════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Receipt className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Caisse Admissions
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              {format(new Date(), "EEEE dd MMMM — HH:mm", { locale: fr })}
            </p>
          </div>
        </div>
        <Button
          onClick={() => { loadAdmissions(); loadAvailableDoctors(); }}
          variant="outline"
          size="sm"
          className="rounded-xl font-bold border-2 gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualiser
        </Button>
      </div>

      {/* ══════ BANDEAU STATS ══════ */}
      <div className="grid grid-cols-3 gap-px rounded-2xl overflow-hidden bg-border shadow-sm">
        <div className="bg-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total</p>
            <p className="text-lg font-black text-foreground">{stats.total}</p>
          </div>
        </div>
        <div className="bg-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">En attente</p>
            <p className="text-lg font-black text-amber-500">
              {stats.pending}
              {stats.pendingAmount > 0 && (
                <span className="text-xs font-bold ml-2 opacity-70">{formatCurrency(stats.pendingAmount)}</span>
              )}
            </p>
          </div>
        </div>
        <div className="bg-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Encaissés</p>
            <p className="text-lg font-black text-emerald-500">
              {stats.paid}
              {stats.paidAmount > 0 && (
                <span className="text-xs font-bold ml-2 opacity-70">{formatCurrency(stats.paidAmount)}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ══════ SEARCH + FILTRES ══════ */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un patient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl border-muted bg-muted/30 focus:bg-background transition-all text-sm h-10"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
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
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════ LAYOUT PRINCIPAL — SPLIT VIEW ══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" style={{ minHeight: '500px' }}>

        {/* ──── LISTE DES PATIENTS ──── */}
        <div className="lg:col-span-3">
          <Card className="border-none shadow-sm bg-card rounded-2xl overflow-hidden h-full">
            {filteredAdmissions.length === 0 ? (
              <CardContent className="py-20 text-center">
                <div className="inline-flex p-5 rounded-full bg-muted mb-4">
                  <Users className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <p className="text-muted-foreground font-medium">
                  {searchQuery
                    ? `Aucun résultat pour "${searchQuery}"`
                    : 'Aucune admission en attente'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Les patients apparaîtront ici après le triage à la réception
                </p>
              </CardContent>
            ) : (
              <div className="divide-y divide-border/30 max-h-[600px] overflow-y-auto">
                {filteredAdmissions.map((admission) => {
                  const statusConf = getStatusConfig(admission.status);
                  const isSelected = selectedAdmission?.id === admission.id;
                  const paid = isPaidStatus(admission.status);

                  return (
                    <button
                      key={admission.id}
                      onClick={() => { setSelectedAdmission(admission); setSelectedDoctor(null); }}
                      className={cn(
                        "w-full flex items-center gap-4 px-5 py-4 text-left transition-all hover:bg-muted/30",
                        isSelected && "bg-emerald-500/5 border-l-4 border-emerald-500"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0",
                        paid ? "bg-emerald-500" : "bg-amber-500"
                      )}>
                        {(admission.patientName || '?').charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">
                          {admission.patientName || 'Patient'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground">
                            {admission.consultationType || 'Consultation'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">•</span>
                          <span className="text-[10px] text-muted-foreground">
                            {admission.createdAt
                              ? format(new Date(admission.createdAt), 'HH:mm', { locale: fr })
                              : '--:--'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className={cn("text-sm font-black", paid ? "text-emerald-500" : "text-foreground")}>
                          {formatCurrency(admission.totalAmount || admission.amount)}
                        </p>
                        <Badge className={cn("border-none text-[10px] font-bold mt-1", statusConf.bg, statusConf.text)}>
                          {statusConf.label}
                        </Badge>
                      </div>

                      <ChevronRight className={cn(
                        "w-4 h-4 shrink-0 transition-colors",
                        isSelected ? "text-emerald-500" : "text-muted-foreground/30"
                      )} />
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* ──── DÉTAILS + SÉLECTION MÉDECIN ──── */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedAdmission ? (
            <Card className="border-none shadow-sm bg-card rounded-2xl h-full">
              <CardContent className="py-20 text-center flex flex-col items-center justify-center h-full">
                <div className="inline-flex p-5 rounded-full bg-muted mb-4">
                  <Receipt className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <h3 className="font-bold text-foreground mb-1">Sélectionnez une admission</h3>
                <p className="text-xs text-muted-foreground max-w-[200px]">
                  Cliquez sur un patient dans la liste pour afficher les détails et procéder au paiement.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* ── CARTE DÉTAILS PATIENT ── */}
              <Card className="border-none shadow-sm bg-card rounded-2xl overflow-hidden">
                <div className="p-6 space-y-5">

                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl",
                      isPaidStatus(selectedAdmission.status) ? "bg-emerald-500" : "bg-amber-500"
                    )}>
                      {(selectedAdmission.patientName || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-black text-foreground">
                        {selectedAdmission.patientName || 'Patient'}
                      </h2>
                      <p className="text-xs text-muted-foreground font-medium">
                        ID: {selectedAdmission.patientId || selectedAdmission.id}
                      </p>
                    </div>
                    <button
                      onClick={() => { setSelectedAdmission(null); setSelectedDoctor(null); }}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <InfoRow icon={Stethoscope} label="Type" value={selectedAdmission.consultationType || 'Consultation'} />
                    <InfoRow
                      icon={Clock}
                      label="Arrivée"
                      value={selectedAdmission.createdAt
                        ? format(new Date(selectedAdmission.createdAt), 'HH:mm — dd MMM yyyy', { locale: fr })
                        : '--'}
                    />
                    <InfoRow
                      icon={User}
                      label="Statut"
                      value={getStatusConfig(selectedAdmission.status).label}
                      color={getStatusConfig(selectedAdmission.status).color}
                    />
                  </div>

                  {/* Facture */}
                  <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Détails de la facture
                    </p>

                    {/* ★ CORRIGÉ : Afficher les montants même sans tableau items */}
                    {(selectedAdmission.items || selectedAdmission.services || []).length > 0 ? (
                      (selectedAdmission.items || selectedAdmission.services).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{item.name || item.serviceName}</span>
                          <span className="font-bold">{formatCurrency(item.amount || item.price)}</span>
                        </div>
                      ))
                    ) : (
                      <>
                        {(selectedAdmission.ficheAmountDue > 0) && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Frais de dossier</span>
                            <span className="font-bold">{formatCurrency(selectedAdmission.ficheAmountDue)}</span>
                          </div>
                        )}
                        {(selectedAdmission.consulAmountDue > 0) && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Consultation</span>
                            <span className="font-bold">{formatCurrency(selectedAdmission.consulAmountDue)}</span>
                          </div>
                        )}
                        {(!selectedAdmission.ficheAmountDue && !selectedAdmission.consulAmountDue) && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Consultation</span>
                            <span className="font-bold">
                              {formatCurrency(selectedAdmission.totalAmount || selectedAdmission.amount)}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    <div className="border-t border-border/50 pt-3 flex justify-between items-center">
                      <span className="font-black text-sm">TOTAL À PAYER</span>
                      <span className="font-black text-lg text-emerald-500">
                        {formatCurrency(selectedAdmission.totalAmount || selectedAdmission.amount)}
                      </span>
                    </div>
                  </div>

                  {/* BOUTON ENCAISSER (si non payé) */}
                  {!isPaidStatus(selectedAdmission.status) && (
                    <Button
                      onClick={openPaymentModal}
                      disabled={processing}
                      className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black h-14 text-base gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      {processing
                        ? <Loader2 className="w-5 h-5 animate-spin" />
                        : <DollarSign className="w-5 h-5" />}
                      Encaisser {formatCurrency(selectedAdmission.totalAmount || selectedAdmission.amount)}
                    </Button>
                  )}

                  {/* ★ Statut déjà envoyé — couvre tous les statuts "chez le médecin" */}
                  {isAlreadyWithDoctor(selectedAdmission.status) && (
                    <div className="flex items-center justify-center gap-2 py-4 rounded-xl bg-blue-500/10">
                      <Stethoscope className="w-5 h-5 text-blue-500" />
                      <span className="font-bold text-blue-600 text-sm">
                        Patient en salle de consultation
                      </span>
                    </div>
                  )}
                </div>
              </Card>

              {/* ═══════════════════════════════════════
                  ★ SÉLECTION DU MÉDECIN — Après paiement
                  ═══════════════════════════════════════ */}
              {isPaidStatus(selectedAdmission.status) && !isAlreadyWithDoctor(selectedAdmission.status) && (
                <Card className="border-none shadow-sm bg-card rounded-2xl overflow-hidden">
                  <div className="p-6 space-y-4">

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Stethoscope className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-foreground">
                          Sélectionner le médecin
                        </h3>
                        <p className="text-[10px] text-muted-foreground font-medium">
                          Médecins disponibles
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={loadAvailableDoctors}
                        className="ml-auto rounded-lg w-8 h-8"
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5", loadingDoctors && "animate-spin")} />
                      </Button>
                    </div>

                    {loadingDoctors ? (
                      <div className="py-8 flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                        <p className="text-xs text-muted-foreground">Chargement des médecins...</p>
                      </div>
                    ) : availableDoctors.length === 0 ? (
                      <div className="py-6 text-center bg-amber-500/5 rounded-xl">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                        <p className="text-sm font-bold text-amber-600">Aucun médecin disponible</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Vérifiez qu'au moins un médecin est enregistré dans le système
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={loadAvailableDoctors}
                          className="mt-3 rounded-xl text-xs font-bold gap-1.5"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Réessayer
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {availableDoctors.map((doctor) => {
                          const isSelected = selectedDoctor?.id === doctor.id;
                          // ★ Utiliser les champs normalisés
                          const doctorInitial = (doctor.prenom || doctor.nom || '?').charAt(0).toUpperCase();
                          const doctorName = doctor.fullName || `${doctor.prenom} ${doctor.nom}`.trim();

                          return (
                            <button
                              key={doctor.id}
                              onClick={() => setSelectedDoctor(isSelected ? null : doctor)}
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all border-2",
                                isSelected
                                  ? "border-blue-500 bg-blue-500/10"
                                  : "border-transparent bg-muted/30 hover:bg-muted/50"
                              )}
                            >
                              <div className="relative shrink-0">
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm",
                                  isSelected ? "bg-blue-500 text-white" : "bg-muted text-foreground"
                                )}>
                                  {doctorInitial}
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-background flex items-center justify-center">
                                  <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    doctor.isConnected ? "bg-emerald-500" : "bg-amber-500"
                                  )} />
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-foreground truncate">
                                  Dr {doctorName}
                                </p>
                                <p className="text-[10px] text-muted-foreground font-medium truncate">
                                  {doctor.specialite}
                                  {doctor.isConnected && (
                                    <span className="ml-1 text-emerald-500">• En ligne</span>
                                  )}
                                  {doctor.isOnDuty && (
                                    <span className="ml-1 text-blue-500">• De garde</span>
                                  )}
                                </p>
                              </div>

                              {isSelected && (
                                <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* BOUTON ENVOYER */}
                    <Button
                      onClick={handleSendToDoctor}
                      disabled={!canSendToDoctor || processing}
                      className={cn(
                        "w-full rounded-xl font-black h-14 text-base gap-2 transition-all",
                        canSendToDoctor
                          ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20"
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

                    {!selectedDoctor && availableDoctors.length > 0 && (
                      <p className="text-[10px] text-center text-muted-foreground">
                        Sélectionnez le médecin de permanence pour activer l'envoi
                      </p>
                    )}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* ══════ MODAL PAIEMENT ══════ */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Encaisser le paiement</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-black">
                {(selectedAdmission?.patientName || '?').charAt(0)}
              </div>
              <div>
                <p className="font-bold text-sm">{selectedAdmission?.patientName}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedAdmission?.consultationType || 'Consultation'}
                </p>
              </div>
              <p className="ml-auto font-black text-emerald-500 text-lg">
                {formatCurrency(getRequiredAmount())}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Méthode de paiement
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(method => {
                  const Icon = method.icon;
                  const isActive = paymentMethod === method.value;
                  return (
                    <button
                      key={method.value}
                      onClick={() => setPaymentMethod(method.value)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-xs font-bold",
                        isActive
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                          : "border-border text-muted-foreground hover:border-muted-foreground"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      {method.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Montant reçu (CDF) — montant exact obligatoire
              </Label>
              <Input
                type="number"
                step="1"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                placeholder={`Saisir exactement ${getRequiredAmount()}`}
                className={cn(
                  "rounded-xl text-lg font-black h-14 text-center transition-colors",
                  amountReceived && !isExactAmount()
                    ? "border-red-500 focus-visible:ring-red-500"
                    : amountReceived && isExactAmount()
                      ? "border-emerald-500 focus-visible:ring-emerald-500"
                      : ""
                )}
                autoFocus
              />

              {amountReceived && !isExactAmount() && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs font-bold text-red-600">
                    Le montant doit être exactement {formatCurrency(getRequiredAmount())}.
                    {parseFloat(amountReceived) > getRequiredAmount()
                      ? ' Montant supérieur non autorisé.'
                      : ' Montant insuffisant.'}
                  </p>
                </div>
              )}

              {amountReceived && isExactAmount() && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <p className="text-xs font-bold text-emerald-600">
                    Montant exact — prêt pour l'encaissement
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-xl">
              <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
              <p className="text-[10px] text-muted-foreground font-medium">
                Pour la traçabilité financière, seul le montant exact est accepté.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPaymentModal(false)}
              className="rounded-xl font-bold border-2"
            >
              Annuler
            </Button>
            <Button
              onClick={handlePayment}
              disabled={processing || !amountReceived || !isExactAmount()}
              className={cn(
                "rounded-xl font-black gap-2 shadow-lg",
                isExactAmount()
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Confirmer le paiement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const InfoRow = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-muted-foreground" />
    </div>
    <div className="flex-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-bold" style={color ? { color } : {}}>{value}</p>
    </div>
  </div>
);

export default CaisseAdmissions;