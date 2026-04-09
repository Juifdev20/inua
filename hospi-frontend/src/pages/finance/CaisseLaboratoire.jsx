import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Microscope, Eye, DollarSign, Lock, Unlock, AlertCircle,
  Search, Loader2, RefreshCw, Users, ArrowUpDown,
  ChevronRight, FlaskConical, TestTubes, ShieldCheck,
  Receipt, Filter, CheckCircle2, Clock, Send, X,
  MinusCircle, PlusCircle, Trash2, Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import financeApi from '../../services/financeApi/financeApi.js';
import api from '../../services/api';
import { addToQueue } from '../../services/api/labTestService';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import PaymentModal from '../../components/modals/PaymentModal.jsx';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const API = `${BACKEND_URL}/api/finance`;

const formatCurrency = (amount) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'CDF', minimumFractionDigits: 0,
  }).format(amount || 0);

const formatTime = (date) => {
  if (!date) return '--:--';
  try { return format(new Date(date), 'HH:mm'); } catch { return '--:--'; }
};

const formatFullDate = (date) => {
  if (!date) return '-';
  try { return format(new Date(date), 'dd MMM yyyy, HH:mm', { locale: fr }); } catch { return '-'; }
};

const STATUS_MAP = {
  'EXAMENS_PRESCRITS': { label: 'À payer', color: 'red', icon: Lock, paid: false },
  'EXAMENS_PAYES': { label: 'Payé - Vers labo', color: 'blue', icon: CheckCircle2, paid: true },
  'AU_LABO': { label: 'Au laboratoire', color: 'violet', icon: FlaskConical, paid: true },
  'TERMINE': { label: 'Terminé', color: 'emerald', icon: ShieldCheck, paid: true },
  'PAID': { label: 'Payé', color: 'emerald', icon: Unlock, paid: true },
  'PAYEE': { label: 'Payé', color: 'emerald', icon: Unlock, paid: true },
  'UNPAID': { label: 'Non payé', color: 'red', icon: Lock, paid: false },
  'EN_ATTENTE': { label: 'À payer', color: 'red', icon: Lock, paid: false },
};

const getStatusConfig = (status) => STATUS_MAP[status] || { label: status, color: 'gray', icon: Clock, paid: false };

