// 🛡️ Super Admin — Tarification des abonnements & confirmation des paiements.
import React, { useState, useEffect } from 'react';
import {
  DollarSign, Save, RefreshCw, Check, Ban, Clock, Loader2, Building2, CreditCard, Percent
} from 'lucide-react';
import { toast } from 'sonner';
import superAdminApi from '../../services/superAdminApi';

const PLAN_LABELS = { STANDARD: 'Standard', PREMIUM: 'Premium', ENTERPRISE: 'Entreprise' };
const fmt = (n, cur) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cur || 'USD' }).format(Number(n || 0));

export default function SubscriptionsPage() {
  const [settings, setSettings] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        superAdminApi.getSubscriptionSettings().catch(() => null),
        superAdminApi.getPendingPayments().catch(() => []),
      ]);
      setSettings(s);
      setPayments(Array.isArray(p) ? p : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const upd = (k) => (e) => setSettings(s => ({ ...s, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const saved = await superAdminApi.updateSubscriptionSettings(settings);
      setSettings(saved);
      toast.success('Tarifs enregistrés');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const confirm = async (p) => {
    if (!window.confirm(`Confirmer le paiement de ${fmt(p.amount, p.currency)} pour « ${p.hospitalName} » ?`)) return;
    setBusyId(p.id);
    try {
      await superAdminApi.confirmPayment(p.id);
      toast.success('Paiement confirmé — abonnement activé');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Erreur');
    } finally { setBusyId(null); }
  };

  const reject = async (p) => {
    const reason = window.prompt('Motif du rejet (optionnel) :', '');
    if (reason === null) return;
    setBusyId(p.id);
    try {
      await superAdminApi.rejectPayment(p.id, reason || '');
      toast.success('Paiement rejeté');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Erreur');
    } finally { setBusyId(null); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const cur = settings?.currency || 'USD';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Abonnements</h1>
            <p className="text-sm text-muted-foreground">Tarification & confirmation des paiements</p>
          </div>
        </div>
        <button onClick={load} className="p-2 rounded-lg border border-border hover:bg-muted"><RefreshCw className="w-4 h-4 text-muted-foreground" /></button>
      </div>

      {/* Paiements en attente */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-500/20 bg-amber-500/10">
          <Clock className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-amber-600 dark:text-amber-400">Paiements à confirmer ({payments.length})</h2>
        </div>
        {payments.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">Aucun paiement en attente.</div>
        ) : (
          <div className="divide-y divide-border">
            {payments.map(p => (
              <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">{p.hospitalName}</span>
                    <span className="font-mono text-xs px-2 py-0.5 bg-muted rounded">{p.reference}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{fmt(p.amount, p.currency)}</span>
                    <span>{PLAN_LABELS[p.plan] || p.plan} · {p.period === 'ANNUAL' ? 'Annuel' : 'Mensuel'}</span>
                    <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" />{p.method}</span>
                    {p.payerName && <span>{p.payerName}</span>}
                    {p.payerDetail && <span className="font-mono">{p.payerDetail}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => reject(p)} disabled={busyId === p.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/40 text-rose-500 text-xs font-medium hover:bg-rose-500/10 disabled:opacity-50">
                    <Ban className="w-3.5 h-3.5" /> Rejeter
                  </button>
                  <button onClick={() => confirm(p)} disabled={busyId === p.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 disabled:opacity-50">
                    <Check className="w-3.5 h-3.5" /> {busyId === p.id ? '...' : 'Confirmer'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Automatisation */}
      <div className="rounded-xl border border-border bg-card p-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Automatisation complète</h2>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
            Activé : les paiements sont validés automatiquement (comme une passerelle), l'établissement
            activé et les identifiants admin envoyés par email sans votre intervention. Désactivé : vous
            confirmez chaque paiement manuellement ci-dessus.
          </p>
        </div>
        <button type="button" onClick={() => setSettings(s => ({ ...s, autoApprove: !s?.autoApprove }))}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${settings?.autoApprove ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
          role="switch" aria-checked={!!settings?.autoApprove}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${settings?.autoApprove ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* Réglages tarifaires */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Tarification</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Devise">
            <select value={settings?.currency || 'USD'} onChange={upd('currency')}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/30 outline-none">
              <option value="USD">USD ($)</option>
              <option value="CDF">CDF (FC)</option>
            </select>
          </Field>
          <Field label={`Prix mensuel Standard (${cur})`}><NumInput v={settings?.standardMonthlyPrice} on={upd('standardMonthlyPrice')} /></Field>
          <Field label={`Prix mensuel Premium (${cur})`}><NumInput v={settings?.premiumMonthlyPrice} on={upd('premiumMonthlyPrice')} /></Field>
          <Field label={`Prix mensuel Entreprise (${cur})`}><NumInput v={settings?.enterpriseMonthlyPrice} on={upd('enterpriseMonthlyPrice')} /></Field>
          <Field label="Réduction annuelle (%)"><NumInput v={settings?.annualDiscountPercent} on={upd('annualDiscountPercent')} /></Field>
          <Field label="Jours d'essai gratuit"><NumInput v={settings?.trialDays} on={upd('trialDays')} /></Field>
          <Field label="Délai de grâce (jours)"><NumInput v={settings?.graceDays} on={upd('graceDays')} /></Field>
          <Field label="Alerte avant échéance (jours)"><NumInput v={settings?.alertDaysBefore} on={upd('alertDaysBefore')} /></Field>
        </div>

        {/* Aperçu annuel calculé */}
        <div className="mt-4 grid sm:grid-cols-3 gap-3">
          {['standardMonthlyPrice', 'premiumMonthlyPrice', 'enterpriseMonthlyPrice'].map((k, i) => {
            const plan = ['STANDARD', 'PREMIUM', 'ENTERPRISE'][i];
            const monthly = Number(settings?.[k] || 0);
            const disc = Number(settings?.annualDiscountPercent || 0);
            const annual = monthly * 12 * (1 - disc / 100);
            return (
              <div key={k} className="rounded-lg bg-muted/40 px-3 py-2 text-xs">
                <span className="font-semibold text-foreground">{PLAN_LABELS[plan]}</span> —
                annuel : <span className="font-medium">{fmt(annual, cur)}</span>
                <Percent className="inline w-3 h-3 ml-1 text-muted-foreground" />
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
            <Save className="w-4 h-4" /> {saving ? 'Enregistrement...' : 'Enregistrer les tarifs'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

function NumInput({ v, on }) {
  return (
    <input type="number" min="0" step="0.01" value={v ?? ''} onChange={on}
      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/30 outline-none" />
  );
}
