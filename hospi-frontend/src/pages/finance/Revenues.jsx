import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import financeApi from '../../services/financeApi/financeApi.js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  TrendingUp, Plus, Edit, Trash2, Download, Search,
  Loader2, RefreshCw, X, Calendar, Save, Filter,
  Wallet, Stethoscope, Microscope, ShoppingCart, Building2,
  Receipt, ArrowDownUp, DollarSign, Bed, FileText
} from 'lucide-react';
import { toast } from 'sonner';

// ═══════════════════════════════════════
// SOURCES / CATÉGORIES D'ENTRÉES
// ═══════════════════════════════════════
const REVENUE_SOURCES = {
  ADMISSION: { label: 'Admission', icon: Wallet, color: '#10B981' },
  CONSULTATION: { label: 'Consultation', icon: Stethoscope, color: '#3B82F6' },
  LABORATOIRE: { label: 'Laboratoire', icon: Microscope, color: '#F59E0B' },
  PHARMACIE: { label: 'Pharmacie', icon: ShoppingCart, color: '#8B5CF6' },
  HOSPITALISATION: { label: 'Hospitalisation', icon: Bed, color: '#EF4444' },
  AUTRE: { label: 'Autre', icon: FileText, color: '#64748B' },
};

const PAYMENT_METHODS = {
  ESPECES: { label: 'Espèces', icon: DollarSign },
  CARTE_BANCAIRE: { label: 'Carte Bancaire', icon: Wallet },
  VIREMENT: { label: 'Virement', icon: Building2 },
  MOBILE_MONEY: { label: 'Mobile Money', icon: Wallet },
  CHEQUE: { label: 'Chèque', icon: FileText },
  ASSURANCE: { label: 'Assurance', icon: FileText },
};

