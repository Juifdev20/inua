import React, { useState, useEffect, useCallback } from 'react';
import { admissionService } from '@/services/admissionService';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Clock, 
  CheckCircle, 
  DollarSign, 
  User, 
  Beaker, 
  RefreshCw,
  Bell,
  AlertCircle,
  ChevronRight,
  Search,
  X
} from 'lucide-react';

// ============================================================
// ✅ FONCTIONS UTILITAIRES
// ============================================================

// Fonction pour formater les montants en CFA
const formatAmount = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num)) return '0 F';
  return `${num.toLocaleString('fr-FR')} F`;
};

// Fonction pour obtenir la date du jour
const getToday = () => new Date().toISOString().split('T')[0];

// ============================================================
// ✅ COMPOSANT: Modal de Paiement
// ============================================================
const PaymentModal = ({ 
  isOpen, 
  onClose, 
  consultation, 
  examServices, 
  onProcessPayment 
}) => {
  const [amountReceived, setAmountReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Calcul du montant total des examens
  const examTotal = React.useMemo(() => {
    if (!consultation || !examServices) return 0;
    return (consultation.exams || []).reduce((sum, ex) => {
      const svc = examServices.find(s => s.id?.toString() === ex.serviceId?.toString()) || {};
      return sum + (parseFloat(svc.price) || 0);
    }, 0);
  }, [consultation, examServices]);

  const remaining = React.useMemo(() => {
    return Math.max(0, examTotal - (parseFloat(amountReceived) || 0));
  }, [examTotal, amountReceived]);

  const isExactAmount = React.useMemo(() => {
    return parseFloat(amountReceived) === examTotal;
  }, [amountReceived, examTotal]);

  const handleSubmit = async () => {
    if (remaining > 0) {
      toast.error('Paiement incomplet. Le montant reçu doit être égal au total.');
      return;
    }
    
    setIsProcessing(true);
    try {
      await onProcessPayment(consultation.id, amountReceived);
      setAmountReceived('');
      onClose();
    } catch (error) {
      console.error('Erreur paiement:', error);
      toast.error('Erreur lors du traitement du paiement');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !consultation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border w-full max-w-md mx-auto rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 h-[600px] max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="p-3 border-b border-border flex justify-between items-center bg-muted/20 flex-shrink-0">
          <div>
            <h3 className="text-base font-black text-foreground">Paiement Examinations</h3>
            <p className="text-xs text-muted-foreground">Patient #{consultation.patientId}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-7 w-7">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Patient Info - Fixed */}
        <div className="p-3 border-b border-border bg-muted/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8 border-2 border-emerald-500">
              <AvatarImage src={consultation.patientPhoto} />
              <AvatarFallback className="bg-emerald-100 text-emerald-600 font-bold text-xs">
                {consultation.patientName?.[0] || 'P'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-bold text-foreground text-xs truncate">{consultation.patientName || 'Patient'}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                Dr. {consultation.doctorName || 'Inconnu'}
              </p>
            </div>
          </div>
        </div>

        {/* Examens List - SCROLLABLE with flex-1 */}
        <div className="flex-1 overflow-y-auto p-3 border-b border-border">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 sticky top-0 bg-card pb-1">
            Examens Prescrits ({consultation.exams?.length || 0})
          </h4>
          <div className="space-y-1.5">
            {(consultation.exams || []).map((exam, idx) => {
              const svc = examServices?.find(s => s.id?.toString() === exam.serviceId?.toString()) || {};
              return (
                <div key={idx} className="flex justify-between items-center p-1.5 bg-muted/30 rounded">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Beaker className="w-3 h-3 text-blue-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-xs truncate">{svc.name || 'Examen'}</p>
                      {exam.note && <p className="text-[10px] text-muted-foreground truncate">{exam.note}</p>}
                    </div>
                  </div>
                  <span className="font-bold text-foreground text-xs flex-shrink-0 ml-1">{formatAmount(svc.price || 0)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Section - FIXED at bottom */}
        <div className="p-3 border-t border-border flex-shrink-0 bg-card">
          {/* Montant Total & Montant Reçu */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Montant Total</label>
              <div className="text-lg font-black text-blue-600">{formatAmount(examTotal)}</div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Montant Reçu</label>
              <Input 
                type="number" 
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                placeholder="0"
                className="h-8 text-sm font-bold"
              />
            </div>
          </div>

          {/* Alert message - Fixed height */}
          <div className="h-8 mb-2">
            {amountReceived && (
              <div className={`h-full px-2 rounded flex items-center justify-center text-xs ${
                isExactAmount 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                <div className="flex items-center gap-1">
                  {isExactAmount ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  <span className="font-medium">
                    {isExactAmount ? 'Montant exact !' : `Reste: ${formatAmount(remaining)}`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Buttons - Always visible */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded h-8 text-xs">
              Annuler
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={remaining > 0 || isProcessing}
              className={`flex-[2] rounded h-8 text-xs ${
                isExactAmount 
                  ? 'bg-emerald-500 hover:bg-emerald-600' 
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                 ...
                </>
              ) : (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Valider
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// ✅ COMPOSANT PRINCIPAL: ReceptionPayments
// ============================================================
const ReceptionPayments = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [todayProcessed, setTodayProcessed] = useState([]);
  const [examServices, setExamServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalPending: 0,
    totalAmount: 0,
    todayProcessed: 0,
    todayRevenue: 0
  });

  // Charger les données
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Charger les services d'examens
      const services = await admissionService.getAvailableServices();
      setExamServices(Array.isArray(services) ? services : []);
      
      // ✅ CORRECTION: Utiliser getPendingConsultations pour PENDING_PAYMENT
      // Le médecin envoie PENDING_PAYMENT, la réception doit recevoir ce statut
      const pending = await admissionService.getPendingConsultations();
      setPendingPayments(pending || []);
      
      // Charger les traitées aujourd'hui
      const processed = await admissionService.getTodayProcessed();
      setTodayProcessed(processed || []);
      
      // Calculer les statistiques
      const totalPendingAmount = pending.reduce((sum, p) => {
        return sum + (p.exams || []).reduce((s, ex) => {
          const svc = services.find(srv => srv.id?.toString() === ex.serviceId?.toString());
          return s + (parseFloat(svc?.price) || 0);
        }, 0);
      }, 0);
      
      const todayRevenue = processed.reduce((sum, p) => {
        return sum + (parseFloat(p.examAmountPaid) || 0);
      }, 0);

      setStats({
        totalPending: pending.length,
        totalAmount: totalPendingAmount,
        todayProcessed: processed.length,
        todayRevenue
      });
      
    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ CORRECTION: Auto-refresh avec chargement initial
  // Charge les données AU DÉMARRAGE puis toutes les 60 secondes
  useEffect(() => {
    if (!token) return;
    
    // 1. Chargement initial
    loadData();
    
    // 2. Auto-refresh toutes les 60 secondes
    const interval = setInterval(() => {
      console.log("🔄 ReceptionPayments: Auto-refresh...");
      loadData();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [token, loadData]);

  // Filtrer les consultations
  const filteredPending = pendingPayments.filter(c => {
    if (!searchTerm) return true;
    const patientName = (c.patientName || '').toLowerCase();
    const motif = (c.motif || c.reasonForVisit || '').toLowerCase();
    return patientName.includes(searchTerm.toLowerCase()) || motif.includes(searchTerm.toLowerCase());
  });

  // Traiter le paiement
  const handleProcessPayment = async (consultationId, amountPaid) => {
    try {
      await admissionService.processLabPayment(consultationId, amountPaid);
      toast.success('Paiement validé! Dossier envoyé au laboratoire.');
      loadData(); // Recharger les données
    } catch (error) {
      console.error('Erreur process payment:', error);
      throw error;
    }
  };

  // Ouvrir le modal de paiement
  const openPaymentModal = (consultation) => {
    setSelectedConsultation(consultation);
    setModalOpen(true);
  };

  // ============================================================
  // ✅ RENDU PRINCIPAL
  // ============================================================
  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground">Paiements & Laboratoires</h1>
          <p className="text-muted-foreground font-medium">
            Gérez les paiements des examens et envoyez au laboratoire
          </p>
        </div>
        <Button onClick={loadData} variant="outline" className="gap-2 rounded-xl">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-600 uppercase">En Attente</p>
                <p className="text-2xl font-black text-amber-700">{stats.totalPending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase">Montant Dû</p>
                <p className="text-xl font-black text-blue-700">{formatAmount(stats.totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase">Traitées Aujourd'hui</p>
                <p className="text-2xl font-black text-emerald-700">{stats.todayProcessed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-purple-50 border-purple-200 dark:bg-purple-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-purple-600 uppercase">Revenus Jour</p>
                <p className="text-xl font-black text-purple-700">{formatAmount(stats.todayRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'pending' 
              ? 'border-emerald-500 text-emerald-600' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="w-4 h-4" />
          En Attente de Paiement
          {pendingPayments.length > 0 && (
            <Badge variant="destructive" className="ml-1">{pendingPayments.length}</Badge>
          )}
        </button>
        <button
          onClick={() => setActiveTab('processed')}
          className={`px-4 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'processed' 
              ? 'border-emerald-500 text-emerald-600' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Traitées Aujourd'hui
        </button>
      </div>

      {/* Search */}
      {activeTab === 'pending' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par patient ou motif..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
      )}

      {/* Liste des consultations */}
      <div className="space-y-3">
        {loading ? (
          // Skeleton loading
          [1, 2, 3].map(i => (
            <Card key={i} className="border-border">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-14 h-14 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-40 mb-2" />
                    <Skeleton className="h-4 w-60" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : activeTab === 'pending' ? (
          // Paiements en attente
          filteredPending.length > 0 ? (
            filteredPending.map((consultation) => (
              <Card 
                key={consultation.id}
                className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-amber-500 border-border"
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-14 h-14 border-2 border-background">
                      <AvatarImage src={consultation.patientPhoto} />
                      <AvatarFallback className="bg-amber-100 text-amber-600 font-bold">
                        {consultation.patientName?.[0] || 'P'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-bold text-lg text-foreground truncate">
                          {consultation.patientName || `Patient #${consultation.patientId}`}
                        </h3>
                        <Badge className="bg-amber-500/10 text-amber-600 border-none">
                          <Clock className="w-3 h-3 mr-1" />
                          En attente
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-2">
                        {(consultation.exams || []).slice(0, 3).map((exam, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            <Beaker className="w-3 h-3 mr-1" />
                            {examServices.find(s => s.id?.toString() === exam.serviceId?.toString())?.name || 'Examen'}
                          </Badge>
                        ))}
                        {(consultation.exams || []).length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{(consultation.exams || []).length - 3}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          Dr. {consultation.doctorName || 'Inconnu'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Montant</p>
                      <p className="text-xl font-black text-blue-600">
                        {formatAmount(
                          (consultation.exams || []).reduce((sum, ex) => {
                            const svc = examServices.find(s => s.id?.toString() === ex.serviceId?.toString());
                            return sum + (parseFloat(svc?.price) || 0);
                          }, 0)
                        )}
                      </p>
                      <Button 
                        size="sm" 
                        onClick={() => openPaymentModal(consultation)}
                        className="mt-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl"
                      >
                        <DollarSign className="w-4 h-4 mr-1" />
                        Payer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-dashed border-2 border-border">
              <CardContent className="py-16 text-center">
                <div className="bg-muted/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Aucun paiement en attente</h3>
                <p className="text-muted-foreground text-sm">
                  Toutes les consultations ont été traitées.
                </p>
              </CardContent>
            </Card>
          )
        ) : (
          // Traitées aujourd'hui
          todayProcessed.length > 0 ? (
            todayProcessed.map((consultation) => (
              <Card 
                key={consultation.id}
                className="border-l-4 border-l-emerald-500 border-border opacity-80"
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12 border-2 border-background">
                      <AvatarImage src={consultation.patientPhoto} />
                      <AvatarFallback className="bg-emerald-100 text-emerald-600 font-bold">
                        {consultation.patientName?.[0] || 'P'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground truncate">
                        {consultation.patientName || `Patient #${consultation.patientId}`}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {consultation.exams?.length || 0} examen(s) traité(s)
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-none">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Payé & Envoyé
                      </Badge>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-dashed border-2 border-border">
              <CardContent className="py-16 text-center">
                <div className="bg-muted/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Aucune consultation traitée</h3>
                <p className="text-muted-foreground text-sm">
                  Aucune examination n'a été traitée aujourd'hui.
                </p>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Modal de paiement */}
      <PaymentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        consultation={selectedConsultation}
        examServices={examServices}
        onProcessPayment={handleProcessPayment}
      />
    </div>
  );
};

export default ReceptionPayments;

