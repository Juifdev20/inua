import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Package,
  Users,
  BarChart3,
  Download,
  Filter,
  RefreshCw,
  FileText,
  CheckCircle,
  Clock
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BACKEND_URL } from '../../config/environment.js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const PharmacySalesHistory = () => {
  const { t } = useTranslation();
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalSales: 0,
    averageSale: 0,
    topMedication: null
  });

  // Charger les données de ventes
  const loadSalesData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Pour l'instant, simulons les données avec l'API existante
      // TODO: Créer un endpoint dédié pour l'historique des ventes
      const response = await fetch(`${BACKEND_URL}/api/v1/finance/prescription/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Simuler des données historiques
        const mockSalesData = generateMockSalesData(dateRange);
        setSalesData(mockSalesData);
        setStats(calculateStats(mockSalesData));
      } else {
        throw new Error('Erreur lors du chargement des données');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des données de ventes');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // Générer des données de test
  const generateMockSalesData = (range) => {
    const data = [];
    const today = new Date();
    let days = 1;

    switch (range) {
      case 'today': days = 1; break;
      case 'week': days = 7; break;
      case 'month': days = 30; break;
      case 'year': days = 365; break;
      default: days = 1;
    }

    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Générer entre 0 et 5 ventes par jour
      const salesCount = Math.floor(Math.random() * 6);
      for (let j = 0; j < salesCount; j++) {
        data.push({
          id: `sale-${i}-${j}`,
          invoiceCode: `INV-${Date.now() - (i * 86400000) - j}`,
          patientName: ['Jean Dupont', 'Marie Curie', 'Pierre Martin', 'Sophie Laurent', 'Bernard Petit'][Math.floor(Math.random() * 5)],
          medicationNames: ['Paracétamol', 'Ibuprofène', 'Amoxicilline', 'Vitamine C', 'Aspirine'][Math.floor(Math.random() * 5)],
          quantity: Math.floor(Math.random() * 10) + 1,
          unitPrice: (Math.random() * 50 + 5).toFixed(2),
          totalAmount: 0,
          paymentMethod: ['CASH', 'CARD', 'MOBILE_MONEY'][Math.floor(Math.random() * 3)],
          createdAt: new Date(date.getTime() + Math.random() * 86400000),
          status: 'PAYEE'
        });
        data[data.length - 1].totalAmount = (data[data.length - 1].quantity * data[data.length - 1].unitPrice).toFixed(2);
      }
    }

    return data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  // Calculer les statistiques
  const calculateStats = (data) => {
    const totalRevenue = data.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
    const totalSales = data.length;
    const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    // Trouver le médicament le plus vendu
    const medicationCounts = {};
    data.forEach(sale => {
      medicationCounts[sale.medicationNames] = (medicationCounts[sale.medicationNames] || 0) + sale.quantity;
    });
    
    const topMedication = Object.keys(medicationCounts).reduce((a, b) => 
      medicationCounts[a] > medicationCounts[b] ? a : b, '');

    return {
      totalRevenue,
      totalSales,
      averageSale,
      topMedication
    };
  };

  useEffect(() => {
    loadSalesData();
  }, [loadSalesData]);

  // Formater la date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Obtenir le libellé de la méthode de paiement
  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case 'CASH': return 'Espèces';
      case 'CARD': return 'Carte';
      case 'MOBILE_MONEY': return 'Mobile Money';
      default: return method;
    }
  };

  // Exporter les données
  const exportData = () => {
    const csvContent = [
      ['Date', 'Facture', 'Patient', 'Médicament', 'Quantité', 'Prix unitaire', 'Total', 'Méthode'],
      ...salesData.map(sale => [
        formatDate(sale.createdAt),
        sale.invoiceCode,
        sale.patientName,
        sale.medicationNames,
        sale.quantity,
        sale.unitPrice,
        sale.totalAmount,
        getPaymentMethodLabel(sale.paymentMethod)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ventes-pharmacie-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('Données exportées avec succès');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Historique des ventes - Pharmacie</h1>
          <p className="text-muted-foreground">Analyse des ventes de médicaments et recettes</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportData} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV
          </Button>
          <Button onClick={loadSalesData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="flex-1 max-w-xs">
              <label className="text-sm font-medium mb-2 block">Période</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Aujourd'hui</SelectItem>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                  <SelectItem value="year">Cette année</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenu total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRevenue.toFixed(2)} $</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nombre de ventes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Panier moyen</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageSale.toFixed(2)} $</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Médicament top</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{stats.topMedication || 'N/A'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des ventes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Détail des ventes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {salesData.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune vente trouvée pour cette période</p>
            </div>
          ) : (
            <div className="space-y-4">
              {salesData.map((sale) => (
                <div key={sale.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{sale.invoiceCode}</h4>
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Payée
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{formatDate(sale.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{sale.patientName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="w-4 h-4 text-muted-foreground" />
                          <span>{sale.medicationNames} x{sale.quantity}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold">{sale.totalAmount} $</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {getPaymentMethodLabel(sale.paymentMethod)}
                      </Badge>
                    </div>
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

export default PharmacySalesHistory;