const Revenues = () => {
  const { t } = useTranslation();
  const [revenues, setRevenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showModal, setShowModal] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState(null);
  const [formData, setFormData] = useState({
    amount: '',
    source: 'ADMISSION',
    paymentMethod: 'ESPECES',
    description: ''
  });
  const [stats, setStats] = useState({ today: 0, monthly: 0, total: 0 });

  // ═══════════════════════════════════════
  // CALCUL DES STATS
  // ═══════════════════════════════════════
  const calculateStats = useCallback((revenuesList) => {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const todayTotal = revenuesList
      .filter(r => {
        if (!r.date) return false;
        try {
          return format(new Date(r.date), 'yyyy-MM-dd') === todayStr;
        } catch { return false; }
      })
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const monthlyTotal = revenuesList
      .filter(r => {
        if (!r.date) return false;
        try {
          const d = new Date(r.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        } catch { return false; }
      })
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const totalAmount = revenuesList.reduce((sum, r) => sum + (r.amount || 0), 0);

    setStats({ today: todayTotal, monthly: monthlyTotal, total: totalAmount });
  }, []);

  // ═══════════════════════════════════════
  // CHARGEMENT DES DONNÉES
  // ═══════════════════════════════════════
  const loadRevenues = async () => {
    try {
      setLoading(true);
      const response = await financeApi.getRevenues({
        source: sourceFilter !== 'all' ? sourceFilter : null,
        size: 100
      });
      const arr = response?.content || response?.data?.content || response?.data || response || [];
      const revenuesList = Array.isArray(arr) ? arr : [];
      setRevenues(revenuesList);
      calculateStats(revenuesList);
    } catch (error) {
      console.error('Error loading revenues:', error);
      toast.error(t('errors.loadRevenues') || 'Erreur de chargement des entrées');
      setRevenues([]);
      setStats({ today: 0, monthly: 0, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRevenues();
  }, [sourceFilter]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CDF', minimumFractionDigits: 0 }).format(amount || 0);

  // Filtrage + tri
  const filtered = useMemo(() => {
    return revenues
      .filter(rev => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          (rev.description || '').toLowerCase().includes(q) ||
          (rev.receiptNumber || '').toLowerCase().includes(q) ||
          (rev.patientName || '').toLowerCase().includes(q) ||
          (rev.createdBy?.firstName || '').toLowerCase().includes(q) ||
          (rev.createdBy?.lastName || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const da = new Date(a.date || 0).getTime();
        const db = new Date(b.date || 0).getTime();
        return sortOrder === 'desc' ? db - da : da - db;
      });
  }, [revenues, searchQuery, sortOrder]);

  // Groupement par date
  const groupedByDate = useMemo(() => {
    const groups = {};
    filtered.forEach(r => {
      const dateKey = r.date
        ? format(new Date(r.date), 'yyyy-MM-dd')
        : 'unknown';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(r);
    });
    return groups;
  }, [filtered]);

  // Modal handlers
  const handleNew = () => {
    setEditingRevenue(null);
    setFormData({ amount: '', source: 'ADMISSION', paymentMethod: 'ESPECES', description: '' });
    setShowModal(true);
  };

  const handleEdit = (revenue) => {
    setEditingRevenue(revenue);
    setFormData({
      amount: revenue.amount || '',
      source: revenue.source || 'ADMISSION',
      paymentMethod: revenue.paymentMethod || 'ESPECES',
      description: revenue.description || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        date: new Date().toISOString()
      };

      if (editingRevenue?.id) {
        await financeApi.updateRevenue(editingRevenue.id, payload);
        toast.success(t('finance.revenueUpdated') || 'Entrée mise à jour');
      } else {
        await financeApi.createRevenue(payload);
        toast.success(t('finance.revenueCreated') || 'Entrée de caisse enregistrée');
      }
      setShowModal(false);
      setFormData({ amount: '', source: 'ADMISSION', paymentMethod: 'ESPECES', description: '' });
      loadRevenues();
    } catch (error) {
      toast.error(t('finance.revenueError') || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('finance.confirmDeleteRevenue') || 'Supprimer cette entrée ?')) return;
    try {
      await financeApi.deleteRevenue(id);
      toast.success(t('finance.revenueDeleted') || 'Entrée supprimée');
      loadRevenues();
    } catch (error) {
      toast.error(t('finance.deleteError') || 'Erreur de suppression');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">
          Chargement des entrées de caisse...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <TrendingUp className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Gestion des Revenus
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              {format(new Date(), "MMMM yyyy", { locale: fr })} • {revenues.length} opération{revenues.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-xl font-bold border-2 gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" />
            Exporter
          </Button>
          <Button
            onClick={handleNew}
            size="sm"
            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold gap-1.5 text-xs shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouveau Revenu
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-px rounded-2xl overflow-hidden bg-border shadow-sm">
        <div className="bg-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Aujourd'hui
            </p>
            <p className="text-lg font-black text-emerald-500">{formatCurrency(stats.today)}</p>
          </div>
        </div>
        <div className="bg-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Ce Mois
            </p>
            <p className="text-lg font-black text-blue-500">{formatCurrency(stats.monthly)}</p>
          </div>
        </div>
        <div className="bg-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Total
            </p>
            <p className="text-lg font-black text-violet-500">{formatCurrency(stats.total)}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder='Rechercher...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-muted bg-muted/30 focus:bg-background transition-all text-sm h-9"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          <Card className="border-none shadow-sm bg-card rounded-2xl overflow-hidden">
            <div className="p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Sources</p>
              <div className="space-y-1">
                <button
                  onClick={() => setSourceFilter('all')}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all text-left",
                    sourceFilter === 'all' ? "bg-emerald-500/10 text-emerald-600" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Filter className="w-4 h-4" />
                  Toutes
                  <span className="ml-auto text-xs font-black">{revenues.length}</span>
                </button>

                {Object.entries(REVENUE_SOURCES).map(([key, src]) => {
                  const Icon = src.icon;
                  const count = revenues.filter(r => r.source === key).length;
                  return (
                    <button
                      key={key}
                      onClick={() => setSourceFilter(sourceFilter === key ? 'all' : key)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all text-left",
                        sourceFilter === key ? "text-white shadow-sm" : "text-muted-foreground hover:bg-muted"
                      )}
                      style={sourceFilter === key ? { backgroundColor: src.color, boxShadow: `0 6px 16px -4px ${src.color}40` } : {}}
                    >
                      <Icon className="w-4 h-4" />
                      {src.label}
                      <span className={cn("ml-auto text-xs font-black", sourceFilter === key ? "text-white/80" : "")}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')}
            className="w-full rounded-xl text-xs font-bold gap-1.5 border-2 justify-center"
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
            {sortOrder === 'desc' ? 'Plus recent' : 'Plus ancien'}
          </Button>

          <Button
            onClick={() => loadRevenues()}
            variant="ghost"
            size="sm"
            className="w-full rounded-xl text-xs font-bold gap-1.5 justify-center text-muted-foreground"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Synchroniser
          </Button>
        </div>

        {/* Timeline */}
        <div className="lg:col-span-3">
          {Object.keys(groupedByDate).length === 0 ? (
            <Card className="border-none shadow-sm bg-card rounded-2xl">
              <CardContent className="py-20 text-center">
                <div className="inline-flex p-5 rounded-full bg-emerald-500/5 mb-4">
                  <TrendingUp className="w-10 h-10 text-emerald-300" />
                </div>
                <p className="text-muted-foreground font-medium">
                  {searchQuery ? `Aucun résultat pour "${searchQuery}"` : 'Aucun revenu enregistré'}
                </p>
                <Button onClick={handleNew} variant="outline" size="sm" className="mt-4 rounded-xl font-bold border-2 gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Ajouter
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedByDate).map(([dateKey, items]) => {
                const dayTotal = items.reduce((s, r) => s + (r.amount || 0), 0);
                return (
                  <div key={dateKey}>
                    <div className="flex items-center gap-3 mb-3 px-1">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-emerald-500" />
                      </div>
                      <p className="text-sm font-black text-foreground flex-1">
                        {dateKey !== 'unknown' ? format(new Date(dateKey), 'EEEE dd MMMM yyyy', { locale: fr }) : 'Date inconnue'}
                      </p>
                      <span className="text-xs font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-lg">
                        +{formatCurrency(dayTotal)}
                      </span>
                    </div>

                    <Card className="border-none shadow-sm bg-card rounded-2xl overflow-hidden">
                      <div className="divide-y divide-border/30">
                        {items.map((revenue) => {
                          const srcConfig = REVENUE_SOURCES[revenue.source] || { label: revenue.source, icon: Receipt, color: '#64748B' };
                          const SrcIcon = srcConfig.icon;

                          return (
                            <div key={revenue.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors group">
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `${srcConfig.color}15`, color: srcConfig.color }}
                              >
                                <SrcIcon className="w-5 h-5" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-foreground truncate">
                                  {revenue.description || 'Sans description'}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span
                                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold"
                                    style={{ backgroundColor: `${srcConfig.color}10`, color: srcConfig.color }}
                                  >
                                    {srcConfig.label}
                                  </span>
                                  {revenue.receiptNumber && (
                                    <span className="text-[10px] text-muted-foreground font-mono">{revenue.receiptNumber}</span>
                                  )}
                                  {revenue.patientName && (
                                    <span className="text-[11px] text-muted-foreground">• {revenue.patientName}</span>
                                  )}
                                  {revenue.createdBy && (
                                    <span className="text-[11px] text-muted-foreground">
                                      par {revenue.createdBy.firstName} {revenue.createdBy.lastName}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <p className="text-xs text-muted-foreground font-medium shrink-0 hidden sm:block">
                                {revenue.date ? format(new Date(revenue.date), 'HH:mm', { locale: fr }) : '--'}
                              </p>

                              {revenue.paymentMethod && (
                                <Badge variant="outline" className="text-[10px] font-bold shrink-0">
                                  {PAYMENT_METHODS[revenue.paymentMethod]?.label || revenue.paymentMethod}
                                </Badge>
                              )}

                              <p className="text-base font-black text-emerald-500 shrink-0">+{formatCurrency(revenue.amount)}</p>

                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(revenue)} className="rounded-lg w-8 h-8 hover:bg-muted">
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(revenue.id)} className="rounded-lg w-8 h-8 hover:bg-red-500/10 text-red-500">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground px-1 mt-4">
            <p className="font-medium">{filtered.length} entrée{filtered.length > 1 ? 's' : ''}</p>
            <p>Synchro : {format(new Date(), 'HH:mm:ss')}</p>
          </div>
        </div>
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">
              {editingRevenue ? (t('finance.editRevenue') || "Modifier l'entrée") : (t('finance.newRevenue') || 'Nouvelle entrée de caisse')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t('finance.amount') || 'Montant'} (CDF)
              </Label>
              <Input
                type="number"
                step="100"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
                className="rounded-xl text-lg font-black"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Source</Label>
              <Select value={formData.source} onValueChange={(val) => setFormData({ ...formData, source: val })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REVENUE_SOURCES).map(([key, src]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <src.icon className="w-3.5 h-3.5" /> {src.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Methode de paiement</Label>
              <Select value={formData.paymentMethod} onValueChange={(val) => setFormData({ ...formData, paymentMethod: val })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHODS).map(([key, method]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <method.icon className="w-3.5 h-3.5" /> {method.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Details de l'encaissement..."
                className="rounded-xl"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="rounded-xl font-bold border-2">
                Annuler
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <Save className="w-4 h-4" />
                {editingRevenue ? (t('finance.update') || 'Enregistrer') : (t('finance.save') || 'Creer')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Revenues;
