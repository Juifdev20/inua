import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Building2, Users, Plus, Trash2, Loader2, Search, UserPlus, Mail, Phone, MapPin,
  FileDown, TrendingUp,
} from 'lucide-react';
import { companyService } from '@/services/companyService';
import { patientService } from '@/services/patientService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const statusBadge = (status) => {
  const cls = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    SUSPENDED: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    EXPIRED: 'bg-red-500/10 text-red-600 border-red-500/20',
  }[status] || '';
  const label = { ACTIVE: 'Actif', SUSPENDED: 'Suspendu', EXPIRED: 'Expiré' }[status] || status;
  return <span className={`px-2 py-0.5 text-xs rounded-md border ${cls}`}>{label}</span>;
};

export default function CompanyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [company, setCompany] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal ajout agent
  const [showAddModal, setShowAddModal] = useState(false);

  // Rapports
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [matricule, setMatricule] = useState('');
  const [dependantOfId, setDependantOfId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [c, emps, st] = await Promise.all([
        companyService.getById(id),
        companyService.getEmployees(id),
        companyService.getStats(id).catch(() => null),
      ]);
      setCompany(c);
      setEmployees(emps || []);
      setStats(st);
    } catch (e) {
      toast.error('Impossible de charger l\'entreprise');
      navigate('/admin/companies');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      await companyService.downloadConsumptionSheet(id, selectedMonth);
      toast.success('Feuille de consommation téléchargée');
    } catch (err) {
      toast.error('Impossible de générer le PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  useEffect(() => { refresh(); }, [refresh]);

  // Recherche de patients (debouncée light)
  useEffect(() => {
    if (!showAddModal) return;
    const q = patientSearch.trim();
    if (q.length < 2) {
      setPatientResults([]);
      return;
    }
    let cancelled = false;
    setSearchingPatients(true);
    const t = setTimeout(async () => {
      try {
        const results = await patientService.searchPatientsSimple(q);
        if (!cancelled) setPatientResults(Array.isArray(results) ? results.slice(0, 20) : []);
      } catch {
        if (!cancelled) setPatientResults([]);
      } finally {
        if (!cancelled) setSearchingPatients(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [patientSearch, showAddModal]);

  const openAddModal = () => {
    setSelectedPatient(null);
    setPatientSearch('');
    setPatientResults([]);
    setMatricule('');
    setDependantOfId('');
    setShowAddModal(true);
  };

  const submitAdd = async (e) => {
    e?.preventDefault();
    if (!selectedPatient) {
      toast.error('Sélectionnez un patient');
      return;
    }
    setSubmitting(true);
    try {
      await companyService.addEmployee(id, {
        patientId: selectedPatient.id,
        matricule: matricule || null,
        dependantOfId: dependantOfId ? Number(dependantOfId) : null,
        isActive: true,
      });
      toast.success('Agent ajouté');
      setShowAddModal(false);
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Impossible d\'ajouter cet agent');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await companyService.removeEmployee(id, deleteTarget.id);
      toast.success('Agent retiré');
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Suppression impossible');
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!company) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/companies')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" /> {company.name}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            {company.contractNumber && <span>Contrat : <span className="font-medium text-foreground">{company.contractNumber}</span></span>}
            {statusBadge(company.subscriptionStatus)}
          </div>
        </div>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Informations générales</TabsTrigger>
          <TabsTrigger value="employees" className="gap-2">
            Agents <Badge variant="secondary">{employees.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <TrendingUp className="w-3.5 h-3.5" /> Rapports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader><CardTitle>Détails du contrat</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <InfoLine icon={<UserPlus className="w-4 h-4" />} label="Personne de contact" value={company.contactPerson} />
              <InfoLine icon={<Mail className="w-4 h-4" />} label="Email" value={company.email} />
              <InfoLine icon={<Phone className="w-4 h-4" />} label="Téléphone" value={company.phone} />
              <InfoLine icon={<MapPin className="w-4 h-4" />} label="Adresse" value={company.address} />
              <InfoLine label="Taux de couverture" value={`${Number(company.coverageRate ?? 0).toFixed(0)} %`} />
              <InfoLine label="Surplus soins externes" value={`${Number(company.surplusRate ?? 0).toFixed(0)} %`} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={openAddModal} className="gap-2">
              <Plus className="w-4 h-4" /> Ajouter un agent
            </Button>
          </div>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Matricule</TableHead>
                  <TableHead>Dépendant de</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      Aucun agent enregistré pour cette entreprise.
                    </TableCell>
                  </TableRow>
                ) : employees.map(emp => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.patientFullName}</TableCell>
                    <TableCell>{emp.patientCode || '—'}</TableCell>
                    <TableCell>{emp.matricule || '—'}</TableCell>
                    <TableCell>{emp.dependantOfName || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{emp.patientPhone || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(emp)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          {/* Feuille de consommation mensuelle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileDown className="w-4 h-4" />
                Feuille de consommation mensuelle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Mois</Label>
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button
                  onClick={handleDownloadPDF}
                  disabled={downloadingPDF}
                  className="gap-2"
                >
                  {downloadingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  Télécharger PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Statistiques */}
          <Card>
            <CardHeader><CardTitle>Statistiques</CardTitle></CardHeader>
            <CardContent>
              {stats ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10 text-center">
                    <p className="text-xs text-muted-foreground">Agents actifs</p>
                    <p className="text-xl font-bold text-emerald-600">{stats.activeEmployees}</p>
                    <p className="text-[10px] text-muted-foreground">/ {stats.totalEmployees} total</p>
                  </div>
                  <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/10 text-center">
                    <p className="text-xs text-muted-foreground">Admissions ce mois</p>
                    <p className="text-xl font-bold text-blue-600">{stats.totalAdmissionsCurrentMonth}</p>
                  </div>
                  <div className="p-3 bg-purple-500/5 rounded-lg border border-purple-500/10 text-center">
                    <p className="text-xs text-muted-foreground">Prise en charge ce mois</p>
                    <p className="text-xl font-bold text-purple-600">{Number(stats.totalCompanyCoverageCurrentMonth ?? 0).toFixed(2)} $</p>
                  </div>
                  <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/10 text-center">
                    <p className="text-xs text-muted-foreground">Ticket modeste ce mois</p>
                    <p className="text-xl font-bold text-amber-600">{Number(stats.totalPatientSurplusCurrentMonth ?? 0).toFixed(2)} $</p>
                  </div>
                  <div className="p-3 bg-slate-500/5 rounded-lg border border-slate-500/10 text-center">
                    <p className="text-xs text-muted-foreground">Prise en charge (total)</p>
                    <p className="text-xl font-bold text-slate-600">{Number(stats.totalCompanyCoverageAllTime ?? 0).toFixed(2)} $</p>
                  </div>
                  <div className="p-3 bg-rose-500/5 rounded-lg border border-rose-500/10 text-center">
                    <p className="text-xs text-muted-foreground">Ticket modeste (total)</p>
                    <p className="text-xl font-bold text-rose-600">{Number(stats.totalPatientSurplusAllTime ?? 0).toFixed(2)} $</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Aucune statistique disponible.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Ajout Agent */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Ajouter un agent</DialogTitle>
            <DialogDescription>
              Liez un patient existant comme agent couvert par cette entreprise.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitAdd} className="space-y-4">
            <div>
              <Label>Rechercher un patient *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Nom, prénom, code patient..."
                  value={patientSearch}
                  onChange={(e) => { setPatientSearch(e.target.value); setSelectedPatient(null); }}
                />
              </div>
              {selectedPatient ? (
                <div className="mt-2 p-3 rounded-md bg-primary/5 border border-primary/20 text-sm">
                  <strong>{selectedPatient.firstName} {selectedPatient.lastName}</strong>
                  <span className="text-muted-foreground ml-2">— {selectedPatient.patientCode}</span>
                  <Button
                    type="button" variant="ghost" size="sm" className="ml-2"
                    onClick={() => { setSelectedPatient(null); }}
                  >
                    Changer
                  </Button>
                </div>
              ) : (patientSearch.length >= 2 && (
                <div className="mt-2 border rounded-md max-h-48 overflow-y-auto">
                  {searchingPatients ? (
                    <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Recherche...
                    </div>
                  ) : patientResults.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">Aucun patient trouvé.</div>
                  ) : patientResults.map(p => (
                    <button
                      type="button" key={p.id}
                      onClick={() => { setSelectedPatient(p); setPatientSearch(`${p.firstName} ${p.lastName}`); }}
                      className="w-full text-left px-3 py-2 hover:bg-muted/40 text-sm border-b last:border-0"
                    >
                      <div className="font-medium">{p.firstName} {p.lastName}</div>
                      <div className="text-xs text-muted-foreground">{p.patientCode}</div>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <div>
              <Label>Matricule</Label>
              <Input
                value={matricule}
                onChange={(e) => setMatricule(e.target.value)}
                placeholder="Ex: AGT-00125"
              />
            </div>

            <div>
              <Label>Dépendant de (optionnel)</Label>
              <Select value={dependantOfId || 'NONE'} onValueChange={(v) => setDependantOfId(v === 'NONE' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Aucun (titulaire)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Aucun (titulaire)</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={String(emp.id)}>
                      {emp.patientFullName} {emp.matricule ? `(${emp.matricule})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Annuler</Button>
              <Button type="submit" disabled={submitting || !selectedPatient}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Ajouter
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer cet agent ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.patientFullName}</strong> ne sera plus considéré comme couvert
              par <strong>{company.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfoLine({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="mt-0.5 text-muted-foreground">{icon}</span>}
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="font-medium">{value || <span className="text-muted-foreground">—</span>}</div>
      </div>
    </div>
  );
}
