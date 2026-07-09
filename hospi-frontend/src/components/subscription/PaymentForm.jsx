// 💳 Formulaire de paiement moderne (simulation) — style Render/Windsurf.
// Fonctionne à l'identique en local et en production : aucune API de paiement réelle
// n'est appelée, seule une transaction "PENDING" est créée côté backend puis confirmée
// par le Super Admin. Aucune donnée bancaire sensible n'est transmise (détail masqué).
import React, { useState } from 'react';
import { Lock, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { PAYMENT_METHODS } from './PaymentMethodLogos';

const fmt = (n, cur) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cur || 'USD', minimumFractionDigits: 2 })
    .format(Number(n || 0));

export default function PaymentForm({ amount, currency = 'USD', plan, period, onSubmit, loading = false }) {
  const [method, setMethod] = useState('VISA');
  const [fields, setFields] = useState({
    holder: '', cardNumber: '', expiry: '', cvv: '', phone: '', bankRef: ''
  });

  const active = PAYMENT_METHODS.find(m => m.id === method) || PAYMENT_METHODS[0];
  const set = (k) => (e) => setFields(f => ({ ...f, [k]: e.target.value }));

  const buildPayload = () => {
    let payerName = fields.holder;
    let payerDetail = '';
    if (active.field === 'card') {
      const digits = (fields.cardNumber || '').replace(/\s+/g, '');
      payerDetail = digits ? '**** **** **** ' + digits.slice(-4) : '';
    } else if (active.field === 'phone') {
      payerDetail = fields.phone;
      if (!payerName) payerName = fields.phone;
    } else {
      payerDetail = fields.bankRef;
    }
    return { method, payerName, payerDetail };
  };

  const valid = () => {
    if (active.field === 'card') {
      return (fields.cardNumber || '').replace(/\s+/g, '').length >= 12 && fields.holder && fields.expiry && fields.cvv;
    }
    if (active.field === 'phone') return (fields.phone || '').length >= 8;
    return (fields.bankRef || '').length >= 3;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!valid()) return;
    onSubmit(buildPayload());
  };

  const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition';
  const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1';

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Récapitulatif montant */}
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-blue-600 to-green-600 text-white px-5 py-4">
        <div>
          <p className="text-xs opacity-80">Abonnement {plan} · {period === 'ANNUAL' ? 'Annuel' : 'Mensuel'}</p>
          <p className="text-2xl font-bold">{fmt(amount, currency)}</p>
        </div>
        <ShieldCheck className="w-8 h-8 opacity-80" />
      </div>

      {/* Choix du moyen de paiement */}
      <div>
        <p className={labelCls}>Moyen de paiement</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {PAYMENT_METHODS.map(({ id, label, Logo }) => (
            <button
              type="button" key={id} onClick={() => setMethod(id)}
              className={`flex flex-col items-center justify-center gap-1.5 h-16 rounded-xl border-2 transition
                ${method === id
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-500'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
            >
              <Logo className="h-5 text-gray-700 dark:text-gray-200" />
              <span className="text-[10px] text-gray-600 dark:text-gray-300">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Champs dynamiques selon le moyen */}
      {active.field === 'card' && (
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Titulaire de la carte</label>
            <input className={inputCls} value={fields.holder} onChange={set('holder')} placeholder="NOM Prénom" />
          </div>
          <div>
            <label className={labelCls}>Numéro de carte</label>
            <input className={inputCls} value={fields.cardNumber} onChange={set('cardNumber')} inputMode="numeric" placeholder="4242 4242 4242 4242" maxLength={19} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Expiration</label>
              <input className={inputCls} value={fields.expiry} onChange={set('expiry')} placeholder="MM/AA" maxLength={5} />
            </div>
            <div>
              <label className={labelCls}>CVV</label>
              <input className={inputCls} value={fields.cvv} onChange={set('cvv')} inputMode="numeric" placeholder="123" maxLength={4} />
            </div>
          </div>
        </div>
      )}

      {active.field === 'phone' && (
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Nom du titulaire (optionnel)</label>
            <input className={inputCls} value={fields.holder} onChange={set('holder')} placeholder="NOM Prénom" />
          </div>
          <div>
            <label className={labelCls}>Numéro {active.label}</label>
            <input className={inputCls} value={fields.phone} onChange={set('phone')} inputMode="tel" placeholder="+243 8XX XXX XXX" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Un message de confirmation (simulation) serait envoyé sur ce numéro.
          </p>
        </div>
      )}

      {active.field === 'bank' && (
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Nom / Raison sociale</label>
            <input className={inputCls} value={fields.holder} onChange={set('holder')} placeholder="Nom du titulaire du compte" />
          </div>
          <div>
            <label className={labelCls}>Référence / N° de compte</label>
            <input className={inputCls} value={fields.bankRef} onChange={set('bankRef')} placeholder="Référence du virement" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Effectuez le virement puis renseignez la référence : elle sera vérifiée par notre équipe.
          </p>
        </div>
      )}

      {/* Note simulation */}
      <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2">
        <CheckCircle2 className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Paiement en mode démonstration : aucun montant réel n'est débité. Votre paiement sera
          validé manuellement par l'équipe Inua Afya, puis votre abonnement activé.
        </p>
      </div>

      <button type="submit" disabled={loading || !valid()}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-green-600 text-white font-semibold hover:opacity-90 disabled:opacity-50 transition shadow-md">
        {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Traitement...</> : <><Lock className="w-4 h-4" /> Payer {fmt(amount, currency)}</>}
      </button>
    </form>
  );
}
