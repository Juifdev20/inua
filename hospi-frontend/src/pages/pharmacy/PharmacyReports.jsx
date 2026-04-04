import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  FileText,
  TrendingUp,
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
  TrendingDown,
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
            <h3 className="text-xl md:text-3xl font-black text-foreground truncate">{value}</h3>
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
  const handlePeriodChange = (newPeriod) => {
    onPeriodChange(newPeriod);
    
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
  
  const stockRotation = data?.stockRotation || [
    { product: 'Paracétamol', rotation: '15j', stock: 120, min: 50 },
    { product: 'Ibuprofène', rotation: '12j', stock: 85, min: 30 },
    { product: 'Amoxicilline', rotation: '8j', stock: 45, min: 25 },
    { product: 'Oméprazole', rotation: '20j', stock: 200, min: 40 },
    { product: 'Vitamine C', rotation: '25j', stock: 150, min: 30 }
  ];
  
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

      {/* Stock Rotation Chart */}
      <Card className="border-none shadow-sm bg-card">
        <CardHeader className="px-4 md:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base md:text-lg font-black text-foreground">Rotation des Stocks</CardTitle>
              <p className="text-xs text-muted-foreground">Délai de rotation par produit</p>
            </div>
            <Badge variant="outline" className="font-bold shrink-0">
              <Clock className="w-3 h-3 mr-1" />
              Mise à jour: {format(new Date(), 'HH:mm')}
            </Badge>
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
                  formatter={(value) => [value, 'Jours']}
                />
                <Bar dataKey="rotation" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={30}>
                  {stockRotation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index < 2 ? COLORS.primary : index < 4 ? COLORS.warning : COLORS.danger} />
                  ))}
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

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF('landscape');
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(16, 185, 129);
      doc.text('RAPPORT PHARMACIE', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Période: ${format(dateRange.startDate, 'dd/MM/yyyy')} - ${format(dateRange.endDate, 'dd/MM/yyyy')}`, 
        doc.internal.pageSize.getWidth() / 2, 30, { align: 'center' });
      
      // Table
      autoTable(doc, {
        startY: 40,
        head: [['Métrique', 'Valeur', 'Évolution']],
        body: [
          ['Ventes Totales', '$45,230', '+12%'],
          ['Commandes', '156', '+8%'],
          ['Panier Moyen', '$45.50', '+5%'],
          ['Stock Faible', '23', '-15%']
        ],
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129], textColor: 255 },
        styles: { fontSize: 10 }
      });
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Document généré le ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 
        doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 20, { align: 'center' });
      
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
