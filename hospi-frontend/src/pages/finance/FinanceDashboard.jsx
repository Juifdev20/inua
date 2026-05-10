import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Wallet,
  CreditCard,
  Clock,
  Receipt,
  Search,
  Eye,
  Loader2,
  RefreshCw,
  Users,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format, startOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import financeApi from '../../services/financeApi/financeApi.js';

/* ═══════════════════════════════════════════
   COMPOSANT STAT CARD — DUAL CURRENCY
   ═══════════════════════════════════════════ */
const StatCard = ({ label, value, icon: Icon, color, trend, trendUp, dualCurrency }) => (
  <Card className="border-none shadow-sm bg-card overflow-hidden">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {dualCurrency ? (
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-emerald-600 font-bold">CDF</span>
                <h3 className="text-xl font-black text-foreground">{dualCurrency.cdf}</h3>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-blue-600 font-bold">USD</span>
                <h3 className="text-xl font-black text-foreground">{dualCurrency.usd}</h3>
              </div>
            </div>
          ) : (
            <h3 className="text-3xl font-black text-foreground">{value}</h3>
          )}
          {trend !== undefined && trend !== null && (
            <div className="flex items-center gap-1 pt-1">
              {trendUp
                ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
              <span className={cn(
                "text-xs font-bold",
                trendUp ? "text-emerald-500" : "text-red-500"
              )}>
                {trend}
              </span>
            </div>
          )}
        </div>
        <div
          className="p-4 rounded-2xl transition-transform hover:scale-110"
          style={{ backgroundColor: `${color}15`, color }}
        >
          <Icon size={28} strokeWidth={2.5} />
        </div>
      </div>
    </CardContent>
  </Card>
);

/* ═══════════════════════════════════════════
   DASHBOARD FINANCE — 100% DONNÉES RÉELLES
   ═══════════════════════════════════════════ */
const FinanceDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // ═══════════════════════════════════════
  // FORMATAGE MONÉTAIRE — DUAL CURRENCY
  // ═══════════════════════════════════════
  const formatUSD = useCallback((amount) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'USD', minimumFractionDigits: 0,
    }).format(amount || 0), []);

  const formatCDF = useCallback((amount) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'CDF', minimumFractionDigits: 0,
    }).format(amount || 0), []);

  const formatDualCurrency = (currencyStats) => {
    if (!currencyStats) return { cdf: '0 CDF', usd: '$0' };
    const cdf = currencyStats.cdf ?? currencyStats.CDF ?? 0;
    const usd = currencyStats.usd ?? currencyStats.USD ?? 0;
    return {
      cdf: formatCDF(cdf),
      usd: formatUSD(usd)
    };
  };

  const formatCurrency = formatUSD; // backward compatibility

  // ═══════════════════════════════════════
  // CALCUL DES STATS LOCALES
  // ═══════════════════════════════════════
  const computeLocalStats = useCallback((invoices, expensesList) => {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = subMonths(now, 1).getMonth();

    // --- Revenus ---
    const paidInvoices = invoices.filter(inv =>
      inv.status === 'PAID' || inv.status === 'PAYEE'
    );

    const dailyRevenue = paidInvoices
      .filter(inv => {
        try { return format(new Date(inv.paidAt || inv.createdAt), 'yyyy-MM-dd') === todayStr; }
        catch { return false; }
      })
      .reduce((sum, inv) => sum + (inv.totalAmount || inv.amount || 0), 0);

    const monthlyRevenue = paidInvoices
      .filter(inv => {
        try {
          const d = new Date(inv.paidAt || inv.createdAt);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        } catch { return false; }
      })
      .reduce((sum, inv) => sum + (inv.totalAmount || inv.amount || 0), 0);

    const lastMonthRevenue = paidInvoices
      .filter(inv => {
        try {
          const d = new Date(inv.paidAt || inv.createdAt);
          return d.getMonth() === lastMonth && d.getFullYear() === currentYear;
        } catch { return false; }
      })
      .reduce((sum, inv) => sum + (inv.totalAmount || inv.amount || 0), 0);

    // --- Factures en attente ---
    const pendingInvoices = invoices.filter(inv =>
      inv.status !== 'PAID' && inv.status !== 'PAYEE'
    );

    // --- Total collecté (tout temps) ---
    const totalCollected = paidInvoices
      .reduce((sum, inv) => sum + (inv.totalAmount || inv.amount || 0), 0);

    // --- Dépenses du mois ---
    const monthlyExpenses = expensesList
      .filter(exp => {
        try {
          const d = new Date(exp.createdAt);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        } catch { return false; }
      })
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);

    // --- Tendance mensuelle ---
    const revenueTrend = lastMonthRevenue > 0
      ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : null;

    // --- Évolution des revenus (6 derniers mois) ---
    const revenueEvolution = [];
    for (let i = 5; i >= 0; i--) {
      const targetDate = subMonths(now, i);
      const m = targetDate.getMonth();
      const y = targetDate.getFullYear();
      const monthLabel = format(targetDate, 'MMM yyyy', { locale: fr });
      const monthRevenue = paidInvoices
        .filter(inv => {
          try {
            const d = new Date(inv.paidAt || inv.createdAt);
            return d.getMonth() === m && d.getFullYear() === y;
          } catch { return false; }
        })
        .reduce((sum, inv) => sum + (inv.totalAmount || inv.amount || 0), 0);
      revenueEvolution.push({ month: monthLabel, revenue: monthRevenue });
    }

    // --- Répartition par catégorie/type ---
    const categoryMap = {};
    paidInvoices.forEach(inv => {
      const cat = inv.category || inv.type || inv.department || 'Autre';
      categoryMap[cat] = (categoryMap[cat] || 0) + (inv.totalAmount || inv.amount || 0);
    });
    const revenueByCategory = Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value
    }));

    return {
      dailyRevenue,
      monthlyRevenue,
      pendingInvoices: pendingInvoices.length,
      totalCollected,
      invoicesGenerated: invoices.length,
      totalExpenses: monthlyExpenses,
      revenueTrend,
      revenueEvolution,
      revenueByCategory
    };
  }, []);

  // ═══════════════════════════════════════
  // CHARGEMENT DES DONNÉES RÉELLES — DUAL CURRENCY
  // ═══════════════════════════════════════
  const loadDashboard = async () => {
    try {
      setLoading(true);

      // 1️⃣ Essayer le nouveau endpoint complet avec stats par devise
      let dashboardData = null;
      try {
        const response = await financeApi.getFullDashboard();
        dashboardData = response?.data || response;
        console.log('📊 Dashboard data loaded:', dashboardData);
      } catch (err) {
        console.warn('⚠️ Nouveau endpoint non disponible, fallback sur ancien:', err.message);
      }

      // 2️⃣ Si le nouvel endpoint fonctionne, utiliser ces données
      if (dashboardData && dashboardData.dailyRevenue) {
        // Combine CDF and USD evolution for chart (merge by month)
        const evolutionCDF = dashboardData.revenueEvolutionCDF || [];
        const evolutionUSD = dashboardData.revenueEvolutionUSD || [];

        // Create a map of all months
        const monthsMap = new Map();

        // Add CDF data
        evolutionCDF.forEach(item => {
          monthsMap.set(item.month, { month: item.month, cdf: item.amount || 0, usd: 0 });
        });

        // Add/merge USD data
        evolutionUSD.forEach(item => {
          if (monthsMap.has(item.month)) {
            monthsMap.get(item.month).usd = item.amount || 0;
          } else {
            monthsMap.set(item.month, { month: item.month, cdf: 0, usd: item.amount || 0 });
          }
        });

        // Convert to array and sort by date
        let combinedEvolution = Array.from(monthsMap.values()).map(item => ({
          month: item.month,
          revenue: item.cdf + item.usd,
          cdf: item.cdf,
          usd: item.usd
        }));

        // Sort chronologically (parse month like "avr. 2026")
        combinedEvolution.sort((a, b) => {
          const parseMonth = (str) => {
            const [monthName, year] = str.split(' ');
            const monthMap = {
              'janv.': 0, 'févr.': 1, 'mars': 2, 'avr.': 3,
              'mai': 4, 'juin': 5, 'juil.': 6, 'août': 7,
              'sept.': 8, 'oct.': 9, 'nov.': 10, 'déc.': 11
            };
            return new Date(parseInt(year), monthMap[monthName.toLowerCase()] || 0, 1);
          };
          return parseMonth(a.month) - parseMonth(b.month);
        });

        // Ensure we have last 6 months even if empty
        const generateLast6Months = () => {
          const months = [];
          const today = new Date();
          for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthLabel = format(d, 'MMM yyyy', { locale: fr });
            months.push(monthLabel);
          }
          return months;
        };

        const last6Months = generateLast6Months();
        const existingMonths = new Set(combinedEvolution.map(e => e.month));

        // Add missing months with 0 values
        last6Months.forEach(month => {
          if (!existingMonths.has(month)) {
            combinedEvolution.push({ month, cdf: 0, usd: 0, revenue: 0 });
          }
        });

        // Re-sort after adding missing months
        combinedEvolution.sort((a, b) => {
          const parseMonth = (str) => {
            const [monthName, year] = str.split(' ');
            const monthMap = {
              'janv.': 0, 'févr.': 1, 'mars': 2, 'avr.': 3,
              'mai': 4, 'juin': 5, 'juil.': 6, 'août': 7,
              'sept.': 8, 'oct.': 9, 'nov.': 10, 'déc.': 11
            };
            return new Date(parseInt(year), monthMap[monthName.toLowerCase()] || 0, 1);
          };
          return parseMonth(a.month) - parseMonth(b.month);
        });

        // Map revenueBySource to revenueByCategory for pie chart
        const revenueByCategory = (dashboardData.revenueBySource || []).map(src => ({
          name: src.source,
          value: (src.amount?.cdf || 0) + (src.amount?.usd || 0) * 2500 // Approximate conversion
        })).filter(cat => cat.value > 0);

        setStats({
          dailyRevenue: dashboardData.dailyRevenue,
          monthlyRevenue: dashboardData.monthlyRevenue,
          totalRevenue: dashboardData.totalRevenue,
          dailyExpenses: dashboardData.dailyExpenses,
          monthlyExpenses: dashboardData.monthlyExpenses,
          totalExpenses: dashboardData.totalExpenses,
          netBalance: dashboardData.netBalance,
          pendingInvoicesCount: dashboardData.pendingInvoicesCount,
          totalInvoicesGenerated: dashboardData.totalInvoicesGenerated,
          revenueBySource: dashboardData.revenueBySource,
          expensesByCategory: dashboardData.expensesByCategory,
          revenueEvolution: combinedEvolution,
          revenueEvolutionCDF: evolutionCDF,
          revenueEvolutionUSD: evolutionUSD,
          revenueByCategory,
          recentTransactions: dashboardData.recentTransactions,
        });
        setRecentInvoices(dashboardData.recentTransactions || []);
        setExpenses([]);
      } else {
        // 3️⃣ Fallback: Charger les données individuellement
        let invoicesData = [];
        let expensesData = [];
        let dashboardStats = null;

        try {
          const invoicesResponse = await financeApi.getInvoices();
          invoicesData = invoicesResponse?.content || invoicesResponse || [];
        } catch (err) {
          console.warn('Could not load invoices:', err);
        }

        try {
          const expensesResponse = await financeApi.getExpenses();
          expensesData = expensesResponse?.content || expensesResponse || [];
        } catch (err) {
          console.warn('Could not load expenses:', err);
        }

        try {
          dashboardStats = await financeApi.getDashboardStats();
        } catch (err) {
          console.warn('Could not load dashboard stats:', err);
        }

        // Calculer les stats localement
        const localComputed = computeLocalStats(invoicesData, expensesData);
        setStats({
          ...localComputed,
          ...dashboardStats,
        });
        setRecentInvoices(invoicesData);
        setExpenses(expensesData);
      }

    } catch (err) {
      console.error('❌ Error loading dashboard:', err);
      toast.error('Erreur lors du chargement du tableau de bord');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  // ═══════════════════════════════════════
  // FILTRAGE & HELPERS
  // ═══════════════════════════════════════
  const filteredInvoices = recentInvoices
    .filter((inv) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (inv.patientName || '').toLowerCase().includes(q) ||
        (inv.type || inv.category || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const da = new Date(a.createdAt || 0).getTime();
      const db = new Date(b.createdAt || 0).getTime();
      return db - da;
    });

  const isPaid = (status) => {
    if (!status) return false;
    const paidStatuses = ['PAID', 'PAYEE', 'REMBOURSEE'];
    return paidStatuses.includes(status.toUpperCase());
  };

  const isPending = (status) => {
    if (!status) return true;
    const pendingStatuses = ['PENDING', 'EN_ATTENTE', 'PARTIELLEMENT_PAYEE'];
    return pendingStatuses.includes(status.toUpperCase());
  };

  const getStatusBadge = (status) => {
    if (!status) {
      return <Badge className="border-none font-bold bg-gray-500/10 text-gray-600">Inconnu</Badge>;
    }
    const s = status.toUpperCase();

    if (s === 'PAYEE' || s === 'PAID') {
      return <Badge className="border-none font-bold bg-emerald-500/10 text-emerald-600">Payé</Badge>;
    }
    if (s === 'REMBOURSEE') {
      return <Badge className="border-none font-bold bg-blue-500/10 text-blue-600">Remboursé</Badge>;
    }
    if (s === 'ANNULEE' || s === 'CANCELLED') {
      return <Badge className="border-none font-bold bg-red-500/10 text-red-600">Annulé</Badge>;
    }
    if (s === 'PARTIELLEMENT_PAYEE') {
      return <Badge className="border-none font-bold bg-blue-500/10 text-blue-600">Partiellement payé</Badge>;
    }
    if (s === 'EN_ATTENTE' || s === 'PENDING') {
      return <Badge className="border-none font-bold bg-amber-500/10 text-amber-600">En attente</Badge>;
    }
    return <Badge className="border-none font-bold bg-gray-500/10 text-gray-600">{status}</Badge>;
  };

  const getTypeBadge = (type) => {
    const map = {
      'CONSULTATION': '#10B981',
      'ADMISSION': '#3B82F6',
      'LABORATORY': '#8B5CF6',
      'LABORATOIRE': '#8B5CF6',
      'PHARMACY': '#F59E0B',
      'PHARMACIE': '#F59E0B',
    };
    const color = map[(type || '').toUpperCase()] || '#6B7280';
    return (
      <span
        className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
        style={{ backgroundColor: `${color}15`, color }}
      >
        {type || 'Autre'}
      </span>
    );
  };

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4'];

  // ═══════════════════════════════════════
  // STAT CARDS — Données réelles avec DUAL CURRENCY
  // ═══════════════════════════════════════
  const revenueTrendLabel = stats.revenueTrend !== null && stats.revenueTrend !== undefined
    ? `${stats.revenueTrend > 0 ? '+' : ''}${stats.revenueTrend}%`
    : null;

  // Formater les stats avec dual currency
  const dailyRevenueDual = formatDualCurrency(stats.dailyRevenue);
  const monthlyRevenueDual = formatDualCurrency(stats.monthlyRevenue);
  const totalRevenueDual = formatDualCurrency(stats.totalRevenue || stats.totalCollected);
  const monthlyExpensesDual = formatDualCurrency(stats.monthlyExpenses || stats.totalExpenses);

  const statCards = [
    {
      label: t('finance.stats.dailyRevenue'),
      dualCurrency: dailyRevenueDual,
      icon: DollarSign,
      color: '#10B981',
      trend: null,
      trendUp: true
    },
    {
      label: t('finance.stats.monthlyRevenue'),
      dualCurrency: monthlyRevenueDual,
      icon: TrendingUp,
      color: '#3B82F6',
      trend: revenueTrendLabel,
      trendUp: (stats.revenueTrend || 0) >= 0
    },
    {
      label: t('finance.stats.pendingInvoices'),
      value: stats.pendingInvoices || stats.pendingInvoicesCount || 0,
      icon: FileText,
      color: '#F59E0B',
      trend: null,
      trendUp: false
    },
    {
      label: t('finance.stats.totalCollected'),
      dualCurrency: totalRevenueDual,
      icon: Wallet,
      color: '#8B5CF6',
      trend: null,
      trendUp: true
    },
    {
      label: t('finance.stats.invoicesGenerated'),
      value: stats.invoicesGenerated || stats.totalInvoicesGenerated || 0,
      icon: CreditCard,
      color: '#06B6D4',
      trend: null,
      trendUp: true
    },
    {
      label: t('finance.stats.totalExpenses'),
      dualCurrency: monthlyExpensesDual,
      icon: TrendingDown,
      color: '#EF4444',
      trend: null,
      trendUp: false
    },
  ];

  /* ── LOADING STATE ── */
  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  /* ── RENDU PRINCIPAL ── */
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge className="bg-emerald-500/10 text-emerald-600 border-none mb-3 px-3 py-1 font-bold">
            FINANCE TEMPS RÉEL
          </Badge>
          <h1 className="text-4xl font-black tracking-tight text-foreground">
            Tableau de bord
          </h1>
          <p className="text-muted-foreground font-medium mt-1 uppercase text-sm tracking-widest">
            {format(new Date(), 'EEEE dd MMMM yyyy', { locale: fr })}
          </p>
        </div>
        <Button
          onClick={loadDashboard}
          variant="outline"
          size="sm"
          className="rounded-xl font-bold border-2"
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Synchroniser
        </Button>
      </div>

      {/* ═══ STATS CARDS ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* ═══ CHARTS + SIDEBAR ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Graphiques — 2 colonnes */}
        <div className="lg:col-span-2 space-y-6">

          {/* Évolution des revenus */}
          <Card className="border-none shadow-sm bg-card overflow-hidden rounded-2xl">
            <div className="p-6 border-b border-border/50">
              <h2 className="text-xl font-black uppercase tracking-tight">
                Évolution des revenus
              </h2>
              <p className="text-sm text-muted-foreground font-medium mt-1">
                Performance sur les 6 derniers mois
              </p>
            </div>
            <CardContent className="p-6">
              <div className="h-[320px] w-full">
                {stats?.revenueEvolution?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.revenueEvolution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="month" axisLine={false} tickLine={false}
                        stroke="hsl(var(--muted-foreground))" fontSize={12} fontWeight="bold"
                      />
                      <YAxis
                        yAxisId="left"
                        axisLine={false} tickLine={false}
                        stroke="#10B981" fontSize={11} fontWeight="bold"
                        tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        axisLine={false} tickLine={false}
                        stroke="#3B82F6" fontSize={11} fontWeight="bold"
                        tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderRadius: '12px',
                          border: '1px solid hsl(var(--border))',
                          boxShadow: '0 10px 40px rgba(0,0,0,.2)',
                        }}
                        formatter={(value, name) => {
                          if (name === 'cdf') return [formatCDF(value), 'CDF'];
                          if (name === 'usd') return [formatUSD(value), 'USD'];
                          return [value, name];
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={30}
                        iconType="circle"
                        wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="cdf"
                        name="CDF"
                        stroke="#10B981"
                        strokeWidth={3}
                        dot={{ fill: '#10B981', r: 4 }}
                        activeDot={{ r: 6, fill: '#10B981' }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="usd"
                        name="USD"
                        stroke="#3B82F6"
                        strokeWidth={3}
                        dot={{ fill: '#3B82F6', r: 4 }}
                        activeDot={{ r: 6, fill: '#3B82F6' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center">
                    <div className="inline-flex p-4 rounded-full bg-muted mb-4">
                      <TrendingUp className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground font-medium italic">
                      Pas encore de données de revenus
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Les graphiques apparaîtront dès les premières factures payées
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Répartition par service */}
          <Card className="border-none shadow-sm bg-card overflow-hidden rounded-2xl">
            <div className="p-6 border-b border-border/50">
              <h2 className="text-xl font-black uppercase tracking-tight">
                Répartition par service
              </h2>
              <p className="text-sm text-muted-foreground font-medium mt-1">
                Revenus par département
              </p>
            </div>
            <CardContent className="p-6">
              <div className="h-[320px] w-full">
                {stats?.revenueByCategory?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.revenueByCategory}
                        cx="50%" cy="50%"
                        innerRadius={70} outerRadius={100}
                        paddingAngle={5} dataKey="value"
                      >
                        {stats.revenueByCategory.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatUSD(value)} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center">
                    <div className="inline-flex p-4 rounded-full bg-muted mb-4">
                      <DollarSign className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground font-medium italic">
                      Aucune donnée de répartition
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar — Actions rapides + Journal */}
        <div className="space-y-6">

          {/* Actions Rapides */}
          <Card className="border-none shadow-sm bg-card rounded-2xl p-6">
            <h2 className="text-xl font-black uppercase tracking-tight mb-4">
              Actions rapides
            </h2>
            <div className="space-y-3">
              <Button
                variant="ghost"
                onClick={() => navigate('/finance/caisse-admissions')}
                className="w-full justify-between h-14 rounded-xl hover:bg-emerald-500/10 group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: '#10B98115', color: '#10B981' }}>
                    <Receipt size={18} strokeWidth={2.5} />
                  </div>
                  <span className="font-bold text-sm">Caisse Admissions</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
              </Button>

              <Button
                variant="ghost"
                onClick={() => navigate('/finance/depenses')}
                className="w-full justify-between h-14 rounded-xl hover:bg-blue-500/10 group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: '#3B82F615', color: '#3B82F6' }}>
                    <FileText size={18} strokeWidth={2.5} />
                  </div>
                  <span className="font-bold text-sm">Gérer dépenses</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
              </Button>

              <Button
                variant="ghost"
                onClick={() => navigate('/finance/tarifs')}
                className="w-full justify-between h-14 rounded-xl hover:bg-purple-500/10 group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: '#8B5CF615', color: '#8B5CF6' }}>
                    <CreditCard size={18} strokeWidth={2.5} />
                  </div>
                  <span className="font-bold text-sm">Grille tarifaire</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-500 transition-colors" />
              </Button>
            </div>
          </Card>

          {/* Journal — Timeline RÉELLE */}
          <Card className="border-none shadow-sm bg-card rounded-2xl p-6">
            <h2 className="text-xl font-black uppercase tracking-tight mb-6">
              Journal
            </h2>
            {recentInvoices.length === 0 ? (
              <div className="py-8 text-center">
                <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground italic">
                  Aucune transaction enregistrée.
                </p>
              </div>
            ) : (
              <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:to-transparent">
                {recentInvoices.slice(0, 5).map((inv) => {
                  const paid = isPaid(inv.status);
                  return (
                    <div key={`log-${inv.id}`} className="relative pl-12">
                      <div className={cn(
                        "absolute left-0 top-1 w-10 h-10 rounded-full bg-background border-4 flex items-center justify-center z-10",
                        paid ? "border-emerald-500" : "border-amber-500"
                      )}>
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          paid ? "bg-emerald-500" : "bg-amber-500"
                        )} />
                      </div>
                      <div>
                        <time className={cn(
                          "text-[10px] font-black uppercase tracking-tighter",
                          paid ? "text-emerald-500" : "text-amber-500"
                        )}>
                          {inv.createdAt
                            ? format(new Date(inv.createdAt), 'HH:mm • dd MMM', { locale: fr })
                            : inv.date
                              ? inv.date.substring(11, 16) + ' • ' + inv.date.substring(0, 5)
                              : '--:--'}
                        </time>
                        <p className="text-sm font-bold text-foreground leading-none mt-1">
                          {inv.type || inv.category || 'Facture'} — {formatCurrency(inv.totalAmount || inv.amount)}
                        </p>
                        <p className="text-xs font-medium text-muted-foreground mt-1 truncate">
                          {inv.patientName || 'Patient'}
                          {paid
                            ? <span className="ml-2 text-emerald-500">✓ Payé</span>
                            : <span className="ml-2 text-amber-500">⏳ En attente</span>
                          }
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Help Card */}
          <Card className="border-none bg-emerald-600 p-6 rounded-2xl text-white shadow-xl shadow-emerald-500/20">
            <h3 className="font-black text-lg leading-tight mb-2">
              Besoin d'aide ?
            </h3>
            <p className="text-emerald-100 text-xs font-medium mb-4 opacity-80">
              Consultez le guide financier ou contactez l'administrateur système.
            </p>
            <Button className="w-full bg-white text-emerald-600 hover:bg-emerald-50 font-black rounded-xl border-none shadow-lg">
              SUPPORT TECHNIQUE
            </Button>
          </Card>
        </div>
      </div>

      {/* ═══ TRANSACTIONS RÉCENTES — DONNÉES RÉELLES ═══ */}
      <Card className="border-none shadow-sm bg-card overflow-hidden rounded-2xl">
        <div className="p-6 border-b border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">
              Transactions récentes
            </h2>
            <p className="text-sm text-muted-foreground font-medium mt-1">
              {recentInvoices.length} facture{recentInvoices.length > 1 ? 's' : ''} enregistrée{recentInvoices.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un patient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl border-muted bg-muted/20 focus:bg-background transition-all"
              />
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-bold px-3">
              LIVE
            </Badge>
          </div>
        </div>

        <CardContent className="p-0">
          {filteredInvoices.length === 0 ? (
            <div className="py-24 text-center">
              <div className="inline-flex p-4 rounded-full bg-muted mb-4">
                <Users className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-medium italic">
                {searchQuery
                  ? `Aucun résultat pour "${searchQuery}"`
                  : 'Aucune transaction enregistrée'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredInvoices.slice(0, 20).map((inv) => (
                <div
                  key={inv.id}
                  className="group flex items-center justify-between p-5 hover:bg-muted/30 transition-all"
                >
                  <div className="flex items-center space-x-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg",
                      isPaid(inv.status) ? "bg-emerald-500" : "bg-amber-500"
                    )}>
                      {(inv.patientName || '?').charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-lg">
                        {inv.patientName || 'Patient'}
                      </p>
                      <p className="text-xs font-medium text-muted-foreground">
                        {getTypeBadge(inv.type || inv.category)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="hidden md:block text-right">
                      <p className="text-[10px] font-black text-muted-foreground uppercase">
                        Montant
                      </p>
                      <p className="text-sm font-black text-foreground">
                        {formatCurrency(inv.totalAmount || inv.amount)}
                      </p>
                    </div>
                    <div className="hidden sm:block text-right">
                      <p className="text-[10px] font-black text-muted-foreground uppercase">
                        Date
                      </p>
                      <p className="text-sm font-black">
                        {inv.createdAt
                          ? format(new Date(inv.createdAt), 'dd/MM HH:mm', { locale: fr })
                          : inv.date
                            ? inv.date.substring(0, 16)
                            : '--'}
                      </p>
                    </div>
                    {getStatusBadge(inv.status)}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (inv.invoiceId) {
                          navigate(`/finance/factures/${inv.invoiceId}`);
                        } else {
                          toast.error('Aucune facture associée');
                        }
                      }}
                      className="rounded-xl hover:bg-emerald-500 hover:text-white transition-all"
                    >
                      <Eye className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceDashboard;
