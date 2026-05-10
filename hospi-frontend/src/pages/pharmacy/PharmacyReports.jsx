import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  Calendar,
  Download,
  PieChart as PieChartIcon,
  BarChart3,
  Filter,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Search,
  ChevronDown,
  Printer,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  Wallet,
  ShoppingCart,
  Boxes,
  Activity,
  Target,
  Users,
  Receipt,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Scatter, ScatterChart
} from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, isSameDay, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { 
  getSalesHistory, 
  getDashboardStats,
  getStockAlerts,
  generateReport,
  getSalesEvolution,
  getTopProducts,
  getPaymentMethods,
  getFinancialAnalysis
} from '../../services/pharmacyApi/pharmacyApi.js';
import hospitalConfigService from '../../services/hospitalConfigService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ═══════════════════════════════════════════════════════════════════════════
   PHARMACY REPORTS - Module complet de rapports
   ═══════════════════════════════════════════════════════════════════════════ */

const PERIOD_OPTIONS = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
  { value: 'quarter', label: 'Ce trimestre' },
  { value: 'custom', label: 'Personnalisé' }
];

const COLORS = {
  primary: '#10B981',
  secondary: '#3B82F6',
  accent: '#8B5CF6',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#06B6D4',
  gray: '#6B7280'
};

const CHART_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899', '#84CC16'];

/* ═══════════════════════════════════════════════════════════════════════════
   COMPOSANT: STAT CARD
   ═══════════════════════════════════════════════════════════════════════════ */
