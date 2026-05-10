import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign, 
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Building2,
  ShoppingCart,
  FileText,
  Loader2,
  Search,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * Status configuration for visual badges
 */
const STATUS_CONFIG = {
  RUPTURE_IMMINENTE: {
    label: 'Rupture Imminente',
    color: 'bg-red-500/10 text-red-600 border-red-500/30',
    icon: AlertTriangle,
    priority: 1
  },
  STOCK_FAIBLE: {
    label: 'Stock Faible',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    icon: ArrowDownRight,
    priority: 2
  },
  STOCK_DORMANT: {
    label: 'Stock Dormant',
    color: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
    icon: Package,
    priority: 3
  },
  STOCK_OK: {
    label: 'Stock OK',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    icon: CheckCircle,
    priority: 4
  }
};

/**
 * Predictive Restock Component
 * Provides intelligent stock replenishment suggestions based on consumption history
 */
export default function PredictiveRestock() {
  // ═══════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════
  const [predictions, setPredictions] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filter states
  // 🔧 Load monthsToCover from localStorage or default to 3
  const [monthsToCover, setMonthsToCover] = useState(() => {
    const saved = localStorage.getItem('pharmacy_months_to_cover');
    return saved ? parseInt(saved, 10) : 3;
  });
  const [selectedSupplier, setSelectedSupplier] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // 🔧 Save monthsToCover to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('pharmacy_months_to_cover', monthsToCover.toString());
  }, [monthsToCover]);
  
  // Summary data
  const [totalBudget, setTotalBudget] = useState(0);
  const [statusCounts, setStatusCounts] = useState({});
  const [totalMedications, setTotalMedications] = useState(0);

  // ═══════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════
  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const params = new URLSearchParams();
      params.append('months', monthsToCover);
      if (selectedSupplier && selectedSupplier !== 'ALL') {
        params.append('supplier', selectedSupplier);
      }
      
      const response = await axios.get(
        `${API_URL}/api/v1/pharmacy/predictions?${params.toString()}`,
        { headers }
      );
      
      setPredictions(response.data.predictions || []);
      setTotalBudget(response.data.totalBudget || 0);
      setStatusCounts(response.data.statusCounts || {});
      setTotalMedications(response.data.totalMedications || 0);
    } catch (err) {
      console.error('Error fetching predictions:', err);
      setError('Erreur lors du chargement des prédictions. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }, [monthsToCover, selectedSupplier]);

  const fetchSuppliers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.get(
        `${API_URL}/api/v1/pharmacy/predictions/suppliers?months=${monthsToCover}`,
        { headers }
      );
      
      setSuppliers(response.data || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  }, [monthsToCover]);

  useEffect(() => {
    fetchPredictions();
    fetchSuppliers();
  }, [fetchPredictions, fetchSuppliers]);

  // ═══════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════
  const filteredPredictions = useMemo(() => {
    if (!searchQuery.trim()) return predictions;
    
    const query = searchQuery.toLowerCase();
    return predictions.filter(pred => 
      pred.medicationName?.toLowerCase().includes(query) ||
      pred.medicationCode?.toLowerCase().includes(query) ||
      pred.category?.toLowerCase().includes(query)
    );
  }, [predictions, searchQuery]);

  const sortedPredictions = useMemo(() => {
    return [...filteredPredictions].sort((a, b) => {
      const priorityA = STATUS_CONFIG[a.status]?.priority || 99;
      const priorityB = STATUS_CONFIG[b.status]?.priority || 99;
      return priorityA - priorityB;
    });
  }, [filteredPredictions]);

  const itemsToOrder = useMemo(() => {
    return sortedPredictions.filter(p => p.suggestedQuantity > 0);
  }, [sortedPredictions]);

  const filteredTotalBudget = useMemo(() => {
    return itemsToOrder.reduce((sum, p) => sum + (p.estimatedSubtotal || 0), 0);
  }, [itemsToOrder]);

  // ═══════════════════════════════════════════════════════════
  // EXPORT FUNCTIONS
  // ═══════════════════════════════════════════════════════════
  const exportToPDF = useCallback(() => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(0, 102, 204);
    doc.text('Bon de Commande - Réapprovisionnement Prédictif', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);
    doc.text(`Période couverte: ${monthsToCover} mois`, 14, 36);
    doc.text(`Fournisseur: ${selectedSupplier === 'ALL' ? 'Tous' : selectedSupplier}`, 14, 42);
    
    // Summary box
    doc.setFillColor(240, 248, 255);
    doc.roundedRect(14, 48, 180, 25, 3, 3, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Total médicaments: ${totalMedications}`, 18, 58);
    doc.text(`Articles à commander: ${itemsToOrder.length}`, 18, 65);
    doc.text(`Budget total: ${filteredTotalBudget.toFixed(2)} $`, 100, 58);
    
    // Table
    const tableData = itemsToOrder.map(p => [
      p.medicationCode,
      p.medicationName,
      p.supplier || '-',
      p.cmm?.toFixed(1) || '0',
      p.currentStock,
      p.suggestedQuantity,
      `${p.unitPurchasePrice?.toFixed(2) || '0.00'} $`,
      `${p.estimatedSubtotal?.toFixed(2) || '0.00'} $`,
      STATUS_CONFIG[p.status]?.label || p.status
    ]);
    
    autoTable(doc, {
      startY: 80,
      head: [['Code', 'Nom', 'Fournisseur', 'CMM', 'Stock', 'Qty', 'Prix U.', 'Total', 'Statut']],
      body: tableData,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [0, 102, 204], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} sur ${pageCount} - Inua Afya Pharmacy System`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }
    
    doc.save(`bon-de-commande-${new Date().toISOString().split('T')[0]}.pdf`);
  }, [itemsToOrder, monthsToCover, selectedSupplier, totalMedications, filteredTotalBudget]);

  // ═══════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════
  const renderStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.STOCK_OK;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} border font-medium flex items-center gap-1.5 w-fit`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      {/* ═══════════════════════════════════════════════════════════
          HEADER SECTION
      ═══════════════════════════════════════════════════════════ */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-foreground flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-primary" />
              Réapprovisionnement Prédictif
            </h1>
            <p className="text-muted-foreground mt-2">
              Calcul intelligent basé sur la consommation moyenne mensuelle (CMM)
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => { fetchPredictions(); fetchSuppliers(); }}
              disabled={loading}
              className="rounded-xl"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button
              onClick={exportToPDF}
              disabled={itemsToOrder.length === 0}
              className="rounded-xl bg-primary hover:bg-primary/90"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter PDF
            </Button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          CONTROL PANEL
      ═══════════════════════════════════════════════════════════ */}
      <Card className="mb-6 border-none shadow-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Months to cover */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Durée à couvrir (mois)
              </label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={monthsToCover}
                  onChange={(e) => setMonthsToCover(parseInt(e.target.value) || 3)}
                  className="w-24 rounded-xl"
                />
                <span className="text-sm text-muted-foreground">mois</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Recommandation: 3-6 mois
              </p>
            </div>

            {/* Supplier filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                Fournisseur
              </label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Tous les fournisseurs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les fournisseurs</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier} value={supplier}>
                      {supplier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                Rechercher
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Nom, code ou catégorie..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════
          SUMMARY CARDS
      ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
        {/* Total medications */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-500/10 to-blue-600/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">Médicaments</p>
                <p className="text-2xl font-black text-foreground mt-1">{totalMedications}</p>
              </div>
              <div className="p-2 bg-blue-500/20 rounded-xl">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Critical alerts */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-red-500/10 to-red-600/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">Ruptures</p>
                <p className="text-2xl font-black text-red-600 mt-1">
                  {statusCounts.RUPTURE_IMMINENTE || 0}
                </p>
              </div>
              <div className="p-2 bg-red-500/20 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Low stock */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-amber-500/10 to-amber-600/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">Stock Faible</p>
                <p className="text-2xl font-black text-amber-600 mt-1">
                  {statusCounts.STOCK_FAIBLE || 0}
                </p>
              </div>
              <div className="p-2 bg-amber-500/20 rounded-xl">
                <ArrowDownRight className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items to order */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-500/10 to-emerald-600/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">À Commander</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">{itemsToOrder.length}</p>
              </div>
              <div className="p-2 bg-emerald-500/20 rounded-xl">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total budget */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-violet-500/10 to-violet-600/5 col-span-2 md:col-span-1 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">Budget Total</p>
                <p className="text-xl font-black text-violet-600 mt-1">
                  {filteredTotalBudget.toFixed(2)} $
                </p>
              </div>
              <div className="p-2 bg-violet-500/20 rounded-xl">
                <DollarSign className="w-5 h-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          ERROR ALERT
      ═══════════════════════════════════════════════════════════ */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          PREDICTIONS TABLE
      ═══════════════════════════════════════════════════════════ */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Liste des Prédictions
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Calcul des prédictions en cours...</p>
            </div>
          ) : sortedPredictions.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">Aucune prédiction trouvée</p>
              <p className="text-muted-foreground text-sm mt-1">
                Essayez d'ajuster vos filtres ou la période d'analyse
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-bold">Statut</TableHead>
                    <TableHead className="font-bold">Code</TableHead>
                    <TableHead className="font-bold">Nom</TableHead>
                    <TableHead className="font-bold">Fournisseur</TableHead>
                    <TableHead className="font-bold text-right">CMM</TableHead>
                    <TableHead className="font-bold text-right">Stock</TableHead>
                    <TableHead className="font-bold text-right">Qty à commander</TableHead>
                    <TableHead className="font-bold text-right">Prix U.</TableHead>
                    <TableHead className="font-bold text-right">Sous-total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPredictions.map((prediction) => (
                    <TableRow 
                      key={prediction.medicationId}
                      className={prediction.suggestedQuantity > 0 ? 'bg-primary/5' : ''}
                    >
                      <TableCell>
                        {renderStatusBadge(prediction.status)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {prediction.medicationCode}
                      </TableCell>
                      <TableCell className="font-medium">
                        {prediction.medicationName}
                        {prediction.category && (
                          <span className="block text-xs text-muted-foreground">
                            {prediction.category}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {prediction.supplier || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono">
                          {prediction.cmm?.toFixed(1) || '0.0'}
                        </span>
                        <span className="text-xs text-muted-foreground block">/mois</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-mono ${prediction.currentStock <= prediction.minimumStock ? 'text-red-600 font-bold' : ''}`}>
                          {prediction.currentStock}
                        </span>
                        <span className="text-xs text-muted-foreground block">
                          min: {prediction.minimumStock}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {prediction.suggestedQuantity > 0 ? (
                          <Badge className="bg-primary text-primary-foreground font-bold">
                            {prediction.suggestedQuantity}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {prediction.unitPurchasePrice?.toFixed(2) || '0.00'} $
                      </TableCell>
                      <TableCell className="text-right">
                        {prediction.suggestedQuantity > 0 ? (
                          <span className="font-bold text-emerald-600">
                            {prediction.estimatedSubtotal?.toFixed(2) || '0.00'} $
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════
          BUDGET SUMMARY FOOTER
      ═══════════════════════════════════════════════════════════ */}
      {itemsToOrder.length > 0 && (
        <Card className="mt-6 border-none shadow-lg bg-gradient-to-r from-primary/10 to-secondary/10">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 rounded-2xl">
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground uppercase font-bold">
                    Budget Total Estimé
                  </p>
                  <p className="text-3xl font-black text-foreground">
                    {filteredTotalBudget.toFixed(2)} $
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Pour {itemsToOrder.length} médicament{itemsToOrder.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={exportToPDF}
                  className="rounded-xl"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger le bon de commande
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
