import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
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
  FileIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Page Livre de Caisse
 * Affiche les entrées/sorties avec solde cumulatif
 * Deux vues: Synthèse (totaux journaliers) et Détails (transaction par transaction)
 */
export default function LivreCaisse() {
  // États pour les filtres de date
  const today = format(new Date(), 'yyyy-MM-dd');
  const firstDayOfMonth = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
  
  const [dateDebut, setDateDebut] = useState(firstDayOfMonth);
  const [dateFin, setDateFin] = useState(today);
  const [activeTab, setActiveTab] = useState('synthese');
  
  // États pour les données
  const [syntheseData, setSyntheseData] = useState(null);
  const [detailsData, setDetailsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [caissierFilter, setCaissierFilter] = useState('');

  // Formater les montants
  const formatCurrency = (amount, currency = 'CDF') => {
    if (!amount) return currency === 'USD' ? '$0.00' : '0 FC';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (currency === 'USD') {
      return '$' + num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return num.toLocaleString('fr-FR') + ' FC';
  };

  // Charger les données de synthèse
  const loadSynthese = useCallback(async () => {
    try {
      setLoading(true);
      const data = await financeApi.getLivreCaisseSynthese(dateDebut, dateFin);
      setSyntheseData(data);
    } catch (error) {
      console.error('Erreur chargement synthèse:', error);
      toast.error('Erreur lors du chargement de la synthèse');
    } finally {
      setLoading(false);
    }
  }, [dateDebut, dateFin]);

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
          {/* Totaux - Compact sur mobile, normal sur desktop */}
          {syntheseData?.totaux && (
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

          {/* Tableau Synthèse */}
          <Card className="shadow-sm -mx-2 sm:mx-0">
            <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
              <CardTitle className="text-base sm:text-lg">Détail journalier</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6 pb-3 sm:pb-6">
              <div className="overflow-x-auto px-2 sm:px-0">
                <Table className="min-w-[800px] sm:min-w-full">
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead className="font-bold">Date</TableHead>
                      <TableHead className="font-bold text-right text-blue-500">Entrée USD</TableHead>
                      <TableHead className="font-bold text-right text-red-500">Sortie USD</TableHead>
                      <TableHead className="font-bold text-right text-foreground">Solde USD</TableHead>
                      <TableHead className="font-bold text-right text-emerald-500">Entrée CDF</TableHead>
                      <TableHead className="font-bold text-right text-orange-500">Sortie CDF</TableHead>
                      <TableHead className="font-bold text-right text-foreground">Solde CDF</TableHead>
                      <TableHead className="font-bold text-center">Trans.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syntheseData?.journal?.length > 0 ? (
                      syntheseData.journal.map((jour, index) => (
                        <TableRow key={index} className={cn(
                          index % 2 === 0 ? "bg-card" : "bg-muted/30"
                        )}>
                          <TableCell className="font-medium">
                            {formatDate(jour.date)}
                          </TableCell>
                          <TableCell className="text-right text-blue-500">
                            {jour.entreeUSD > 0 ? formatCurrency(jour.entreeUSD, 'USD') : '-'}
                          </TableCell>
                          <TableCell className="text-right text-red-500">
                            {jour.sortieUSD > 0 ? formatCurrency(jour.sortieUSD, 'USD') : '-'}
                          </TableCell>
                          <TableCell className="text-right font-bold text-foreground">
                            {formatCurrency(jour.soldeUSD, 'USD')}
                          </TableCell>
                          <TableCell className="text-right text-emerald-500">
                            {jour.entreeCDF > 0 ? formatCurrency(jour.entreeCDF, 'CDF') : '-'}
                          </TableCell>
                          <TableCell className="text-right text-orange-500">
                            {jour.sortieCDF > 0 ? formatCurrency(jour.sortieCDF, 'CDF') : '-'}
                          </TableCell>
                          <TableCell className="text-right font-bold text-foreground">
                            {formatCurrency(jour.soldeCDF, 'CDF')}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{jour.nombreTransactions}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Aucune transaction pour cette période
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Détails */}
        <TabsContent value="details" className="space-y-3 sm:space-y-4">
          {/* Tableau Détails */}
          <Card className="shadow-sm -mx-2 sm:mx-0">
            <CardHeader className="flex flex-row items-center justify-between px-3 sm:px-6 py-3 sm:py-4">
              <CardTitle className="text-base sm:text-lg">Transactions détaillées</CardTitle>
              {detailsData && (
                <div className="text-sm text-muted-foreground">
                  Page {currentPage + 1} / {Math.ceil(detailsData.totalElements / detailsData.size)}
                  ({detailsData.totalElements} total)
                </div>
              )}
            </CardHeader>
            <CardContent className="px-0 sm:px-6 pb-3 sm:pb-6">
              <div className="overflow-x-auto px-2 sm:px-0">
                <Table className="min-w-[900px] sm:min-w-full">
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead className="font-bold">Heure</TableHead>
                      <TableHead className="font-bold">Type</TableHead>
                      <TableHead className="font-bold">Document</TableHead>
                      <TableHead className="font-bold">Description</TableHead>
                      <TableHead className="font-bold">Patient/Fournisseur</TableHead>
                      <TableHead className="font-bold">Montant</TableHead>
                      <TableHead className="font-bold">Solde après</TableHead>
                      <TableHead className="font-bold">Caissier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailsData?.transactions?.length > 0 ? (
                      detailsData.transactions.map((trans, index) => (
                        <TableRow key={index} className={cn(
                          index % 2 === 0 ? "bg-card" : "bg-muted/30",
                          trans.type === 'ENTREE' ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-orange-500"
                        )}>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="font-mono text-sm">{trans.heure}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(trans.date)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={trans.type === 'ENTREE' ? 'default' : 'destructive'}
                              className={cn(
                                trans.type === 'ENTREE'
                                  ? "bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400"
                                  : "bg-orange-500/20 text-orange-600 hover:bg-orange-500/30 dark:bg-orange-500/20 dark:text-orange-400"
                              )}
                            >
                              {trans.type === 'ENTREE' ? (
                                <ArrowDownLeft className="h-3 w-3 mr-1" />
                              ) : (
                                <ArrowUpRight className="h-3 w-3 mr-1" />
                              )}
                              {trans.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {trans.document || '-'}
                          </TableCell>
                          <TableCell className="max-w-xs truncate" title={trans.description}>
                            {trans.description || '-'}
                          </TableCell>
                          <TableCell>
                            {trans.patientNom ? (
                              <div>
                                <div className="font-medium">{trans.patientPrenom} {trans.patientNom}</div>
                                {trans.patientCode && (
                                  <div className="text-xs text-muted-foreground">{trans.patientCode}</div>
                                )}
                              </div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            <span className={cn(
                              trans.type === 'ENTREE' ? "text-emerald-600" : "text-orange-600"
                            )}>
                              {trans.type === 'ENTREE' ? '+' : '-'}
                              {formatCurrency(trans.montant, trans.devise)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold">
                            {formatCurrency(trans.soldeApres, trans.devise)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <User className="h-3 w-3 text-muted-foreground" />
                              {trans.caissierNom || '-'}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Aucune transaction pour cette période
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {detailsData && detailsData.totalElements > detailsData.size && (
                <div className="flex items-center justify-between mt-4 px-2 sm:px-0">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0 || loading}
                  >
                    Précédent
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage + 1} sur {Math.ceil(detailsData.totalElements / detailsData.size)}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={(currentPage + 1) * detailsData.size >= detailsData.totalElements || loading}
                  >
                    Suivant
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
