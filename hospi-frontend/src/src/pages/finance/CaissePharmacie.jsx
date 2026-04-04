import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pill, Eye, DollarSign, CheckCircle, Package,
  Search, Loader2, RefreshCw, ArrowUpDown,
  Receipt, ShoppingBag, Tablets, ClipboardList,
  Clock, ChevronRight, AlertTriangle, PackageCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import financeApi from '../../services/financeApi/financeApi.js';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import PaymentModal from '../../components/modals/PaymentModal.jsx';
import { toast } from 'sonner';

const CaissePharmacie = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => { loadPrescriptions(); }, []);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      const data = await financeApi.getPharmacyQueue();
      const dataArray = data?.content || data || [];
      setPrescriptions(Array.isArray(dataArray) ? dataArray : []);
    } catch (error) {
      console.error('Error loading prescriptions:', error);
      toast.error(t('common.error') || 'Erreur chargement ordonnances');
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedInvoice(null);
    setSelectedPrescription(null);
    loadPrescriptions();
    toast.success(t('finance.payment.success') || 'Paiement validé');
  };

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

  const isPaid = (s) => s === 'PAID' || s === 'PAYEE';
  const isUnpaid = (s) => !isPaid(s);

  const totalPaid = prescriptions.filter((p) => isPaid(p.status)).length;
  const totalUnpaid = prescriptions.filter((p) => isUnpaid(p.status)).length;
  const totalAmountUnpaid = prescriptions
    .filter((p) => isUnpaid(p.status))
    .reduce((s, p) => s + (p.totalAmount || p.amount || 0), 0);
  const totalAmountPaid = prescriptions
    .filter((p) => isPaid(p.status))
    .reduce((s, p) => s + (p.totalAmount || p.amount || 0), 0);

  const filtered = prescriptions
    .filter((rx) => {
      const match = (rx.patientName || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (filterStatus === 'PAID') return match && isPaid(rx.status);
      if (filterStatus === 'UNPAID') return match && isUnpaid(rx.status);
      return match;
    })
    .sort((a, b) => {
      const dA = new Date(a.createdAt || a.date || 0).getTime();
      const dB = new Date(b.createdAt || b.date || 0).getTime();
      return sortOrder === 'desc' ? dB - dA : dA - dB;
    });

  const getMedCount = (rx) => (rx.services || rx.items || []).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500" data-testid="caisse-pharmacie">

      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-teal-500/10">
              <Pill className="w-7 h-7 text-teal-600" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                {t('finance.pharmacy') || 'Caisse Pharmacie'}
              </h1>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-0.5">
                {format(new Date(), "EEEE dd MMMM • HH:mm", { locale: fr })}
              </p>
            </div>
          </div>
          <Button
            onClick={loadPrescriptions}
            variant="outline" size="sm"
            className="rounded-xl font-bold border-2 shrink-0"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Actualiser
          </Button>
        </div>

        {/* Compteurs compacts — accent teal */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-card rounded-xl border border-border shadow-sm">
            <div className="w-2 h-2 rounded-full bg-teal-500" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ordonnances</span>
            <span className="text-lg font-black text-foreground ml-1">{prescriptions.length}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/5 rounded-xl border border-amber-500/20 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">En attente</span>
            <span className="text-lg font-black text-amber-600 ml-1">{totalUnpaid}</span>
            <span className="text-[10px] text-amber-500/70 font-bold ml-1 hidden sm:inline">
              ({formatCurrency(totalAmountUnpaid)})
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-teal-500/5 rounded-xl border border-teal-500/20 shadow-sm">
            <PackageCheck className="w-3.5 h-3.5 text-teal-500" />
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Retrait OK</span>
            <span className="text-lg font-black text-teal-600 ml-1">{totalPaid}</span>
            <span className="text-[10px] text-teal-500/70 font-bold ml-1 hidden sm:inline">
              ({formatCurrency(totalAmountPaid)})
            </span>
          </div>
        </div>
      </div>

      {/* ═══ TOOLBAR ═══ */}
      <Card className="border-none shadow-sm bg-card rounded-2xl overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un patient ou une ordonnance..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-muted bg-muted/20 focus:bg-background focus:ring-2 focus:ring-teal-500/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex rounded-xl border border-border overflow-hidden">
              {[
                { key: 'ALL', label: 'Toutes' },
                { key: 'UNPAID', label: 'À payer' },
                { key: 'PAID', label: 'Retrait OK' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilterStatus(f.key)}
                  className={cn(
                    'px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all',
                    filterStatus === f.key
                      ? 'bg-teal-500 text-white shadow-inner'
                      : 'bg-transparent text-muted-foreground hover:bg-muted'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <Button
              variant="ghost" size="icon"
              className="rounded-xl hover:bg-muted"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            >
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </Card>

      {/* ═══ CONTENU — Grille de cartes + Panneau détail ═══ */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
          <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">
            Chargement des ordonnances...
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-none shadow-sm bg-card rounded-2xl">
          <div className="py-24 text-center">
            <div className="inline-flex p-4 rounded-full bg-muted mb-4">
              <Pill className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium italic">
              {searchQuery ? `Aucun résultat pour "${searchQuery}"` : 'Aucune ordonnance en attente'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── GRILLE ORDONNANCES (3 colonnes) ── */}
          <div className="lg:col-span-3 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((rx) => {
                const isActive = selectedPrescription?.id === rx.id;
                const paid = isPaid(rx.status);

                return (
                  <Card
                    key={rx.id}
                    onClick={() => setSelectedPrescription(rx)}
                    className={cn(
                      'border shadow-sm rounded-2xl cursor-pointer transition-all hover:shadow-md group relative overflow-hidden',
                      isActive
                        ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-md'
                        : 'border-border hover:border-teal-500/30'
                    )}
                    data-testid={`pharmacy-card-${rx.id}`}
                  >
                    {/* Bande latérale statut */}
                    <div className={cn(
                      'absolute top-0 left-0 w-1 h-full',
                      paid ? 'bg-teal-500' : 'bg-amber-500'
                    )} />

                    <CardContent className="p-5 pl-6">
                      {/* Header carte */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm',
                            paid
                              ? 'bg-teal-500/10 text-teal-600'
                              : 'bg-amber-500/10 text-amber-600'
                          )}>
                            {(rx.patientName || '?').charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-foreground truncate">
                              {rx.patientName || 'Patient Inconnu'}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {formatTime(rx.createdAt || rx.date)} • #{rx.id}
                            </p>
                          </div>
                        </div>
                        {!paid && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0 mt-2" />
                        )}
                      </div>

                      {/* Médicaments preview */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {(rx.services || rx.items || []).slice(0, 3).map((med, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-teal-500/8 text-teal-700 dark:text-teal-400 truncate max-w-[140px]"
                          >
                            💊 {med.name || med.serviceName}
                          </span>
                        ))}
                        {getMedCount(rx) > 3 && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-muted text-muted-foreground">
                            +{getMedCount(rx) - 3}
                          </span>
                        )}
                      </div>

                      {/* Footer : montant + statut */}
                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <p className={cn(
                          'text-lg font-black',
                          paid ? 'text-teal-600' : 'text-amber-600'
                        )}>
                          {formatCurrency(rx.totalAmount || rx.amount)}
                        </p>
                        <Badge className={cn(
                          'border-none text-[10px] font-bold',
                          paid
                            ? 'bg-teal-500/10 text-teal-600'
                            : 'bg-amber-500/10 text-amber-600'
                        )}>
                          {paid ? (
                            <><PackageCheck className="w-3 h-3 mr-1" /> Retrait OK</>
                          ) : (
                            <><Clock className="w-3 h-3 mr-1" /> À payer</>
                          )}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Barre résumé */}
            <div className="p-3 rounded-xl bg-card border border-border shadow-sm flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">
                {filtered.length} ordonnance{filtered.length > 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">
                  À encaisser : <strong className="text-amber-600">{formatCurrency(totalAmountUnpaid)}</strong>
                </span>
                <span className="text-muted-foreground">
                  Encaissé : <strong className="text-teal-600">{formatCurrency(totalAmountPaid)}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* ── PANNEAU DÉTAIL (2 colonnes) ── */}
          <div className="lg:col-span-2 space-y-6">
            {selectedPrescription ? (
              <>
                <Card className="border-none shadow-sm bg-card rounded-2xl overflow-hidden">
                  {/* Entête */}
                  <div className={cn(
                    'p-5 border-b border-border/50',
                    isPaid(selectedPrescription.status) ? 'bg-teal-500/5' : 'bg-amber-500/5'
                  )}>
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl',
                        isPaid(selectedPrescription.status) ? 'bg-teal-500' : 'bg-amber-500'
                      )}>
                        {(selectedPrescription.patientName || '?').charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-black text-foreground truncate">
                          {selectedPrescription.patientName || 'Patient Inconnu'}
                        </h3>
                        <p className="text-xs text-muted-foreground font-medium">
                          #{selectedPrescription.id} • {formatFullDate(selectedPrescription.createdAt || selectedPrescription.date)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-5 space-y-5">
                    {/* Workflow : Prescrit → Payé → Retrait */}
                    <div className="flex items-center justify-center gap-0 py-3">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 bg-teal-500/10 border-teal-500 text-teal-500">
                          <ClipboardList className="w-4 h-4" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Prescrit</span>
                      </div>

                      <div className={cn(
                        'w-12 h-0.5 mt-[-16px]',
                        isPaid(selectedPrescription.status) ? 'bg-teal-500' : 'bg-border'
                      )} />

                      <div className="flex flex-col items-center gap-1.5">
                        <div className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center border-2',
                          isPaid(selectedPrescription.status)
                            ? 'bg-teal-500/10 border-teal-500 text-teal-500'
                            : 'bg-muted border-border text-muted-foreground'
                        )}>
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Payé</span>
                      </div>

                      <div className={cn(
                        'w-12 h-0.5 mt-[-16px]',
                        isPaid(selectedPrescription.status) ? 'bg-teal-500' : 'bg-border'
                      )} />

                      <div className="flex flex-col items-center gap-1.5">
                        <div className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center border-2',
                          isPaid(selectedPrescription.status)
                            ? 'bg-teal-500/10 border-teal-500 text-teal-500'
                            : 'bg-muted border-border text-muted-foreground'
                        )}>
                          <Package className="w-4 h-4" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Retrait</span>
                      </div>
                    </div>

                    {/* Montant */}
                    <div className="text-center py-2">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                        Montant total
                      </p>
                      <p className={cn(
                        'text-4xl font-black tracking-tighter',
                        isPaid(selectedPrescription.status) ? 'text-teal-600' : 'text-amber-600'
                      )}>
                        {formatCurrency(selectedPrescription.totalAmount || selectedPrescription.amount)}
                      </p>
                      <div className="mt-3">
                        {isPaid(selectedPrescription.status) ? (
                          <Badge className="border-none bg-teal-500/10 text-teal-600 font-bold px-4 py-1">
                            <PackageCheck className="w-3.5 h-3.5 mr-1.5" /> Retrait autorisé
                          </Badge>
                        ) : (
                          <Badge className="border-none bg-amber-500/10 text-amber-600 font-bold px-4 py-1">
                            <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> En attente de paiement
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Liste des médicaments */}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">
                        Médicaments prescrits
                      </p>
                      {(selectedPrescription.services || selectedPrescription.items || []).length > 0 ? (
                        <div className="space-y-2">
                          {(selectedPrescription.services || selectedPrescription.items).map((med, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
                                  <Pill className="w-3.5 h-3.5 text-teal-500" />
                                </div>
                                <div className="min-w-0">
                                  <span className="text-sm font-bold text-foreground block truncate">
                                    {med.name || med.serviceName}
                                  </span>
                                  {med.dosage && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {med.dosage}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-sm font-black text-foreground shrink-0 ml-3">
                                {formatCurrency(med.price || med.unitPrice)}
                              </span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between p-3 rounded-xl bg-foreground/5 mt-1">
                            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                              Total ({(selectedPrescription.services || selectedPrescription.items).length} article{(selectedPrescription.services || selectedPrescription.items).length > 1 ? 's' : ''})
                            </span>
                            <span className="text-base font-black text-foreground">
                              {formatCurrency(selectedPrescription.totalAmount || selectedPrescription.amount)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 text-center rounded-xl bg-muted/20">
                          <p className="text-xs text-muted-foreground italic">
                            Aucun médicament détaillé
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {isUnpaid(selectedPrescription.status) && (
                      <Button
                        onClick={() => handlePayment(selectedPrescription)}
                        className="w-full h-14 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-black text-base gap-3 shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        data-testid="btn-encaisser"
                      >
                        <DollarSign className="w-5 h-5" />
                        Encaisser & Autoriser le retrait
                      </Button>
                    )}

                    {isPaid(selectedPrescription.status) && (
                      <div className="space-y-3">
                        <div className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/10 text-center">
                          <PackageCheck className="w-6 h-6 text-teal-500 mx-auto mb-2" />
                          <p className="text-sm font-bold text-teal-600">
                            Le patient peut retirer ses médicaments
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold border-2 gap-2">
                            <Eye className="w-4 h-4" /> Reçu
                          </Button>
                          <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold border-2 gap-2">
                            <Receipt className="w-4 h-4" /> Imprimer
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              /* État vide */
              <Card className="border-none shadow-sm bg-card rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-teal-500/5 flex items-center justify-center mb-6">
                      <ShoppingBag className="w-10 h-10 text-teal-500/30" />
                    </div>
                    <h3 className="text-lg font-black text-foreground mb-2">
                      Sélectionnez une ordonnance
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                      Cliquez sur une ordonnance pour voir les médicaments prescrits et procéder au paiement.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Note contextuelle — accent teal */}
            <div className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/10">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-teal-500/10 shrink-0">
                  <Package className="w-4 h-4 text-teal-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-teal-600 mb-1">Dispensation</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Après encaissement, le retrait des médicaments est automatiquement 
                    autorisé. Le pharmacien verra le statut mis à jour dans son interface.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

export default CaissePharmacie;