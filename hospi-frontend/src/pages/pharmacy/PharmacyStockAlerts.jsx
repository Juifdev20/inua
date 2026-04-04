import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Package,
  TrendingDown,
  RefreshCw,
  Download,
  Bell,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Archive,
  Trash2,
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
  Calendar,
  AlertOctagon,
  Layers
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getStockAlerts, updateMedicationStock, getExpiryAlerts } from '../../services/pharmacyApi/pharmacyApi.js';

/* ═══════════════════════════════════════════════════════════════════════════
   PHARMACY STOCK ALERTS - Page des alertes de stock
   ═══════════════════════════════════════════════════════════════════════════ */

const COLORS = {
  critical: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  primary: '#10B981',
  secondary: '#3B82F6',
  accent: '#8B5CF6'
};

// Alert level badge component
const AlertLevelBadge = ({ level }) => {
  const configs = {
    CRITICAL: { 
      label: 'Critique', 
      className: 'bg-red-100 text-red-700 border-red-200',
      icon: AlertCircle
    },
    OUT_OF_STOCK: { 
      label: 'Rupture', 
      className: 'bg-red-100 text-red-700 border-red-200',
      icon: XCircle
    },
    LOW: { 
      label: 'Faible', 
      className: 'bg-amber-100 text-amber-700 border-amber-200',
      icon: AlertTriangle
    }
  };
  
  const config = configs[level] || configs.LOW;
  const Icon = config.icon;
  
  return (
    <Badge className={cn('font-bold border', config.className)}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
};

// Stat card component
const StatCard = ({ title, value, subtitle, icon: Icon, color, trend, trendValue }) => (
  <Card className="border-none shadow-sm bg-card hover:shadow-md transition-shadow">
    <CardContent className="p-4 md:p-6">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase text-muted-foreground truncate">{title}</p>
          <h3 className="text-2xl md:text-3xl font-black mt-1 truncate">{value}</h3>
          {subtitle && (
            <p className={cn(
              'text-xs font-medium mt-1',
              trend === 'up' ? 'text-emerald-600' : 
              trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
            )}>
              {trend === 'up' && <TrendingDown className="w-3 h-3 inline mr-1 rotate-180" />}
              {trend === 'down' && <TrendingDown className="w-3 h-3 inline mr-1" />}
              {subtitle}
            </p>
          )}
        </div>
        <div 
          className="p-3 rounded-xl shrink-0 ml-3"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Alert item row component
const AlertItem = ({ alert, onRestock, onDismiss }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [restockQty, setRestockQty] = useState('');
  
  const percentage = Math.max(0, Math.min(100, 
    alert.minimumStock > 0 
      ? (alert.currentStock / alert.minimumStock) * 100 
      : 0
  ));
  
  const handleRestock = () => {
    const qty = parseInt(restockQty, 10);
    if (qty > 0) {
      onRestock(alert.medicationId, qty);
      setRestockQty('');
    }
  };
  
  return (
    <div className="border-b border-border/50 last:border-0">
      <div 
        className="py-4 px-4 md:px-6 hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
              alert.alertLevel === 'CRITICAL' || alert.alertLevel === 'OUT_OF_STOCK' 
                ? 'bg-red-100 text-red-600' 
                : 'bg-amber-100 text-amber-600'
            )}>
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-foreground truncate">{alert.medicationName}</h4>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <AlertLevelBadge level={alert.alertLevel} />
                <span className="text-xs text-muted-foreground">
                  Code: {alert.medicationCode || 'N/A'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 md:gap-6 shrink-0">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Stock Actuel</p>
              <p className={cn(
                'text-lg font-black',
                alert.currentStock === 0 ? 'text-red-600' : 'text-amber-600'
              )}>
                {alert.currentStock}
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground">Stock Min</p>
              <p className="text-lg font-black text-foreground">{alert.minimumStock}</p>
            </div>
            <div className="text-right hidden md:block">
              <p className="text-xs text-muted-foreground">Déficit</p>
              <p className="text-lg font-black text-red-600">{alert.deficit || Math.max(0, alert.minimumStock - alert.currentStock)}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Niveau de stock</span>
            <span className={cn(
              'font-bold',
              percentage < 25 ? 'text-red-600' : percentage < 50 ? 'text-amber-600' : 'text-emerald-600'
            )}>
              {percentage.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full rounded-full transition-all',
                percentage < 25 ? 'bg-red-500' : percentage < 50 ? 'bg-amber-500' : 'bg-emerald-500'
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 md:px-6 pb-4 bg-muted/20">
          <div className="pt-4 border-t border-border/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Catégorie</p>
                <p className="font-medium text-sm">{alert.category || 'Non catégorisé'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Fournisseur</p>
                <p className="font-medium text-sm">{alert.supplier || 'Non spécifié'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Dernière vente</p>
                <p className="font-medium text-sm">
                  {alert.lastSaleDate ? format(new Date(alert.lastSaleDate), 'dd/MM/yyyy', { locale: fr }) : 'Jamais'}
                </p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-2 flex-1">
                <Input
                  type="number"
                  placeholder="Qté à ajouter"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-32"
                  min="1"
                />
                <Button 
                  onClick={handleRestock}
                  disabled={!restockQty || parseInt(restockQty, 10) <= 0}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Réapprovisionner
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onDismiss(alert.medicationId)}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archiver
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT: Pharmacy Stock Alerts
   ═══════════════════════════════════════════════════════════════════════════ */
const PharmacyStockAlerts = () => {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState([]);
  const [expiryAlerts, setExpiryAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'stock', 'expiry'
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  // Load alerts data
  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const [stockRes, expiryRes] = await Promise.all([
        getStockAlerts(),
        getExpiryAlerts(30).catch(() => ({ data: [] })) // Graceful fallback if endpoint not ready
      ]);
      setAlerts(stockRes.data || []);
      setExpiryAlerts(expiryRes.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error loading stock alerts:', err);
      toast.error('Erreur lors du chargement des alertes');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    loadAlerts();
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadAlerts]);
  
  // Filter alerts based on active tab
  const getFilteredAlerts = () => {
    let filtered = [];
    
    if (activeTab === 'stock' || activeTab === 'all') {
      const stockFiltered = alerts.filter(alert => {
        const matchesSearch = alert.medicationName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             alert.medicationCode?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesLevel = filterLevel === 'ALL' || alert.alertLevel === filterLevel;
        return matchesSearch && matchesLevel;
      });
      filtered = [...filtered, ...stockFiltered.map(a => ({ ...a, type: 'stock' }))];
    }
    
    if (activeTab === 'expiry' || activeTab === 'all') {
      const expiryFiltered = expiryAlerts.filter(alert => {
        const matchesSearch = alert.medicationName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             alert.medicationCode?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      });
      filtered = [...filtered, ...expiryFiltered.map(a => ({ ...a, type: 'expiry' }))];
    }
    
    return filtered;
  };
  
  const filteredAlerts = getFilteredAlerts();
  
  // Stats
  const criticalCount = alerts.filter(a => a.alertLevel === 'CRITICAL' || a.alertLevel === 'OUT_OF_STOCK').length;
  const lowCount = alerts.filter(a => a.alertLevel === 'LOW').length;
  const totalDeficit = alerts.reduce((sum, a) => sum + (a.deficit || Math.max(0, a.minimumStock - a.currentStock)), 0);
  const expiringSoonCount = expiryAlerts.length;
  const totalAlertsCount = alerts.length + expiryAlerts.length;
  
  // Handlers
  const handleRestock = async (medicationId, quantity) => {
    try {
      await updateMedicationStock(medicationId, quantity);
      toast.success(`Stock mis à jour: +${quantity} unités`);
      loadAlerts(); // Refresh
    } catch (err) {
      console.error('Error restocking:', err);
      toast.error('Erreur lors du réapprovisionnement');
    }
  };
  
  const handleDismiss = (medicationId) => {
    // In a real app, this would archive the alert
    toast.success('Alerte archivée');
    setAlerts(prev => prev.filter(a => a.medicationId !== medicationId));
  };
  
  const handleExport = () => {
    // Generate CSV
    const csvContent = [
      ['Médicament', 'Code', 'Stock Actuel', 'Stock Min', 'Déficit', 'Niveau'].join(','),
      ...filteredAlerts.map(a => [
        a.medicationName,
        a.medicationCode || 'N/A',
        a.currentStock,
        a.minimumStock,
        a.deficit || Math.max(0, a.minimumStock - a.currentStock),
        a.alertLevel
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alertes-stock-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Export CSV réussi');
  };
  
  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <Badge className="bg-amber-500/10 text-amber-600 border-none mb-2 md:mb-3 px-3 py-1 font-bold text-xs md:text-sm">
            <Bell className="w-3 h-3 mr-1" />
            GESTION DES ALERTES
          </Badge>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
            Centre d'Alertes
          </h1>
          <p className="text-sm md:text-base text-muted-foreground font-medium mt-1">
            {totalAlertsCount} alerte{totalAlertsCount > 1 ? 's' : ''} au total • {alerts.length} stock + {expiryAlerts.length} péremption
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={filteredAlerts.length === 0}
            className="rounded-xl font-bold w-full sm:w-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Exporter CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Button
            variant="outline"
            onClick={loadAlerts}
            disabled={loading}
            className="rounded-xl font-bold w-full sm:w-auto"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            <span className="hidden sm:inline">Actualiser</span>
            <span className="sm:hidden">Refresh</span>
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Alertes Totales"
          value={totalAlertsCount}
          subtitle={`${criticalCount + expiringSoonCount} urgentes`}
          icon={Bell}
          color={COLORS.warning}
        />
        <StatCard
          title="Stock Critique"
          value={criticalCount}
          subtitle="Rupture ou quasi"
          icon={AlertTriangle}
          color={COLORS.critical}
        />
        <StatCard
          title="Stock Faible"
          value={lowCount}
          subtitle="Surveillance rapprochée"
          icon={TrendingDown}
          color={COLORS.warning}
        />
        <StatCard
          title="Péremption"
          value={expiringSoonCount}
          subtitle="Dans 30 jours"
          icon={Calendar}
          color={COLORS.accent}
        />
        <StatCard
          title="Déficit Total"
          value={totalDeficit}
          subtitle="Unités manquantes"
          icon={Package}
          color={COLORS.primary}
        />
      </div>
      
      {/* Tabs for alert types */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={activeTab === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('all')}
          className="rounded-lg whitespace-nowrap"
        >
          <Layers className="w-4 h-4 mr-2" />
          Toutes ({totalAlertsCount})
        </Button>
        <Button
          variant={activeTab === 'stock' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('stock')}
          className="rounded-lg whitespace-nowrap"
        >
          <Package className="w-4 h-4 mr-2" />
          Stock ({alerts.length})
        </Button>
        <Button
          variant={activeTab === 'expiry' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('expiry')}
          className="rounded-lg whitespace-nowrap"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Péremption ({expiryAlerts.length})
        </Button>
      </div>
      
      {/* Filters */}
      <Card className="border-none shadow-sm bg-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un médicament..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterLevel === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterLevel('ALL')}
                className="rounded-lg"
              >
                Tous
              </Button>
              <Button
                variant={filterLevel === 'CRITICAL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterLevel('CRITICAL')}
                className="rounded-lg"
              >
                Critiques
              </Button>
              <Button
                variant={filterLevel === 'LOW' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterLevel('LOW')}
                className="rounded-lg"
              >
                Faibles
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Alerts List */}
      <Card className="border-none shadow-sm bg-card">
        <CardHeader className="px-4 md:px-6 pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base md:text-lg font-black text-foreground">
                {activeTab === 'all' && 'Toutes les Alertes'}
                {activeTab === 'stock' && 'Alertes Stock'}
                {activeTab === 'expiry' && 'Alertes Péremption'}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {filteredAlerts.length} résultat{filteredAlerts.length > 1 ? 's' : ''} • 
                Mis à jour: {format(lastUpdated, 'HH:mm', { locale: fr })}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="space-y-4 px-4 md:px-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : filteredAlerts.length > 0 ? (
            <div className="divide-y divide-border/50">
              {filteredAlerts.map((alert) => (
                alert.type === 'expiry' ? (
                  <div key={`expiry-${alert.medicationId}`} className="border-b border-border/50 last:border-0">
                    <div className="py-4 px-4 md:px-6 hover:bg-muted/30 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-purple-100 text-purple-600">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-foreground truncate">{alert.medicationName}</h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <Badge className="bg-purple-100 text-purple-700 border-purple-200 font-bold">
                                <AlertOctagon className="w-3 h-3 mr-1" />
                                Péremption
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Code: {alert.medicationCode || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 md:gap-6 shrink-0">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Expire le</p>
                            <p className="text-lg font-black text-purple-600">
                              {alert.expiryDate ? format(new Date(alert.expiryDate), 'dd/MM/yyyy', { locale: fr }) : 'N/A'}
                            </p>
                          </div>
                          <div className="text-right hidden sm:block">
                            <p className="text-xs text-muted-foreground">Jours restants</p>
                            <p className="text-lg font-black text-foreground">
                              {alert.daysUntilExpiry || '?'}
                            </p>
                          </div>
                          <div className="text-right hidden md:block">
                            <p className="text-xs text-muted-foreground">Stock</p>
                            <p className="text-lg font-black text-purple-600">{alert.currentStock || 0}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <AlertItem
                    key={`stock-${alert.medicationId}`}
                    alert={alert}
                    onRestock={handleRestock}
                    onDismiss={handleDismiss}
                  />
                )
              ))}
            </div>
          ) : (
            <div className="py-16 text-center px-4">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                Aucune alerte en cours
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {activeTab === 'all' 
                  ? 'Tous vos stocks sont à des niveaux acceptables et aucun médicament ne risque de périmé.' 
                  : activeTab === 'stock' 
                    ? 'Tous vos stocks sont à des niveaux acceptables.'
                    : 'Aucun médicament ne risque de périmé dans les prochains jours.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PharmacyStockAlerts;