const CaisseLaboratoire = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [labTests, setLabTests] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedTest, setSelectedTest] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [adjustedExams, setAdjustedExams] = useState([]);
  const [savingAdjustments, setSavingAdjustments] = useState(false);
  const [sendingToLab, setSendingToLab] = useState(false);

  // ✅ FIX: Store AbortController in ref to prevent race conditions[1]
  const abortControllerRef = useRef(null);

  // ✅ FIX: loadLabTests with AbortController and date filtering
  const loadLabTests = async () => {
    // Cancel any previous request
    if (abortControllerRef.current) {
      console.log('🛑 [CAISSE] Cancelling previous request');
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      setLoading(true);
      console.log('📋 [CAISSE] Loading lab tests... Date:', selectedDate);

      const params = { date: selectedDate };
      const response = await api.get(`${API}/all-lab-payments`, { signal, params });

      // Check if Request was cancelled (expected in Strict Mode) before processing
      if (signal.aborted) {
        console.log('⏭️ [CAISSE] Request was cancelled, skipping response');
        return;
      }

      console.log('📋 Response from /all-lab-payments:', response.data);

      let data = response.data.data || [];

      // ✅ Le backend filtre déjà par date - plus besoin de filtrer ici
      // Le paramètre date est envoyé au backend via params
      console.log('📊 [CAISSE] Total examens reçus du backend:', data.length);

      data.forEach((item, idx) => {
        console.log(`Item ${idx}:`, {
          id: item.id,
          status: item.status,
          examTotalAmount: item.examTotalAmount,
          examAmountPaid: item.examAmountPaid,
          remainingAmount: item.remainingAmount,
          patientId: item.patientId,
          consultationId: item.consultationId
        });
      });

      setLabTests(Array.isArray(data) ? data : []);
    } catch (error) {
      // ✅ FIX: Ignore abort errors (expected behavior)[3]
      if (error.name === 'CanceledError' || error.name === 'AbortError') {
        console.log('ℹ️ [CAISSE] Request was cancelled (expected in Strict Mode)');
        return;
      }

      console.error('❌ [CAISSE] Error loading lab tests:', error);
      toast.error('Erreur chargement examens');
      setLabTests([]);
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  };

  // ✅ Initialize only once on mount
  useEffect(() => {
    loadLabTests();

    // Cleanup: abort request when unmounting
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []); // Empty = runs ONCE on mount

  // ✅ Recharger quand la date change
  useEffect(() => {
    loadLabTests();
  }, [selectedDate]);

  useEffect(() => {
    if (selectedTest) {
      const exams = selectedTest.prescribedExams || selectedTest.services || selectedTest.items || [];
      setAdjustedExams(exams.map(ex => ({
        ...ex,
        id: ex.id || ex.serviceId,
        quantity: ex.quantity || 1,
        active: ex.active !== false,
        unitPrice: ex.unitPrice || ex.price || 0,
        serviceName: ex.serviceName || ex.name || 'Examen',
      })));
    } else {
      setAdjustedExams([]);
    }
  }, [selectedTest]);

  const adjustedTotal = useMemo(() => {
    return adjustedExams.reduce((sum, exam) => {
      if (!exam.active) return sum;
      return sum + (exam.unitPrice * exam.quantity);
    }, 0);
  }, [adjustedExams]);

  const originalTotal = useMemo(() => {
    return adjustedExams.reduce((sum, exam) => sum + exam.unitPrice, 0);
  }, [adjustedExams]);

  const handlePayment = (invoice) => {
    const invoiceToPay = {
      ...invoice,
      totalAmount: adjustedTotal,
      originalAmount: originalTotal,
      adjustedExams: adjustedExams.filter(e => e.active)
    };
    setSelectedInvoice(invoiceToPay);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);
    setSelectedInvoice(null);
    
    // ✅ AUTO-SEND TO LAB after successful payment
    toast.success('Paiement validé. Envoi automatique au laboratoire...');
    
    // Small delay to let the payment state update on backend
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Trigger auto-send to lab
    await handleAutoSendToLab();
  };

  // ✅ AUTO-SEND: Automatically send to lab after payment
  const handleAutoSendToLab = async () => {
    if (!selectedTest) return;

    const consultationId = selectedTest.consultationId || selectedTest.id;
    const patientId = selectedTest.patientId || selectedTest.patient?.id;
    
    if (!consultationId || !patientId) {
      toast.error('ID Consultation ou Patient manquant. Vérifiez les données.');
      return;
    }

    const activeExams = adjustedExams.filter(e => e.active);
    if (activeExams.length === 0) {
      toast.error('Aucun examen actif à envoyer au laboratoire.');
      return;
    }

    try {
      setSendingToLab(true);

      const promises = activeExams.map(async (exam) => {
        const labTestPayload = {
          consultationId,
          patientId,
          patientName: selectedTest.patientName || 'Patient inconnu',
          testType: 'LABORATOIRE',
          testName: exam.serviceName || exam.name || 'Examen de laboratoire',
          testCode: exam.code || exam.serviceCode || `LAB-${Date.now().toString().slice(-6)}`,
          description: exam.doctorNote || selectedTest.note || '',
          priority: exam.priority || 'NORMALE',
          quantity: exam.quantity || 1,
          unitPrice: exam.unitPrice || 0,
          status: 'EN_ATTENTE',
          fromFinance: true
        };

        console.log('📤 [AUTO-SEND] Envoi LabTest:', labTestPayload);
        return addToQueue(labTestPayload);
      });

      const results = await Promise.all(promises);

      // Update consultation status to AU_LABO
      await api.post(`${API}/consultations/${consultationId}/send-to-lab`);

      console.log('✅ [AUTO-SEND] Tests envoyés:', results.length);
      toast.success(`✅ ${results.length} test(s) envoyés au laboratoire automatiquement !`);

      // Notify LabQueue to refresh
      window.dispatchEvent(new CustomEvent('labTestsAdded', { 
        detail: { newTests: results.length, patientId, consultationId } 
      }));

      // Refresh the list
      loadLabTests();

    } catch (error) {
      console.error('❌ [AUTO-SEND] Erreur:', error.response?.data || error);
      toast.error('Paiement réussi mais erreur envoi labo. Cliquez "Envoyer au laboratoire" manuellement.');
    } finally {
      setSendingToLab(false);
    }
  };

  const handleSaveAdjustments = async () => {
    if (!selectedTest) return;
    try {
      setSavingAdjustments(true);
      await api.put(`${API}/consultations/${selectedTest.consultationId || selectedTest.id}/adjust-exams`, {
        exams: adjustedExams.map(ex => ({
          examId: ex.id,
          quantity: ex.quantity,
          active: ex.active,
          cashierNote: ex.cashierNote || ''
        }))
      });
      toast.success('Ajustements sauvegardés');
      loadLabTests();
    } catch (error) {
      console.error('❌ [CAISSE] Erreur sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde des ajustements');
    } finally {
      setSavingAdjustments(false);
    }
  };

  // ✅ FIX: Send to lab with complete payload to ensure visibility in LabQueue
  const handleSendToLab = async () => {
    if (!selectedTest) return;

    const consultationId = selectedTest.consultationId || selectedTest.id;
    const patientId = selectedTest.patientId || selectedTest.patient?.id;
    
    if (!consultationId || !patientId) {
      toast.error('ID Consultation ou Patient manquant. Vérifiez les données.');
      return;
    }

    const activeExams = adjustedExams.filter(e => e.active);
    if (activeExams.length === 0) {
      toast.error('Aucun examen actif à envoyer au laboratoire.');
      return;
    }

    try {
      setSendingToLab(true);

      const promises = activeExams.map(async (exam) => {
        // ✅ CORRECTION : AJOUT DES CHAMPS MANQUANTS POUR QUE LE TEST SOIT VISIBLE DANS LABQUEUE
        const labTestPayload = {
          consultationId,
          patientId,
          patientName: selectedTest.patientName || 'Patient inconnu', // 👈 Ajouté
          testType: 'LABORATOIRE',
          testName: exam.serviceName || exam.name || 'Examen de laboratoire',
          testCode: exam.code || exam.serviceCode || `LAB-${Date.now().toString().slice(-6)}`, // 👈 Ajouté (code unique)
          description: exam.doctorNote || selectedTest.note || '',
          priority: exam.priority || 'NORMALE',
          quantity: exam.quantity || 1,
          unitPrice: exam.unitPrice || 0,
          status: 'EN_ATTENTE', // 👈 Ajouté (CRUCIAL !)
          fromFinance: true // 👈 Ajouté
        };

        console.log('📤 [CAISSE] Envoi LabTest COMPLET:', labTestPayload);

        return addToQueue(labTestPayload);
      });

      const results = await Promise.all(promises);

      await api.post(`${API}/consultations/${consultationId}/send-to-lab`);

      console.log('✅ [CAISSE] Tests sent successfully:', results.length);

      toast.success(`✅ ${results.length} test(s) envoyés au laboratoire !`);

      // ✅ AJOUTEZ CE LOG POUR VÉRIFIER QUE L'ÉVÉNEMENT EST DÉCLENCHE
      console.log('🎯 [CAISSE] Dispatching labTestsAdded event:', { newTests: results.length, patientId, consultationId });
      
      // ✅ FIX: Dispatch event to notify LabQueue to refresh
      window.dispatchEvent(new CustomEvent('labTestsAdded', { 
        detail: { newTests: results.length, patientId, consultationId } 
      }));

      setSelectedTest(null);
      loadLabTests();

    } catch (error) {
      console.error('❌ [CAISSE] Erreur envoi labo:', error.response?.data || error);
      const errorMsg = error.response?.data?.message || error.message || 'Erreur lors de l\'envoi au laboratoire';
      toast.error(errorMsg);
    } finally {
      setSendingToLab(false);
    }
  };

  const handleQuantityChange = (examId, delta) => {
    setAdjustedExams(prev => prev.map(ex => {
      if (ex.id === examId) {
        const newQty = Math.max(1, (ex.quantity || 1) + delta);
        return { ...ex, quantity: newQty };
      }
      return ex;
    }));
  };

  const handleToggleActive = (examId) => {
    setAdjustedExams(prev => prev.map(ex => 
      ex.id === examId ? { ...ex, active: !ex.active } : ex
    ));
  };

  const handleRemoveExam = (examId) => {
    setAdjustedExams(prev => prev.filter(ex => ex.id !== examId));
  };

  const filtered = labTests
    .filter((test) => {
      const match = (test.patientName || '').toLowerCase().includes(searchQuery.toLowerCase());
      const statusConfig = getStatusConfig(test.status);
      
      if (filterStatus === 'PAID') return match && statusConfig.paid;
      if (filterStatus === 'UNPAID') return match && !statusConfig.paid;
      return match;
    })
    .sort((a, b) => {
      const dA = new Date(a.createdAt || a.date || 0).getTime();
      const dB = new Date(b.createdAt || b.date || 0).getTime();
      return sortOrder === 'desc' ? dB - dA : dA - dB;
    });

  const stats = useMemo(() => {
    const unpaid = labTests.filter(t => !getStatusConfig(t.status).paid);
    const paid = labTests.filter(t => getStatusConfig(t.status).paid);
    
    return {
      unpaidCount: unpaid.length,
      paidCount: paid.length,
      unpaidAmount: unpaid.reduce((s, t) => {
        const amount = parseFloat(t.examTotalAmount || 0);
        return s + amount;
      }, 0),
      paidAmount: paid.reduce((s, t) => {
        const amount = parseFloat(t.examAmountPaid || t.examTotalAmount || 0);
        return s + amount;
      }, 0),
    };
  }, [labTests]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500" data-testid="caisse-laboratoire">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
              <Microscope className="w-8 h-8 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-foreground">
                Caisse Laboratoire
              </h1>
              <p className="text-sm text-muted-foreground font-medium mt-1 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {format(new Date(), "EEEE dd MMMM • HH:mm", { locale: fr })}
              </p>
            </div>
          </div>
          <Button
            onClick={loadLabTests}
            variant="outline"
            size="sm"
            className="rounded-xl font-semibold border-2 border-border hover:bg-violet-50 hover:border-violet-200 hover:text-violet-600 transition-all shrink-0"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Actualiser
          </Button>
        </div>

        {/* Compteurs adaptés au dark mode */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-500 to-slate-600 p-5 text-white shadow-lg shadow-slate-500/20 group hover:shadow-xl hover:shadow-slate-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TestTubes className="w-20 h-20" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <TestTubes className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-100">Total Examens</p>
              </div>
              <p className="text-3xl font-black">{labTests.length}</p>
              <p className="text-xs text-slate-200 mt-1 font-medium opacity-80">
                {stats.unpaidCount} à payer • {stats.paidCount} payés
              </p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20" />
          </div>

          {/* Card 2: À payer */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-5 text-white shadow-lg shadow-amber-500/20 group hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Lock className="w-20 h-20" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-100">À Payer</p>
              </div>
              <p className="text-3xl font-black">{stats.unpaidCount}</p>
              <p className="text-lg font-bold mt-1">{formatCurrency(stats.unpaidAmount)}</p>
              <p className="text-xs text-amber-100 mt-1 font-medium opacity-80">Montant à encaisser</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20" />
          </div>

          {/* Card 3: Payés */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-5 text-white shadow-lg shadow-emerald-500/20 group hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <CheckCircle2 className="w-20 h-20" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">Payés</p>
              </div>
              <p className="text-3xl font-black">{stats.paidCount}</p>
              <p className="text-lg font-bold mt-1">{formatCurrency(stats.paidAmount)}</p>
              <p className="text-xs text-emerald-100 mt-1 font-medium opacity-80">Total encaissé</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20" />
          </div>
        </div>
      </div>

      {/* Zone de travail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[60vh]">
        {/* Liste */}
        <Card className="lg:col-span-3 border-none shadow-sm bg-card rounded-2xl overflow-hidden flex flex-col">
          {/* Barre de filtres avec sélecteur de date */}
          <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row items-center gap-3 bg-muted/20">
            {/* Sélecteur de date */}
            <div className="flex items-center gap-2 bg-background rounded-xl px-3 py-2 border border-border shrink-0">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-sm font-medium focus:outline-none cursor-pointer w-32"
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
            
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un patient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl border-muted bg-background"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex rounded-xl border border-border overflow-hidden">
                {[
                  { key: 'ALL', label: 'Tous' },
                  { key: 'UNPAID', label: 'À payer', icon: Lock },
                  { key: 'PAID', label: 'Payés', icon: CheckCircle2 },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilterStatus(f.key)}
                    className={cn(
                      'px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5',
                      filterStatus === f.key
                        ? 'bg-slate-500 text-white'
                        : 'bg-transparent text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {f.icon && <f.icon className="w-3 h-3" />}
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Indicateur de date */}
          <div className="px-4 py-2 bg-muted/10 border-b border-border/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {selectedDate === format(new Date(), 'yyyy-MM-dd') 
                  ? "Aujourd'hui" 
                  : format(new Date(selectedDate), 'dd MMMM yyyy', { locale: fr })
                }
              </span>
              <Badge variant="secondary" className="text-xs">
                {filtered.length} examen{filtered.length > 1 ? 's' : ''}
              </Badge>
            </div>
            {selectedDate !== format(new Date(), 'yyyy-MM-dd') && (
              <button
                onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Retour à aujourd'hui
              </button>
            )}
          </div>

          {/* Indicateur de nombre d'examens dans la liste */}
          <div className="px-4 py-1 bg-muted/30 border-b border-border/30 text-xs text-muted-foreground flex justify-between items-center">
            <span>{filtered.length.toLocaleString()} examen{filtered.length > 1 ? 's' : ''}</span>
            <span className="text-muted-foreground/60">Défilez pour voir plus</span>
          </div>

          <div className="flex-1 overflow-y-auto bg-muted/10 max-h-[600px]" style={{ willChange: 'transform' }}>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="relative">
                  <Loader2 className="w-12 h-12 text-slate-500 animate-spin" />
                  <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-slate-200 border-t-transparent animate-spin" style={{ animationDuration: '3s' }} />
                </div>
                <p className="text-muted-foreground mt-4 text-sm font-medium">Chargement des examens...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-24 text-center">
                <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <FlaskConical className="w-10 h-10 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground font-medium">Aucun examen en attente</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Les examens apparaîtront ici</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30" style={{ contain: 'layout paint' }}>
                {filtered.map((test, index) => {
                  const isActive = selectedTest?.id === test.id;
                  const statusConfig = getStatusConfig(test.status);
                  const StatusIcon = statusConfig.icon;
                  const paid = statusConfig.paid;

                  return (
                    <div
                      key={test.id}
                      onClick={() => setSelectedTest(test)}
                      className={cn(
                        'flex items-center gap-4 p-4 cursor-pointer transition-all duration-200 group',
                        isActive
                          ? 'bg-gradient-to-r from-slate-500/10 to-transparent border-l-4 border-l-slate-500'
                          : 'hover:bg-muted/30 border-l-4 border-l-transparent'
                      )}
                      // Optimisation: pas d'animation pour les index > 50
                      style={index < 50 ? { animationDelay: `${Math.min(index * 20, 1000)}ms` } : undefined}
                    >
                      <div className={cn(
                        'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-200 shadow-sm',
                        paid
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                          : 'bg-gradient-to-br from-amber-500 to-orange-500 text-white',
                        isActive && 'scale-110 shadow-lg'
                      )}>
                        <StatusIcon className="w-6 h-6" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm truncate text-foreground group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">{test.patientName}</p>
                          {!paid && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                            {formatTime(test.createdAt)}
                          </span>
                          <span className="text-[11px] text-muted-foreground/60">
                            {test.consultationCode || `REF-${test.id}`}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className={cn('text-lg font-black', paid ? 'text-emerald-500' : 'text-foreground')}>
                          {formatCurrency(test.examTotalAmount || test.totalAmount)}
                        </p>
                        <div className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase',
                          paid 
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        )}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {statusConfig.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Panneau détail */}
        <div className="lg:col-span-2 space-y-6">
          {selectedTest ? (
            <Card className="border-none shadow-lg rounded-2xl overflow-hidden animate-in slide-in-from-right-4 duration-300">
              {/* Header patient */}
              <div className={cn(
                'p-6 border-b relative overflow-hidden',
                getStatusConfig(selectedTest.status).paid 
                  ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20' 
                  : 'bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20'
              )}>
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative flex items-center gap-5">
                  <div className={cn(
                    'w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg',
                    getStatusConfig(selectedTest.status).paid 
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/30' 
                      : 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/30'
                  )}>
                    {getStatusConfig(selectedTest.status).paid 
                      ? <CheckCircle2 className="w-8 h-8" />
                      : <Lock className="w-8 h-8" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-black truncate text-foreground">{selectedTest.patientName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs font-semibold">
                        {selectedTest.consultationCode || `REF-${selectedTest.id}`}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatFullDate(selectedTest.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Workflow visuel */}
                <div className="bg-muted/30 rounded-2xl p-5">
                  <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4 text-center">
                    Progression
                  </p>
                  <div className="flex items-center justify-between">
                    {[
                      { key: 'EN_ATTENTE', label: 'En attente', icon: Clock },
                      { key: 'EXAMENS_PRESCRITS', label: 'Payer', icon: DollarSign },
                      { key: 'EXAMENS_PAYES', label: 'Payé', icon: CheckCircle2 },
                      { key: 'AU_LABO', label: 'Labo', icon: FlaskConical }
                    ].map((step, idx) => {
                      const currentStep = selectedTest.status;
                      const stepOrder = ['EN_ATTENTE', 'EXAMENS_PRESCRITS', 'EXAMENS_PAYES', 'AU_LABO', 'TERMINE'];
                      const currentIdx = stepOrder.indexOf(currentStep);
                      const stepIdx = stepOrder.indexOf(step.key);
                      const isActive = stepIdx <= currentIdx;
                      const isCurrent = step.key === currentStep || 
                        (currentStep === 'TERMINE' && step.key === 'AU_LABO');
                      
                      return (
                        <React.Fragment key={step.key}>
                          <div className="flex flex-col items-center gap-2 flex-1">
                            <div className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300',
                              isCurrent 
                                ? 'bg-slate-500 text-white shadow-lg shadow-slate-500/30 ring-2 ring-slate-200 ring-offset-2 dark:ring-slate-700'
                                : isActive 
                                  ? 'bg-emerald-500 text-white shadow-md'
                                  : 'bg-muted text-muted-foreground'
                            )}>
                              <step.icon className="w-5 h-5" />
                            </div>
                            <span className={cn(
                              'text-[10px] font-bold uppercase text-center leading-tight',
                              isCurrent ? 'text-slate-600 dark:text-slate-400' : isActive ? 'text-emerald-600' : 'text-muted-foreground'
                            )}>
                              {step.label}
                            </span>
                          </div>
                          {idx < 3 && (
                            <div className={cn(
                              'w-8 h-0.5 rounded-full transition-all duration-500',
                              stepIdx < currentIdx ? 'bg-emerald-400' : 'bg-border'
                            )} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Liste des examens */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <TestTubes className="w-4 h-4 text-slate-500" />
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                        Examens prescrits
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {adjustedExams.filter(e => e.active).length}/{adjustedExams.length}
                      </Badge>
                    </div>
                    {getStatusConfig(selectedTest.status).paid === false && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleSaveAdjustments}
                        disabled={savingAdjustments}
                        className="h-8 text-xs font-semibold hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                      >
                        {savingAdjustments ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sauvegarder'}
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {adjustedExams.map((exam, idx) => (
                      <div 
                        key={exam.id} 
                        className={cn(
                          'p-4 rounded-xl border transition-all duration-200',
                          exam.active 
                            ? 'bg-muted/30 border-border hover:border-border/60' 
                            : 'bg-muted/10 border-transparent opacity-50'
                        )}
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                              exam.active ? 'bg-slate-500/20 text-slate-600 dark:text-slate-400' : 'bg-muted text-muted-foreground'
                            )}>
                              <FlaskConical className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className={cn(
                                'text-sm font-bold block truncate text-foreground',
                                !exam.active && 'line-through text-muted-foreground'
                              )}>
                                {exam.serviceName}
                              </span>
                              {exam.doctorNote && exam.active && (
                                <p className="text-[11px] text-blue-500 mt-0.5 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  {exam.doctorNote}
                                </p>
                              )}
                            </div>
                          </div>
                          {getStatusConfig(selectedTest.status).paid === false && (
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => handleToggleActive(exam.id)}
                                className={cn(
                                  'p-1.5 rounded-lg transition-colors',
                                  exam.active 
                                    ? 'hover:bg-red-500/10 text-muted-foreground hover:text-red-500' 
                                    : 'hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500'
                                )}
                                title={exam.active ? "Désactiver" : "Réactiver"}
                              >
                                {exam.active ? <X className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleRemoveExam(exam.id)}
                                className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded-lg transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-border/30">
                          <div className="flex items-center gap-2">
                            {getStatusConfig(selectedTest.status).paid === false && exam.active ? (
                              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                                <button
                                  onClick={() => handleQuantityChange(exam.id, -1)}
                                  className="p-1 hover:bg-background rounded-md shadow-sm transition-all"
                                >
                                  <MinusCircle className="w-4 h-4 text-muted-foreground" />
                                </button>
                                <span className="text-sm font-bold w-6 text-center text-foreground">{exam.quantity}</span>
                                <button
                                  onClick={() => handleQuantityChange(exam.id, 1)}
                                  className="p-1 hover:bg-background rounded-md shadow-sm transition-all"
                                >
                                  <PlusCircle className="w-4 h-4 text-muted-foreground" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                                Qté: {exam.quantity}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground">{formatCurrency(exam.unitPrice)} x {exam.quantity}</span>
                            <p className="text-lg font-black text-foreground">
                              {formatCurrency(exam.unitPrice * exam.quantity)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totaux adaptés au dark mode */}
                  <div className="mt-5 p-5 rounded-2xl bg-muted/40 border border-border/50 shadow-sm space-y-3">
                    {originalTotal !== adjustedTotal && (
                      <div className="flex justify-between items-center text-sm pb-2 border-b border-border/30">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Receipt className="w-4 h-4" />
                          Montant initial
                        </span>
                        <span className="line-through text-muted-foreground font-medium">{formatCurrency(originalTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-foreground flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Total à payer
                      </span>
                      <span className="text-2xl font-black text-emerald-500">{formatCurrency(adjustedTotal)}</span>
                    </div>
                    {originalTotal > adjustedTotal && (
                      <div className="flex items-center gap-2 p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <p className="text-xs text-emerald-600 font-semibold">
                          Réduction de {formatCurrency(originalTotal - adjustedTotal)} appliquée
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-2">
                  {!getStatusConfig(selectedTest.status).paid && (
                    <Button
                      onClick={() => handlePayment(selectedTest)}
                      disabled={adjustedTotal === 0 || adjustedExams.every(e => !e.active)}
                      className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black gap-2 shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 disabled:shadow-none disabled:translate-y-0"
                    >
                      <DollarSign className="w-6 h-6" />
                      Encaisser {formatCurrency(adjustedTotal)}
                    </Button>
                  )}

                  {getStatusConfig(selectedTest.status).paid && 
                   selectedTest.status !== 'AU_LABO' && 
                   selectedTest.status !== 'TERMINE' && 
                   adjustedExams.some(e => e.active) && (
                    <Button
                      onClick={handleSendToLab}
                      disabled={sendingToLab}
                      className="w-full h-14 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-black gap-2 shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 disabled:shadow-none disabled:translate-y-0"
                    >
                      {sendingToLab ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      Envoyer au laboratoire
                    </Button>
                  )}

                  {selectedTest.status === 'AU_LABO' && (
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 text-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-blue-400/5 animate-pulse" />
                      <div className="relative">
                        <div className="relative inline-block mb-4">
                          <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <FlaskConical className="w-10 h-10 text-blue-500" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          </div>
                        </div>
                        <p className="text-blue-600 dark:text-blue-400 font-black text-lg">En cours d'analyse</p>
                        <p className="text-sm text-blue-500/80 mt-2">Le laboratoire traite actuellement les examens</p>
                        <div className="flex justify-center gap-1 mt-4">
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none shadow-lg rounded-2xl overflow-hidden">
              <CardContent className="py-20 text-center bg-gradient-to-br from-muted/30 to-muted/10">
                <div className="relative inline-block mb-6">
                  <div className="w-24 h-24 rounded-full bg-slate-500/10 flex items-center justify-center">
                    <Microscope className="w-12 h-12 text-slate-500/50" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-slate-500/10 flex items-center justify-center animate-pulse">
                    <Search className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Aucun examen sélectionné</h3>
                <p className="text-muted-foreground max-w-xs mx-auto">Cliquez sur un examen dans la liste pour voir les détails et effectuer le paiement</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <PaymentModal
          invoice={selectedInvoice}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default CaisseLaboratoire;

