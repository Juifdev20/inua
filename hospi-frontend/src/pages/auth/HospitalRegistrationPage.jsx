// 🏥 Inscription d'un établissement (hôpital) — Formulaire public + choix du plan + paiement.
// Flux : formulaire → (essai gratuit → confirmation) OU (paiement simulé → confirmation).
// La demande est ensuite validée par le Super Admin qui envoie les identifiants par email.
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, MapPin, Phone, Mail, User, Globe, FileText,
  Loader2, ArrowLeft, CheckCircle2, Send, ShieldCheck, Check, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import LogoInuaAfya from '../../components/LogoInuaAfya';
import publicApi from '../../services/publicApi';
import PaymentForm from '../../components/subscription/PaymentForm';

const PLAN_LABELS = { STANDARD: 'Standard', PREMIUM: 'Premium', ENTERPRISE: 'Entreprise' };
const fmt = (n, cur) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cur || 'USD' }).format(Number(n || 0));

// ⚠️ Défini au niveau module (PAS dans le composant) : sinon React recrée le type
// à chaque frappe et démonte les <input>, ce qui fait perdre le focus.
const Shell = ({ children, wide }) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-10 px-4">
    <div className={`mx-auto ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>
      <div className="flex items-center justify-between mb-8">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 transition">
          <ArrowLeft className="w-5 h-5" /> Accueil
        </Link>
        <LogoInuaAfya size={40} />
      </div>
      {children}
    </div>
  </div>
);

const HospitalRegistrationPage = () => {
  const [step, setStep] = useState('form');          // form | payment | done
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState(null);
  const [created, setCreated] = useState(null);      // { id, code }
  const [paidTrial, setPaidTrial] = useState('trial'); // 'trial' | 'paid'
  const [autoActivated, setAutoActivated] = useState(false); // paiement/essai validé automatiquement

  const [form, setForm] = useState({
    nom: '', code: '', address: '', city: '', country: 'RD Congo',
    phone: '', email: '', subscriptionPlan: 'STANDARD', period: 'MONTHLY', notes: '',
    requestedAdminFirstName: '', requestedAdminLastName: '',
    adminEmail: '', requestedAdminPhone: '',
  });

  useEffect(() => {
    publicApi.getPricing().then(setPricing).catch(() => {});
  }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const planPricing = pricing?.plans?.find(p => p.plan === form.subscriptionPlan);
  const amount = planPricing ? (form.period === 'ANNUAL' ? planPricing.annual : planPricing.monthly) : 0;
  const currency = pricing?.currency || 'USD';
  const trialDays = pricing?.trialDays ?? 0;

  const validate = () => {
    if (!form.nom.trim()) return "Le nom de l'établissement est obligatoire";
    if (!form.requestedAdminFirstName.trim() || !form.requestedAdminLastName.trim())
      return "Le nom et prénom de l'administrateur sont obligatoires";
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(form.adminEmail)) return "L'email administrateur est invalide";
    if (form.email && !emailRe.test(form.email)) return "L'email de l'établissement est invalide";
    return null;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { toast.error(err); return; }
    setLoading(true);
    try {
      const res = await publicApi.registerHospital(form);
      // La réponse est enveloppée : { success, message, data: { id, code, status, autoOnboarded } }
      const data = res?.data || res;
      setCreated(data);
      if (trialDays > 0) {
        setPaidTrial('trial');
        setAutoActivated(Boolean(data?.autoOnboarded));
        setStep('done');
        toast.success('Établissement créé !');
      } else {
        setStep('payment');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.response?.data?.error || "Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (payload) => {
    setLoading(true);
    try {
      const res = await publicApi.submitPayment({
        hospitalId: created?.id,
        plan: form.subscriptionPlan,
        period: form.period,
        ...payload,
      });
      setPaidTrial('paid');
      setAutoActivated((res?.status || res?.data?.status) === 'CONFIRMED');
      setStep('done');
      toast.success('Paiement effectué !');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.response?.data?.error || 'Erreur de paiement');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  // ─────────── ÉTAPE : CONFIRMATION ───────────
  if (step === 'done') {
    return (
      <Shell>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-gray-100 dark:border-gray-700">
          <div className="inline-flex p-4 rounded-full bg-green-100 dark:bg-green-900/40 mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {autoActivated ? 'Établissement activé !' : paidTrial === 'paid' ? 'Paiement effectué !' : 'Demande envoyée !'}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {autoActivated ? (
              <>
                Votre établissement <strong>{form.nom}</strong> est actif
                {paidTrial === 'trial' && trialDays > 0 && <> (essai gratuit de <strong>{trialDays} jours</strong>)</>}.
                {' '}Les identifiants de connexion de l'administrateur viennent d'être envoyés à <strong>{form.adminEmail}</strong>.
                Vérifiez votre boîte mail (et les spams).
              </>
            ) : (
              <>
                Votre demande pour <strong>{form.nom}</strong> a été transmise.
                {' '}Après validation, les identifiants de l'administrateur seront envoyés à <strong>{form.adminEmail}</strong>.
              </>
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/" className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">Retour à l'accueil</Link>
            <Link to="/login" className="px-6 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition">Se connecter</Link>
          </div>
        </div>
      </Shell>
    );
  }

  // ─────────── ÉTAPE : PAIEMENT ───────────
  if (step === 'payment') {
    return (
      <Shell>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Paiement de l'abonnement</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{form.nom} · {PLAN_LABELS[form.subscriptionPlan]}</p>
          <PaymentForm amount={amount} currency={currency} plan={PLAN_LABELS[form.subscriptionPlan]} period={form.period} onSubmit={handlePayment} loading={loading} />
        </div>
      </Shell>
    );
  }

  // ─────────── ÉTAPE : FORMULAIRE ───────────
  return (
    <Shell wide>
      <div className="text-center mb-8">
        <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-blue-600 to-green-600 mb-4">
          <Building2 className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Inscrire votre établissement</h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
          Rejoignez Inua Afya. {trialDays > 0
            ? `Profitez de ${trialDays} jours d'essai gratuit.`
            : "Choisissez votre formule et réglez l'abonnement pour activer votre hôpital."}
        </p>
      </div>

      <form onSubmit={handleRegister} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Choix du plan */}
        <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Formule d'abonnement</h2>

          {/* Période mensuel/annuel */}
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-1 mb-4">
            {['MONTHLY', 'ANNUAL'].map(p => (
              <button type="button" key={p} onClick={() => setForm(f => ({ ...f, period: p }))}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${form.period === p ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                {p === 'MONTHLY' ? 'Mensuel' : 'Annuel'}
                {p === 'ANNUAL' && pricing?.annualDiscountPercent > 0 && (
                  <span className="ml-1 text-[10px]">-{pricing.annualDiscountPercent}%</span>
                )}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            {(pricing?.plans || [{ plan: 'STANDARD' }, { plan: 'PREMIUM' }, { plan: 'ENTERPRISE' }]).map(pl => {
              const price = form.period === 'ANNUAL' ? pl.annual : pl.monthly;
              const selected = form.subscriptionPlan === pl.plan;
              return (
                <button type="button" key={pl.plan} onClick={() => setForm(f => ({ ...f, subscriptionPlan: pl.plan }))}
                  className={`text-left rounded-xl border-2 p-4 transition ${selected ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-500' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 dark:text-white">{PLAN_LABELS[pl.plan]}</span>
                    {selected && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                  {price != null && (
                    <div className="mt-2">
                      <span className="text-xl font-bold text-gray-900 dark:text-white">{fmt(price, currency)}</span>
                      <span className="text-xs text-gray-500"> /{form.period === 'ANNUAL' ? 'an' : 'mois'}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {trialDays > 0 && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
              <Sparkles className="w-4 h-4" /> {trialDays} jours d'essai gratuit inclus — paiement après l'essai.
            </p>
          )}
        </div>

        {/* Établissement */}
        <div className="p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" /> Informations de l'établissement
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Nom de l'établissement *</label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input name="nom" value={form.nom} onChange={onChange} required placeholder="Hôpital Général de ..." className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Ville</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input name="city" value={form.city} onChange={onChange} placeholder="Kinshasa" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Pays</label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input name="country" value={form.country} onChange={onChange} className={inputCls} />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Adresse</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input name="address" value={form.address} onChange={onChange} placeholder="Avenue, quartier, commune..." className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Téléphone</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input name="phone" value={form.phone} onChange={onChange} placeholder="+243 ..." className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Email de l'établissement</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input name="email" type="email" value={form.email} onChange={onChange} placeholder="contact@hopital.cd" className={inputCls} />
              </div>
            </div>
          </div>
        </div>

        <div className="h-px bg-gray-100 dark:bg-gray-700" />

        {/* Administrateur */}
        <div className="p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
            <User className="w-5 h-5 text-green-600" /> Administrateur de l'hôpital
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Cette personne recevra les identifiants et gérera les comptes (réception, finance, labo, pharmacie, médecins…).
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Prénom *</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input name="requestedAdminFirstName" value={form.requestedAdminFirstName} onChange={onChange} required className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Nom *</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input name="requestedAdminLastName" value={form.requestedAdminLastName} onChange={onChange} required className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Email de l'administrateur *</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input name="adminEmail" type="email" value={form.adminEmail} onChange={onChange} required placeholder="admin@hopital.cd" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Téléphone de l'administrateur</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input name="requestedAdminPhone" value={form.requestedAdminPhone} onChange={onChange} placeholder="+243 ..." className={inputCls} />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Message / informations complémentaires</label>
              <div className="relative">
                <FileText className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <textarea name="notes" value={form.notes} onChange={onChange} rows={3}
                  placeholder="Nombre de lits, spécialités, besoins particuliers..."
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition" />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 sm:px-8 py-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" /> Vos informations sont traitées de manière confidentielle.
          </p>
          <button type="submit" disabled={loading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-green-600 text-white font-semibold hover:opacity-90 transition disabled:opacity-60 shadow-md">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Envoi...</>
              : trialDays > 0 ? <><Send className="w-5 h-5" /> Envoyer la demande</>
              : <><Send className="w-5 h-5" /> Continuer vers le paiement</>}
          </button>
        </div>
      </form>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
        Vous avez déjà un compte ? <Link to="/login" className="text-blue-600 hover:underline font-medium">Se connecter</Link>
      </p>
    </Shell>
  );
};

export default HospitalRegistrationPage;
