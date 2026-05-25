import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ClipboardList, Plus, X, ChevronRight, RefreshCw,
  Calendar, User, AlertCircle, CheckCircle2, Clock, XCircle,
  Sun, CalendarDays, CalendarRange, BookOpen
} from 'lucide-react';
import { inventairePharmaAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ─── Constantes ──────────────────────────────────────────────────────────────

const TYPES_INFO = {
  QUOTIDIEN: {
    label: 'Quotidien',
    description: 'Médicaments catégorie A uniquement (vitaux / urgence)',
    frequence: 'Chaque jour ouvrable',
    icon: Sun,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-200 dark:border-orange-800',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  },
  HEBDO: {
    label: 'Hebdomadaire',
    description: 'Médicaments catégories A + B (vitaux + essentiels)',
    frequence: 'Chaque semaine',
    icon: CalendarDays,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  MENSUEL: {
    label: 'Mensuel',
    description: 'Tous les médicaments actifs (A + B + C)',
    frequence: 'Fin de mois',
    icon: CalendarRange,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-800',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  },
  ANNUEL: {
    label: 'Annuel',
    description: 'Inventaire général complet de tous les médicaments',
    frequence: 'Fin d\'exercice comptable',
    icon: BookOpen,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
};

const STATUTS_INFO = {
  EN_COURS: { label: 'En cours', icon: Clock, class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  SOUMIS:   { label: 'Soumis',   icon: AlertCircle, class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  APPROUVE: { label: 'Approuvé', icon: CheckCircle2, class: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  REJETE:   { label: 'Rejeté',   icon: XCircle,     class: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

const PHARMACY_ROLES = ['PHARMACIE', 'PHARMACIST', 'PHARMACY', 'ADMIN'];

// ─── Composant Badge Statut ───────────────────────────────────────────────────

function StatutBadge({ statut }) {
  const info = STATUTS_INFO[statut] || STATUTS_INFO.EN_COURS;
  const Icon = info.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${info.class}`}>
      <Icon className="w-3 h-3" />
      {info.label}
    </span>
  );
}

// ─── Composant Principal ──────────────────────────────────────────────────────

export default function InventairePharmacieList() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [inventaires, setInventaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ type: 'MENSUEL', observations: '' });

  const canLancer = PHARMACY_ROLES.includes(user?.role?.toUpperCase());

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventairePharmaAPI.lister();
      setInventaires(res.data || []);
    } catch (err) {
      toast.error('Erreur lors du chargement des inventaires');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const handleCreer = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await inventairePharmaAPI.creer({ type: form.type, observations: form.observations || null });
      toast.success('Inventaire créé avec succès !');
      setShowForm(false);
      setForm({ type: 'MENSUEL', observations: '' });
      navigate(`/pharmacy/inventaire/${res.data.id}`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Erreur lors de la création';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── En-tête ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Inventaire des Médicaments</h1>
            <p className="text-sm text-muted-foreground">Historique et gestion des inventaires pharmacie</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={charger}
            className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
            title="Actualiser"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
          {canLancer && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Lancer un inventaire
            </button>
          )}
        </div>
      </div>

      {/* ── Cartes explicatives des types ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(TYPES_INFO).map(([key, info]) => {
          const Icon = info.icon;
          return (
            <div key={key} className={`rounded-xl border p-4 ${info.bg} ${info.border}`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-white/60 dark:bg-black/20`}>
                  <Icon className={`w-5 h-5 ${info.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm ${info.color}`}>{info.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{info.description}</p>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-semibold ${info.badge}`}>
                    {info.frequence}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Mini-formulaire de création (inline) ── */}
      {showForm && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-foreground flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Lancer un nouvel inventaire
            </h2>
            <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <form onSubmit={handleCreer} className="space-y-4">
            {/* Type */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Type d'inventaire <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(TYPES_INFO).map(([key, info]) => {
                  const Icon = info.icon;
                  const selected = form.type === key;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setForm(f => ({ ...f, type: key }))}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-xs font-semibold transition-all
                        ${selected
                          ? `${info.border} ${info.bg} ${info.color} shadow-sm`
                          : 'border-border bg-card text-muted-foreground hover:bg-muted'}`}
                    >
                      <Icon className="w-5 h-5" />
                      {info.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Observations */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Observations / Motif <span className="text-muted-foreground font-normal">(optionnel)</span>
              </label>
              <textarea
                rows={2}
                value={form.observations}
                onChange={e => setForm(f => ({ ...f, observations: e.target.value }))}
                placeholder="Ex : Inventaire fin de mois de mai, contrôle suite audit..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            {/* Avertissement */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Les lignes seront générées <strong>automatiquement</strong> selon le type choisi.
                Le stock théorique sera <strong>figé au moment de la création</strong>.
              </span>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {creating ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Création...</>
                ) : (
                  <><ClipboardList className="w-4 h-4" />Lancer l'inventaire</>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Tableau des inventaires ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <p className="text-sm font-semibold text-foreground">
            {inventaires.length} inventaire{inventaires.length !== 1 ? 's' : ''} enregistré{inventaires.length !== 1 ? 's' : ''}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <span className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Chargement...</span>
          </div>
        ) : inventaires.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <ClipboardList className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="font-semibold text-foreground">Aucun inventaire</p>
            <p className="text-sm text-muted-foreground mt-1">
              {canLancer ? 'Cliquez sur "Lancer un inventaire" pour commencer.' : 'Aucun inventaire n\'a encore été réalisé.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Agent responsable</th>
                  <th className="px-4 py-3 hidden md:table-cell">Observations</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Lignes</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inventaires.map((inv) => {
                  const typeInfo = TYPES_INFO[inv.type] || {};
                  const TypeIcon = typeInfo.icon || ClipboardList;
                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => navigate(`/pharmacy/inventaire/${inv.id}`)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium text-foreground">
                            {inv.date ? new Date(inv.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${typeInfo.badge || ''}`}>
                          <TypeIcon className="w-3 h-3" />
                          {typeInfo.label || inv.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-foreground truncate max-w-[140px]">
                            {inv.agentPrenom} {inv.agentNom}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-muted-foreground truncate max-w-[180px] block text-xs">
                          {inv.observations || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-center">
                        <span className="font-semibold text-foreground">{inv.nbLignes}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatutBadge statut={inv.statut} />
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
