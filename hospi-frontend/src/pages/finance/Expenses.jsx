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
import { useHospitalConfig } from '../../hooks/useHospitalConfig';
import {
  TrendingDown, Plus, Edit, Trash2, Printer, Search,
  Loader2, RefreshCw, X, Calendar, Save, Filter,
  Wallet, ShoppingCart, Zap, Building2, Receipt,
  ArrowDownUp, DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

// ═══════════════════════════════════════
// CATÉGORIES
// ═══════════════════════════════════════
const CATEGORIES = {
  ADMINISTRATION: { label: 'Administration', icon: Building2, color: '#3B82F6' },
  ADMISSION: { label: 'Admission', icon: Wallet, color: '#10B981' },
  LABORATOIRE: { label: 'Laboratoire', icon: Zap, color: '#F59E0B' },
  PHARMACIE: { label: 'Pharmacie', icon: ShoppingCart, color: '#8B5CF6' },
};

const Expenses = () => {
  const { t } = useTranslation();
  const { config } = useHospitalConfig();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    category: 'ADMINISTRATION',
    currency: 'CDF',
    description: ''
  });
  const [stats, setStats] = useState({ today: { CDF: 0, USD: 0 }, monthly: { CDF: 0, USD: 0 }, total: { CDF: 0, USD: 0 } });
  const [balances, setBalances] = useState({});
  const [totalBalance, setTotalBalance] = useState(0);

  // ═══════════════════════════════════════
  // ★ CHARGEMENT DES SOLDES DE CAISSE
  // ═══════════════════════════════════════
  const loadBalances = async () => {
    try {
      const balanceData = await financeApi.getBalancesBySource();
      setBalances(balanceData || {});
      
      const totalData = await financeApi.getTotalCashBalance();
      setTotalBalance(totalData?.totalBalance || 0);
    } catch (error) {
      console.error('Error loading balances:', error);
    }
  };

  // ═══════════════════════════════════════
  // ★ CALCUL DES STATS CÔTÉ CLIENT
  // ═══════════════════════════════════════
  const calculateStats = useCallback((expensesList) => {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const todayTotalCDF = expensesList
      .filter(e => {
        if (!e.createdAt || e.currency !== 'CDF') return false;
        try {
          return format(new Date(e.createdAt), 'yyyy-MM-dd') === todayStr;
        } catch { return false; }
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const todayTotalUSD = expensesList
      .filter(e => {
        if (!e.createdAt || e.currency !== 'USD') return false;
        try {
          return format(new Date(e.createdAt), 'yyyy-MM-dd') === todayStr;
        } catch { return false; }
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const monthlyTotalCDF = expensesList
      .filter(e => {
        if (!e.createdAt || e.currency !== 'CDF') return false;
        try {
          const d = new Date(e.createdAt);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        } catch { return false; }
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const monthlyTotalUSD = expensesList
      .filter(e => {
        if (!e.createdAt || e.currency !== 'USD') return false;
        try {
          const d = new Date(e.createdAt);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        } catch { return false; }
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const totalAmountCDF = expensesList.filter(e => e.currency === 'CDF').reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalAmountUSD = expensesList.filter(e => e.currency === 'USD').reduce((sum, e) => sum + (e.amount || 0), 0);

    setStats({ 
      today: { CDF: todayTotalCDF, USD: todayTotalUSD }, 
      monthly: { CDF: monthlyTotalCDF, USD: monthlyTotalUSD }, 
      total: { CDF: totalAmountCDF, USD: totalAmountUSD } 
    });
  }, []);

  // ═══════════════════════════════════════
  // CHARGEMENT DES DÉPENSES
  // ═══════════════════════════════════════
  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await financeApi.getExpenses({
        category: categoryFilter !== 'all' ? categoryFilter : null
      });
      const arr = data?.content || data || [];
      const expensesList = Array.isArray(arr) ? arr : [];
      setExpenses(expensesList);
      // ★ Calcul des stats à partir des données chargées
      calculateStats(expensesList);
    } catch (error) {
      console.error('Error loading expenses:', error);
      toast.error(t('errors.loadExpenses') || 'Erreur de chargement');
      setExpenses([]);
      setStats({ today: { CDF: 0, USD: 0 }, monthly: { CDF: 0, USD: 0 }, total: { CDF: 0, USD: 0 } });
    } finally {
      setLoading(false);
    }
  };

  // ★ SUPPRIMÉ : l'ancien loadStats() qui appelait financeApi.api.get(...)
  // Les stats sont maintenant calculées dans loadExpenses()

  useEffect(() => {
    loadExpenses();
    loadBalances();
  }, [categoryFilter]);

  const formatCurrency = (amount, currency = 'CDF') =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency, minimumFractionDigits: 0 }).format(amount || 0);

  // Mapping expense category to revenue source
  const mapExpenseCategoryToSource = (category) => {
    const mapping = {
      'ADMISSION': 'ADMISSION',
      'LABORATOIRE': 'LABORATOIRE',
      'PHARMACIE': 'PHARMACIE',
      'ADMINISTRATION': 'AUTRE',
      'AUTRE': 'AUTRE'
    };
    return mapping[category] || 'AUTRE';
  };

  // Filtrage + tri
  const filtered = useMemo(() => {
    return expenses
      .filter(exp => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          (exp.description || '').toLowerCase().includes(q) ||
          (exp.createdBy?.nom || '').toLowerCase().includes(q) ||
          (exp.createdBy?.prenom || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const da = new Date(a.createdAt || 0).getTime();
        const db = new Date(b.createdAt || 0).getTime();
        return sortOrder === 'desc' ? db - da : da - db;
      });
  }, [expenses, searchQuery, sortOrder]);

  // Groupement par date
  const groupedByDate = useMemo(() => {
    const groups = {};
    filtered.forEach(e => {
      const dateKey = e.createdAt
        ? format(new Date(e.createdAt), 'yyyy-MM-dd')
        : 'unknown';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(e);
    });
    return groups;
  }, [filtered]);

  // Modal
  const handleNew = () => {
    setEditingExpense(null);
    setFormData({ amount: '', category: 'ADMINISTRATION', currency: 'CDF', description: '' });
    setShowModal(true);
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      amount: expense.amount || '',
      category: expense.category || 'ADMINISTRATION',
      currency: expense.currency || 'CDF',
      description: expense.description || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const amount = parseFloat(formData.amount);
      const revenueSource = mapExpenseCategoryToSource(formData.category);
      const availableBalance = balances[revenueSource] || 0;

      // Validate balance before creating expense
      if (amount > availableBalance) {
        toast.error(
          `Solde insuffisant pour ${formData.category}. Disponible: ${formatCurrency(availableBalance)}, Requis: ${formatCurrency(amount)}`
        );
        setIsSubmitting(false);
        return;
      }

      if (editingExpense?.id) {
        toast.info('Mise à jour en développement');
      } else {
        await financeApi.createExpense(formData);
        toast.success(t('finance.expenseCreated') || 'Dépense enregistrée');
      }
      setShowModal(false);
      setFormData({ amount: '', category: 'ADMINISTRATION', description: '' });
      loadExpenses();
      loadBalances(); // Reload balances after expense creation
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || t('finance.expenseError') || 'Erreur lors de la sauvegarde';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('finance.confirmDeleteExpense') || 'Supprimer cette dépense ?')) return;
    try {
      await financeApi.deleteExpense(id);
      toast.success(t('finance.expenseDeleted') || 'Dépense supprimée');
      loadExpenses();
      loadBalances(); // Reload balances after expense deletion
    } catch (error) {
      toast.error(t('finance.deleteError') || 'Erreur de suppression');
    }
  };

  // ═══════════════════════════════════════
  // LOADING
  // ═══════════════════════════════════════
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
        </div>
        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">
          Chargement des dépenses...
        </p>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ══════ HEADER ══════ */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/25">
            <TrendingDown className="w-6 h-6 sm:w-7 sm:h-7 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Gestion des Dépenses
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm font-medium">
              {format(new Date(), "MMMM yyyy", { locale: fr })} • {expenses.length} opération{expenses.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline" 
            className="rounded-xl font-bold border-2 gap-2 text-sm h-12 sm:h-9 sm:text-xs flex-1 sm:flex-none"
            onClick={() => window.print()}
          >
            <Printer className="w-5 h-5 sm:w-3.5 sm:h-3.5" />
            Imprimer
          </Button>
          <Button
            onClick={handleNew}
            className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold gap-2 text-sm h-12 sm:h-9 sm:text-xs shadow-lg shadow-rose-500/20 flex-1 sm:flex-none"
          >
            <Plus className="w-5 h-5 sm:w-3.5 sm:h-3.5" />
            Nouvelle Dépense
          </Button>
        </div>
      </div>

      {/* ══════ BANDEAU RÉSUMÉ ══════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-px rounded-2xl overflow-hidden bg-border shadow-sm">
        <div className="bg-card p-3 sm:p-5 flex items-center gap-3 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Aujourd'hui
            </p>
            <div className="flex flex-col gap-0.5">
              <p className="text-xs sm:text-sm font-black text-rose-500 truncate">CDF: {formatCurrency(stats.today?.CDF || 0, 'CDF')}</p>
              <p className="text-[10px] sm:text-xs font-semibold text-rose-500/70 truncate">USD: {formatCurrency(stats.today?.USD || 0, 'USD')}</p>
            </div>
          </div>
        </div>
        <div className="bg-card p-3 sm:p-5 flex items-center gap-3 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Ce Mois
            </p>
            <div className="flex flex-col gap-0.5">
              <p className="text-xs sm:text-sm font-black text-amber-500 truncate">CDF: {formatCurrency(stats.monthly?.CDF || 0, 'CDF')}</p>
              <p className="text-[10px] sm:text-xs font-semibold text-amber-500/70 truncate">USD: {formatCurrency(stats.monthly?.USD || 0, 'USD')}</p>
            </div>
          </div>
        </div>
        <div className="bg-card p-3 sm:p-5 flex items-center gap-3 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Total
            </p>
            <div className="flex flex-col gap-0.5">
              <p className="text-xs sm:text-sm font-black text-violet-500 truncate">CDF: {formatCurrency(stats.total?.CDF || 0, 'CDF')}</p>
              <p className="text-[10px] sm:text-xs font-semibold text-violet-500/70 truncate">USD: {formatCurrency(stats.total?.USD || 0, 'USD')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════ LAYOUT PRINCIPAL ══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">

        {/* ──── SIDEBAR FILTRES ──── */}
        <div className="lg:col-span-1 space-y-3 lg:space-y-4">
          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder='Rechercher...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-muted bg-muted/30 focus:bg-background transition-all text-sm h-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Catégories */}
          <Card className="border-none shadow-sm bg-card rounded-2xl overflow-hidden">
            <div className="p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">
                Catégories
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all text-left",
                    categoryFilter === 'all'
                      ? "bg-rose-500/10 text-rose-600"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Filter className="w-4 h-4" />
                  Toutes
                  <span className="ml-auto text-xs font-black">{expenses.length}</span>
                </button>

                {Object.entries(CATEGORIES).map(([key, cat]) => {
                  const Icon = cat.icon;
                  const count = expenses.filter(e => e.category === key).length;
                  const balance = balances[key] || 0;
                  const revenueSource = mapExpenseCategoryToSource(key);
                  const sourceBalance = balances[revenueSource] || 0;
                  return (
                    <button
                      key={key}
                      onClick={() => setCategoryFilter(categoryFilter === key ? 'all' : key)}
                      className={cn(
                        "w-full flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl text-sm font-bold transition-all text-left",
                        categoryFilter === key
                          ? "text-white shadow-sm"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                      style={
                        categoryFilter === key
                          ? { backgroundColor: cat.color, boxShadow: `0 6px 16px -4px ${cat.color}40` }
                          : {}
                      }
                    >
                      <div className="flex items-center gap-3 w-full">
                        <Icon className="w-4 h-4" />
                        <span className="flex-1">{cat.label}</span>
                        <span className={cn(
                          "text-xs font-black",
                          categoryFilter === key ? "text-white/80" : ""
                        )}>
                          {count}
                        </span>
                      </div>
                      <div className={cn(
                        "text-[10px] font-medium w-full flex justify-between",
                        categoryFilter === key ? "text-white/70" : "text-muted-foreground"
                      )}>
                        <span>Solde disponible:</span>
                        <span>{formatCurrency(sourceBalance)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Tri */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')}
            className="w-full rounded-xl text-xs font-bold gap-1.5 border-2 justify-center"
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
            {sortOrder === 'desc' ? 'Plus récent' : 'Plus ancien'}
          </Button>

          <Button
            onClick={() => loadExpenses()}
            variant="ghost"
            size="sm"
            className="w-full rounded-xl text-xs font-bold gap-1.5 justify-center text-muted-foreground"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Synchroniser
          </Button>
        </div>

        {/* ──── CONTENU : TIMELINE ──── */}
        <div className="lg:col-span-3">
          {Object.keys(groupedByDate).length === 0 ? (
            <Card className="border-none shadow-sm bg-card rounded-2xl">
              <CardContent className="py-20 text-center">
                <div className="inline-flex p-5 rounded-full bg-rose-500/5 mb-4">
                  <TrendingDown className="w-10 h-10 text-rose-300" />
                </div>
                <p className="text-muted-foreground font-medium">
                  {searchQuery
                    ? `Aucun résultat pour "${searchQuery}"`
                    : 'Aucune dépense enregistrée'}
                </p>
                <Button
                  onClick={handleNew}
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-xl font-bold border-2 gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedByDate).map(([dateKey, items]) => {
                const dayTotal = items.reduce((s, e) => s + (e.amount || 0), 0);
                return (
                  <div key={dateKey}>
                    {/* Date header */}
                    <div className="flex items-center gap-3 mb-3 px-1">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-rose-500" />
                      </div>
                      <p className="text-sm font-black text-foreground flex-1">
                        {dateKey !== 'unknown'
                          ? format(new Date(dateKey), 'EEEE dd MMMM yyyy', { locale: fr })
                          : 'Date inconnue'}
                      </p>
                      <span className="text-xs font-black text-rose-500 bg-rose-500/10 px-3 py-1 rounded-lg">
                        -{formatCurrency(dayTotal)}
                      </span>
                    </div>

                    {/* Expense list */}
                    <Card className="border-none shadow-sm bg-card rounded-2xl overflow-hidden">
                      <div className="divide-y divide-border/30">
                        {items.map((expense) => {
                          const catConfig = CATEGORIES[expense.category] || {
                            label: expense.category, icon: Receipt, color: '#64748B'
                          };
                          const CatIcon = catConfig.icon;

                          return (
                            <div
                              key={expense.id}
                              className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3 sm:py-4 hover:bg-muted/30 transition-colors group"
                            >
                              {/* Header row for mobile */}
                              <div className="flex items-center gap-3 w-full sm:w-auto">
                                {/* Icône catégorie */}
                                <div
                                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: `${catConfig.color}15`, color: catConfig.color }}
                                >
                                  <CatIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>

                                {/* Description */}
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-sm text-foreground break-words">
                                    {expense.description || 'Sans description'}
                                  </p>
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-0.5">
                                    <span
                                      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold"
                                      style={{ backgroundColor: `${catConfig.color}10`, color: catConfig.color }}
                                    >
                                      {catConfig.label}
                                    </span>
                                    {expense.createdBy && (
                                      <span className="text-[11px] text-muted-foreground">
                                        par {expense.createdBy.prenom} {expense.createdBy.nom}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Bottom row for mobile - right side for desktop */}
                              <div className="flex items-center justify-between w-full sm:w-auto sm:flex-col sm:items-end gap-2">
                                {/* Time and amount for mobile */}
                                <div className="flex items-center gap-2 sm:gap-4">
                                  {/* Heure */}
                                  <p className="text-xs text-muted-foreground font-medium shrink-0">
                                    {expense.createdAt
                                      ? format(new Date(expense.createdAt), 'HH:mm', { locale: fr })
                                      : '--'}
                                  </p>

                                  {/* Montant */}
                                  <p className="text-base font-black text-rose-500 shrink-0">
                                    -{formatCurrency(expense.amount, expense.currency || 'CDF')}
                                  </p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  <Button
                                    variant="ghost" size="icon"
                                    onClick={() => handleEdit(expense)}
                                    className="rounded-lg w-7 h-7 sm:w-8 sm:h-8 hover:bg-muted"
                                  >
                                    <Edit className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost" size="icon"
                                    onClick={() => handleDelete(expense.id)}
                                    className="rounded-lg w-7 h-7 sm:w-8 sm:h-8 hover:bg-red-500/10 text-red-500"
                                  >
                                    <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                  </Button>
                                </div>
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

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1 mt-4">
            <p className="font-medium">
              {filtered.length} dépense{filtered.length > 1 ? 's' : ''}
            </p>
            <p>Synchro : {format(new Date(), 'HH:mm:ss')}</p>
          </div>
        </div>
      </div>

      {/* ══════ MODAL AJOUT/EDIT ══════ */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">
              {editingExpense
                ? 'Modifier la dépense'
                : 'Nouvelle Dépense'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Montant
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
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Devise</Label>
              <Select value={formData.currency} onValueChange={(val) => setFormData({ ...formData, currency: val })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CDF">CDF - Franc Congolais</SelectItem>
                  <SelectItem value="USD">USD - Dollar Américain</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Catégorie
              </Label>
              <Select
                value={formData.category}
                onValueChange={(val) => setFormData({ ...formData, category: val })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <cat.icon className="w-3.5 h-3.5" /> {cat.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Description
              </Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Détails de la dépense..."
                className="rounded-xl"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                className="rounded-xl font-bold border-2"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold gap-1.5 shadow-lg shadow-rose-500/20 disabled:opacity-70"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSubmitting
                  ? 'En cours...'
                  : (editingExpense ? 'Enregistrer' : 'Créer')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Expenses;
