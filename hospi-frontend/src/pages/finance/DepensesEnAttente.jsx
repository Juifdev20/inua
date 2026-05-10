import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText, Upload, DollarSign, Clock, CheckCircle, XCircle,
  Search, Loader2, RefreshCw, AlertCircle, Receipt,
  Calendar, CreditCard, Building2, X, Eye, Shield, Wallet,
  ExternalLink, Paperclip
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { pharmacieFinanceApi } from '../../services/pharmacieFinanceApi';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DepensesEnAttente = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [caisses, setCaisses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  
  // Modal validation
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [scanFile, setScanFile] = useState(null);
  const [modePaiement, setModePaiement] = useState('CREDIT');
  const [caisseId, setCaisseId] = useState('');
  const [dateEcheance, setDateEcheance] = useState('');
  const [validating, setValidating] = useState(false);
  const [pieceVerifiee, setPieceVerifiee] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [txResponse, caissesResponse] = await Promise.all([
        pharmacieFinanceApi.getDepensesEnAttente(),
        pharmacieFinanceApi.getCaisses(),
      ]);
      
      // 🔧 DEBUG: Vérifier les données reçues
      console.log('🔍 DEBUG Transactions reçues:', txResponse.data);
      if (txResponse.data && txResponse.data.length > 0) {
        console.log('🔍 DEBUG Première transaction:', txResponse.data[0]);
        console.log('🔍 DEBUG justificatifUrl:', txResponse.data[0].justificatifUrl);
        console.log('🔍 DEBUG justificatif_url:', txResponse.data[0].justificatif_url);
      }
      
      setTransactions(txResponse.data || []);
      setCaisses(caissesResponse.data || []);
    } catch (err) {
      console.error('❌ Erreur chargement:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
      setError('Erreur chargement: ' + errorMsg);
      toast.error(t('common.error') || 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (e) => {
    e.preventDefault();
    // 🔧 Vérification bloquante: pièce justificative doit être vérifiée
    const justifUrl = selectedTransaction?.justificatifUrl || selectedTransaction?.justificatif_url;
    if (justifUrl && !pieceVerifiee) {
      toast.error('Vous devez ouvrir et vérifier la pièce justificative avant de valider !');
      return;
    }
    // Scan obligatoire seulement s'il n'y a pas de pièce justificative
    const hasJustificatif = selectedTransaction?.justificatifUrl || selectedTransaction?.justificatif_url;
    if (!scanFile && !hasJustificatif) {
      toast.error('Scan de facture obligatoire car aucune pièce justificative fournie !');
      return;
    }
    if (modePaiement === 'IMMEDIAT' && !caisseId) {
      toast.error('Sélectionnez une caisse pour le paiement immédiat');
      return;
    }

    try {
      setValidating(true);
      const formData = new FormData();
      if (scanFile) formData.append('scanFacture', scanFile);
      formData.append('modePaiement', modePaiement);
      if (caisseId) formData.append('caisseId', caisseId);
      if (dateEcheance) formData.append('dateEcheance', dateEcheance);

      await pharmacieFinanceApi.validerDepense(selectedTransaction.id, formData);
      
      toast.success('Dépense validée avec succès !');
      setSelectedTransaction(null);
      setScanFile(null);
      setPieceVerifiee(false);
      loadData();
    } catch (err) {
      toast.error('Erreur validation: ' + (err.response?.data?.message || err.message));
    } finally {
      setValidating(false);
    }
  };

  const formatCurrency = (amount, currency = 'CDF') =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency, minimumFractionDigits: 0,
    }).format(amount || 0);

  const formatTime = (date) => {
    if (!date) return '--:--';
    try { return format(new Date(date), 'HH:mm'); } catch { return '--:--'; }
  };

  const formatFullDate = (date) => {
    if (!date) return '-';
    try { return format(new Date(date), 'dd MMM yyyy, HH:mm', { locale: fr }); } catch { return '-'; }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'EN_ATTENTE_SCAN': return 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400';
      case 'A_PAYER': return 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400';
      case 'PAYE': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400';
      case 'CONTRE_PASSEE': return 'bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/20 dark:text-red-400';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'EN_ATTENTE_SCAN': return 'En attente scan';
      case 'A_PAYER': return 'À payer (crédit)';
      case 'PAYE': return 'Payé';
      case 'CONTRE_PASSEE': return 'Annulé (avoir)';
      default: return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'EN_ATTENTE_SCAN': return Clock;
      case 'A_PAYER': return CreditCard;
      case 'PAYE': return CheckCircle;
      case 'CONTRE_PASSEE': return XCircle;
      default: return AlertCircle;
    }
  };

  const totalEnAttente = transactions.filter(t => t.status === 'EN_ATTENTE_SCAN').length;
  const totalAPayer = transactions.filter(t => t.status === 'A_PAYER').length;
  const totalPaye = transactions.filter(t => t.status === 'PAYE').length;
  
  // Calcul séparé par devise
  const montantTotalCDF = transactions
    .filter(t => (t.devise || 'CDF') === 'CDF')
    .reduce((sum, t) => sum + (t.montant || 0), 0);
  const montantTotalUSD = transactions
    .filter(t => t.devise === 'USD')
    .reduce((sum, t) => sum + (t.montant || 0), 0);
  const montantTotal = montantTotalCDF + montantTotalUSD;

  const filtered = transactions
    .filter((tx) => {
      const match = (tx.fournisseurNom || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                   (tx.referenceFournisseur || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (filterStatus === 'EN_ATTENTE_SCAN') return match && tx.status === 'EN_ATTENTE_SCAN';
      if (filterStatus === 'A_PAYER') return match && tx.status === 'A_PAYER';
      if (filterStatus === 'PAYE') return match && tx.status === 'PAYE';
      return match;
    });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-rose-500/10">
              <Receipt className="w-7 h-7 text-rose-600" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                {t('finance.pendingExpenses') || 'Dépenses à Valider'}
              </h1>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-0.5">
                {format(new Date(), "EEEE dd MMMM • HH:mm", { locale: fr })}
              </p>
            </div>
          </div>
          <Button
            onClick={loadData}
            variant="outline" size="sm"
            className="rounded-xl font-bold border-2 shrink-0"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Actualiser
          </Button>
        </div>

        {/* Compteurs compacts */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-card rounded-xl border border-border shadow-sm">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total</span>
            <span className="text-lg font-black text-foreground ml-1">{transactions.length}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/5 rounded-xl border border-amber-500/20 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">En attente</span>
            <span className="text-lg font-black text-amber-600 ml-1">{totalEnAttente}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/5 rounded-xl border border-blue-500/20 shadow-sm">
            <CreditCard className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">À payer</span>
            <span className="text-lg font-black text-blue-600 ml-1">{totalAPayer}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/5 rounded-xl border border-emerald-500/20 shadow-sm">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Payé</span>
            <span className="text-lg font-black text-emerald-600 ml-1">{totalPaye}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/5 rounded-xl border border-rose-500/20 shadow-sm">
            <DollarSign className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Total</span>
            <div className="flex flex-col ml-1">
              <span className="text-sm font-black text-rose-600">{formatCurrency(montantTotalCDF, 'CDF')}</span>
              {montantTotalUSD > 0 && (
                <span className="text-xs font-bold text-blue-600">{formatCurrency(montantTotalUSD, 'USD')}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TOOLBAR ═══ */}
      <Card className="border-none shadow-sm bg-card rounded-2xl overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un fournisseur ou une référence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-muted bg-muted/20 focus:bg-background focus:ring-2 focus:ring-rose-500/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex rounded-xl border border-border overflow-hidden">
              {[
                { key: 'ALL', label: 'Toutes' },
                { key: 'EN_ATTENTE_SCAN', label: 'En attente' },
                { key: 'A_PAYER', label: 'À payer' },
                { key: 'PAYE', label: 'Payé' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilterStatus(f.key)}
                  className={cn(
                    'px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all',
                    filterStatus === f.key
                      ? 'bg-rose-500 text-white shadow-inner'
                      : 'bg-transparent text-muted-foreground hover:bg-muted'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ═══ CONTENU ═══ */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
          <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">
            Chargement des dépenses...
          </p>
        </div>
      ) : error ? (
        <Card className="border-none shadow-sm bg-card rounded-2xl">
          <div className="py-24 text-center">
            <div className="inline-flex p-4 rounded-full bg-red-500/10 mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-none shadow-sm bg-card rounded-2xl">
          <div className="py-24 text-center">
            <div className="inline-flex p-4 rounded-full bg-muted mb-4">
              <Receipt className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium italic">
              {searchQuery ? `Aucun résultat pour "${searchQuery}"` : 'Aucune dépense en attente'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((tx) => {
            const StatusIcon = getStatusIcon(tx.status);
            
            return (
              <Card
                key={tx.id}
                className={cn(
                  'border shadow-sm rounded-2xl transition-all hover:shadow-md group relative overflow-hidden',
                  tx.status === 'EN_ATTENTE_SCAN' ? 'border-amber-500/30' : 'border-border'
                )}
              >
                {/* Bande latérale statut */}
                <div className={cn(
                  'absolute top-0 left-0 w-1 h-full',
                  tx.status === 'EN_ATTENTE_SCAN' ? 'bg-amber-500' :
                  tx.status === 'A_PAYER' ? 'bg-blue-500' :
                  tx.status === 'PAYE' ? 'bg-emerald-500' : 'bg-red-500'
                )} />

                <CardContent className="p-5 pl-6">
                  {/* Header carte */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center',
                        tx.status === 'EN_ATTENTE_SCAN' ? 'bg-amber-500/10 text-amber-600' :
                        tx.status === 'A_PAYER' ? 'bg-blue-500/10 text-blue-600' :
                        tx.status === 'PAYE' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                      )}>
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">
                          {tx.fournisseurNom || 'Fournisseur Inconnu'}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          #{tx.id} • {formatTime(tx.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Badge className={cn(
                      'border-none text-[10px] font-bold',
                      getStatusColor(tx.status)
                    )}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {getStatusLabel(tx.status)}
                    </Badge>
                  </div>

                  {/* Détails */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Référence</span>
                      <span className="text-xs font-medium text-foreground">
                        {tx.referenceFournisseur || '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Date</span>
                      <span className="text-xs font-medium text-foreground">
                        {formatFullDate(tx.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Devise</span>
                      <span className="text-xs font-medium text-foreground">
                        {tx.devise || 'CDF'}
                      </span>
                    </div>
                  </div>

                  {/* Footer : montant + action */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <div>
                      <p className="text-lg font-black text-rose-600">
                        {formatCurrency(tx.montant, tx.devise)}
                      </p>
                      {/* 🔧 NOUVEAU: Indicateur pièce jointe */}
                      {(tx.justificatifUrl || tx.justificatif_url) && (
                        <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                          <Paperclip className="w-3 h-3" />
                          Pièce justificative jointe
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* 🔧 NOUVEAU: Bouton voir pièce si présente */}
                      {(tx.justificatifUrl || tx.justificatif_url) && (
                        <a
                          href={tx.justificatifUrl || tx.justificatif_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-all border border-emerald-500/20"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Voir pièce
                        </a>
                      )}
                      {tx.status === 'EN_ATTENTE_SCAN' && (
                        <Button
                          onClick={() => { setSelectedTransaction(tx); setPieceVerifiee(false); }}
                          size="sm"
                          className="rounded-xl font-bold bg-rose-500 hover:bg-rose-600 text-white gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Valider
                        </Button>
                      )}
                      {tx.status === 'A_PAYER' && (
                        <Button
                          onClick={() => { setSelectedTransaction(tx); setPieceVerifiee(false); }}
                          size="sm"
                          variant="outline"
                          className="rounded-xl font-bold border-2 gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Voir
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══ MODAL VALIDATION - COMPACT ═══ */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 overflow-hidden">
          <Card className="w-full max-w-xl rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Header Compact */}
            <div className="p-3 border-b border-border/50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-rose-500/10">
                    <Receipt className="w-5 h-5 text-rose-500" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-foreground">
                      Valider Dépense <span className="text-rose-500">#{selectedTransaction.id}</span>
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {selectedTransaction.fournisseurNom || 'Fournisseur inconnu'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setSelectedTransaction(null); setPieceVerifiee(false); }}
                  className="rounded-lg h-8 w-8 hover:bg-rose-500/10 hover:text-rose-500"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="p-3 overflow-y-auto flex-1">
              {/* Résumé Compact */}
              <div className="mb-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Montant</span>
                  <span className="text-xl font-black text-rose-500">
                    {formatCurrency(selectedTransaction.montant, selectedTransaction.devise)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Réf: {selectedTransaction.referenceFournisseur || '-'}</span>
                  <span className="text-muted-foreground">{new Date(selectedTransaction.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>

              <form onSubmit={handleValidate} className="space-y-3">
                {/* Layout compact 2 colonnes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Colonne Gauche */}
                  <div className="space-y-3">
                    {/* Section pièce justificative */}
                    {(selectedTransaction.justificatifUrl || selectedTransaction.justificatif_url) ? (
                      <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-50/50 border border-emerald-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Paperclip className="w-4 h-4 text-emerald-600" />
                          <p className="text-sm font-bold text-emerald-800">Pièce Justificative</p>
                          <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px]">FOURNIE</span>
                        </div>
                        <a
                          href={selectedTransaction.justificatifUrl || selectedTransaction.justificatif_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setPieceVerifiee(true)}
                          className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Voir la pièce
                        </a>
                        <div className="mt-2 flex items-start gap-2 p-2 rounded-lg bg-white/70 border border-emerald-200">
                          <input
                            type="checkbox"
                            id="pieceVerifiee"
                            checked={pieceVerifiee}
                            onChange={(e) => setPieceVerifiee(e.target.checked)}
                            className="mt-0.5 w-4 h-4 accent-emerald-600 cursor-pointer"
                          />
                          <label htmlFor="pieceVerifiee" className="text-xs text-emerald-800 cursor-pointer select-none">
                            <span className="font-bold">J'ai vérifié la pièce</span>
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-gradient-to-br from-amber-50 to-amber-50/50 border border-amber-200">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          <p className="text-sm font-bold text-amber-800">Aucune Pièce</p>
                        </div>
                        <p className="text-xs text-amber-600/80">
                          Scan obligatoire - aucune pièce fournie.
                        </p>
                      </div>
                    )}

                    {/* Alerte si non vérifié */}
                    {(selectedTransaction.justificatifUrl || selectedTransaction.justificatif_url) && !pieceVerifiee && (
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-300 flex items-center gap-2 animate-pulse">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <p className="text-xs text-amber-800 font-medium">
                          Vérifiez la pièce avant validation.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Colonne Droite */}
                  <div className="space-y-3">
                    {/* Upload scan */}
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                      <label className="flex items-center gap-2 text-xs font-bold mb-2 text-foreground">
                        <Upload className="w-3.5 h-3.5 text-rose-500" />
                        Scan Facture
                        {(selectedTransaction?.justificatifUrl || selectedTransaction?.justificatif_url) ? (
                          <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 text-[10px]">OPTIONNEL</span>
                        ) : (
                          <span className="ml-auto px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[10px]">OBLIGATOIRE</span>
                        )}
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setScanFile(e.target.files[0])}
                          className="w-full border-2 border-border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-rose-500 file:text-white file:font-bold hover:file:bg-rose-600"
                          required={!(selectedTransaction?.justificatifUrl || selectedTransaction?.justificatif_url)}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF, JPG, PNG (max 50MB)
                      </p>
                    </div>

                    {/* Mode paiement */}
                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold mb-2 text-foreground">
                        <CreditCard className="w-3.5 h-3.5 text-rose-500" />
                        Mode de Paiement
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setModePaiement('CREDIT')}
                          className={cn(
                            'flex flex-col items-center gap-1 p-2 rounded-lg border-2 font-bold text-xs transition-all',
                            modePaiement === 'CREDIT'
                              ? 'border-rose-500 bg-rose-500 text-white shadow-md'
                              : 'border-border bg-card hover:border-rose-300 hover:bg-rose-50/50'
                          )}
                        >
                          <Clock className="w-4 h-4" />
                          <span>Crédit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setModePaiement('IMMEDIAT')}
                          className={cn(
                            'flex flex-col items-center gap-1 p-2 rounded-lg border-2 font-bold text-xs transition-all',
                            modePaiement === 'IMMEDIAT'
                              ? 'border-rose-500 bg-rose-500 text-white shadow-md'
                              : 'border-border bg-card hover:border-rose-300 hover:bg-rose-50/50'
                          )}
                        >
                          <DollarSign className="w-4 h-4" />
                          <span>Immédiat</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section Conditionnelle */}
                <div className="space-y-3">
                  {/* Caisse (si immédiat) */}
                  {modePaiement === 'IMMEDIAT' && (
                    <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200">
                      <label className="flex items-center gap-2 text-xs font-bold mb-2 text-foreground">
                        <Wallet className="w-3.5 h-3.5 text-amber-600" />
                        Sélection Caisse <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={caisseId}
                          onChange={(e) => setCaisseId(e.target.value)}
                          className="w-full bg-card border-2 border-amber-200 rounded-lg px-3 py-2 text-sm text-foreground font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all appearance-none cursor-pointer"
                          required
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23f59e0b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 12px center',
                            backgroundSize: '20px',
                            paddingRight: '40px'
                          }}
                        >
                          <option value="">Choisir une caisse...</option>
                          {caisses
                            .filter(c => c.devise === selectedTransaction.devise)
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.id < 0 ? '💰' : '🏦'} {c.nom} — {formatCurrency(c.solde, c.devise)}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-amber-600">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        Devise requise: <span className="font-bold">{selectedTransaction.devise}</span>
                      </div>
                    </div>
                  )}

                  {/* Date échéance (si crédit) */}
                  {modePaiement === 'CREDIT' && (
                    <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200">
                      <label className="flex items-center gap-2 text-xs font-bold mb-2 text-foreground">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        Date Échéance
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={dateEcheance}
                          onChange={(e) => setDateEcheance(e.target.value)}
                          className="w-full bg-card border-2 border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                      </div>
                      <p className="text-xs text-blue-600/80 mt-1">
                        Défaut: 30 jours
                      </p>
                    </div>
                  )}
                </div>

                {/* Boutons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setSelectedTransaction(null); setPieceVerifiee(false); }}
                    disabled={validating}
                    className="flex-1 rounded-lg font-bold border-2 h-10 text-sm hover:bg-muted"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    className="flex-[2] rounded-lg font-bold bg-rose-500 hover:bg-rose-600 text-white h-10 text-sm gap-2"
                    disabled={validating}
                  >
                    {validating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Validation...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Valider
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DepensesEnAttente;