const StatCard = ({ title, value, subtitle, icon: Icon, color, trend, trendValue, onClick, className }) => (
  <Card 
    className={cn(
      "border-none shadow-sm bg-card overflow-hidden transition-all duration-300 hover:shadow-md cursor-pointer",
      className
    )}
    onClick={onClick}
  >
    <CardContent className="p-4 md:p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1 md:space-y-2 min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
            {title}
          </p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="text-lg md:text-xl lg:text-2xl font-black text-foreground">{value}</h3>
            {trend && (
              <span className={cn(
                "text-xs font-bold flex items-center gap-0.5 shrink-0",
                trend === 'up' ? "text-emerald-500" : "text-red-500"
              )}>
                {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {trendValue}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        <div
          className="p-2 md:p-4 rounded-xl transition-transform hover:scale-110 shrink-0 ml-2"
          style={{ backgroundColor: `${color}15`, color }}
        >
          <Icon className="w-5 h-5 md:w-7 md:h-7" strokeWidth={2.5} />
        </div>
      </div>
    </CardContent>
  </Card>
);

/* ═══════════════════════════════════════════════════════════════════════════
   COMPOSANT: FILTER BAR
   ═══════════════════════════════════════════════════════════════════════════ */
const FilterBar = ({
  period,
  onPeriodChange,
  dateRange,
  onDateRangeChange,
  activeTab,
  onTabChange,
  onRefresh,
  loading
}) => {
  // 🎯 État pour le sélecteur de dates personnalisé
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const handlePeriodChange = (newPeriod) => {
    onPeriodChange(newPeriod);

    // 🎯 Si personnalisé, afficher le sélecteur de dates
    if (newPeriod === 'custom') {
      setShowCustomPicker(true);
      // Initialiser avec la dernière semaine par défaut
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setCustomStartDate(format(lastWeek, 'yyyy-MM-dd'));
      setCustomEndDate(format(now, 'yyyy-MM-dd'));
      return;
    }

    // Cacher le sélecteur si on change de période
    setShowCustomPicker(false);

    const now = new Date();
    let start, end;

    switch (newPeriod) {
      case 'today':
        start = now;
        end = now;
        break;
      case 'week':
        start = startOfWeek(now, { locale: fr });
        end = endOfWeek(now, { locale: fr });
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'quarter':
        start = startOfMonth(subMonths(now, 2));
        end = endOfMonth(now);
        break;
      default:
        return;
    }

    onDateRangeChange({ startDate: start, endDate: end });
  };

  // 🎯 Appliquer les dates personnalisées
  const applyCustomDates = () => {
    if (customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      // Ajuster l'heure de fin à 23:59:59 pour inclure toute la journée
      end.setHours(23, 59, 59, 999);
      onDateRangeChange({ startDate: start, endDate: end });
      setShowCustomPicker(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-card p-3 md:p-4 rounded-2xl border border-border/50">
      {/* Tabs - Horizontal scroll on mobile */}
      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl overflow-x-auto w-full lg:w-auto scrollbar-hide">
        {[
          { id: 'sales', label: 'Ventes', icon: TrendingUp },
          { id: 'stock', label: 'Stock', icon: Package },
          { id: 'financial', label: 'Financier', icon: DollarSign }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap shrink-0",
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden text-xs">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Period Selector - Horizontal scroll on mobile */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3 w-full lg:w-auto">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl overflow-x-auto scrollbar-hide">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handlePeriodChange(opt.value)}
                className={cn(
                  "px-2 md:px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0",
                  period === opt.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* 🎯 Sélecteur de dates personnalisé - Compatible dark mode */}
          {showCustomPicker && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-muted border border-border rounded-xl">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-foreground whitespace-nowrap">Du:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1 text-xs border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-foreground whitespace-nowrap">Au:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1 text-xs border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={applyCustomDates}
                  size="sm"
                  className="h-7 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
                >
                  Appliquer
                </Button>
                <Button
                  onClick={() => setShowCustomPicker(false)}
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs rounded-lg"
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-xl font-bold flex-1 sm:flex-none"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            <span className="hidden sm:inline">Actualiser</span>
            <span className="sm:hidden">Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="rounded-xl font-bold flex-1 sm:flex-none"
          >
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Exporter</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   COMPOSANT: SALES REPORTS - Avec données réelles
   ═══════════════════════════════════════════════════════════════════════════ */
const SalesReports = ({ dateRange, loading, data }) => {
  // Utiliser les données du rapport si disponibles, sinon les données mockées
  const salesData = data?.sales || [];
  const stats = data?.stats || {};
  const dailySales = data?.dailySales || [
    { day: 'Lun', sales: 0, orders: 0 },
    { day: 'Mar', sales: 0, orders: 0 },
    { day: 'Mer', sales: 0, orders: 0 },
    { day: 'Jeu', sales: 0, orders: 0 },
    { day: 'Ven', sales: 0, orders: 0 },
    { day: 'Sam', sales: 0, orders: 0 },
    { day: 'Dim', sales: 0, orders: 0 }
  ];
  
  const topProducts = data?.topProducts || [];
  
  const paymentMethods = data?.paymentMethods || [
    { name: 'Espèces', value: 0, color: COLORS.primary },
    { name: 'Carte Bancaire', value: 0, color: COLORS.secondary },
    { name: 'Mobile Money', value: 0, color: COLORS.accent },
    { name: 'Assurance', value: 0, color: COLORS.warning }
  ];

  const reportStats = data?.salesStats || {};

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ventes Totales"
          value={`$${reportStats.totalSales?.toFixed(2) || stats.totalSales?.toFixed(2) || '0.00'}`}
          subtitle={`${reportStats.totalOrders || stats.totalOrders || 0} commandes`}
          icon={DollarSign}
          color={COLORS.primary}
          trend="up"
          trendValue="12%"
        />
        <StatCard
          title="Panier Moyen"
          value={`$${reportStats.averageOrderValue?.toFixed(2) || stats.averageOrderValue?.toFixed(2) || '0.00'}`}
          subtitle="Par transaction"
          icon={ShoppingCart}
          color={COLORS.secondary}
          trend="up"
          trendValue="5%"
        />
        <StatCard
          title="Articles Vendus"
          value={reportStats.totalItems || stats.totalItems || 0}
          subtitle={`${reportStats.uniqueProducts || stats.uniqueProducts || 0} produits différents`}
          icon={Package}
          color={COLORS.accent}
        />
        <StatCard
          title="Meilleure Vente"
          value={reportStats.bestSellingProduct || stats.bestSellingProduct || '-'}
          subtitle={`${reportStats.bestSellingQuantity || stats.bestSellingQuantity || 0} unités`}
          icon={Target}
          color={COLORS.warning}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Daily Sales Chart */}
        <Card className="lg:col-span-2 border-none shadow-sm bg-card">
          <CardHeader className="pb-2 px-4 md:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base md:text-lg font-black text-foreground">Évolution des Ventes</CardTitle>
                <p className="text-xs text-muted-foreground">Revenus et nombre de commandes</p>
              </div>
              <Badge variant="outline" className="font-bold shrink-0">
                <Calendar className="w-3 h-3 mr-1" />
                {format(dateRange.startDate, 'dd/MM')} - {format(dateRange.endDate, 'dd/MM')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <div className="h-[250px] md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailySales}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="day" stroke="#6B7280" fontSize={12} />
                  <YAxis yAxisId="left" stroke="#6B7280" fontSize={12} tickFormatter={(v) => `$${v}`} />
                  <YAxis yAxisId="right" orientation="right" stroke="#6B7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB' }}
                    formatter={(value, name) => name === 'sales' ? [`$${value}`, 'Ventes'] : [value, 'Commandes']}
                  />
                  <Legend />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="sales" 
                    name="Ventes ($)"
                    stroke={COLORS.primary} 
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                    strokeWidth={2}
                  />
                  <Bar 
                    yAxisId="right"
                    dataKey="orders" 
                    name="Commandes"
                    fill={COLORS.secondary} 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="border-none shadow-sm bg-card">
          <CardHeader className="pb-2 px-4 md:px-6">
            <CardTitle className="text-base md:text-lg font-black text-foreground">Modes de Paiement</CardTitle>
            <p className="text-xs text-muted-foreground">Répartition par méthode</p>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <div className="h-48 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethods}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px' }}
                    formatter={(value) => [`${value}%`, 'Part']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {paymentMethods.map((method) => (
                <div key={method.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: method.color }} />
                    <span className="font-medium">{method.name}</span>
                  </div>
                  <span className="font-bold">{method.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products Table */}
      <Card className="border-none shadow-sm bg-card">
        <CardHeader className="pb-2 px-4 md:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base md:text-lg font-black text-foreground">Top 5 Produits Vendus</CardTitle>
              <p className="text-xs text-muted-foreground">Par quantité et revenus</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl font-bold w-full sm:w-auto">
              <FileText className="w-4 h-4 mr-2" />
              Voir tout
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase text-muted-foreground">Produit</th>
                  <th className="text-center py-3 px-4 text-xs font-bold uppercase text-muted-foreground">Quantité</th>
                  <th className="text-center py-3 px-4 text-xs font-bold uppercase text-muted-foreground">Revenus</th>
                  <th className="text-center py-3 px-4 text-xs font-bold uppercase text-muted-foreground">% du Total</th>
                  <th className="text-right py-3 px-4 text-xs font-bold uppercase text-muted-foreground">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {topProducts.map((product, index) => (
                  <tr key={index} className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-black">
                          #{index + 1}
                        </div>
                        <span className="font-bold">{product.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="font-bold">{product.quantity}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="font-bold text-emerald-600">${product.revenue}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="font-bold">
                        {((product.revenue / dailySales.reduce((a, b) => a + b.sales, 0)) * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${(product.quantity / 145) * 100}%` }}
                          />
                        </div>
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   COMPOSANT: STOCK REPORTS - Avec données réelles
   ═══════════════════════════════════════════════════════════════════════════ */
const StockReports = ({ loading, data }) => {
  // Utiliser les données du rapport si disponibles
  const stockMetrics = data?.stockMetrics || {
    stockValuation: 0,
    totalItems: 0,
    alertsCount: 0,
    averageRotation: '12j'
  };
  
  // 🔧 CONVERTIR les rotations (strings comme "15j") en nombres pour le graphique
  const rawStockRotation = data?.stockRotation || [
    { product: 'Paracétamol', rotation: '15j', stock: 120, min: 50 },
    { product: 'Ibuprofène', rotation: '12j', stock: 85, min: 30 },
    { product: 'Amoxicilline', rotation: '8j', stock: 45, min: 25 },
    { product: 'Oméprazole', rotation: '20j', stock: 200, min: 40 },
    { product: 'Vitamine C', rotation: '25j', stock: 150, min: 30 }
  ];
  
  // Convertir rotation string "15j" → nombre 15
  const stockRotation = rawStockRotation.map(item => ({
    ...item,
    rotationValue: parseInt(item.rotation) || 0, // Extraire le nombre
    rotationLabel: item.rotation // Garder le label original pour l'affichage
  }));
  
  const stockAlerts = data?.stockAlerts || [];

  const metrics = [
    { 
      label: 'Valuation Stock', 
      value: `$${stockMetrics.stockValuation?.toLocaleString() || '0'}`, 
      change: '+5%', 
      icon: DollarSign, 
      color: COLORS.primary 
    },
    { 
      label: 'Articles en Stock', 
      value: stockMetrics.totalItems?.toLocaleString() || '0', 
      change: '-2%', 
      icon: Boxes, 
      color: COLORS.secondary 
    },
    { 
      label: 'Alertes Stock', 
      value: stockMetrics.alertsCount?.toString() || '0', 
      change: '+8%', 
      icon: AlertTriangle, 
      color: COLORS.warning 
    },
    { 
      label: 'Rotation Moyenne', 
      value: stockMetrics.averageRotation || '12j', 
      change: '-3j', 
      icon: Activity, 
      color: COLORS.accent 
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <StatCard
            key={index}
            title={metric.label}
            value={metric.value}
            subtitle={metric.change}
            icon={metric.icon}
            color={metric.color}
          />
        ))}
      </div>

      {/* 🚨 ALERTE STOCK MORT - Rotation > 180 jours */}
      {(() => {
        const slowMovingProducts = stockRotation.filter(item => item.rotationValue > 180);
        const deadStockProducts = stockRotation.filter(item => item.rotationValue > 365);
        
        if (slowMovingProducts.length === 0) return null;
        
        return (
          <div className="space-y-3">
            {/* Alerte Stock Mort (> 365j) */}
            {deadStockProducts.length > 0 && (
              <Card className="border-red-500/50 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-red-500 text-white shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black text-red-700 dark:text-red-400 flex items-center gap-2">
                        🚨 STOCK MORT DÉTECTÉ
                        <Badge className="bg-red-500 text-white border-none">
                          {deadStockProducts.length} produit(s)
                        </Badge>
                      </h4>
                      <p className="text-sm text-red-600/80 mt-1">
                        Ces médicaments mettent <strong>plus d&apos;1 an</strong> à s&apos;écouler. 
                        Risque élevé d&apos;expiration et de capital bloqué.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {deadStockProducts.slice(0, 5).map((p, i) => (
                          <Badge key={i} variant="outline" className="border-red-500/50 text-red-700 bg-white/50">
                            {p.product}: {p.rotationLabel}
                          </Badge>
                        ))}
                        {deadStockProducts.length > 5 && (
                          <Badge variant="outline" className="border-red-500/50 text-red-700">
                            +{deadStockProducts.length - 5} autres
                          </Badge>
                        )}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" className="rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold">
                          <TrendingDown className="w-4 h-4 mr-2" />
                          Arrêter les achats
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-lg border-red-500/50 text-red-700 font-bold">
                          <DollarSign className="w-4 h-4 mr-2" />
                          Promo liquidation
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Alerte Rotation Lente (180-365j) */}
            {slowMovingProducts.filter(p => p.rotationValue <= 365).length > 0 && (
              <Card className="border-amber-500/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-900/20 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                        ⚠️ Rotation Lente
                        <Badge className="bg-amber-500 text-white border-none">
                          {slowMovingProducts.filter(p => p.rotationValue <= 365).length} produit(s)
                        </Badge>
                      </h4>
                      <p className="text-sm text-amber-600/80 mt-1">
                        Ces produits mettent <strong>6 à 12 mois</strong> à s&apos;écouler. 
                        À surveiller et réduire les commandes.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
      })()}

      {/* Stock Rotation Chart */}
      <Card className="border-none shadow-sm bg-card">
        <CardHeader className="px-4 md:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base md:text-lg font-black text-foreground">Rotation des Stocks</CardTitle>
              <p className="text-xs text-muted-foreground">Délai de rotation par produit</p>
            </div>
            <div className="flex gap-2">
              {/* Légende des couleurs */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span>&lt;90j</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span>90-180j</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>&gt;180j</span>
              </div>
              <Badge variant="outline" className="font-bold shrink-0 ml-2">
                <Clock className="w-3 h-3 mr-1" />
                {format(new Date(), 'HH:mm')}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="h-[250px] md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockRotation} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                <XAxis type="number" stroke="#6B7280" fontSize={12} />
                <YAxis type="category" dataKey="product" stroke="#6B7280" fontSize={12} width={100} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px' }}
                  formatter={(value, name, props) => {
                    const days = props?.payload?.rotationLabel || `${value}j`;
                    return [`${days}`, 'Rotation'];
                  }}
                />
                <Bar dataKey="rotationValue" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={30}>
                  {stockRotation.map((entry, index) => {
                    // 🔧 Couleurs basées sur les seuils de rotation
                    const days = entry.rotationValue;
                    let color = COLORS.primary; // < 90j = vert
                    if (days > 180) color = COLORS.danger; // > 180j = rouge (stock mort)
                    else if (days > 90) color = COLORS.warning; // 90-180j = orange
                    
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Stock Alerts Table */}
      <Card className="border-none shadow-sm bg-card">
        <CardHeader className="px-4 md:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base md:text-lg font-black text-foreground">Alertes de Stock</CardTitle>
              <p className="text-xs text-muted-foreground">Médicaments nécessitant une attention</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl font-bold w-full sm:w-auto">
              <FileText className="w-4 h-4 mr-2" />
              Voir tout
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase text-muted-foreground">Produit</th>
                  <th className="text-center py-3 px-4 text-xs font-bold uppercase text-muted-foreground">Stock Actuel</th>
                  <th className="text-center py-3 px-4 text-xs font-bold uppercase text-muted-foreground">Stock Min</th>
                  <th className="text-center py-3 px-4 text-xs font-bold uppercase text-muted-foreground">Statut</th>
                  <th className="text-right py-3 px-4 text-xs font-bold uppercase text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {stockAlerts.slice(0, 5).map((alert, index) => (
                  <tr key={index} className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-4">
                      <span className="font-bold">{alert.medicationName}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={cn(
                        "font-bold",
                        alert.currentStock === 0 ? "text-red-600" : "text-amber-600"
                      )}>
                        {alert.currentStock}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="font-medium text-muted-foreground">{alert.minimumStock}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Badge className={cn(
                        alert.alertLevel === 'CRITICAL' ? "bg-red-100 text-red-700" :
                        alert.alertLevel === 'OUT_OF_STOCK' ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700"
                      )}>
                        {alert.alertLevel === 'CRITICAL' ? 'Critique' :
                         alert.alertLevel === 'OUT_OF_STOCK' ? 'Rupture' : 'Faible'}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Button size="sm" className="rounded-lg font-bold">
                        Commander
                      </Button>
                    </td>
                  </tr>
                ))}
                {stockAlerts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center">
                      <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-sm font-medium text-emerald-600">Aucune alerte de stock</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   COMPOSANT: FINANCIAL REPORTS - Avec données réelles
   ═══════════════════════════════════════════════════════════════════════════ */
const FinancialReports = ({ dateRange, loading, data }) => {
  // Utiliser les données du rapport si disponibles
  const financialSummary = data?.financialSummary || {
    totalRevenue: 0,
    totalExpenses: 0,
    totalProfit: 0,
    profitMargin: 0,
    averageCart: 0
  };
  
  const monthlyRevenue = data?.financialPeriods || [
    { month: 'Jan', revenue: 0, expenses: 0, profit: 0 },
    { month: 'Fév', revenue: 0, expenses: 0, profit: 0 },
    { month: 'Mar', revenue: 0, expenses: 0, profit: 0 },
    { month: 'Avr', revenue: 0, expenses: 0, profit: 0 },
    { month: 'Mai', revenue: 0, expenses: 0, profit: 0 },
    { month: 'Juin', revenue: 0, expenses: 0, profit: 0 }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Revenus Totaux"
          value={`$${financialSummary.totalRevenue?.toLocaleString() || '0'}`}
          subtitle="+15% vs mois dernier"
          icon={DollarSign}
          color={COLORS.primary}
          trend="up"
          trendValue="15%"
        />
        <StatCard
          title="Bénéfice Net"
          value={`$${financialSummary.totalProfit?.toLocaleString() || '0'}`}
          subtitle={`Marge: ${financialSummary.profitMargin?.toFixed(1) || '0'}%`}
          icon={TrendingUp}
          color={COLORS.secondary}
          trend="up"
          trendValue="22%"
        />
        <StatCard
          title="Coûts d'Acquisition"
          value={`$${financialSummary.totalExpenses?.toLocaleString() || '0'}`}
          subtitle="-5% optimisation"
          icon={Receipt}
          color={COLORS.warning}
          trend="down"
          trendValue="5%"
        />
        <StatCard
          title="Panier Moyen"
          value={`$${financialSummary.averageCart?.toFixed(2) || '0.00'}`}
          subtitle="+8% progression"
          icon={ShoppingCart}
          color={COLORS.accent}
          trend="up"
          trendValue="8%"
        />
      </div>

      {/* Revenue Chart */}
      <Card className="border-none shadow-sm bg-card">
        <CardHeader className="px-4 md:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base md:text-lg font-black text-foreground">Analyse Financière</CardTitle>
              <p className="text-xs text-muted-foreground">Revenus, dépenses et bénéfices</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="font-bold bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                Croissance
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="h-[300px] md:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyRevenue}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.accent} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.accent} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
                <YAxis stroke="#6B7280" fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px' }}
                  formatter={(value) => [`$${value.toLocaleString()}`, '']}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  name="Revenus"
                  stroke={COLORS.primary} 
                  fill="url(#colorRevenue)"
                  strokeWidth={2}
                />
                <Bar dataKey="expenses" name="Dépenses" fill={COLORS.danger} radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Line type="monotone" dataKey="profit" name="Bénéfice" stroke={COLORS.accent} strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-emerald-100 text-xs font-bold uppercase">Revenus Ce Mois</p>
                <h3 className="text-3xl font-black mt-1">${financialSummary.totalRevenue?.toLocaleString() || '0'}</h3>
                <p className="text-emerald-100 text-xs mt-2">+12% vs mois dernier</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-blue-100 text-xs font-bold uppercase">Transactions</p>
                <h3 className="text-3xl font-black mt-1">-</h3>
                <p className="text-blue-100 text-xs mt-2">+8% vs mois dernier</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <Receipt className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-amber-100 text-xs font-bold uppercase">Objectif Mensuel</p>
                <h3 className="text-3xl font-black mt-1">89%</h3>
                <p className="text-amber-100 text-xs mt-2">${(financialSummary.totalRevenue / 1000).toFixed(0)}k / $75k objectif</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <Target className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE PRINCIPALE: PHARMACY REPORTS
   ═══════════════════════════════════════════════════════════════════════════ */
const PharmacyReports = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('sales');
  const [period, setPeriod] = useState('month');
  const [dateRange, setDateRange] = useState({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date())
  });
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({});

  // Load report data
  const loadReportData = useCallback(async () => {
    try {
      setLoading(true);
      
      const formatDate = (date) => format(date, 'yyyy-MM-dd');
      const startStr = formatDate(dateRange.startDate);
      const endStr = formatDate(dateRange.endDate);
      
      // Fetch complete report for active tab using new API
      const reportType = activeTab.toUpperCase(); // SALES, STOCK, FINANCIAL
      const reportRes = await generateReport({
        startDate: startStr,
        endDate: endStr,
        reportType: reportType
      });
      
      let data = reportRes.data || {};
      
      // Fetch additional data for specific tabs
      if (activeTab === 'sales') {
        // Also fetch sales history for the table
        const [salesRes, statsRes] = await Promise.all([
          getSalesHistory({ 
            startDate: startStr, 
            endDate: endStr 
          }),
          getDashboardStats()
        ]);
        data = {
          ...data,
          sales: salesRes.data?.content || [],
          stats: statsRes.data || {}
        };
      } else if (activeTab === 'stock') {
        const alertsRes = await getStockAlerts();
        data = {
          ...data,
          stockAlerts: alertsRes.data || []
        };
      }
      
      setReportData(prev => ({ ...prev, [activeTab]: data }));
    } catch (err) {
      console.error('Error loading reports:', err);
      toast.error('Erreur lors du chargement des rapports');
    } finally {
      setLoading(false);
    }
  }, [activeTab, dateRange]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const handleExportPDF = async () => {
    try {
      // 🏥 Récupérer la configuration de l'hôpital depuis le service (API ou localStorage)
      let hospitalConfig = await hospitalConfigService.getConfig();
      
      // Si pas de config depuis l'API, essayer localStorage directement
      if (!hospitalConfig) {
        const localConfig = localStorage.getItem('inua_afya_hospital_config');
        if (localConfig) {
          hospitalConfig = JSON.parse(localConfig);
        }
      }
      
      // Fallback aux valeurs par défaut
      if (!hospitalConfig) {
        hospitalConfig = {
          hospitalName: 'INUA AFYA',
          ministryName: 'MINISTERE DE LA SANTE',
          departmentName: 'DEPARTEMENT DE LA SANTE PUBLIQUE',
          zoneName: 'ZONE RURALE DE BENI',
          primaryColor: '#059669',
          address: 'Boulevard du 30 Juin, Beni, RDC',
          phoneNumber: '+243 000 000 000',
          email: 'contact@inuafia.com'
        };
      }
      
      // Debug: voir ce qui est chargé
      console.log('🏥 Config hôpital chargée:', hospitalConfig);

      // 🎨 Convertir les couleurs hex en RGB pour jsPDF
      const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 5, g: 150, b: 105 };
      };
      
      const primaryColor = hexToRgb(hospitalConfig.primaryColor || '#059669');
      
      const doc = new jsPDF('landscape');
      const pdfWidth = doc.internal.pageSize.getWidth();
      
      // 🏥 EN-TÊTE ÉLÉGANT avec configuration admin complète
      const margin = 15;
      let currentY = 8;
      
      // Ligne ministère/departement/zone en HAUT et CENTRÉE
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      const topInfo = [hospitalConfig.ministryName, hospitalConfig.departmentName, hospitalConfig.zoneName, hospitalConfig.region]
        .filter(Boolean).join(' | ');
      if (topInfo) {
        doc.text(topInfo.toUpperCase(), pdfWidth / 2, currentY + 3, { align: 'center' });
        currentY += 8; // Espace après la ligne du haut
      }
      
      // Fonction helper pour charger l'image avec promesse
      const loadImage = (url) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = url;
        });
      };
      
      // Logo si disponible et activé (meilleure qualité et ratio)
      let hasLogo = false;
      if (hospitalConfig.hospitalLogoUrl && hospitalConfig.enableLogoOnDocuments !== false) {
        try {
          const logoUrl = hospitalConfig.hospitalLogoUrl;
          
          // Précharger l'image pour obtenir les dimensions réelles
          const img = await loadImage(logoUrl);
          
          // Dimensions max - LOGO ENCORE PLUS GRAND
          const maxLogoHeight = 45; // mm - ENCORE PLUS GRAND
          const maxLogoWidth = 45;  // mm - ENCORE PLUS GRAND
          
          // Calculer dimensions en conservant le ratio
          let logoWidth = maxLogoWidth;
          let logoHeight = maxLogoHeight;
          
          if (img.width && img.height) {
            const ratio = img.width / img.height;
            if (ratio > 1) {
              // Image plus large que haute
              logoWidth = maxLogoWidth;
              logoHeight = maxLogoWidth / ratio;
            } else {
              // Image plus haute que large
              logoHeight = maxLogoHeight;
              logoWidth = maxLogoHeight * ratio;
            }
          }
          
          // Détecter le format de l'image
          let imgFormat = 'PNG';
          if (logoUrl.toLowerCase().includes('.jpg') || logoUrl.toLowerCase().includes('.jpeg')) {
            imgFormat = 'JPEG';
          } else if (logoUrl.toLowerCase().includes('.webp')) {
            imgFormat = 'PNG';
          }
          
          // Ajouter le logo avec dimensions calculées
          doc.addImage(logoUrl, imgFormat, margin, currentY, logoWidth, logoHeight);
          hasLogo = true;
          currentY += logoHeight + 3; // Petit espace après logo
          
          console.log('✅ Logo ajouté:', logoWidth.toFixed(1), 'x', logoHeight.toFixed(1), 'mm (ratio:', (img.width/img.height).toFixed(2), ')');
        } catch (e) {
          console.log('❌ Logo non chargé:', e.message);
          hasLogo = false;
        }
      }
      
      // Zone de texte alignée à GAUCHE comme le logo
      const textX = margin; // Aligné à gauche avec le logo
      const textAlign = 'left';
      
      // Titre de l'hôpital - GRAND et aligné gauche
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
      const hospitalName = hospitalConfig.hospitalName || 'INUA AFYA';
      doc.text(hospitalName.toUpperCase(), textX, currentY + 18, { align: textAlign });
      
      // Sous-titre / slogan
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      const subtitle = hospitalConfig.headerSubtitle || 'Système de Gestion Hospitalière';
      doc.text(subtitle, textX, currentY + 26, { align: textAlign });
      
      // Code établissement si disponible
      if (hospitalConfig.hospitalCode) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text(`Code Établissement: ${hospitalConfig.hospitalCode}`, textX, currentY + 32, { align: textAlign });
      }
      
      // Informations de contact alignées à gauche (AU DESSUS de la barre)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      const address = hospitalConfig.address || 'Boulevard du 30 Juin, Beni, RDC';
      const phone = hospitalConfig.phoneNumber || '+243 000 000 000';
      const email = hospitalConfig.email || 'contact@inuafia.com';
      const website = hospitalConfig.website || '';
      const city = hospitalConfig.city || '';
      const country = hospitalConfig.country || '';
      const postalCode = hospitalConfig.postalCode || '';
      
      // Adresse complète alignée gauche (au dessus de la barre)
      let fullAddress = address;
      if (city) fullAddress += `, ${city}`;
      if (country) fullAddress += `, ${country.toUpperCase()}`;
      if (postalCode) fullAddress += ` - ${postalCode}`;
      doc.text(fullAddress, textX, currentY + 40, { align: textAlign });
      
      // Contact aligné gauche (au dessus de la barre)
      let contactLine = `Tél: ${phone}`;
      if (email) contactLine += ` | Email: ${email}`;
      if (website) contactLine += ` | Web: ${website}`;
      doc.text(contactLine, textX, currentY + 48, { align: textAlign });
      
      // Ligne séparatrice épaisse (pleine largeur) - EN DESSOUS de l'adresse/contact
      doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.setLineWidth(2);
      const separatorY = currentY + 55;
      doc.line(margin, separatorY, pdfWidth - margin, separatorY);
      
      // Titre du rapport (en dessous de la barre)
      const titleY = separatorY + 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.text('RAPPORT PHARMACIE', pdfWidth / 2, titleY, { align: 'center' });
      
      // Période
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const periodText = `Période: ${format(dateRange.startDate, 'dd/MM/yyyy')} - ${format(dateRange.endDate, 'dd/MM/yyyy')}`;
      doc.text(periodText, pdfWidth / 2, titleY + 7, { align: 'center' });
      
      // Table
      autoTable(doc, {
        startY: titleY + 12,
        head: [['Métrique', 'Valeur', 'Évolution']],
        body: [
          ['Ventes Totales', '$45,230', '+12%'],
          ['Commandes', '156', '+8%'],
          ['Panier Moyen', '$45.50', '+5%'],
          ['Stock Faible', '23', '-15%']
        ],
        theme: 'striped',
        headStyles: { 
          fillColor: [primaryColor.r, primaryColor.g, primaryColor.b], 
          textColor: 255,
          fontStyle: 'bold'
        },
        styles: { fontSize: 10, cellPadding: 3 },
        margin: { left: 15, right: 15 },
        alternateRowStyles: { fillColor: [250, 250, 250] }
      });
      
      // 📄 PIED DE PAGE avec branding (style facture)
      const footerY = doc.internal.pageSize.getHeight() - 35;
      
      // Ligne de séparation horizontale en haut du footer
      doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.setLineWidth(0.5);
      doc.line(margin, footerY, pdfWidth - margin, footerY);
      
      // © Nom de l'application (INUA AFYA)
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
      doc.text('© INUA AFYA - Tous droits réservés', pdfWidth / 2, footerY + 8, { align: 'center' });
      
      // Nom de l'hôpital
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`- ${hospitalConfig.hospitalName || 'CLINIQUE CI UCBC'} -`, pdfWidth / 2, footerY + 16, { align: 'center' });
      
      // Lignes de signature
      const signatureY = doc.internal.pageSize.getHeight() - 12;
      
      // Signature Client (gauche)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Signature Client', margin + 20, signatureY - 8);
      // Ligne pour signature
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.3);
      doc.line(margin + 20, signatureY - 2, margin + 80, signatureY - 2);
      
      // Signature & Cachet (droite)
      doc.text('Signature & Cachet', pdfWidth - margin - 80, signatureY - 8);
      // Ligne pour signature
      doc.line(pdfWidth - margin - 80, signatureY - 2, pdfWidth - margin - 20, signatureY - 2);
      
      doc.save(`rapport_pharmacie_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Rapport PDF généré avec succès !');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <Badge className="bg-emerald-500/10 text-emerald-600 border-none mb-2 md:mb-3 px-3 py-1 font-bold text-xs md:text-sm">
            ANALYTICS & RAPPORTS
          </Badge>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
            Rapports Pharmacie
          </h1>
          <p className="text-sm md:text-base text-muted-foreground font-medium mt-1">
            Analysez vos performances et prenez des décisions éclairées
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
          <Button
            variant="outline"
            onClick={handleExportPDF}
            className="rounded-xl font-bold w-full sm:w-auto"
          >
            <Printer className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Imprimer PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
          <Button
            variant="outline"
            className="rounded-xl font-bold w-full sm:w-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Export Excel</span>
            <span className="sm:hidden">Excel</span>
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        period={period}
        onPeriodChange={setPeriod}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={loadReportData}
        loading={loading}
      />

      {/* Report Content */}
      <div className="min-h-[500px]">
        {activeTab === 'sales' && (
          <SalesReports 
            dateRange={dateRange} 
            loading={loading} 
            data={reportData.sales} 
          />
        )}
        {activeTab === 'stock' && (
          <StockReports 
            loading={loading} 
            data={reportData.stock} 
          />
        )}
        {activeTab === 'financial' && (
          <FinancialReports 
            dateRange={dateRange} 
            loading={loading} 
            data={reportData.financial} 
          />
        )}
      </div>
    </div>
  );
};

export default PharmacyReports;
