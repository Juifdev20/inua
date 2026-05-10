import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, parseISO, getYear, getMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import financeApi from '../../services/financeApi/financeApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Download, 
  RefreshCw, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  FileText,
  User,
  Clock,
  FileSpreadsheet,
  FileIcon,
  ChevronDown,
  ChevronRight,
  Calculator,
  Sigma
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Page Livre de Caisse - Style Excel Pro
 * Structure hiérarchique: ANNEE → MOIS → DATES avec totaux clairs
 */
export default function LivreCaisse() {
  // États pour les filtres de date - utiliser le mois en cours par défaut
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const firstDayOfMonth = format(new Date(currentYear, currentMonth, 1), 'yyyy-MM-dd');
  const lastDayOfMonth = format(new Date(currentYear, currentMonth + 1, 0), 'yyyy-MM-dd');
  
  const [dateDebut, setDateDebut] = useState(firstDayOfMonth);
  const [dateFin, setDateFin] = useState(lastDayOfMonth);
  const [activeTab, setActiveTab] = useState('synthese');
  const [expandedMonths, setExpandedMonths] = useState(new Set());
  
  // États pour les données
  const [syntheseData, setSyntheseData] = useState(null);
  const [detailsData, setDetailsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  // Formater les montants
  const formatCurrency = (amount, currency = 'CDF') => {
    if (!amount || amount === 0) return '-';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (currency === 'USD') {
      return '$' + num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return num.toLocaleString('fr-FR') + ' FC';
  };

  // Toggle mois expanded
  const toggleMonth = (monthKey) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthKey)) {
      newExpanded.delete(monthKey);
    } else {
      newExpanded.add(monthKey);
    }
    setExpandedMonths(newExpanded);
  };

  // Charger les données de synthèse
  const loadSynthese = useCallback(async () => {
    try {
      setLoading(true);
      const data = await financeApi.getLivreCaisseSynthese(dateDebut, dateFin);
      setSyntheseData(data);
      // Auto-expand current month if data exists
      if (data?.journal?.length > 0) {
        const currentMonthKey = `${currentYear}-${currentMonth}`;
        setExpandedMonths(new Set([currentMonthKey]));
      }
    } catch (error) {
      console.error('Erreur chargement synthèse:', error);
      if (error.response?.status === 400) {
        toast.error('Aucune transaction trouvée pour cette période. Essayez une autre date.');
      } else {
        toast.error('Erreur lors du chargement de la synthèse');
      }
      setSyntheseData(null);
    } finally {
      setLoading(false);
    }
  }, [dateDebut, dateFin, currentYear, currentMonth]);

  // Charger les données détaillées
  const loadDetails = useCallback(async () => {
    try {
      setLoading(true);
      const data = await financeApi.getLivreCaisseDetails(dateDebut, dateFin, currentPage, 50);
      setDetailsData(data);
    } catch (error) {
      console.error('Erreur chargement détails:', error);
      toast.error('Erreur lors du chargement des détails');
    } finally {
      setLoading(false);
    }
  }, [dateDebut, dateFin, currentPage]);

  // Charger selon l'onglet actif
  useEffect(() => {
    if (activeTab === 'synthese') {
      loadSynthese();
    } else {
      loadDetails();
    }
  }, [activeTab, loadSynthese, loadDetails]);

  // Export Excel
  const handleExportExcel = async () => {
    try {
      setLoading(true);
      const blob = await financeApi.exportLivreCaisseExcel(dateDebut, dateFin);
      
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `LIVRE-DE-CAISSE-${dateDebut}-${dateFin}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('✅ Export Excel téléchargé (2 onglets: Synthèse + Détails)');
    } catch (error) {
      console.error('Erreur export Excel:', error);
      toast.error('❌ Erreur lors de l\'export Excel');
    } finally {
      setLoading(false);
    }
  };

  // Export PDF
  const handleExportPDF = async () => {
    try {
      setLoading(true);
      const blob = await financeApi.exportLivreCaissePDF(dateDebut, dateFin);
      
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `LIVRE-DE-CAISSE-${dateDebut}-${dateFin}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('✅ Export PDF téléchargé');
    } catch (error) {
      console.error('Erreur export PDF:', error);
      toast.error('❌ Erreur lors de l\'export PDF');
    } finally {
      setLoading(false);
    }
  };

  // Formater une date
  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: fr });
    } catch {
      return dateStr;
    }
  };

  // Formater une date complète
  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '--';
    try {
      return format(parseISO(dateTimeStr), 'dd/MM/yyyy HH:mm', { locale: fr });
    } catch {
      return dateTimeStr;
    }
  };

  // Organiser les données par année/mois comme Excel
  const organizedData = useMemo(() => {
    if (!syntheseData?.journal) return null;

    const data = syntheseData.journal;
    const byYearMonth = {};

    data.forEach(day => {
      const date = parseISO(day.date);
      const year = getYear(date);
      const month = getMonth(date); // 0-11
      const monthKey = `${year}-${month}`;
      const yearKey = `${year}`;

      if (!byYearMonth[yearKey]) {
        byYearMonth[yearKey] = {
          year,
          months: {},
          totalUSD: { entree: 0, sortie: 0, solde: 0 },
          totalCDF: { entree: 0, sortie: 0, solde: 0 }
        };
      }

      if (!byYearMonth[yearKey].months[monthKey]) {
        byYearMonth[yearKey].months[monthKey] = {
          year,
          month,
          monthName: format(date, 'MMMM', { locale: fr }),
          days: [],
          totalUSD: { entree: 0, sortie: 0 },
          totalCDF: { entree: 0, sortie: 0 }
        };
      }

      byYearMonth[yearKey].months[monthKey].days.push(day);
      
      // Accumuler totaux mensuels
      byYearMonth[yearKey].months[monthKey].totalUSD.entree += day.entreeUSD || 0;
      byYearMonth[yearKey].months[monthKey].totalUSD.sortie += day.sortieUSD || 0;
      byYearMonth[yearKey].months[monthKey].totalCDF.entree += day.entreeCDF || 0;
      byYearMonth[yearKey].months[monthKey].totalCDF.sortie += day.sortieCDF || 0;

      // Accumuler totaux annuels
      byYearMonth[yearKey].totalUSD.entree += day.entreeUSD || 0;
      byYearMonth[yearKey].totalUSD.sortie += day.sortieUSD || 0;
      byYearMonth[yearKey].totalCDF.entree += day.entreeCDF || 0;
      byYearMonth[yearKey].totalCDF.sortie += day.sortieCDF || 0;
    });

    // Calculer soldes
    Object.keys(byYearMonth).forEach(yearKey => {
      const year = byYearMonth[yearKey];
      year.totalUSD.solde = year.totalUSD.entree - year.totalUSD.sortie;
      year.totalCDF.solde = year.totalCDF.entree - year.totalCDF.sortie;
    });

    return byYearMonth;
  }, [syntheseData]);

  // Calculer les totaux généraux (toutes années confondues)
  const grandTotals = useMemo(() => {
    if (!organizedData) return null;
    
    let totalUSD = { entree: 0, sortie: 0, solde: 0 };
    let totalCDF = { entree: 0, sortie: 0, solde: 0 };
    let totalTrans = 0;
    
    Object.values(organizedData).forEach(year => {
      totalUSD.entree += year.totalUSD.entree;
      totalUSD.sortie += year.totalUSD.sortie;
      totalCDF.entree += year.totalCDF.entree;
      totalCDF.sortie += year.totalCDF.sortie;
      
      Object.values(year.months).forEach(month => {
        totalTrans += month.days.reduce((acc, d) => acc + (d.nombreTransactions || 0), 0);
      });
    });
    
    totalUSD.solde = totalUSD.entree - totalUSD.sortie;
    totalCDF.solde = totalCDF.entree - totalCDF.sortie;
    
    return { totalUSD, totalCDF, totalTrans };
  }, [organizedData]);

  // Calculer le solde progressif pour chaque ligne
  const getRunningBalance = (data, targetDate, currency) => {
    let balance = 0;
    for (const day of data) {
      if (day.date <= targetDate) {
        balance += (currency === 'USD' ? day.entreeUSD : day.entreeCDF) || 0;
        balance -= (currency === 'USD' ? day.sortieUSD : day.sortieCDF) || 0;
      }
    }
    return balance;
  };

  return (
    <div className="w-full px-2 sm:px-4 lg:px-6 py-4 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Livre de Caisse</h1>
          <p className="text-muted-foreground mt-1">
            Suivi des entrées et sorties avec solde cumulatif
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={loading}
            className="gap-1 sm:gap-2 bg-red-50 hover:bg-red-100 border-red-200 text-xs sm:text-sm px-2 sm:px-4"
          >
            <FileIcon className="h-4 w-4 text-red-600" />
            <span className="text-red-700 hidden sm:inline">Export PDF</span>
            <span className="text-red-700 sm:hidden">PDF</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={loading}
            className="gap-1 sm:gap-2 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-xs sm:text-sm px-2 sm:px-4"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span className="text-emerald-700 hidden sm:inline">Export Excel</span>
            <span className="text-emerald-700 sm:hidden">Excel</span>
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card className="shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="dateDebut" className="flex items-center gap-2 text-xs sm:text-sm">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Date de début
              </Label>
              <Input
                id="dateDebut"
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="text-sm h-9 sm:h-10"
              />
            </div>

            <div className="flex-1 space-y-1.5">
              <Label htmlFor="dateFin" className="flex items-center gap-2 text-xs sm:text-sm">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Date de fin
              </Label>
              <Input
                id="dateFin"
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="text-sm h-9 sm:h-10"
              />
            </div>

            <div className="flex">
              <Button
                onClick={() => activeTab === 'synthese' ? loadSynthese() : loadDetails()}
                disabled={loading}
                className="gap-2 w-full sm:w-auto"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                Actualiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 sm:space-y-4">
        <TabsList className="grid w-full sm:w-auto grid-cols-2 h-auto">
          <TabsTrigger value="synthese" className="gap-1 sm:gap-2 py-2.5 sm:py-2 text-xs sm:text-sm">
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Vue Synthétique</span>
            <span className="sm:hidden">Synthèse</span>
          </TabsTrigger>
          <TabsTrigger value="details" className="gap-1 sm:gap-2 py-2.5 sm:py-2 text-xs sm:text-sm">
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Vue Détaillée</span>
            <span className="sm:hidden">Détails</span>
          </TabsTrigger>
        </TabsList>

        {/* Onglet Synthèse */}
        <TabsContent value="synthese" className="space-y-2 sm:space-y-4">
          {/* Totaux - Compact sur mobile, normal sur desktop - seulement si données */}
          {syntheseData?.totaux && syntheseData?.journal?.length > 0 && (
            <div className="space-y-2">
              {/* Ligne 1: Soldes USD et CDF côte à côte sur mobile */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* USD Card - Compact */}
                <Card className="border-l-4 border-l-blue-500 bg-card sm:col-span-1">
                  <CardHeader className="p-2 sm:pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1 sm:gap-2">
                      <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                      <span className="hidden sm:inline">Solde USD</span>
                      <span className="sm:hidden">USD</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
                    <div className="text-lg sm:text-2xl font-bold text-blue-500 truncate">
                      {formatCurrency(syntheseData.totaux.soldeFinalUSD, 'USD')}
                    </div>
                    <div className="hidden sm:flex text-xs text-muted-foreground mt-1 justify-between">
                      <span>Entrées: {formatCurrency(syntheseData.totaux.totalEntreesUSD, 'USD')}</span>
                      <span>Sorties: {formatCurrency(syntheseData.totaux.totalSortiesUSD, 'USD')}</span>
                    </div>
                    <div className="flex sm:hidden text-[10px] text-muted-foreground mt-0.5 gap-2">
                      <span>+{formatCurrency(syntheseData.totaux.totalEntreesUSD, 'USD')}</span>
                      <span>-{formatCurrency(syntheseData.totaux.totalSortiesUSD, 'USD')}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* CDF Card - Compact */}
                <Card className="border-l-4 border-l-emerald-500 bg-card sm:col-span-1">
                  <CardHeader className="p-2 sm:pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1 sm:gap-2">
                      <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />
                      <span className="hidden sm:inline">Solde CDF</span>
                      <span className="sm:hidden">CDF</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
                    <div className="text-lg sm:text-2xl font-bold text-emerald-500 truncate">
                      {formatCurrency(syntheseData.totaux.soldeFinalCDF, 'CDF')}
                    </div>
                    <div className="hidden sm:flex text-xs text-muted-foreground mt-1 justify-between">
                      <span>Entrées: {formatCurrency(syntheseData.totaux.totalEntreesCDF, 'CDF')}</span>
                      <span>Sorties: {formatCurrency(syntheseData.totaux.totalSortiesCDF, 'CDF')}</span>
                    </div>
                    <div className="flex sm:hidden text-[10px] text-muted-foreground mt-0.5 gap-2">
                      <span>+{formatCurrency(syntheseData.totaux.totalEntreesCDF, 'CDF')}</span>
                      <span>-{formatCurrency(syntheseData.totaux.totalSortiesCDF, 'CDF')}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Période Card - Caché sur mobile, visible sur desktop */}
                <Card className="bg-card hidden sm:block">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Période analysée
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-semibold">
                      {formatDate(syntheseData.totaux.dateDebut)} - {formatDate(syntheseData.totaux.dateFin)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {syntheseData.journal?.length || 0} jours | {syntheseData.journal?.reduce((acc, j) => acc + j.nombreTransactions, 0) || 0} transactions
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Période - Version compacte sur mobile seulement */}
              <div className="sm:hidden flex items-center justify-between px-1">
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">{formatDate(syntheseData.totaux.dateDebut)} - {formatDate(syntheseData.totaux.dateFin)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {syntheseData.journal?.length || 0}j | {syntheseData.journal?.reduce((acc, j) => acc + j.nombreTransactions, 0) || 0}trans
                </div>
              </div>
            </div>
          )}

          {/* Tableau Synthèse - Style Excel Pro avec Dark Mode */}
          <Card className="shadow-sm -mx-2 sm:mx-0 border border-border">
            <CardHeader className="px-3 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-muted/50 to-muted border-b border-border">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-foreground">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                Livre de Caisse - Vue Synthétique
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-0 pb-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[1000px] border-collapse">
                  <TableHeader>
                    <TableRow className="bg-muted/80">
                      <TableHead className="font-bold text-foreground border border-border w-16 text-center">ANNÉE</TableHead>
                      <TableHead className="font-bold text-foreground border border-border w-20 text-center">MOIS</TableHead>
                      <TableHead className="font-bold text-foreground border border-border w-28 text-center">DATE</TableHead>
                      <TableHead className="font-bold text-foreground border border-border">TYPE TRANSACTION</TableHead>
                      <TableHead className="font-bold text-foreground border border-border w-20 text-center">DEVISE</TableHead>
                      <TableHead className="font-bold text-emerald-600 border border-border w-32 text-right">ENTRÉE</TableHead>
                      <TableHead className="font-bold text-orange-500 border border-border w-32 text-right">SORTIE</TableHead>
                      <TableHead className="font-bold text-foreground border border-border w-32 text-right">SOLDE</TableHead>
                      <TableHead className="font-bold text-foreground border border-border w-16 text-center">TRANS.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizedData && Object.keys(organizedData).length > 0 ? (
                      <>
                        {Object.entries(organizedData).map(([yearKey, yearData]) => (
                          <React.Fragment key={yearKey}>
                            {/* ANNÉE HEADER */}
                            <TableRow className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold">
                              <TableCell colSpan={5} className="border border-border py-3">
                                <span className="text-xl">{yearData.year}</span>
                              </TableCell>
                              <TableCell className="border border-border text-right text-emerald-100">
                                {formatCurrency(yearData.totalUSD.entree, 'USD')}
                              </TableCell>
                              <TableCell className="border border-border text-right text-orange-200">
                                {formatCurrency(yearData.totalUSD.sortie, 'USD')}
                              </TableCell>
                              <TableCell className="border border-border text-right font-black text-lg">
                                {formatCurrency(yearData.totalUSD.solde, 'USD')}
                              </TableCell>
                              <TableCell className="border border-border"></TableCell>
                            </TableRow>
                          
                          {/* MOIS PAR DEVISE CDF (sous-ligne année) */}
                          <TableRow className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold">
                            <TableCell className="border border-border"></TableCell>
                            <TableCell colSpan={3} className="border border-border text-right italic">
                              Total CDF
                            </TableCell>
                            <TableCell className="border border-border text-center">CDF</TableCell>
                            <TableCell className="border border-border text-right">
                              {formatCurrency(yearData.totalCDF.entree, 'CDF')}
                            </TableCell>
                            <TableCell className="border border-border text-right">
                              {formatCurrency(yearData.totalCDF.sortie, 'CDF')}
                            </TableCell>
                            <TableCell className="border border-border text-right font-bold">
                              {formatCurrency(yearData.totalCDF.solde, 'CDF')}
                            </TableCell>
                            <TableCell className="border border-border"></TableCell>
                          </TableRow>

                          {/* MOIS */}
                          {Object.entries(yearData.months).map(([monthKey, monthData]) => {
                            const isExpanded = expandedMonths.has(monthKey);
                            const monthTotalTrans = monthData.days.reduce((acc, d) => acc + (d.nombreTransactions || 0), 0);
                            
                            return (
                              <React.Fragment key={monthKey}>
                                {/* LIGNE MOIS - Cliquable pour expand/collapse */}
                                <TableRow 
                                  className="bg-blue-100/70 dark:bg-blue-950/30 hover:bg-blue-200/70 dark:hover:bg-blue-900/40 cursor-pointer transition-colors"
                                  onClick={() => toggleMonth(monthKey)}
                                >
                                  <TableCell className="border border-border"></TableCell>
                                  <TableCell colSpan={2} className="border border-border font-bold text-blue-700 dark:text-blue-400">
                                    <div className="flex items-center gap-2">
                                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                      <span className="uppercase">{monthData.monthName}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell colSpan={2} className="border border-border text-center text-blue-600 dark:text-blue-400 font-medium">
                                    TOTAL {monthData.monthName.toUpperCase()}
                                  </TableCell>
                                  <TableCell className="border border-border text-right font-bold text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(monthData.totalUSD.entree, 'USD')}
                                  </TableCell>
                                  <TableCell className="border border-border text-right font-bold text-orange-500 dark:text-orange-400">
                                    {formatCurrency(monthData.totalUSD.sortie, 'USD')}
                                  </TableCell>
                                  <TableCell className="border border-border text-right font-bold text-foreground">
                                    {formatCurrency(monthData.totalUSD.entree - monthData.totalUSD.sortie, 'USD')}
                                  </TableCell>
                                  <TableCell className="border border-border text-center">
                                    <Badge variant="outline" className="bg-card">{monthTotalTrans}</Badge>
                                  </TableCell>
                                </TableRow>
                                
                                {/* TOTAL CDF du mois */}
                                <TableRow 
                                  className="bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 cursor-pointer"
                                  onClick={() => toggleMonth(monthKey)}
                                >
                                  <TableCell className="border border-border"></TableCell>
                                  <TableCell className="border border-border"></TableCell>
                                  <TableCell colSpan={3} className="border border-border text-right text-blue-600 dark:text-blue-400 italic">
                                    Total CDF {monthData.monthName}
                                  </TableCell>
                                  <TableCell className="border border-border text-center font-medium text-foreground">CDF</TableCell>
                                  <TableCell className="border border-border text-right text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(monthData.totalCDF.entree, 'CDF')}
                                  </TableCell>
                                  <TableCell className="border border-border text-right text-orange-500 dark:text-orange-400">
                                    {formatCurrency(monthData.totalCDF.sortie, 'CDF')}
                                  </TableCell>
                                  <TableCell className="border border-border text-right font-medium text-foreground">
                                    {formatCurrency(monthData.totalCDF.entree - monthData.totalCDF.sortie, 'CDF')}
                                  </TableCell>
                                  <TableCell className="border border-border"></TableCell>
                                </TableRow>

                                {/* JOURS DU MOIS (si expanded) */}
                                {isExpanded && monthData.days.map((day, dayIndex) => (
                                  <React.Fragment key={day.date}>
                                    {/* Ligne USD */}
                                    <TableRow className={cn(
                                      "hover:bg-muted/50",
                                      dayIndex % 2 === 0 ? "bg-card" : "bg-muted/30"
                                    )}>
                                      <TableCell className="border border-border"></TableCell>
                                      <TableCell className="border border-border"></TableCell>
                                      <TableCell className="border border-border text-center font-medium text-foreground">
                                        {formatDate(day.date)}
                                      </TableCell>
                                      <TableCell className="border border-border text-muted-foreground">
                                        Paiements (Entrée)
                                      </TableCell>
                                      <TableCell className="border border-border text-center">
                                        <Badge variant="outline" className="bg-blue-100/50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">USD</Badge>
                                      </TableCell>
                                      <TableCell className="border border-border text-right text-emerald-600 dark:text-emerald-400">
                                        {day.entreeUSD > 0 ? formatCurrency(day.entreeUSD, 'USD') : '-'}
                                      </TableCell>
                                      <TableCell className="border border-border text-right text-orange-500 dark:text-orange-400">
                                        {day.sortieUSD > 0 ? formatCurrency(day.sortieUSD, 'USD') : '-'}
                                      </TableCell>
                                      <TableCell className="border border-border text-right font-medium text-foreground">
                                        {formatCurrency(day.soldeUSD, 'USD')}
                                      </TableCell>
                                      <TableCell className="border border-border text-center" rowSpan={2}>
                                        <Badge variant="outline">{day.nombreTransactions}</Badge>
                                      </TableCell>
                                    </TableRow>
                                    {/* Ligne CDF */}
                                    <TableRow className={cn(
                                      "hover:bg-muted/50",
                                      dayIndex % 2 === 0 ? "bg-card" : "bg-muted/30"
                                    )}>
                                      <TableCell className="border border-border"></TableCell>
                                      <TableCell className="border border-border"></TableCell>
                                      <TableCell className="border border-border text-center font-medium text-foreground">
                                        {formatDate(day.date)}
                                      </TableCell>
                                      <TableCell className="border border-border text-muted-foreground">
                                        Paiements (Entrée)
                                      </TableCell>
                                      <TableCell className="border border-border text-center">
                                        <Badge variant="outline" className="bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">CDF</Badge>
                                      </TableCell>
                                      <TableCell className="border border-border text-right text-emerald-600 dark:text-emerald-400">
                                        {day.entreeCDF > 0 ? formatCurrency(day.entreeCDF, 'CDF') : '-'}
                                      </TableCell>
                                      <TableCell className="border border-border text-right text-orange-500 dark:text-orange-400">
                                        {day.sortieCDF > 0 ? formatCurrency(day.sortieCDF, 'CDF') : '-'}
                                      </TableCell>
                                      <TableCell className="border border-border text-right font-medium text-foreground">
                                        {formatCurrency(day.soldeCDF, 'CDF')}
                                      </TableCell>
                                    </TableRow>
                                  </React.Fragment>
                                ))}
                              </React.Fragment>
                            );
                          })}
                        </React.Fragment>
                      ))}
                      
                      {/* LIGNE TOTAL GÉNÉRAL - USD + CDF côte à côte */}
                      {grandTotals && (
                        <React.Fragment>
                          {/* Séparateur */}
                          <TableRow>
                            <TableCell colSpan={9} className="h-2 bg-muted border-0"></TableCell>
                          </TableRow>
                          
                          {/* TOTAL GÉNÉRAL USD */}
                          <TableRow className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white font-black">
                            <TableCell colSpan={4} className="border border-border py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                  <Sigma className="h-6 w-6" />
                                </div>
                                <div>
                                  <span className="text-2xl uppercase tracking-wider">Total Général</span>
                                  <span className="text-sm ml-3 font-normal text-indigo-200">{grandTotals.totalTrans} transactions</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="border border-border text-center font-bold text-lg bg-white/10">USD</TableCell>
                            <TableCell className="border border-border text-right text-emerald-200">
                              <span className="text-xl">{formatCurrency(grandTotals.totalUSD.entree, 'USD')}</span>
                            </TableCell>
                            <TableCell className="border border-border text-right text-orange-200">
                              <span className="text-xl">{formatCurrency(grandTotals.totalUSD.sortie, 'USD')}</span>
                            </TableCell>
                            <TableCell className="border border-border text-right text-2xl">
                              {formatCurrency(grandTotals.totalUSD.solde, 'USD')}
                            </TableCell>
                            <TableCell className="border border-border"></TableCell>
                          </TableRow>
                          
                          {/* TOTAL GÉNÉRAL CDF */}
                          <TableRow className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold">
                            <TableCell className="border border-border"></TableCell>
                            <TableCell colSpan={3} className="border border-border text-right text-lg italic">
                              Total Général CDF
                            </TableCell>
                            <TableCell className="border border-border text-center text-lg bg-white/10">CDF</TableCell>
                            <TableCell className="border border-border text-right text-emerald-200 text-lg">
                              {formatCurrency(grandTotals.totalCDF.entree, 'CDF')}
                            </TableCell>
                            <TableCell className="border border-border text-right text-orange-200 text-lg">
                              {formatCurrency(grandTotals.totalCDF.sortie, 'CDF')}
                            </TableCell>
                            <TableCell className="border border-border text-right text-xl">
                              {formatCurrency(grandTotals.totalCDF.solde, 'CDF')}
                            </TableCell>
                            <TableCell className="border border-border"></TableCell>
                          </TableRow>
                        </React.Fragment>
                      )}
                      </>
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <Calculator className="h-8 w-8 text-muted" />
                            <p>Aucune transaction pour cette période</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Détails - Design Modernisé */}
        <TabsContent value="details" className="space-y-4 sm:space-y-6">
          {/* Header avec stats style CaisseAdmissions */}
          {detailsData?.transactions?.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Card: Total Transactions */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-500 to-slate-600 p-4 sm:p-6 text-white shadow-lg shadow-slate-500/20">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <FileText className="w-16 h-16" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1 sm:mb-2">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/20 flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-100">Transactions</p>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black">{detailsData.totalElements}</p>
                  <p className="text-[10px] sm:text-xs text-slate-200 mt-1 font-medium opacity-80">
                    Total sur la période
                  </p>
                </div>
              </div>

              {/* Card: Entrées */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-4 sm:p-6 text-white shadow-lg shadow-emerald-500/20">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <ArrowDownLeft className="w-16 h-16" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1 sm:mb-2">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/20 flex items-center justify-center">
                      <ArrowDownLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-100">Entrées</p>
                  </div>
                  <p className="text-xl sm:text-2xl font-black">
                    {detailsData.transactions.filter(t => t.type === 'ENTREE').length}
                  </p>
                  <p className="text-xs sm:text-sm font-bold mt-1">
                    {formatCurrency(
                      detailsData.transactions
                        .filter(t => t.type === 'ENTREE')
                        .reduce((sum, t) => sum + parseFloat(t.montant || 0), 0),
                      'USD'
                    )}
                  </p>
                </div>
              </div>

              {/* Card: Sorties */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 p-4 sm:p-6 text-white shadow-lg shadow-orange-500/20">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <ArrowUpRight className="w-16 h-16" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1 sm:mb-2">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/20 flex items-center justify-center">
                      <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-100">Sorties</p>
                  </div>
                  <p className="text-xl sm:text-2xl font-black">
                    {detailsData.transactions.filter(t => t.type === 'SORTIE').length}
                  </p>
                  <p className="text-xs sm:text-sm font-bold mt-1">
                    {formatCurrency(
                      detailsData.transactions
                        .filter(t => t.type === 'SORTIE')
                        .reduce((sum, t) => sum + parseFloat(t.montant || 0), 0),
                      'USD'
                    )}
                  </p>
                </div>
              </div>

              {/* Card: Balance */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-4 sm:p-6 text-white shadow-lg shadow-blue-500/20">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <Wallet className="w-16 h-16" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1 sm:mb-2">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/20 flex items-center justify-center">
                      <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-100">Solde</p>
                  </div>
                  <p className="text-lg sm:text-xl font-black">
                    {formatCurrency(
                      detailsData.transactions[detailsData.transactions.length - 1]?.soldeApres || 0,
                      'USD'
                    )}
                  </p>
                  <p className="text-[10px] sm:text-xs text-blue-200 mt-1 font-medium opacity-80">
                    Dernière transaction
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tableau Détails Modernisé */}
          <Card className="shadow-sm -mx-2 sm:mx-0 border border-border">
            <CardHeader className="flex flex-row items-center justify-between px-3 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-muted/50 to-muted border-b border-border">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-foreground">
                <Clock className="h-5 w-5 text-blue-500" />
                Transactions détaillées
              </CardTitle>
              {detailsData && (
                <div className="text-xs sm:text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                  Page <span className="font-bold text-foreground">{currentPage + 1}</span> / {Math.ceil(detailsData.totalElements / detailsData.size)}
                  <span className="hidden sm:inline"> ({detailsData.totalElements} total)</span>
                </div>
              )}
            </CardHeader>
            <CardContent className="px-0 sm:px-0 pb-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[900px] sm:min-w-full border-collapse">
                  <TableHeader>
                    <TableRow className="bg-muted/80">
                      <TableHead className="font-bold text-foreground border-b border-border">Heure/Date</TableHead>
                      <TableHead className="font-bold text-foreground border-b border-border">Type</TableHead>
                      <TableHead className="font-bold text-foreground border-b border-border">Document</TableHead>
                      <TableHead className="font-bold text-foreground border-b border-border">Description</TableHead>
                      <TableHead className="font-bold text-foreground border-b border-border">Patient/Fournisseur</TableHead>
                      <TableHead className="font-bold text-foreground border-b border-border text-right">Montant</TableHead>
                      <TableHead className="font-bold text-foreground border-b border-border text-right">Solde après</TableHead>
                      <TableHead className="font-bold text-foreground border-b border-border">Caissier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailsData?.transactions?.length > 0 ? (
                      detailsData.transactions.map((trans, index) => (
                        <TableRow 
                          key={index} 
                          className={cn(
                            "hover:bg-muted/50 transition-colors",
                            index % 2 === 0 ? "bg-card" : "bg-muted/30",
                            trans.type === 'ENTREE' 
                              ? "border-l-4 border-l-emerald-500" 
                              : "border-l-4 border-l-orange-500"
                          )}
                        >
                          <TableCell className="whitespace-nowrap border-b border-border">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <div className="font-mono text-sm font-medium text-foreground">{trans.heure}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDateTime(trans.date)}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="border-b border-border">
                            <div className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold",
                              trans.type === 'ENTREE'
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                            )}>
                              {trans.type === 'ENTREE' ? (
                                <ArrowDownLeft className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              )}
                              {trans.type}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm text-foreground border-b border-border">
                            {trans.document || '-'}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-muted-foreground border-b border-border" title={trans.description}>
                            {trans.description || '-'}
                          </TableCell>
                          <TableCell className="border-b border-border">
                            {trans.patientNom ? (
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                  {trans.patientPrenom?.[0]}{trans.patientNom?.[0]}
                                </div>
                                <div>
                                  <div className="font-medium text-foreground">{trans.patientPrenom} {trans.patientNom}</div>
                                  {trans.patientCode && (
                                    <div className="text-xs text-muted-foreground font-mono">{trans.patientCode}</div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right border-b border-border">
                            <div className={cn(
                              "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-sm",
                              trans.type === 'ENTREE'
                                ? "bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                                : "bg-orange-100/50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400"
                            )}>
                              {trans.type === 'ENTREE' ? '+' : '-'}
                              {formatCurrency(trans.montant, trans.devise)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right border-b border-border">
                            <div className="font-mono font-bold text-foreground bg-muted/50 inline-block px-3 py-1.5 rounded-lg">
                              {formatCurrency(trans.soldeApres, trans.devise)}
                            </div>
                          </TableCell>
                          <TableCell className="border-b border-border">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                {trans.caissierNom?.[0] || '?'}
                              </div>
                              <span className="text-sm text-foreground">{trans.caissierNom || '-'}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                              <FileText className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                            <p className="text-lg font-medium">Aucune transaction pour cette période</p>
                            <p className="text-sm text-muted-foreground">Modifiez les dates pour voir plus de résultats</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Modernisée */}
              {detailsData && detailsData.totalElements > detailsData.size && (
                <div className="flex items-center justify-between mt-4 px-4 sm:px-6 py-4 border-t border-border bg-muted/30">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0 || loading}
                    className="gap-2 rounded-xl border-2 font-bold"
                  >
                    <ChevronRight className="h-4 w-4 rotate-180" />
                    Précédent
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Page</span>
                    <span className="px-3 py-1 bg-background border border-border rounded-lg font-bold text-foreground">
                      {currentPage + 1}
                    </span>
                    <span className="text-sm text-muted-foreground">sur</span>
                    <span className="px-3 py-1 bg-background border border-border rounded-lg font-bold text-foreground">
                      {Math.ceil(detailsData.totalElements / detailsData.size)}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={(currentPage + 1) * detailsData.size >= detailsData.totalElements || loading}
                    className="gap-2 rounded-xl border-2 font-bold"
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
