import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Building2, Plus, Search, Loader2, Edit, Trash2, Users, AlertTriangle, ChevronRight,
} from 'lucide-react';
import { companyService } from '@/services/companyService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Actif' },
  { value: 'SUSPENDED', label: 'Suspendu' },
  { value: 'EXPIRED', label: 'Expiré' },
];

const statusBadge = (status) => {
  const map = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    SUSPENDED: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    EXPIRED: 'bg-red-500/10 text-red-600 border-red-500/20',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${map[status] || ''}`}>
      {STATUS_OPTIONS.find(o => o.value === status)?.label || status}
    </span>
  );
};

const EMPTY_FORM = {
  name: '',
  address: '',
  phone: '',
  email: '',
  contactPerson: '',
  contractNumber: '',
  subscriptionStatus: 'ACTIVE',
  coverageRate: 100,
  surplusRate: 35,
};

export default function CompaniesPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const data = await companyService.getAll(filterStatus === 'ALL' ? null : filterStatus);
      setCompanies(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Erreur de chargement des entreprises');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(c =>
      [c.name, c.contractNumber, c.contactPerson, c.email]
        .some(v => (v || '').toLowerCase().includes(q))
    );
  }, [companies, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (company) => {
    setEditing(company);
    setForm({
      name: company.name || '',
      address: company.address || '',
      phone: company.phone || '',
      email: company.email || '',
      contactPerson: company.contactPerson || '',
      contractNumber: company.contractNumber || '',
      subscriptionStatus: company.subscriptionStatus || 'ACTIVE',
      coverageRate: company.coverageRate ?? 100,
      surplusRate: company.surplusRate ?? 35,
    });
    setShowModal(true);
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (!form.name?.trim()) {
      toast.error('Le nom de l\'entreprise est obligatoire');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        coverageRate: Number(form.coverageRate),
        surplusRate: Number(form.surplusRate),
      };
      if (editing) {
        await companyService.update(editing.id, payload);
        toast.success('Entreprise mise à jour');
      } else {
        await companyService.create(payload);
        toast.success('Entreprise créée');
      }
      setShowModal(false);
      fetchCompanies();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await companyService.remove(deleteTarget.id);
      toast.success('Entreprise supprimée');
      setDeleteTarget(null);
      fetchCompanies();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Suppression impossible');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Entreprises abonnées
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les entreprises clientes et leurs agents couverts par abonnement.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Nouvelle entreprise
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, contrat, contact..."
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous statuts</SelectItem>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Contrat</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Couverture</TableHead>
              <TableHead className="text-right">Surplus</TableHead>
              <TableHead className="text-center">Agents</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">
                  <Loader2 className="inline w-5 h-5 animate-spin mr-2" /> Chargement...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  Aucune entreprise trouvée.
                </TableCell>
              </TableRow>
            ) : filtered.map(c => (
              <TableRow key={c.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">
                  <button
                    className="hover:underline text-left"
                    onClick={() => navigate(`/admin/companies/${c.id}`)}
                  >
                    {c.name}
                  </button>
                </TableCell>
                <TableCell>{c.contractNumber || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  <div className="text-sm">{c.contactPerson || '—'}</div>
                  <div className="text-xs text-muted-foreground">{c.email || c.phone || ''}</div>
                </TableCell>
                <TableCell>{statusBadge(c.subscriptionStatus)}</TableCell>
                <TableCell className="text-right">{Number(c.coverageRate ?? 0).toFixed(0)}%</TableCell>
                <TableCell className="text-right">{Number(c.surplusRate ?? 0).toFixed(0)}%</TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary" className="gap-1">
                    <Users className="w-3 h-3" /> {c.employeesCount ?? 0}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/companies/${c.id}`)} title="Détails">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Modifier">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c)} title="Supprimer">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ---- Modal création / édition ---- */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier l\'entreprise' : 'Nouvelle entreprise abonnée'}</DialogTitle>
            <DialogDescription>
              Renseignez les informations du contrat d'abonnement.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
            <div className="md:col-span-2">
              <Label>Nom de l'entreprise *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label>Numéro de contrat</Label>
              <Input value={form.contractNumber} onChange={(e) => setForm({ ...form, contractNumber: e.target.value })} />
            </div>
            <div>
              <Label>Statut d'abonnement</Label>
              <Select
                value={form.subscriptionStatus}
                onValueChange={(v) => setForm({ ...form, subscriptionStatus: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Personne de contact</Label>
              <Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Adresse</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label>Taux de couverture (%)</Label>
              <Input
                type="number" min="0" max="100" step="0.01"
                value={form.coverageRate}
                onChange={(e) => setForm({ ...form, coverageRate: e.target.value })}
              />
            </div>
            <div>
              <Label>Surplus soins externes (%)</Label>
              <Input
                type="number" min="0" max="100" step="0.01"
                value={form.surplusRate}
                onChange={(e) => setForm({ ...form, surplusRate: e.target.value })}
              />
            </div>
            <DialogFooter className="md:col-span-2 gap-2 mt-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Annuler</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editing ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---- Confirmation suppression ---- */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" /> Confirmer la suppression
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'entreprise <strong>{deleteTarget?.name}</strong> ?
              Cette action est irréversible. Une entreprise avec des agents ne peut pas être supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
