import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Settings, Plus, Edit, Save, Trash2, Search,
  RefreshCw, Loader2, ArrowUpDown, X, Tag,
  Building2, Stethoscope, FlaskConical, Pill, ChevronRight,
  AlertTriangle, DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import financeApi from '../../services/financeApi/financeApi.js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const Tarifs = () => {
  const { t } = useTranslation();
  const [tarifs, setTarifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTarif, setEditingTarif] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState({ key: 'name', dir: 'asc' });
  const [selectedTarif, setSelectedTarif] = useState(null);
  const [formData, setFormData] = useState({
    name: '', type: '', price: '', department: '',
  });

  useEffect(() => { loadTarifs(); }, []);

  const loadTarifs = async () => {
    try {
      setLoading(true);
      const data = await financeApi.getTarifs();
      setTarifs(Array.isArray(data) ? data : data?.content || []);
    } catch (error) {
      toast.error(t('errors.loadTarifs') || 'Erreur chargement tarifs');
      setTarifs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tarif) => {
    setEditingTarif(tarif);
    setFormData({
      name: tarif.name || '',
      type: tarif.type || '',
      price: tarif.price || '',
      department: tarif.department || '',
    });
    setShowEditModal(true);
  };

  const handleCreate = () => {
    setEditingTarif({});
    setFormData({ name: '', type: '', price: '', department: '' });
    setShowEditModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTarif?.id) {
        await financeApi.updateTarif(editingTarif.id, formData);
        toast.success(t('finance.tarifUpdated') || 'Tarif mis à jour');
      } else {
        await financeApi.createTarif(formData);
        toast.success('Tarif créé avec succès');
      }
      setShowEditModal(false);
      setEditingTarif(null);
      setFormData({ name: '', type: '', price: '', department: '' });
      loadTarifs();
    } catch (error) {
      toast.error(t('finance.tarifError') || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('common.confirmDelete') || 'Confirmer la suppression ?')) return;
    try {
      await financeApi.deleteTarif?.(id);
      toast.success(t('finance.tarifDeleted') || 'Tarif supprimé');
      if (selectedTarif?.id === id) setSelectedTarif(null);
      loadTarifs();
    } catch (error) {
      toast.error(t('finance.deleteError') || 'Erreur suppression');
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'CDF', minimumFractionDigits: 0,
    }).format(amount || 0);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  /* ── Config département ── */
  const deptConfig = {
    ADMISSION: { label: 'Admissions', color: '#3B82F6', icon: Building2 },
    LABORATOIRE: { label: 'Laboratoire', color: '#8B5CF6', icon: FlaskConical },
    PHARMACIE: { label: 'Pharmacie', color: '#14B8A6', icon: Pill },
    CONSULTATION: { label: 'Consultation', color: '#F59E0B', icon: Stethoscope },
  };

  const typeConfig = {
    BASE: { label: 'Base', color: '#6B7280' },
    SPECIALISTE: { label: 'Spécialiste', color: '#3B82F6' },
    URGENCE: { label: 'Urgence', color: '#EF4444' },
  };

  const getDept = (d) => deptConfig[d] || { label: d || 'Autre', color: '#6B7280', icon: Tag };
  const getType = (t) => typeConfig[t] || { label: t || 'Standard', color: '#6B7280' };

  /* ── Filtrage + Tri ── */
  const filtered = useMemo(() => {
    let result = [...tarifs];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter((t) =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.department || '').toLowerCase().includes(q)
      );
    }
    if (deptFilter !== 'ALL') result = result.filter((t) => t.department === deptFilter);
    if (typeFilter !== 'ALL') result = result.filter((t) => t.type === typeFilter);

    result.sort((a, b) => {
      if (sortConfig.key === 'price') {
        return sortConfig.dir === 'asc'
          ? (a.price || 0) - (b.price || 0)
          : (b.price || 0) - (a.price || 0);
      }
      const valA = (a[sortConfig.key] || '').toLowerCase();
      const valB = (b[sortConfig.key] || '').toLowerCase();
      return sortConfig.dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    return result;
  }, [tarifs, searchTerm, deptFilter, typeFilter, sortConfig]);

  /* ── Stats par département ── */
  const deptStats = useMemo(() => {
    const stats = {};
    tarifs.forEach((t) => {
      const d = t.department || 'AUTRE';
      if (!stats[d]) stats[d] = { count: 0, avgPrice: 0, total: 0 };
      stats[d].count++;
      stats[d].total += t.price || 0;
    });
    Object.keys(stats).forEach((d) => {
      stats[d].avgPrice = stats[d].count > 0 ? Math.round(stats[d].total / stats[d].count) : 0;
    });
    return stats;
  }, [tarifs]);

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
        sortConfig.key === sortKey && 'opacity-100 text-indigo-500'
      )} />
    </button>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-indigo-500/10">
              <Settings className="w-7 h-7 text-indigo-600" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                {t('finance.tarifs') || 'Grille tarifaire'}
              </h1>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-0.5">
                Configuration des prix par service
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              onClick={loadTarifs}
              variant="outline" size="sm"
              className="rounded-xl font-bold border-2"
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
              Actualiser
            </Button>
            <Button
              onClick={handleCreate}
              size="sm"
              className="rounded-xl font-bold bg-indigo-500 hover:bg-indigo-600 text-white gap-2 shadow-lg shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" />
              Nouveau tarif
            </Button>
          </div>
        </div>

        {/* Compteurs par département */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-card rounded-xl border border-border shadow-sm">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total</span>
            <span className="text-lg font-black text-foreground ml-1">{tarifs.length}</span>
          </div>
          {Object.entries(deptConfig).map(([key, cfg]) => {
            const stat = deptStats[key];
            if (!stat) return null;
            const DeptIcon = cfg.icon;
            return (
              <button
                key={key}
                onClick={() => setDeptFilter(deptFilter === key ? 'ALL' : key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl border shadow-sm transition-all',
                  deptFilter === key
                    ? 'ring-2 ring-offset-1'
                    : 'hover:shadow-md'
                )}
                style={{
                  backgroundColor: `${cfg.color}08`,
                  borderColor: `${cfg.color}30`,
                  ...(deptFilter === key ? { ringColor: cfg.color } : {}),
                }}
              >
                <DeptIcon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
                  {cfg.label}
                </span>
                <span className="text-sm font-black ml-0.5" style={{ color: cfg.color }}>
                  {stat.count}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground ml-1 hidden sm:inline">
                  ~{formatCurrency(stat.avgPrice)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ CONTENU — Tableau + Panneau détail ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── TABLEAU ── */}
        <Card className={cn(
          'border-none shadow-sm bg-card rounded-2xl overflow-hidden flex flex-col transition-all',
          selectedTarif ? 'lg:col-span-3' : 'lg:col-span-5'
        )}>
          {/* Toolbar */}
          <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row items-center gap-3 bg-muted/20">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl border-muted bg-background focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-background border border-border focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all text-foreground"
              >
                <option value="ALL">Tous types</option>
                <option value="BASE">Base</option>
                <option value="SPECIALISTE">Spécialiste</option>
                <option value="URGENCE">Urgence</option>
              </select>
              {(deptFilter !== 'ALL' || typeFilter !== 'ALL' || searchTerm) && (
                <Button
                  variant="ghost" size="sm"
                  className="rounded-xl text-xs font-bold text-indigo-500 hover:bg-indigo-500/10"
                  onClick={() => { setDeptFilter('ALL'); setTypeFilter('ALL'); setSearchTerm(''); }}
                >
                  <X className="w-3 h-3 mr-1" /> Réinitialiser
                </Button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto scrollbar-thin">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                  Chargement de la grille...
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-24 text-center">
                <div className="inline-flex p-4 rounded-full bg-muted mb-4">
                  <Tag className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground font-medium italic">
                  {searchTerm || deptFilter !== 'ALL' || typeFilter !== 'ALL'
                    ? 'Aucun tarif ne correspond aux filtres'
                    : 'Aucun tarif configuré'}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-5 py-3 text-left">
                      <SortableHeader label="Service" sortKey="name" />
                    </th>
                    <th className="px-5 py-3 text-left hidden md:table-cell">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Département
                      </span>
                    </th>
                    <th className="px-5 py-3 text-left hidden sm:table-cell">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Type
                      </span>
                    </th>
                    <th className="px-5 py-3 text-left">
                      <SortableHeader label="Prix" sortKey="price" />
                    </th>
                    <th className="px-5 py-3 text-right">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Actions
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tarif) => {
                    const dept = getDept(tarif.department);
                    const type = getType(tarif.type);
                    const DeptIcon = dept.icon;
                    const isActive = selectedTarif?.id === tarif.id;

                    return (
                      <tr
                        key={tarif.id}
                        onClick={() => setSelectedTarif(tarif)}
                        className={cn(
                          'border-b border-border/50 cursor-pointer transition-all group',
                          isActive ? 'bg-indigo-500/5' : 'hover:bg-muted/40'
                        )}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${dept.color}15`, color: dept.color }}
                            >
                              <DeptIcon className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-sm text-foreground truncate">
                              {tarif.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <span
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                            style={{ backgroundColor: `${dept.color}15`, color: dept.color }}
                          >
                            {dept.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 hidden sm:table-cell">
                          <span
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                            style={{ backgroundColor: `${type.color}15`, color: type.color }}
                          >
                            {type.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-base font-black text-foreground font-mono">
                            {formatCurrency(tarif.price)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost" size="icon"
                              className="rounded-xl h-8 w-8 hover:bg-indigo-500/10 text-indigo-500"
                              onClick={(e) => { e.stopPropagation(); handleEdit(tarif); }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="rounded-xl h-8 w-8 hover:bg-red-500/10 text-red-500"
                              onClick={(e) => { e.stopPropagation(); handleDelete(tarif.id); }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <ChevronRight className={cn(
                              'w-4 h-4 text-muted-foreground/30 transition-all',
                              isActive && 'text-indigo-500 translate-x-0.5'
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

          {/* Footer */}
          <div className="p-3 border-t border-border bg-muted/20 flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">
              {filtered.length} tarif{filtered.length > 1 ? 's' : ''} sur {tarifs.length}
            </span>
            <span className="text-muted-foreground">
              Prix moyen : <strong className="text-indigo-600">
                {formatCurrency(
                  filtered.length > 0
                    ? Math.round(filtered.reduce((s, t) => s + (t.price || 0), 0) / filtered.length)
                    : 0
                )}
              </strong>
            </span>
          </div>
        </Card>

        {/* ── PANNEAU DÉTAIL ── */}
        {selectedTarif && (
          <div className="lg:col-span-2 space-y-6 animate-in slide-in-from-right-4 duration-300">
            <Card className="border-none shadow-sm bg-card rounded-2xl overflow-hidden">
              {/* Header */}
              {(() => {
                const dept = getDept(selectedTarif.department);
                const DeptIcon = dept.icon;
                return (
                  <div className="p-5 border-b border-border/50" style={{ backgroundColor: `${dept.color}05` }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center"
                          style={{ backgroundColor: `${dept.color}15`, color: dept.color }}
                        >
                          <DeptIcon className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-lg font-black text-foreground truncate">
                            {selectedTarif.name}
                          </h3>
                          <p className="text-xs text-muted-foreground font-medium">
                            {dept.label} • {getType(selectedTarif.type).label}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost" size="icon"
                        className="rounded-xl hover:bg-muted shrink-0"
                        onClick={() => setSelectedTarif(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })()}

              <CardContent className="p-5 space-y-5">
                {/* Prix central */}
                <div className="text-center py-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    Prix actuel
                  </p>
                  <p className="text-5xl font-black tracking-tighter text-indigo-600 font-mono">
                    {formatCurrency(selectedTarif.price)}
                  </p>
                </div>

                {/* Détails */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Informations
                  </p>
                  {[
                    {
                      label: 'Département',
                      value: (() => {
                        const d = getDept(selectedTarif.department);
                        return (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase"
                            style={{ backgroundColor: `${d.color}15`, color: d.color }}>
                            {d.label}
                          </span>
                        );
                      })(),
                    },
                    {
                      label: 'Type',
                      value: (() => {
                        const tp = getType(selectedTarif.type);
                        return (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase"
                            style={{ backgroundColor: `${tp.color}15`, color: tp.color }}>
                            {tp.label}
                          </span>
                        );
                      })(),
                    },
                    { label: 'Identifiant', value: `#${selectedTarif.id}` },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        {item.label}
                      </span>
                      <span className="text-sm font-bold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-2">
                  <Button
                    onClick={() => handleEdit(selectedTarif)}
                    className="w-full h-14 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-base gap-3 shadow-lg shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <Edit className="w-5 h-5" />
                    Modifier ce tarif
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDelete(selectedTarif.id)}
                    className="w-full h-12 rounded-xl font-bold border-2 border-red-500/20 text-red-500 hover:bg-red-500/10 gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Note */}
            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 shrink-0">
                  <DollarSign className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-600 mb-1">Tarification</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Les modifications de tarifs s'appliquent immédiatement aux nouvelles 
                    factures. Les factures déjà émises conservent leur prix d'origine.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ MODAL ÉDITION ═══ */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight">
              {editingTarif?.id ? 'Modifier le tarif' : 'Nouveau tarif'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider">
                Nom du service
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Consultation générale"
                className="rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department" className="text-xs font-bold uppercase tracking-wider">
                  Département
                </Label>
                <Select
                  value={formData.department}
                  onValueChange={(val) => setFormData({ ...formData, department: val })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMISSION">Admissions</SelectItem>
                    <SelectItem value="LABORATOIRE">Laboratoire</SelectItem>
                    <SelectItem value="PHARMACIE">Pharmacie</SelectItem>
                    <SelectItem value="CONSULTATION">Consultation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type" className="text-xs font-bold uppercase tracking-wider">
                  Type
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(val) => setFormData({ ...formData, type: val })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BASE">Base</SelectItem>
                    <SelectItem value="SPECIALISTE">Spécialiste</SelectItem>
                    <SelectItem value="URGENCE">Urgence</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price" className="text-xs font-bold uppercase tracking-wider">
                Prix (CDF)
              </Label>
              <Input
                id="price"
                type="number"
                step="100"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0"
                className="rounded-xl text-lg font-black font-mono"
                required
              />
            </div>

            <DialogFooter className="gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl font-bold border-2"
                onClick={() => setShowEditModal(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="rounded-xl font-bold bg-indigo-500 hover:bg-indigo-600 text-white gap-2 shadow-lg shadow-indigo-500/20"
              >
                <Save className="w-4 h-4" />
                {editingTarif?.id ? 'Enregistrer' : 'Créer le tarif'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tarifs;