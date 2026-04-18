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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Livre de Caisse</h1>
          <p className="text-muted-foreground mt-1">
            Suivi des entrées et sorties avec solde cumulatif
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={loading}
            className="gap-2 bg-red-50 hover:bg-red-100 border-red-200"
          >
            <FileIcon className="h-4 w-4 text-red-600" />
            <span className="text-red-700">Export PDF</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={loading}
            className="gap-2 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span className="text-emerald-700">Export Excel</span>
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="dateDebut" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date de début
              </Label>
              <Input
                id="dateDebut"
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
              />
            </div>
            
            <div className="flex-1 space-y-2">
              <Label htmlFor="dateFin" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date de fin
              </Label>
              <Input
                id="dateFin"
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => activeTab === 'synthese' ? loadSynthese() : loadDetails()}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                Actualiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full md:w-auto grid-cols-2 md:inline-flex">
          <TabsTrigger value="synthese" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Vue Synthétique
          </TabsTrigger>
          <TabsTrigger value="details" className="gap-2">
            <FileText className="h-4 w-4" />
            Vue Détaillée
          </TabsTrigger>
        </TabsList>

        {/* Onglet Synthèse */}
        <TabsContent value="synthese" className="space-y-4">
          {/* Totaux */}
          {syntheseData?.totaux && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* USD Card */}
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-blue-500" />
                    Solde USD
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(syntheseData.totaux.soldeFinalUSD, 'USD')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                    <span>Entrées: {formatCurrency(syntheseData.totaux.totalEntreesUSD, 'USD')}</span>
                    <span>Sorties: {formatCurrency(syntheseData.totaux.totalSortiesUSD, 'USD')}</span>
                  </div>
                </CardContent>
              </Card>

              {/* CDF Card */}
              <Card className="border-l-4 border-l-emerald-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-emerald-500" />
                    Solde CDF
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(syntheseData.totaux.soldeFinalCDF, 'CDF')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                    <span>Entrées: {formatCurrency(syntheseData.totaux.totalEntreesCDF, 'CDF')}</span>
                    <span>Sorties: {formatCurrency(syntheseData.totaux.totalSortiesCDF, 'CDF')}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Période Card */}
              <Card>
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
          )}

          {/* Tableau Synthèse */}
          <Card>
            <CardHeader>
              <CardTitle>Détail journalier</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-bold">Date</TableHead>
                      <TableHead className="font-bold text-right text-blue-600">Entrée USD</TableHead>
                      <TableHead className="font-bold text-right text-red-600">Sortie USD</TableHead>
                      <TableHead className="font-bold text-right">Solde USD</TableHead>
                      <TableHead className="font-bold text-right text-emerald-600">Entrée CDF</TableHead>
                      <TableHead className="font-bold text-right text-orange-600">Sortie CDF</TableHead>
                      <TableHead className="font-bold text-right">Solde CDF</TableHead>
                      <TableHead className="font-bold text-center">Trans.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syntheseData?.journal?.length > 0 ? (
                      syntheseData.journal.map((jour, index) => (
                        <TableRow key={index} className={cn(
                          index % 2 === 0 ? "bg-white" : "bg-muted/20"
                        )}>
                          <TableCell className="font-medium">
                            {formatDate(jour.date)}
                          </TableCell>
                          <TableCell className="text-right text-blue-600">
                            {jour.entreeUSD > 0 ? formatCurrency(jour.entreeUSD, 'USD') : '-'}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {jour.sortieUSD > 0 ? formatCurrency(jour.sortieUSD, 'USD') : '-'}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(jour.soldeUSD, 'USD')}
                          </TableCell>
                          <TableCell className="text-right text-emerald-600">
                            {jour.entreeCDF > 0 ? formatCurrency(jour.entreeCDF, 'CDF') : '-'}
                          </TableCell>
                          <TableCell className="text-right text-orange-600">
                            {jour.sortieCDF > 0 ? formatCurrency(jour.sortieCDF, 'CDF') : '-'}
                          </TableCell>
                          <TableCell className="text-right font-bold">
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
        <TabsContent value="details" className="space-y-4">
          {/* Tableau Détails */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Transactions détaillées</CardTitle>
              {detailsData && (
                <div className="text-sm text-muted-foreground">
                  Page {currentPage + 1} / {Math.ceil(detailsData.totalElements / detailsData.size)}
                  ({detailsData.totalElements} total)
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
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
                          index % 2 === 0 ? "bg-white" : "bg-muted/20",
                          trans.type === 'ENTREE' ? "border-l-4 border-l-emerald-400" : "border-l-4 border-l-orange-400"
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
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" 
                                  : "bg-orange-100 text-orange-700 hover:bg-orange-200"
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
                <div className="flex items-center justify-between mt-4">
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
