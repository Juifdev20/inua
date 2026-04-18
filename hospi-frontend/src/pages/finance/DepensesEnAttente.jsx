import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText, Upload, DollarSign, Clock, CheckCircle, XCircle,
  Search, Loader2, RefreshCw, AlertCircle, Receipt,
  Calendar, CreditCard, Building2, X, Eye, Shield, Wallet
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
    if (!scanFile) {
      toast.error('Scan de facture obligatoire !');
      return;
    }
    if (modePaiement === 'IMMEDIAT' && !caisseId) {
      toast.error('Sélectionnez une caisse pour le paiement immédiat');
      return;
    }

    try {
      setValidating(true);
      const formData = new FormData();
      formData.append('scanFacture', scanFile);
      formData.append('modePaiement', modePaiement);
      if (caisseId) formData.append('caisseId', caisseId);
      if (dateEcheance) formData.append('dateEcheance', dateEcheance);

      await pharmacieFinanceApi.validerDepense(selectedTransaction.id, formData);
      
      toast.success('Dépense validée avec succès !');
      setSelectedTransaction(null);
      setScanFile(null);
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
  const montantTotal = transactions.reduce((sum, t) => sum + (t.montant || 0), 0);

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
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Montant total</span>
            <span className="text-lg font-black text-rose-600 ml-1">{formatCurrency(montantTotal)}</span>
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
                    <p className="text-lg font-black text-rose-600">
                      {formatCurrency(tx.montant, tx.devise)}
                    </p>
                    {tx.status === 'EN_ATTENTE_SCAN' && (
                      <Button
                        onClick={() => setSelectedTransaction(tx)}
                        size="sm"
                        className="rounded-xl font-bold bg-rose-500 hover:bg-rose-600 text-white gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Valider
                      </Button>
                    )}
                    {tx.status === 'A_PAYER' && (
                      <Button
                        onClick={() => setSelectedTransaction(tx)}
                        size="sm"
                        variant="outline"
                        className="rounded-xl font-bold border-2 gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Voir
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══ MODAL VALIDATION ═══ */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-rose-500/10">
                    <Receipt className="w-5 h-5 text-rose-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-foreground">
                      Valider la Dépense #{selectedTransaction.id}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {selectedTransaction.fournisseurNom}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedTransaction(null)}
                  className="rounded-xl"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Résumé */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Montant</span>
                  <span className="text-xl font-black text-foreground">
                    {formatCurrency(selectedTransaction.montant, selectedTransaction.devise)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Référence</span>
                  <span className="text-sm font-medium text-foreground">
                    {selectedTransaction.referenceFournisseur || '-'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleValidate} className="space-y-4">
                {/* Upload scan */}
                <div>
                  <label className="block text-sm font-bold mb-2 text-foreground">
                    Scan Facture Fournisseur <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setScanFile(e.target.files[0])}
                      className="w-full border-2 border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                      required
                    />
                    <Upload className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    PDF, JPG ou PNG (obligatoire)
                  </p>
                </div>

                {/* Mode paiement */}
                <div>
                  <label className="block text-sm font-bold mb-2 text-foreground">Mode de Paiement</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setModePaiement('CREDIT')}
                      className={cn(
                        'p-3 rounded-xl border-2 font-bold text-sm transition-all',
                        modePaiement === 'CREDIT'
                          ? 'border-rose-500 bg-rose-500/10 text-rose-600'
                          : 'border-border hover:border-muted-foreground/50'
                      )}
                    >
                      <CreditCard className="w-4 h-4 mx-auto mb-1" />
                      Crédit
                    </button>
                    <button
                      type="button"
                      onClick={() => setModePaiement('IMMEDIAT')}
                      className={cn(
                        'p-3 rounded-xl border-2 font-bold text-sm transition-all',
                        modePaiement === 'IMMEDIAT'
                          ? 'border-rose-500 bg-rose-500/10 text-rose-600'
                          : 'border-border hover:border-muted-foreground/50'
                      )}
                    >
                      <DollarSign className="w-4 h-4 mx-auto mb-1" />
                      Immédiat
                    </button>
                  </div>
                </div>

                {/* Caisse (si immédiat) */}
                {modePaiement === 'IMMEDIAT' && (
                  <div>
                    <label className="block text-sm font-bold mb-2 text-foreground">
                      Caisse <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={caisseId}
                        onChange={(e) => setCaisseId(e.target.value)}
                        className="w-full bg-card border-2 border-border rounded-xl px-4 py-3 text-foreground font-medium
                          focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all
                          appearance-none cursor-pointer
                          [&>option]:bg-card [&>option]:text-foreground [&>option]:py-2
                          [&>option:checked]:bg-rose-500 [&>option:checked]:text-white"
                        required
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23f43f5e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 12px center',
                          backgroundSize: '20px',
                          paddingRight: '40px'
                        }}
                      >
                        <option value="" className="text-muted-foreground">
                          {user?.role === 'ADMIN' || user?.role === 'FINANCE' 
                            ? "Sélectionnez une caisse (Trésorerie ou Réception)..." 
                            : "Sélectionnez la Caisse Réception..."}
                        </option>
                        {caisses
                          .filter(c => c.devise === selectedTransaction.devise)
                          .filter(c => {
                            // Si Admin/Finance: voir TOUTES les caisses
                            if (user?.role === 'ADMIN' || user?.role === 'FINANCE') return true;
                            // Sinon: voir uniquement les caisses physiques (ID > 0)
                            return c.id > 0;
                          })
                          .map((c) => {
                            // Renommer pour clarifier
                            const displayName = c.nom.includes('Principale') 
                              ? c.nom.replace('Principale', 'Réception (Opérationnelle)')
                              : c.nom;
                            const isTresorerie = c.id < 0;
                            
                            return (
                              <option key={c.id} value={c.id} className="py-2">
                                {isTresorerie ? '💰 ' : '🏦 '}{displayName} — {formatCurrency(c.solde, c.devise)}
                                {isTresorerie ? ' [Admin/Finance]' : ' [Caissier]'}
                              </option>
                            );
                          })}
                      </select>
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-rose-500"></span>
                        Devise requise: <span className="font-bold text-foreground">{selectedTransaction.devise}</span>
                      </p>
                      
                      {/* Explication selon le rôle */}
                      {user?.role === 'ADMIN' || user?.role === 'FINANCE' ? (
                        <div className="flex items-start gap-1.5 text-[10px] text-amber-600/80 bg-amber-500/5 p-1.5 rounded">
                          <Shield className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>
                            <strong>Mode Admin:</strong> Vous pouvez choisir 💰 Trésorerie Globale (fournisseurs/salaires) 
                            ou 🏦 Caisse Réception (patients). Les deux ont le même solde.
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-start gap-1.5 text-[10px] text-blue-600/80 bg-blue-500/5 p-1.5 rounded">
                          <Wallet className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>
                            <strong>Mode Caissier:</strong> Utilisez la Caisse Réception pour les paiements patients.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Date échéance (si crédit) */}
                {modePaiement === 'CREDIT' && (
                  <div>
                    <label className="block text-sm font-bold mb-2 text-foreground">Date Échéance Paiement</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={dateEcheance}
                        onChange={(e) => setDateEcheance(e.target.value)}
                        className="w-full border-2 border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Défaut: 30 jours
                    </p>
                  </div>
                )}

                {/* Boutons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedTransaction(null)}
                    disabled={validating}
                    className="flex-1 rounded-xl font-bold border-2 h-12"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 rounded-xl font-bold bg-rose-500 hover:bg-rose-600 text-white h-12 gap-2"
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
