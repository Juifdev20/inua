// 💳 Facturation / Abonnement — page de l'admin d'un hôpital.
// Affiche l'état de l'abonnement, l'historique des paiements et permet de renouveler.
import React, { useState, useEffect } from 'react';
import {
  CreditCard, CalendarClock, CheckCircle2, AlertTriangle, XCircle,
  RefreshCw, Clock, Loader2, X, ReceiptText
} from 'lucide-react';
import { toast } from 'sonner';
import subscriptionApi from '../../services/subscriptionApi';
import PaymentForm from '../../components/subscription/PaymentForm';

const PLAN_LABELS = { STANDARD: 'Standard', PREMIUM: 'Premium', ENTERPRISE: 'Entreprise' };
const fmt = (n, cur) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cur || 'USD' }).format(Number(n || 0));

const STATUS_META = {
  ACTIVE:          { label: 'Actif',              cls: 'text-emerald-600 bg-emerald-500/10', Icon: CheckCircle2 },
  TRIAL:           { label: 'Essai gratuit',      cls: 'text-blue-600 bg-blue-500/10',       Icon: Clock },
  GRACE:           { label: 'Délai de grâce',     cls: 'text-amber-600 bg-amber-500/10',     Icon: AlertTriangle },
  PENDING_PAYMENT: { label: 'En attente paiement',cls: 'text-amber-600 bg-amber-500/10',     Icon: Clock },
  EXPIRED:         { label: 'Expiré',             cls: 'text-rose-600 bg-rose-500/10',       Icon: XCircle },
};

const PAYMENT_STATUS = {
  PENDING:   { label: 'En attente', cls: 'text-amber-600 bg-amber-500/10' },
  CONFIRMED: { label: 'Confirmé',   cls: 'text-emerald-600 bg-emerald-500/10' },
  REJECTED:  { label: 'Rejeté',     cls: 'text-rose-600 bg-rose-500/10' },
};

export default function Billing() {
  const [sub, setSub] = useState(null);
  const [payments, setPayments] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPay, setShowPay] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [plan, setPlan] = useState('STANDARD');
  const [period, setPeriod] = useState('MONTHLY');

  const load = async () => {
    setLoading(true);
    try {
      const [s, p, pr] = await Promise.all([
        subscriptionApi.getSubscription().catch(() => null),
        subscriptionApi.getPayments().catch(() => []),
        subscriptionApi.getPricing().catch(() => null),
      ]);
      setSub(s);
      setPayments(Array.isArray(p) ? p : []);
      setPricing(pr);
      if (s?.plan) setPlan(s.plan);
      if (s?.type === 'ANNUAL') setPeriod('ANNUAL');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const planPricing = pricing?.plans?.find(p => p.plan === plan);
  const amount = planPricing ? (period === 'ANNUAL' ? planPricing.annual : planPricing.monthly) : 0;
  const currency = pricing?.currency || sub?.currency || 'USD';

  const handlePay = async (payload) => {
    setPayLoading(true);
    try {
      await subscriptionApi.pay({ plan, period, ...payload });
      toast.success('Paiement enregistré. En attente de confirmation.');
      setShowPay(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.response?.data?.error || 'Erreur de paiement');
    } finally {
      setPayLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  const meta = STATUS_META[sub?.status] || STATUS_META.ACTIVE;
  const StatusIcon = meta.Icon;
  const daysLeft = sub?.daysRemaining;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Facturation & Abonnement</h1>
            <p className="text-sm text-muted-foreground">Gérez l'abonnement de votre établissement</p>
          </div>
        </div>
        <button onClick={load} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors" title="Rafraîchir">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Carte abonnement */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${meta.cls}`}>
              <StatusIcon className="w-4 h-4" /> {meta.label}
            </span>
            <div className="mt-4 space-y-1">
              <p className="text-lg font-bold text-foreground">
                Plan {PLAN_LABELS[sub?.plan] || sub?.plan || '—'}
                {sub?.type && sub.type !== 'TRIAL' && <span className="text-sm font-normal text-muted-foreground"> · {sub.type === 'ANNUAL' ? 'Annuel' : 'Mensuel'}</span>}
              </p>
              {sub?.endDate && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <CalendarClock className="w-4 h-4" />
                  {sub.status === 'EXPIRED' ? 'Expiré le ' : "Échéance : "} {sub.endDate}
                  {daysLeft != null && daysLeft >= 0 && sub.status !== 'EXPIRED' && (
                    <span className={`ml-1 font-medium ${daysLeft <= 5 ? 'text-amber-600' : 'text-foreground'}`}>
                      ({daysLeft} jour{daysLeft > 1 ? 's' : ''} restant{daysLeft > 1 ? 's' : ''})
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
          <button onClick={() => setShowPay(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
            <CreditCard className="w-4 h-4" /> {sub?.status === 'EXPIRED' ? 'Réactiver' : 'Renouveler'}
          </button>
        </div>

        {(sub?.status === 'EXPIRED' || sub?.status === 'GRACE') && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {sub.status === 'EXPIRED'
                ? "Votre abonnement est expiré : les modules cliniques (réception, pharmacie, laboratoire, médecins, finance) sont bloqués. Renouvelez pour les réactiver."
                : `Votre abonnement a expiré. Vous êtes dans le délai de grâce (${sub.graceDays ?? 0} jours) avant blocage des modules. Renouvelez rapidement.`}
            </p>
          </div>
        )}
      </div>

      {/* Historique des paiements */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <ReceiptText className="w-5 h-5 text-muted-foreground" /> Historique des paiements
        </h2>
        {payments.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border border-border rounded-xl">Aucun paiement pour le moment</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Référence</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Montant</th>
                  <th className="px-4 py-3 font-semibold">Méthode</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => {
                  const st = PAYMENT_STATUS[p.status] || PAYMENT_STATUS.PENDING;
                  return (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs">{p.reference}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.createdAt ? String(p.createdAt).split('T')[0] : '—'}</td>
                      <td className="px-4 py-3">{PLAN_LABELS[p.plan] || p.plan} · {p.period === 'ANNUAL' ? 'Annuel' : 'Mensuel'}</td>
                      <td className="px-4 py-3 font-medium">{fmt(p.amount, p.currency)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.method}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modale de paiement */}
      {showPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Renouveler l'abonnement</h2>
              <button onClick={() => setShowPay(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Sélecteur plan + période */}
              <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-1">
                {['MONTHLY', 'ANNUAL'].map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${period === p ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                    {p === 'MONTHLY' ? 'Mensuel' : 'Annuel'}
                    {p === 'ANNUAL' && pricing?.annualDiscountPercent > 0 && <span className="ml-1 text-[10px]">-{pricing.annualDiscountPercent}%</span>}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(pricing?.plans || []).map(pl => {
                  const price = period === 'ANNUAL' ? pl.annual : pl.monthly;
                  const selected = plan === pl.plan;
                  return (
                    <button key={pl.plan} onClick={() => setPlan(pl.plan)}
                      className={`rounded-lg border-2 p-2 text-center transition ${selected ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700'}`}>
                      <div className="text-xs font-semibold text-gray-900 dark:text-white">{PLAN_LABELS[pl.plan]}</div>
                      <div className="text-[11px] text-gray-500">{fmt(price, currency)}</div>
                    </button>
                  );
                })}
              </div>
              <PaymentForm amount={amount} currency={currency} plan={PLAN_LABELS[plan]} period={period} onSubmit={handlePay} loading={payLoading} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
