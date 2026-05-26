import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import {
  Building2, Loader2, Download, Search, ArrowLeft,
  Users, DollarSign, Activity,
  Stethoscope, FlaskConical, Pill, RefreshCw,
} from 'lucide-react';
import { companyService } from '@/services/companyService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const statusBadge = (status) => {
  const cls = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    SUSPENDED: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    EXPIRED: 'bg-red-500/10 text-red-600 border-red-500/20',
  }[status] || '';
  const label = { ACTIVE: 'Actif', SUSPENDED: 'Suspendu', EXPIRED: 'Expiré' }[status] || status;
  return <span className={`px-2 py-0.5 text-xs rounded-md border ${cls}`}>{label}</span>;
};

const fmt = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount || 0);

export default function CompanyConsumptionPage() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedCompany, setSelectedCompany] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const summaryIntervalRef = useRef(null);
  const selectedCompanyRef = useRef(null);
  const selectedMonthRef   = useRef(selectedMonth);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await companyService.getAllStats();
      setCompanies(data || []);
    } catch (e) {
      toast.error('Impossible de charger les entreprises');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Polling dashboard toutes les 30 s (actif uniquement sur la liste)
  useEffect(() => {
    const id = setInterval(() => {
      if (!selectedCompanyRef.current) refresh();
    }, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  const loadSummaries = useCallback(async (company, month) => {
    setLoadingRecords(true);
    try {
      const data = await companyService.getPatientSummaries(company.id, month);
      setSummaries(data || []);
    } catch (e) {
      toast.error('Impossible de charger les consommations');
      setSummaries([]);
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  const stopSummaryPolling = () => {
    if (summaryIntervalRef.current) {
      clearInterval(summaryIntervalRef.current);
      summaryIntervalRef.current = null;
    }
  };

  const startSummaryPolling = (company, month) => {
    stopSummaryPolling();
    summaryIntervalRef.current = setInterval(() => {
      loadSummaries(company, month);
    }, 300000);
  };

  const openCompany = (company) => {
    selectedCompanyRef.current = company;
    setSelectedCompany(company);
    setSummaries([]);
    loadSummaries(company, selectedMonth);
    startSummaryPolling(company, selectedMonth);
  };

  // Cleanup sur unmount
  useEffect(() => () => stopSummaryPolling(), []);

  const handleMonthChange = (newMonth) => {
    selectedMonthRef.current = newMonth;
    setSelectedMonth(newMonth);
    if (selectedCompany) {
      loadSummaries(selectedCompany, newMonth);
      startSummaryPolling(selectedCompany, newMonth);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedCompany) return;
    setDownloadingPDF(true);
    try {
      await companyService.downloadConsumptionSheet(selectedCompany.id, selectedMonth);
      toast.success(`PDF téléchargé : ${selectedCompany.name} — ${selectedMonth}`);
    } catch (e) {
      toast.error('Erreur lors du téléchargement du PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const filteredCompanies = companies.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const grandTotals = useMemo(() => summaries.reduce(
    (acc, s) => ({
      consultation: acc.consultation + Number(s.consultationAmount ?? 0),
      labo:         acc.labo         + Number(s.laboAmount ?? 0),
      pharmacie:    acc.pharmacie    + Number(s.pharmacieAmount ?? 0),
      coverage:     acc.coverage     + Number(s.totalCoverage ?? 0),
      surplus:      acc.surplus      + Number(s.totalSurplus ?? 0),
      total:        acc.total        + Number(s.totalAmount ?? 0),
    }),
    { consultation: 0, labo: 0, pharmacie: 0, coverage: 0, surplus: 0, total: 0 }
  ), [summaries]);

  const AmtCell = ({ amount }) => {
    const n = Number(amount ?? 0);
    return (
      <TableCell className={`text-right font-bold text-sm ${n === 0 ? 'text-muted-foreground/50' : ''}`}>
        {fmt(n)}
      </TableCell>
    );
  };

  if (selectedCompany) {
    return (
      <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => { stopSummaryPolling(); selectedCompanyRef.current = null; setSelectedCompany(null); refresh(); }} className="gap-2 rounded-xl font-bold">
              <ArrowLeft className="w-4 h-4" /> Retour
            </Button>
            <div>
              <h1 className="text-xl font-black flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                {selectedCompany.name}
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                Feuille de consommation — couverture {selectedCompany.coverageRate ?? 100}%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="space-y-0.5">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Mois</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="w-44 h-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => loadSummaries(selectedCompany, selectedMonth)}
              disabled={loadingRecords}
              className="gap-1.5 rounded-xl h-9 self-end"
            >
              <RefreshCw className={`w-4 h-4 ${loadingRecords ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF || summaries.length === 0}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 self-end"
            >
              {downloadingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Télécharger PDF
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Admissions', value: summaries.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-500/10' },
            { label: 'Total consommé', value: fmt(grandTotals.total), icon: Activity, color: 'text-purple-600', bg: 'bg-purple-500/10' },
            { label: 'Pris en charge', value: fmt(grandTotals.coverage), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
            { label: 'Ticket modeste', value: fmt(grandTotals.surplus), icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-500/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`rounded-2xl border p-4 flex items-center gap-3 ${bg} border-transparent`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
                <p className={`text-lg font-black ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table principale */}
        <Card className="rounded-2xl border">
          <CardContent className="p-0">
            {loadingRecords ? (
              <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" /> Chargement des admissions...
              </div>
            ) : summaries.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-bold">Aucune admission enregistrée</p>
                <p className="text-sm">pour {selectedCompany.name} en {selectedMonth}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-[11px] uppercase bg-muted/30">
                      <TableHead className="pl-4">Patient</TableHead>
                      <TableHead>Matricule</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-center">
                        <span className="inline-flex items-center gap-1">
                          <Stethoscope className="w-3 h-3" /> Consultation
                        </span>
                      </TableHead>
                      <TableHead className="text-center">
                        <span className="inline-flex items-center gap-1">
                          <FlaskConical className="w-3 h-3" /> Labo
                        </span>
                      </TableHead>
                      <TableHead className="text-center">
                        <span className="inline-flex items-center gap-1">
                          <Pill className="w-3 h-3" /> Pharmacie
                        </span>
                      </TableHead>
                      <TableHead className="text-right text-emerald-600 font-black">Couvert</TableHead>
                      <TableHead className="text-right text-amber-600 font-black">Ticket</TableHead>
                      <TableHead className="text-right pr-4">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaries.map((s) => (
                      <TableRow key={s.admissionId} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-500 to-slate-700 text-white flex items-center justify-center font-black text-xs shrink-0">
                              {(s.patientName || '?').charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-sm">{s.patientName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.matricule || '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {s.admissionDate ? new Date(s.admissionDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'}
                        </TableCell>
                        <AmtCell amount={s.consultationAmount} />
                        <AmtCell amount={s.laboAmount} />
                        <AmtCell amount={s.pharmacieAmount} />
                        <TableCell className="text-right font-black text-emerald-600">{fmt(s.totalCoverage)}</TableCell>
                        <TableCell className="text-right font-black text-amber-600">{fmt(s.totalSurplus)}</TableCell>
                        <TableCell className="text-right pr-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            s.admissionStatus === 'TERMINE' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                            s.admissionStatus === 'EN_COURS' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                            'bg-muted/50 text-muted-foreground border-border'
                          }`}>
                            {s.admissionStatus === 'TERMINE' ? 'Terminé' :
                             s.admissionStatus === 'EN_COURS' ? 'En cours' :
                             s.admissionStatus === 'EN_ATTENTE' ? 'En attente' : s.admissionStatus || '—'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Ligne TOTAUX */}
                <div className="flex items-center gap-0 border-t-2 border-border bg-muted/40 text-sm">
                  <div className="flex-1 px-4 py-3 font-black uppercase tracking-wider text-[11px]">TOTAL GÉNÉRAL</div>
                  <div className="w-28 text-center py-3 font-black">{fmt(grandTotals.consultation)}</div>
                  <div className="w-24 text-center py-3 font-black">{fmt(grandTotals.labo)}</div>
                  <div className="w-28 text-center py-3 font-black">{fmt(grandTotals.pharmacie)}</div>
                  <div className="w-28 text-right py-3 font-black text-emerald-600 pr-4">{fmt(grandTotals.coverage)}</div>
                  <div className="w-28 text-right py-3 font-black text-amber-600 pr-4">{fmt(grandTotals.surplus)}</div>
                  <div className="w-28 pr-4" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Feuilles de consommation des entreprises
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Cliquez sur une entreprise pour voir le détail avant de télécharger le PDF
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="space-y-1">
                <Label className="text-xs">Mois de consommation</Label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-48"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Recherche</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Entreprise ou contact..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
              </div>
            </div>
            <Button onClick={refresh} variant="outline" size="sm" className="gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              {searchQuery ? 'Aucune entreprise trouvée' : 'Aucune entreprise abonnée'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Employés</TableHead>
                  <TableHead className="text-right">Flux ({selectedMonth})</TableHead>
                  <TableHead className="text-right">Total couvert</TableHead>
                  <TableHead className="text-right">Ticket modeste</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company) => (
                  <TableRow
                    key={company.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => openCompany(company)}
                  >
                    <TableCell className="font-bold text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center font-black text-xs">
                          {(company.name || '?').charAt(0)}
                        </div>
                        {company.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{company.contactPerson || '—'}</TableCell>
                    <TableCell>{statusBadge(company.subscriptionStatus)}</TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-bold bg-muted/40">
                        <Users className="w-3 h-3" /> {company.employeeCount || 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold">{company.admissionCount || 0}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      {fmt(company.totalCompanyCoverage)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-amber-600">
                      {fmt(company.totalPatientSurplus)}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openCompany(company)}
                          className="gap-1.5 text-xs rounded-lg"
                        >
                          <Activity className="w-3.5 h-3.5" /> Détails
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
