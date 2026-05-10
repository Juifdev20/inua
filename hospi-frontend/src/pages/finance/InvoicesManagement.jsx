import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Receipt, Search, Eye, DollarSign, Printer, Plus,
  RefreshCw, Loader2, FileText, ArrowUpDown,
  ChevronRight, X, Download, CheckCircle2,
  Clock, AlertTriangle, Filter, BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import financeApi from '../../services/financeApi/financeApi';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import PaymentModal from '../../components/modals/PaymentModal';
import { toast } from 'sonner';

const InvoicesManagement = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'date', dir: 'desc' });

  useEffect(() => { loadInvoices(); }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await financeApi.getInvoices();
      setInvoices(Array.isArray(data) ? data : data?.content || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error(t('common.error') || 'Erreur chargement factures');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'CDF', minimumFractionDigits: 0,
    }).format(amount || 0);

  const formatDate = (date) => {
    if (!date) return '-';
    try { return format(new Date(date), 'dd MMM yyyy', { locale: fr }); } catch { return '-'; }
  };

  const formatFullDate = (date) => {
    if (!date) return '-';
    try { return format(new Date(date), 'dd MMMM yyyy à HH:mm', { locale: fr }); } catch { return '-'; }
  };

  const isPaid = (s) => s === 'PAID' || s === 'PAYEE';
  const isPartial = (s) => s === 'PARTIAL';

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handlePayment = (invoice) => {
    setPaymentTarget(invoice);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setPaymentTarget(null);
    setSelectedInvoice(null);
    loadInvoices();
    toast.success(t('finance.payment.success') || 'Paiement enregistré');
  };

  /* ── Filtrage + Tri ── */
  const filtered = useMemo(() => {
    let result = [...invoices];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (inv) =>
          (inv.patientName || '').toLowerCase().includes(q) ||
          (inv.id || '').toString().toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'ALL') result = result.filter((inv) => inv.status === statusFilter);
    if (typeFilter !== 'ALL') result = result.filter((inv) => inv.type === typeFilter);

    result.sort((a, b) => {
      let valA, valB;
      if (sortConfig.key === 'date') {
        valA = new Date(a.date || a.createdAt || 0).getTime();
        valB = new Date(b.date || b.createdAt || 0).getTime();
      } else if (sortConfig.key === 'amount') {
        valA = a.amount || a.totalAmount || 0;
        valB = b.amount || b.totalAmount || 0;
      } else if (sortConfig.key === 'patient') {
        valA = (a.patientName || '').toLowerCase();
        valB = (b.patientName || '').toLowerCase();
        return sortConfig.dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        valA = a[sortConfig.key] || '';
        valB = b[sortConfig.key] || '';
      }
      return sortConfig.dir === 'asc' ? valA - valB : valB - valA;
    });

    return result;
  }, [invoices, searchTerm, statusFilter, typeFilter, sortConfig]);

  /* ── Stats ── */
  const totalAmount = invoices.reduce((s, i) => s + (i.amount || i.totalAmount || 0), 0);
  const paidCount = invoices.filter((i) => isPaid(i.status)).length;
  const unpaidCount = invoices.filter((i) => i.status === 'UNPAID').length;
  const partialCount = invoices.filter((i) => isPartial(i.status)).length;

  /* ── Helpers UI ── */
  const getStatusConfig = (status) => {
    const map = {
      PAID: { label: 'Payé', color: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle2 },
      PAYEE: { label: 'Payé', color: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle2 },
      UNPAID: { label: 'Non payé', color: 'bg-red-500/10 text-red-500', icon: AlertTriangle },
      PARTIAL: { label: 'Partiel', color: 'bg-amber-500/10 text-amber-600', icon: Clock },
    };
    return map[status] || { label: status, color: 'bg-muted text-muted-foreground', icon: FileText };
  };

  const getTypeConfig = (type) => {
    const map = {
      ADMISSION: { label: 'Admission', color: '#3B82F6' },
      LABO: { label: 'Laboratoire', color: '#8B5CF6' },
      PHARMACIE: { label: 'Pharmacie', color: '#14B8A6' },
    };
    return map[type] || { label: type || 'Autre', color: '#6B7280' };
  };

  const SortableHeader = ({ label, sortKey, className }) => (
    <button
      onClick={() => handleSort(sortKey)}
      className={cn(
        'flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors group',
        className
      )}
    >
      {label}
      <ArrowUpDown className={cn(
        'w-3 h-3 opacity-30 group-hover:opacity-100 transition-opacity',
        sortConfig.key === sortKey && 'opacity-100 text-orange-500'
      )} />
    </button>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500" data-testid="invoices-management">

      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-orange-500/10">
              <Receipt className="w-7 h-7 text-orange-600" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                {t('finance.invoices') || 'Gestion des factures'}
              </h1>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-0.5">
                {format(new Date(), "EEEE dd MMMM yyyy", { locale: fr })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              onClick={loadInvoices}
              variant="outline" size="sm"
              className="rounded-xl font-bold border-2"
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
              Actualiser
            </Button>
            <Button
              size="sm"
              className="rounded-xl font-bold bg-orange-500 hover:bg-orange-600 text-white gap-2 shadow-lg shadow-orange-500/20"
            >
              <Plus className="w-4 h-4" />
              Nouvelle facture
            </Button>
          </div>
        </div>

        {/* Compteurs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-card rounded-xl border border-border shadow-sm">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total</span>
            <span className="text-lg font-black text-foreground ml-1">{invoices.length}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/5 rounded-xl border border-emerald-500/20 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Payées</span>
            <span className="text-lg font-black text-emerald-600 ml-1">{paidCount}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/5 rounded-xl border border-red-500/20 shadow-sm">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Non payées</span>
            <span className="text-lg font-black text-red-600 ml-1">{unpaidCount}</span>
          </div>
          {partialCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/5 rounded-xl border border-amber-500/20 shadow-sm">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Partielles</span>
              <span className="text-lg font-black text-amber-600 ml-1">{partialCount}</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-500/5 rounded-xl border border-orange-500/20 shadow-sm ml-auto">
            <BarChart3 className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Volume</span>
            <span className="text-sm font-black text-orange-600 ml-1">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* ═══ CONTENU — Tableau + Panneau détail ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── TABLEAU (3 ou 5 colonnes selon sélection) ── */}
        <Card className={cn(
          'border-none shadow-sm bg-card rounded-2xl overflow-hidden flex flex-col transition-all',
          selectedInvoice ? 'lg:col-span-3' : 'lg:col-span-5'
        )}>
          {/* Toolbar filtres */}
          <div className="p-4 border-b border-border/50 flex flex-col md:flex-row items-center gap-3 bg-muted/20">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par patient ou n° facture..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl border-muted bg-background focus:ring-2 focus:ring-orange-500/20 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* Filtre statut */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-background border border-border focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all text-foreground"
              >
                <option value="ALL">Tous statuts</option>
                <option value="PAID">Payé</option>
                <option value="UNPAID">Non payé</option>
                <option value="PARTIAL">Partiel</option>
              </select>
              {/* Filtre type */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-background border border-border focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all text-foreground"
              >
                <option value="ALL">Tous types</option>
                <option value="ADMISSION">Admission</option>
                <option value="LABO">Laboratoire</option>
                <option value="PHARMACIE">Pharmacie</option>
              </select>
              {/* Reset */}
              {(statusFilter !== 'ALL' || typeFilter !== 'ALL' || searchTerm) && (
                <Button
                  variant="ghost" size="sm"
                  className="rounded-xl text-xs font-bold text-orange-500 hover:bg-orange-500/10"
                  onClick={() => { setStatusFilter('ALL'); setTypeFilter('ALL'); setSearchTerm(''); }}
                >
                  <X className="w-3 h-3 mr-1" /> Réinitialiser
                </Button>
              )}
            </div>
          </div>

          {/* Tableau */}
          <div className="flex-1 overflow-auto scrollbar-thin">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                  Chargement des factures...
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-24 text-center">
                <div className="inline-flex p-4 rounded-full bg-muted mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground font-medium italic">
                  {searchTerm || statusFilter !== 'ALL' || typeFilter !== 'ALL'
                    ? 'Aucune facture ne correspond aux filtres'
                    : 'Aucune facture enregistrée'}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-5 py-3 text-left">
                      <SortableHeader label="N° Facture" sortKey="id" />
                    </th>
                    <th className="px-5 py-3 text-left">
                      <SortableHeader label="Patient" sortKey="patient" />
                    </th>
                    <th className="px-5 py-3 text-left hidden md:table-cell">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Type</span>
                    </th>
                    <th className="px-5 py-3 text-left">
                      <SortableHeader label="Montant" sortKey="amount" />
                    </th>
                    <th className="px-5 py-3 text-left hidden sm:table-cell">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Statut</span>
                    </th>
                    <th className="px-5 py-3 text-left hidden lg:table-cell">
                      <SortableHeader label="Date" sortKey="date" />
                    </th>
                    <th className="px-5 py-3 text-right">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((invoice) => {
                    const statusCfg = getStatusConfig(invoice.status);
                    const typeCfg = getTypeConfig(invoice.type);
                    const isActive = selectedInvoice?.id === invoice.id;
                    const StatusIcon = statusCfg.icon;

                    return (
                      <tr
                        key={invoice.id}
                        onClick={() => setSelectedInvoice(invoice)}
                        className={cn(
                          'border-b border-border/50 cursor-pointer transition-all group',
                          isActive
                            ? 'bg-orange-500/5'
                            : 'hover:bg-muted/40'
                        )}
                        data-testid={`invoice-row-${invoice.id}`}
                      >
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs font-black text-orange-600">
                            #{invoice.id}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0"
                              style={{ backgroundColor: `${typeCfg.color}15`, color: typeCfg.color }}
                            >
                              {(invoice.patientName || '?').charAt(0)}
                            </div>
                            <span className="font-bold text-sm text-foreground truncate max-w-[160px]">
                              {invoice.patientName || 'Inconnu'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <span
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                            style={{ backgroundColor: `${typeCfg.color}15`, color: typeCfg.color }}
                          >
                            {typeCfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm font-black text-foreground">
                            {formatCurrency(invoice.amount || invoice.totalAmount)}
                          </span>
                        </td>
                        <td className="px-5 py-4 hidden sm:table-cell">
                          <Badge className={cn('border-none font-bold text-[10px]', statusCfg.color)}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusCfg.label}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground font-medium">
                            {formatDate(invoice.date || invoice.createdAt)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost" size="icon"
                              className="rounded-xl h-8 w-8 hover:bg-muted"
                              onClick={(e) => { e.stopPropagation(); setSelectedInvoice(invoice); }}
                            >
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            {invoice.status === 'UNPAID' && (
                              <Button
                                variant="ghost" size="icon"
                                className="rounded-xl h-8 w-8 hover:bg-orange-500/10 text-orange-500"
                                onClick={(e) => { e.stopPropagation(); handlePayment(invoice); }}
                              >
                                <DollarSign className="w-4 h-4" />
                              </Button>
                            )}
                            <ChevronRight className={cn(
                              'w-4 h-4 text-muted-foreground/30 transition-all',
                              isActive && 'text-orange-500 translate-x-0.5'
                            )} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer résumé */}
          <div className="p-3 border-t border-border bg-muted/20 flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">
              {filtered.length} facture{filtered.length > 1 ? 's' : ''} sur {invoices.length}
            </span>
            <span className="text-muted-foreground">
              Montant filtré : <strong className="text-orange-600">
                {formatCurrency(filtered.reduce((s, i) => s + (i.amount || i.totalAmount || 0), 0))}
              </strong>
            </span>
          </div>
        </Card>

        {/* ── PANNEAU DÉTAIL (2 colonnes) — Apparaît à la sélection ── */}
        {selectedInvoice && (
          <div className="lg:col-span-2 space-y-6 animate-in slide-in-from-right-4 duration-300">
            <Card className="border-none shadow-sm bg-card rounded-2xl overflow-hidden">
              {/* Header détail */}
              <div className={cn(
                'p-5 border-b border-border/50 flex items-center justify-between',
                isPaid(selectedInvoice.status) ? 'bg-emerald-500/5' : 'bg-orange-500/5'
              )}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white',
                    isPaid(selectedInvoice.status) ? 'bg-emerald-500' : 'bg-orange-500'
                  )}>
                    {(selectedInvoice.patientName || '?').charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-foreground truncate">
                      {selectedInvoice.patientName || 'Inconnu'}
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium">
                      Facture #{selectedInvoice.id}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost" size="icon"
                  className="rounded-xl hover:bg-muted shrink-0"
                  onClick={() => setSelectedInvoice(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <CardContent className="p-5 space-y-5">
                {/* Montant */}
                <div className="text-center py-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    Montant
                  </p>
                  <p className={cn(
                    'text-4xl font-black tracking-tighter',
                    isPaid(selectedInvoice.status) ? 'text-emerald-600' : 'text-orange-600'
                  )}>
                    {formatCurrency(selectedInvoice.amount || selectedInvoice.totalAmount)}
                  </p>
                  <div className="mt-3">
                    {(() => {
                      const cfg = getStatusConfig(selectedInvoice.status);
                      const Icon = cfg.icon;
                      return (
                        <Badge className={cn('border-none font-bold px-4 py-1', cfg.color)}>
                          <Icon className="w-3.5 h-3.5 mr-1.5" /> {cfg.label}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>

                {/* Infos */}
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Informations
                  </p>
                  {[
                    { label: 'Type', value: (() => { const c = getTypeConfig(selectedInvoice.type); return (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase" style={{ backgroundColor: `${c.color}15`, color: c.color }}>
                        {c.label}
                      </span>
                    );})()},
                    { label: 'Date', value: formatFullDate(selectedInvoice.date || selectedInvoice.createdAt) },
                    { label: 'Patient', value: selectedInvoice.patientName || '-' },
                    { label: 'Référence', value: `#${selectedInvoice.id}` },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        {item.label}
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Prestations si disponibles */}
                {(selectedInvoice.items || selectedInvoice.services || []).length > 0 && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">
                      Détail des prestations
                    </p>
                    <div className="space-y-2">
                      {(selectedInvoice.items || selectedInvoice.services || []).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                          <span className="text-sm font-bold text-foreground">
                            {item.name || item.serviceName}
                          </span>
                          <span className="text-sm font-black text-foreground">
                            {formatCurrency(item.price || item.unitPrice)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-3 pt-2">
                  {selectedInvoice.status === 'UNPAID' && (
                    <Button
                      onClick={() => handlePayment(selectedInvoice)}
                      className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-base gap-3 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      <DollarSign className="w-5 h-5" />
                      Encaisser cette facture
                    </Button>
                  )}
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold border-2 gap-2">
                      <Printer className="w-4 h-4" /> Imprimer
                    </Button>
                    <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold border-2 gap-2">
                      <Download className="w-4 h-4" /> Exporter
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tip */}
            <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-orange-500/10 shrink-0">
                  <Filter className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-orange-600 mb-1">Gestion</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Utilisez les filtres par statut et type pour retrouver rapidement une facture.
                    Cliquez sur une ligne pour afficher les détails et procéder au paiement.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && paymentTarget && (
        <PaymentModal
          invoice={paymentTarget}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default InvoicesManagement;