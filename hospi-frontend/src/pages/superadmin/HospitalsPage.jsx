import React, { useState, useEffect } from 'react';
import {
  Building2, Plus, Search, ToggleLeft, ToggleRight,
  Edit, Trash2, Users, UserCheck, CheckCircle, XCircle,
  RefreshCw, X, Save, UserPlus, Clock, Mail, Check, Ban, Phone, KeyRound
} from 'lucide-react';
import superAdminApi from '../../services/superAdminApi';

const PLANS = ['STANDARD', 'PREMIUM', 'ENTERPRISE'];

const emptyForm = {
  nom: '', code: '', address: '', city: '', country: '',
  phone: '', email: '', adminEmail: '', subscriptionPlan: 'STANDARD',
  maxUsers: 100, notes: '', isActive: true
};

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminTarget, setAdminTarget] = useState(null);
  const [adminForm, setAdminForm] = useState({ email: '', firstName: '', lastName: '' });
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMsg, setAdminMsg] = useState('');
  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggleLoading, setToggleLoading] = useState(false);
  // Demandes d'inscription en attente
  const [pending, setPending] = useState([]);
  const [pendingBusyId, setPendingBusyId] = useState(null);

  const fetchHospitals = async () => {
    setLoading(true);
    try {
      const data = await superAdminApi.getHospitals();
      setHospitals(Array.isArray(data) ? data : []);
    } catch (e) {
      setError('Erreur lors du chargement des hôpitaux');
    } finally {
      setLoading(false);
    }
  };

  const fetchPending = async () => {
    try {
      const data = await superAdminApi.getPendingHospitals();
      setPending(Array.isArray(data) ? data : []);
    } catch (e) {
      // silencieux : la section reste masquée si l'appel échoue
      setPending([]);
    }
  };

  useEffect(() => { fetchHospitals(); fetchPending(); }, []);

  const handleApprove = async (h) => {
    if (!window.confirm(`Approuver « ${h.nom} » ? Le compte admin sera créé et les identifiants envoyés à ${h.adminEmail}.`)) return;
    setPendingBusyId(h.id);
    try {
      const res = await superAdminApi.approveHospital(h.id);
      // Téléchargement du PDF d'identifiants si disponible
      if (res?.pdfBase64) {
        const link = document.createElement('a');
        link.href = 'data:application/pdf;base64,' + res.pdfBase64;
        link.download = res.filename || 'credentials.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      await Promise.all([fetchHospitals(), fetchPending()]);
    } catch (e) {
      alert('Erreur: ' + (e?.response?.data?.message || e?.response?.data?.error || e.message));
    } finally {
      setPendingBusyId(null);
    }
  };

  const handleReject = async (h) => {
    const reason = window.prompt(`Motif du rejet de « ${h.nom} » (optionnel) :`, '');
    if (reason === null) return; // annulé
    setPendingBusyId(h.id);
    try {
      await superAdminApi.rejectHospital(h.id, reason || '');
      await Promise.all([fetchHospitals(), fetchPending()]);
    } catch (e) {
      alert('Erreur: ' + (e?.response?.data?.message || e.message));
    } finally {
      setPendingBusyId(null);
    }
  };

  const openCreate = () => { setEditTarget(null); setForm(emptyForm); setError(''); setShowModal(true); };
  const openEdit = (h) => {
    setEditTarget(h);
    setForm({ nom: h.nom, code: h.code, address: h.address || '', city: h.city || '',
      country: h.country || '', phone: h.phone || '', email: h.email || '',
      adminEmail: h.adminEmail || '', subscriptionPlan: h.subscriptionPlan || 'STANDARD',
      maxUsers: h.maxUsers || 100, notes: h.notes || '', isActive: h.isActive });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nom.trim() || !form.code.trim()) { setError('Nom et code sont obligatoires'); return; }
    setSaving(true); setError('');
    try {
      if (editTarget) {
        await superAdminApi.updateHospital(editTarget.id, form);
      } else {
        await superAdminApi.createHospital(form);
      }
      setShowModal(false);
      fetchHospitals();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (h) => {
    setToggleTarget(h);
  };

  const confirmToggle = async () => {
    if (!toggleTarget) return;
    setToggleLoading(true);
    try {
      const updatedHospital = await superAdminApi.toggleHospital(toggleTarget.id);
      setHospitals(prev => prev.map(hosp =>
        hosp.id === toggleTarget.id ? updatedHospital : hosp
      ));
      setToggleTarget(null);
    } catch (e) {
      alert(e?.response?.data?.message || 'Erreur');
    } finally {
      setToggleLoading(false);
    }
  };

  const openProvisionAdmin = (h) => { setAdminTarget(h); setAdminForm({ email: '', firstName: '', lastName: '' }); setAdminMsg(''); setShowAdminModal(true); };

  const handleProvisionAdmin = async () => {
    if (!adminForm.email) { setAdminMsg('Email obligatoire'); return; }
    setAdminLoading(true);
    try {
      const res = await superAdminApi.provisionAdmin(adminTarget.id, adminForm);
      setAdminMsg(`Compte admin cree pour ${adminTarget.nom} — credentials envoyes par email.`);
      setAdminForm({ email: '', firstName: '', lastName: '' });
      // Telechargement PDF credentials
      if (res?.pdfBase64) {
        const link = document.createElement('a');
        link.href = 'data:application/pdf;base64,' + res.pdfBase64;
        link.download = res.filename || 'credentials.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (e) {
      setAdminMsg('Erreur: ' + (e?.response?.data?.message || e.message));
    } finally { setAdminLoading(false); }
  };

  const [resendBusyId, setResendBusyId] = useState(null);

  const handleResendCredentials = async (h) => {
    if (!window.confirm(`Régénérer et renvoyer les identifiants de l'admin de « ${h.nom} » ?\nUn nouveau mot de passe temporaire sera généré, l'email renvoyé, et le PDF téléchargé.`)) return;
    setResendBusyId(h.id);
    try {
      const res = await superAdminApi.resendCredentials(h.id);
      // Canal 2 : téléchargement immédiat du PDF (fiable même si l'email échoue)
      if (res?.pdfBase64) {
        const link = document.createElement('a');
        link.href = 'data:application/pdf;base64,' + res.pdfBase64;
        link.download = res.filename || 'credentials.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      alert(`Identifiants régénérés pour ${res?.email || 'l\'admin'}.\nEmail renvoyé + PDF téléchargé.`);
    } catch (e) {
      alert('Erreur: ' + (e?.response?.data?.message || e?.response?.data?.error || e.message));
    } finally {
      setResendBusyId(null);
    }
  };

  const handleDelete = async (h) => {
    if (h.id === 1) { alert("L'hôpital principal ne peut pas être supprimé."); return; }
    if (!window.confirm(`Supprimer "${h.nom}" ? Cette action est irréversible.`)) return;
    try { await superAdminApi.deleteHospital(h.id); fetchHospitals(); }
    catch (e) { alert(e?.response?.data?.message || 'Erreur'); }
  };

  const filtered = hospitals.filter(h =>
    h.nom?.toLowerCase().includes(search.toLowerCase()) ||
    h.code?.toLowerCase().includes(search.toLowerCase()) ||
    h.city?.toLowerCase().includes(search.toLowerCase())
  );

  const planColor = (plan) => ({
    STANDARD: 'bg-blue-500/10 text-blue-400',
    PREMIUM: 'bg-purple-500/10 text-purple-400',
    ENTERPRISE: 'bg-amber-500/10 text-amber-400',
  }[plan] || 'bg-muted text-muted-foreground');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestion des Hôpitaux</h1>
            <p className="text-sm text-muted-foreground">Multi-tenant — {hospitals.length} établissement(s) enregistré(s)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { fetchHospitals(); fetchPending(); }} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors" title="Rafraîchir">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            Nouvel hôpital
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total hôpitaux" value={hospitals.length} color="text-primary" icon={Building2} />
        <StatCard label="Actifs" value={hospitals.filter(h => h.isActive).length} color="text-emerald-400" icon={CheckCircle} />
        <StatCard label="Inactifs" value={hospitals.filter(h => !h.isActive).length} color="text-rose-400" icon={XCircle} />
      </div>

      {/* Demandes d'inscription en attente */}
      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-500/20 bg-amber-500/10">
            <Clock className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              Demandes d'inscription en attente ({pending.length})
            </h2>
          </div>
          <div className="divide-y divide-border">
            {pending.map(h => (
              <div key={h.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{h.nom}</span>
                    <span className="font-mono text-xs px-2 py-0.5 bg-muted rounded">{h.code}</span>
                    {h.subscriptionPlan && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planColor(h.subscriptionPlan)}`}>{h.subscriptionPlan}</span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      {[h.requestedAdminFirstName, h.requestedAdminLastName].filter(Boolean).join(' ') || '—'}
                    </span>
                    {h.adminEmail && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{h.adminEmail}</span>}
                    {h.requestedAdminPhone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{h.requestedAdminPhone}</span>}
                    {h.city && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{h.city}{h.country ? `, ${h.country}` : ''}</span>}
                  </div>
                  {h.notes && <p className="mt-1 text-xs text-muted-foreground/80 italic line-clamp-2">{h.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleReject(h)} disabled={pendingBusyId === h.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/40 text-rose-500 text-xs font-medium hover:bg-rose-500/10 disabled:opacity-50 transition-colors">
                    <Ban className="w-3.5 h-3.5" /> Rejeter
                  </button>
                  <button onClick={() => handleApprove(h)} disabled={pendingBusyId === h.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                    <Check className="w-3.5 h-3.5" /> {pendingBusyId === h.id ? 'Traitement...' : 'Approuver'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom, code ou ville..."
          className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Aucun hôpital trouvé</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Hôpital</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Code</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Ville</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Plan</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Utilisateurs</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Patients</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Statut</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(h => (
                <tr key={h.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{h.nom}</div>
                    {h.email && <div className="text-xs text-muted-foreground">{h.email}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs px-2 py-1 bg-muted rounded">{h.code}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{h.city || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${planColor(h.subscriptionPlan)}`}>
                      {h.subscriptionPlan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      <span>{h.totalUsers ?? 0} / {h.maxUsers}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{h.totalPatients ?? 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggle(h)}>
                      {h.isActive
                        ? <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium"><ToggleRight className="w-4 h-4" /> Actif</span>
                        : <span className="flex items-center gap-1 text-rose-400 text-xs font-medium"><ToggleLeft className="w-4 h-4" /> Inactif</span>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openProvisionAdmin(h)} className="p-1.5 rounded hover:bg-primary/10 transition-colors" title="Creer un admin">
                        <UserPlus className="w-4 h-4 text-muted-foreground hover:text-primary" />
                      </button>
                      <button onClick={() => handleResendCredentials(h)} disabled={resendBusyId === h.id} className="p-1.5 rounded hover:bg-emerald-500/10 transition-colors disabled:opacity-50" title="Renvoyer les identifiants (email + PDF)">
                        <KeyRound className="w-4 h-4 text-muted-foreground hover:text-emerald-500" />
                      </button>
                      <button onClick={() => openEdit(h)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Modifier">
                        <Edit className="w-4 h-4 text-muted-foreground hover:text-primary" />
                      </button>
                      <button onClick={() => handleDelete(h)} disabled={h.id === 1} className="p-1.5 rounded hover:bg-rose-500/10 transition-colors" title="Supprimer">
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-rose-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Admin Provision Modal */}
      {showAdminModal && adminTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Creer un admin — {adminTarget.nom}</h2>
              <button onClick={() => setShowAdminModal(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <Field label="Email *" value={adminForm.email} onChange={v => setAdminForm(f => ({...f, email: v}))} type="email" placeholder="admin@hopital.com" />
              <Field label="Prenom" value={adminForm.firstName} onChange={v => setAdminForm(f => ({...f, firstName: v}))} />
              <Field label="Nom" value={adminForm.lastName} onChange={v => setAdminForm(f => ({...f, lastName: v}))} />
              {adminMsg && (
                <div className={adminMsg.includes('Erreur')
                  ? 'px-4 py-2 rounded-lg text-sm bg-rose-500/10 text-rose-400'
                  : 'px-4 py-2 rounded-lg text-sm bg-emerald-500/10 text-emerald-400'}>
                  {adminMsg}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button onClick={() => setShowAdminModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors">Annuler</button>
              <button onClick={handleProvisionAdmin} disabled={adminLoading} className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors">
                <UserPlus className="w-4 h-4" />
                {adminLoading ? 'Creation...' : 'Creer le compte admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Confirmation Modal */}
      {toggleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">
                {toggleTarget.isActive ? 'Désactiver l\'hôpital' : 'Activer l\'hôpital'}
              </h2>
              <button onClick={() => setToggleTarget(null)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className={`flex items-center gap-3 p-4 rounded-lg ${toggleTarget.isActive ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
                {toggleTarget.isActive ? (
                  <ToggleLeft className="w-8 h-8 text-rose-400" />
                ) : (
                  <ToggleRight className="w-8 h-8 text-emerald-400" />
                )}
                <div>
                  <p className="font-medium text-foreground">{toggleTarget.nom}</p>
                  <p className="text-sm text-muted-foreground">{toggleTarget.code}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {toggleTarget.isActive
                  ? 'Êtes-vous sûr de vouloir désactiver cet hôpital ? Le personnel clinique ne pourra plus accéder au système.'
                  : 'Êtes-vous sûr de vouloir activer cet hôpital ? Le personnel clinique pourra à nouveau accéder au système.'}
              </p>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button onClick={() => setToggleTarget(null)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors">
                Annuler
              </button>
              <button
                onClick={confirmToggle}
                disabled={toggleLoading}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  toggleTarget.isActive
                    ? 'bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-60'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60'
                }`}
              >
                {toggleLoading ? 'Traitement...' : toggleTarget.isActive ? 'Désactiver' : 'Activer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">
                {editTarget ? `Modifier — ${editTarget.nom}` : 'Nouvel hôpital'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nom *" value={form.nom} onChange={v => setForm(f => ({...f, nom: v}))} placeholder="Hôpital Général de..." />
              <Field label="Code *" value={form.code} onChange={v => setForm(f => ({...f, code: v.toUpperCase()}))} placeholder="HGK" disabled={!!editTarget} />
              <Field label="Ville" value={form.city} onChange={v => setForm(f => ({...f, city: v}))} />
              <Field label="Pays" value={form.country} onChange={v => setForm(f => ({...f, country: v}))} />
              <Field label="Téléphone" value={form.phone} onChange={v => setForm(f => ({...f, phone: v}))} />
              <Field label="Email hôpital" value={form.email} onChange={v => setForm(f => ({...f, email: v}))} type="email" />
              <Field label="Email admin" value={form.adminEmail} onChange={v => setForm(f => ({...f, adminEmail: v}))} type="email" />
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Plan</label>
                <select value={form.subscriptionPlan} onChange={e => setForm(f => ({...f, subscriptionPlan: e.target.value}))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <Field label="Max utilisateurs" value={form.maxUsers} onChange={v => setForm(f => ({...f, maxUsers: parseInt(v)||100}))} type="number" />
              <div className="sm:col-span-2">
                <Field label="Adresse" value={form.address} onChange={v => setForm(f => ({...f, address: v}))} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
            </div>

            {error && <div className="mx-6 mb-4 px-4 py-2 bg-rose-500/10 text-rose-400 rounded-lg text-sm">{error}</div>}

            <div className="flex justify-end gap-3 px-6 pb-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors">Annuler</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors">
                <Save className="w-4 h-4" />
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '', disabled = false }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50" />
    </div>
  );
}
