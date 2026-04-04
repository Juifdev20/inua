import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Microscope, Eye, DollarSign, Lock, Unlock, AlertCircle,
  Search, Loader2, RefreshCw, Users, ArrowUpDown,
  ChevronRight, FlaskConical, TestTubes, ShieldCheck,
  Receipt, Filter, CheckCircle2, Clock, Send, X,
  MinusCircle, PlusCircle, Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import financeApi from '../../services/financeApi/financeApi.js';
import api from '../../services/api'; // ✅ AJOUT: pour les nouveaux endpoints
// 🚀 IMPORT NOUVEAU: Utilise votre service labTestService.js fourni
import { addToQueue } from '../../services/api/labTestService';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import PaymentModal from '../../components/modals/PaymentModal.jsx';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';

const API = "http://localhost:8080/api/v1/finance";

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

// ✅ CORRECTION: Ajout de EN_ATTENTE comme 'À payer' (non payé)
const STATUS_MAP = {
  'EXAMENS_PRESCRITS': { label: 'À payer', color: 'red', icon: Lock, paid: false },
  'EXAMENS_PAYES': { label: 'Payé - Vers labo', color: 'blue', icon: CheckCircle2, paid: true },
  'AU_LABO': { label: 'Au laboratoire', color: 'violet', icon: FlaskConical, paid: true },
  'TERMINE': { label: 'Terminé', color: 'emerald', icon: ShieldCheck, paid: true },
  // Compatibilité anciens statuts + EN_ATTENTE
  'PAID': { label: 'Payé', color: 'emerald', icon: Unlock, paid: true },
  'PAYEE': { label: 'Payé', color: 'emerald', icon: Unlock, paid: true },
  'UNPAID': { label: 'Non payé', color: 'red', icon: Lock, paid: false },
  'EN_ATTENTE': { label: 'À payer', color: 'red', icon: Lock, paid: false },  // 👈 AJOUT
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
  
  // ✅ NOUVEAU: État pour l'ajustement des examens
  const [adjustedExams, setAdjustedExams] = useState([]);
  const [savingAdjustments, setSavingAdjustments] = useState(false);
  const [sendingToLab, setSendingToLab] = useState(false);

  useEffect(() => { loadLabTests(); }, []);

  // ✅ CORRECTION: Charger TOUS les examens (pending + payés) pour voir les payés dans la liste et stats
  const loadLabTests = async () => {
    try {
      setLoading(true);
      // 👈 Changement: Utiliser un endpoint qui renvoie TOUS (ajustez si différent)
      const response = await api.get(`${API}/all-lab-payments`);  // Assumé; si pas, implémentez-le backend
      console.log('📋 Response from /all-lab-payments:', response.data);  // 👈 LOG POUR DÉBOGAGE
      
      // 🔍 DEBUG: Vérifiez cette sortie dans la console
      const data = response.data.data || [];
      
      // Debug: Logue chaque item pour vérifier les champs
      data.forEach((item, idx) => {
        console.log(`Item ${idx}:`, {
          id: item.id,
          status: item.status,
          examTotalAmount: item.examTotalAmount,
          examAmountPaid: item.examAmountPaid,
          remainingAmount: item.remainingAmount,
          // 👈 AJOUT: Vérifiez patientId et consultationId pour le workflow Labo
          patientId: item.patientId,
          consultationId: item.consultationId
        });
      });
      
      setLabTests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading lab tests:', error);
      toast.error('Erreur chargement examens');
      setLabTests([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NOUVEAU: Initialiser les examens ajustés quand on sélectionne un test
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

  // ✅ NOUVEAU: Calcul du montant ajusté
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
    // ✅ CORRECTION: Utiliser le montant ajusté pour le paiement
    const invoiceToPay = {
      ...invoice,
      totalAmount: adjustedTotal, // Montant après ajustement
      originalAmount: originalTotal,
      adjustedExams: adjustedExams.filter(e => e.active)
    };
    setSelectedInvoice(invoiceToPay);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedInvoice(null);
    loadLabTests();  // 👈 REFRESH AUTO APRÈS PAIEMENT
    toast.success('Paiement validé. Vous pouvez maintenant envoyer au laboratoire.');
  };

  // ✅ NOUVEAU: Sauvegarder les ajustements (quantité, désactivation)
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
      loadLabTests();  // 👈 REFRESH AUTO
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde des ajustements');
    } finally {
      setSavingAdjustments(false);
    }
  };

  // 🚀 CORRECTION CLÉ: Envoyer au laboratoire via addToQueue (votre service)
  const handleSendToLab = async () => {
    if (!selectedTest) return;

    // Vérifier les IDs nécessaires (extrait de selectedTest)
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

      // 👈 Boucle pour créer un LabTest par examen actif (via votre service addToQueue)
      const promises = activeExams.map(async (exam) => {
        const labTestPayload = {
          consultationId,
          patientId,
          testType: 'LABORATOIRE', // 👈 Type fixe; adaptez si dynamique (ex. exam.category)
          testName: exam.serviceName || exam.name || 'Examen de laboratoire',
          description: exam.doctorNote || selectedTest.note || '', // Note optionnelle
          priority: exam.priority || 'NORMALE', // Priorité par défaut
          // fromFinance: true est ajouté automatiquement par addToQueue dans votre service
        };

        console.log('📤 Envoi LabTest:', labTestPayload); // 👈 LOG pour débogage

        return addToQueue(labTestPayload);
      });

      // Attendre tous les envois
      const results = await Promise.all(promises);

      // 👈 Optionnel: Mise à jour statut Finance vers AU_LABO (votre endpoint existant)
      await api.post(`${API}/consultations/${consultationId}/send-to-lab`);

      toast.success(`Examens envoyés au laboratoire (${results.length} test(s) créés).`);
      setSelectedTest(null);
      loadLabTests();  // 👈 REFRESH AUTO
    } catch (error) {
      console.error('Erreur envoi labo:', error);
      // 👈 Gestion erreur du backend (via votre service qui propage l'erreur axios)
      const errorMsg = error.response?.data?.message || error.message || 'Erreur lors de l\'envoi au laboratoire';
      toast.error(errorMsg);
    } finally {
      setSendingToLab(false);
    }
  };

  // ✅ NOUVEAU: Modifier la quantité
  const handleQuantityChange = (examId, delta) => {
    setAdjustedExams(prev => prev.map(ex => {
      if (ex.id === examId) {
        const newQty = Math.max(1, (ex.quantity || 1) + delta);
        return { ...ex, quantity: newQty };
      }
      return ex;
    }));
  };

  // ✅ NOUVEAU: Activer/Désactiver un examen
  const handleToggleActive = (examId) => {
    setAdjustedExams(prev => prev.map(ex => 
      ex.id === examId ? { ...ex, active: !ex.active } : ex
    ));
  };

  // ✅ NOUVEAU: Supprimer un examen
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

  // 💰 CORRECTION DES STATS - Ajusté pour utiliser les bons champs du backend
  const stats = useMemo(() => {
    const unpaid = labTests.filter(t => !getStatusConfig(t.status).paid);
    const paid = labTests.filter(t => getStatusConfig(t.status).paid);
    
    console.log('🔢 Stats calculation:', {
      unpaidCount: unpaid.length,
      paidCount: paid.length,
      unpaidItems: unpaid.map(i => ({id: i.id, status: i.status, examAmountPaid: i.examAmountPaid})),
      paidItems: paid.map(i => ({id: i.id, status: i.status, examAmountPaid: i.examAmountPaid}))
    });
    
    return {
      unpaidCount: unpaid.length,
      paidCount: paid.length,
      // 👈 UTILISE EXACTEMENT Les champs retournés par le backend
      unpaidAmount: unpaid.reduce((s, t) => {
        const amount = parseFloat(t.examTotalAmount || t.totalAmount || 0);
        return s + amount;
      }, 0),
      // 👈 UTILISE LE BON CHAMP POUR LES MONTANTS PAYÉS
      paidAmount: paid.reduce((s, t) => {
        const amount = parseFloat(t.examAmountPaid || t.totalAmount || 0);
        return s + amount;
      }, 0),
    };
  }, [labTests]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500" data-testid="caisse-laboratoire">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-violet-500/10">
              <Microscope className="w-7 h-7 text-violet-600" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                Caisse Laboratoire
              </h1>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-0.5">
                {format(new Date(), "EEEE dd MMMM • HH:mm", { locale: fr })}
              </p>
            </div>
          </div>
          <Button
            onClick={loadLabTests}
            variant="outline"
            size="sm"
            className="rounded-xl font-bold border-2 shrink-0"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Actualiser
          </Button>
        </div>

        {/* Compteurs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-card rounded-xl border border-border shadow-sm">
            <div className="w-2 h-2 rounded-full bg-violet-500" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total</span>
            <span className="text-lg font-black text-foreground ml-1">{labTests.length}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-500/5 rounded-xl border border-orange-500/20 shadow-sm">
            <Lock className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">À payer</span>
            <span className="text-lg font-black text-orange-600 ml-1">{stats.unpaidCount}</span>
            <span className="text-[10px] text-orange-500/70 font-bold ml-1 hidden sm:inline">
              ({formatCurrency(stats.unpaidAmount)})
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/5 rounded-xl border border-blue-500/20 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Payés</span>
            <span className="text-lg font-black text-blue-600 ml-1">{stats.paidCount}</span>
            <span className="text-[10px] text-blue-500/70 font-bold ml-1 hidden sm:inline">
              ({formatCurrency(stats.paidAmount)})
            </span>
          </div>
        </div>
      </div>

      {/* Zone de travail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[60vh]">
        {/* Liste */}
        <Card className="lg:col-span-3 border-none shadow-sm bg-card rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row items-center gap-3 bg-muted/20">
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
                        ? 'bg-violet-500 text-white'
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

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-24 text-center">
                <FlaskConical className="w-8 h-8 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun examen en file</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {filtered.map((test) => {
                  const isActive = selectedTest?.id === test.id;
                  const statusConfig = getStatusConfig(test.status);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <div
                      key={test.id}
                      onClick={() => setSelectedTest(test)}
                      className={cn(
                        'flex items-center gap-4 p-4 cursor-pointer transition-all',
                        isActive
                          ? 'bg-violet-500/5 border-l-4 border-l-violet-500'
                          : 'hover:bg-muted/40 border-l-4 border-l-transparent'
                      )}
                    >
                      <div className={cn(
                        'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
                        `bg-${statusConfig.color}-500/10 text-${statusConfig.color}-600`
                      )}>
                        <StatusIcon className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm truncate">{test.patientName}</p>
                          {statusConfig.color === 'orange' && (
                            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {formatTime(test.createdAt)} • {test.consultationCode || `REF-${test.id}`}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className={cn('text-sm font-black', `text-${statusConfig.color}-600`)}>
                          {formatCurrency(test.examTotalAmount || test.totalAmount)}
                        </p>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">
                          {statusConfig.label}
                        </p>
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
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              {/* Header avec statut */}
              <div className={cn(
                'p-5 border-b',
                getStatusConfig(selectedTest.status).paid ? 'bg-emerald-500/5' : 'bg-orange-500/5'
              )}>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'w-14 h-14 rounded-2xl flex items-center justify-center text-white',
                    getStatusConfig(selectedTest.status).paid ? 'bg-emerald-500' : 'bg-orange-500'
                  )}>
                    {getStatusConfig(selectedTest.status).paid 
                      ? <CheckCircle2 className="w-7 h-7" />
                      : <Lock className="w-7 h-7" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-black">{selectedTest.patientName}</h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedTest.consultationCode || `REF-${selectedTest.id}`}
                    </p>
                  </div>
                </div>
              </div>

              <CardContent className="p-5 space-y-5">
                {/* Workflow visuel – CORRECTION: Ajout de EN_ATTENTE comme étape 1 */}
                <div className="flex items-center justify-center gap-2 py-3">
                  {['EN_ATTENTE', 'EXAMENS_PRESCRITS', 'EXAMENS_PAYES', 'AU_LABO'].map((step, idx) => {  // 👈 AJOUT EN_ATTENTE
                    const currentStep = selectedTest.status;
                    const stepIndex = ['EN_ATTENTE', 'EXAMENS_PRESCRITS', 'EXAMENS_PAYES', 'AU_LABO'].indexOf(currentStep);
                    const isActive = idx <= stepIndex;
                    const isCurrent = idx === stepIndex;
                    
                    return (
                      <React.Fragment key={step}>
                        <div className="flex flex-col items-center gap-1">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                            isActive ? 'bg-violet-500 text-white' : 'bg-muted text-muted-foreground',
                            isCurrent && 'ring-2 ring-violet-500 ring-offset-2'
                          )}>
                            {idx + 1}
                          </div>
                          <span className="text-[9px] font-bold uppercase text-muted-foreground">
                            {step === 'EN_ATTENTE' ? 'En attente' :
                             step === 'EXAMENS_PRESCRITS' ? 'Payer' : 
                             step === 'EXAMENS_PAYES' ? 'Payé' : 'Labo'}
                          </span>
                        </div>
                        {idx < 3 && (  // 👈 Ajusté pour 4 étapes
                          <div className={cn(
                            'w-8 h-0.5',
                            idx < stepIndex ? 'bg-violet-500' : 'bg-border'
                          )} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Liste des examens avec ajustement */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Examens prescrits
                    </p>
                    {getStatusConfig(selectedTest.status).paid === false && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleSaveAdjustments}
                        disabled={savingAdjustments}
                      >
                        {savingAdjustments ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sauvegarder'}
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {adjustedExams.map((exam) => (
                      <div 
                        key={exam.id} 
                        className={cn(
                          'p-3 rounded-xl border transition-all',
                          exam.active 
                            ? 'bg-muted/30 border-border' 
                            : 'bg-gray-100 border-gray-200 opacity-50'
                        )}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <TestTubes className="w-4 h-4 text-violet-500" />
                            <span className={cn(
                              'text-sm font-bold',
                              !exam.active && 'line-through'
                            )}>
                              {exam.serviceName}
                            </span>
                          </div>
                          {/* Actions uniquement si non payé */}
                          {getStatusConfig(selectedTest.status).paid === false && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleToggleActive(exam.id)}
                                className="p-1 hover:bg-muted rounded"
                                title={exam.active ? "Désactiver" : "Réactiver"}
                              >
                                {exam.active ? <X className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                              </button>
                              <button
                                onClick={() => handleRemoveExam(exam.id)}
                                className="p-1 hover:bg-red-100 text-red-500 rounded"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Quantité et prix */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            {getStatusConfig(selectedTest.status).paid === false && exam.active ? (
                              <>
                                <button
                                  onClick={() => handleQuantityChange(exam.id, -1)}
                                  className="p-1 hover:bg-muted rounded"
                                >
                                  <MinusCircle className="w-4 h-4" />
                                </button>
                                <span className="text-sm font-bold w-6 text-center">{exam.quantity}</span>
                                <button
                                  onClick={() => handleQuantityChange(exam.id, 1)}
                                  className="p-1 hover:bg-muted rounded"
                                >
                                  <PlusCircle className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">Qté: {exam.quantity}</span>
                            )}
                          </div>
                          <span className="text-sm font-black">
                            {formatCurrency(exam.unitPrice * exam.quantity)}
                          </span>
                        </div>
                        
                        {exam.doctorNote && (
                          <p className="text-xs text-blue-600 mt-1 italic">
                            Note médecin: {exam.doctorNote}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Totaux */}
                  <div className="mt-4 p-4 rounded-xl bg-orange-50 border border-orange-200 space-y-2">
                    {originalTotal !== adjustedTotal && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Montant initial:</span>
                        <span className="line-through">{formatCurrency(originalTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-black text-orange-700">
                      <span>Total à payer:</span>
                      <span>{formatCurrency(adjustedTotal)}</span>
                    </div>
                    {originalTotal > adjustedTotal && (
                      <p className="text-xs text-orange-600">
                        Réduction de {formatCurrency(originalTotal - adjustedTotal)} appliquée
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions selon le statut – CORRECTION: Basé sur !paid au lieu de status strict */}
                <div className="space-y-3">
                  {!getStatusConfig(selectedTest.status).paid && (
                    <Button
                      onClick={() => handlePayment(selectedTest)}
                      disabled={adjustedTotal === 0 || adjustedExams.every(e => !e.active)}
                      className="w-full h-14 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black gap-2"
                    >
                      <DollarSign className="w-5 h-5" />
                      Encaisser {formatCurrency(adjustedTotal)}
                    </Button>
                  )}

                  {/* 👈 CORRECTION: Bouton seulement si payé ET pas déjà au labo/terminé ET exams actifs */}
                  {getStatusConfig(selectedTest.status).paid && 
                   selectedTest.status !== 'AU_LABO' && 
                   selectedTest.status !== 'TERMINE' && 
                   adjustedExams.some(e => e.active) && (
                    <Button
                      onClick={handleSendToLab}
                      disabled={sendingToLab}
                      className="w-full h-14 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black gap-2"
                    >
                      {sendingToLab ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      Envoyer au laboratoire
                    </Button>
                  )}

                  {selectedTest.status === 'AU_LABO' && (
                    <div className="p-4 rounded-xl bg-blue-50 text-center">
                      <FlaskConical className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <p className="text-blue-800 font-bold">En cours d'analyse</p>
                      <p className="text-xs text-blue-600">Le laboratoire traite les examens</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none shadow-sm rounded-2xl">
              <CardContent className="py-32 text-center">
                <Microscope className="w-10 h-10 text-violet-500/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Sélectionnez un examen pour voir les détails</p>
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