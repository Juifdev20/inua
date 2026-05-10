import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Settings, Plus, Edit, Save, Trash2, Search,
  RefreshCw, Loader2, ArrowUpDown, X, Tag,
  Building2, Stethoscope, FlaskConical, Pill, ChevronRight,
  AlertTriangle, DollarSign, Printer
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
import { useAuth } from '@/context/AuthContext';
import { hospitalConfigService, defaultHospitalConfig } from '../../services/hospitalConfigService';

const Tarifs = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
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
  const [hospitalConfig, setHospitalConfig] = useState(defaultHospitalConfig);

  useEffect(() => { 
    loadTarifs(); 
    loadHospitalConfig();
  }, []);

  const loadHospitalConfig = async () => {
    try {
      const config = await hospitalConfigService.getConfig();
      if (config) {
        setHospitalConfig({ ...defaultHospitalConfig, ...config });
      }
    } catch (error) {
      console.error('Erreur chargement config hôpital:', error);
    }
  };

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
      type: tarif.category || '',
      price: tarif.price || '',
      department: tarif.category || '',
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
      // Mapper les champs frontend vers les noms du backend MedicalService
      const payload = {
        nom: formData.name,
        departement: formData.department || formData.type || '',
        prix: Number(formData.price) || 0,
        description: formData.description || '',
        currency: 'USD',
        isActive: true,
      };
      if (editingTarif?.id) {
        await financeApi.updateTarif(editingTarif.id, payload);
        toast.success(t('finance.tarifUpdated') || 'Tarif mis à jour');
      } else {
        await financeApi.createTarif(payload);
        toast.success('Tarif créé avec succès');
      }
      setShowEditModal(false);
      setEditingTarif(null);
      setFormData({ name: '', type: '', price: '', department: '' });
      loadTarifs();
    } catch (error) {
      console.error(error);
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

  // Fonction d'impression professionnelle
  const handlePrintTarifs = () => {
    const printWindow = window.open('', '_blank');
    const currentDate = format(new Date(), 'dd MMMM yyyy', { locale: fr });
    const totalTarifs = filtered.length;
    const totalValue = filtered.reduce((sum, t) => sum + (t.price || 0), 0);
    
    // Grouper par catégorie pour le PDF
    const groupedByCategory = filtered.reduce((acc, tarif) => {
      const cat = tarif.category || 'Autre';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(tarif);
      return acc;
    }, {});
    
    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Grille Tarifaire - ${hospitalConfig.hospitalName}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid ${hospitalConfig.primaryColor || '#059669'};
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .ministry {
      font-size: 9pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #444;
      margin-bottom: 5px;
    }
    .hospital-name {
      font-size: 22pt;
      font-weight: 900;
      color: ${hospitalConfig.primaryColor || '#059669'};
      margin: 8px 0;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .hospital-info {
      font-size: 9pt;
      color: #555;
      margin-top: 8px;
    }
    .hospital-info span {
      margin: 0 8px;
    }
    .document-title {
      text-align: center;
      font-size: 16pt;
      font-weight: 700;
      color: #1a1a1a;
      margin: 25px 0 15px;
      text-transform: uppercase;
      letter-spacing: 3px;
      border: 2px solid ${hospitalConfig.primaryColor || '#059669'};
      padding: 10px 20px;
      display: inline-block;
      width: 100%;
    }
    .meta-info {
      display: flex;
      justify-content: space-between;
      font-size: 10pt;
      color: #555;
      margin-bottom: 20px;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 4px;
    }
    .category-section {
      margin-bottom: 20px;
    }
    .category-header {
      background: ${hospitalConfig.primaryColor || '#059669'};
      color: white;
      padding: 8px 12px;
      font-weight: 700;
      font-size: 11pt;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
      border-radius: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      font-size: 10pt;
    }
    th {
      background: #f0f0f0;
      color: #1a1a1a;
      font-weight: 700;
      text-align: left;
      padding: 10px 8px;
      border-bottom: 2px solid ${hospitalConfig.primaryColor || '#059669'};
      text-transform: uppercase;
      font-size: 9pt;
      letter-spacing: 0.5px;
    }
    td {
      padding: 8px;
      border-bottom: 1px solid #e0e0e0;
    }
    tr:nth-child(even) { background: #fafafa; }
    tr:hover { background: #f0f7f0; }
    .price-cell {
      text-align: right;
      font-weight: 700;
      color: ${hospitalConfig.primaryColor || '#059669'};
      font-family: 'Courier New', monospace;
    }
    .number-cell {
      text-align: center;
      width: 50px;
    }
    .summary-box {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border: 2px solid ${hospitalConfig.primaryColor || '#059669'};
      border-radius: 6px;
      padding: 15px;
      margin-top: 25px;
      display: flex;
      justify-content: space-around;
      text-align: center;
    }
    .summary-item {
      flex: 1;
    }
    .summary-label {
      font-size: 9pt;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .summary-value {
      font-size: 16pt;
      font-weight: 900;
      color: ${hospitalConfig.primaryColor || '#059669'};
      margin-top: 5px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 8pt;
      color: #777;
    }
    .footer-logo {
      font-weight: bold;
      color: ${hospitalConfig.primaryColor || '#059669'};
    }
    .signature-section {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .signature-box {
      width: 45%;
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #333;
      margin-top: 50px;
      padding-top: 5px;
      font-size: 9pt;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="ministry">${hospitalConfig.ministryName || 'MINISTÈRE DE LA SANTÉ'}</div>
    <div class="hospital-name">${hospitalConfig.hospitalName || 'INUA AFYA'}</div>
    <div class="hospital-info">
      <span>📍 ${hospitalConfig.address || 'Adresse non définie'}</span>
      <span>📞 ${hospitalConfig.phoneNumber || 'Tél: ---'}</span>
      <span>✉ ${hospitalConfig.email || 'Email: ---'}</span>
    </div>
  </div>
  
  <div class="document-title">Grille Tarifaire des Services Médicaux</div>
  
  <div class="meta-info">
    <span><strong>Date d'impression:</strong> ${currentDate}</span>
    <span><strong>Généré par:</strong> ${user?.username || 'Système'}</span>
  </div>
  
  ${Object.entries(groupedByCategory).map(([category, items], idx) => `
    <div class="category-section">
      <div class="category-header">${category} (${items.length} services)</div>
      <table>
        <thead>
          <tr>
            <th class="number-cell">N°</th>
            <th>Nom du Service</th>
            <th class="price-cell">Prix (USD)</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((tarif, index) => `
            <tr>
              <td class="number-cell">${index + 1}</td>
              <td>${tarif.name || 'Sans nom'}</td>
              <td class="price-cell">${(tarif.price || 0).toLocaleString('fr-FR')} $</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('')}
  
  <div class="summary-box">
    <div class="summary-item">
      <div class="summary-label">Total Services</div>
      <div class="summary-value">${totalTarifs}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Valeur Totale</div>
      <div class="summary-value">${totalValue.toLocaleString('fr-FR')} $</div>
    </div>
  </div>
  
  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-line">Préparé par<br><strong>${user?.username || '---'}</strong><br>(Service Finance)</div>
    </div>
    <div class="signature-box">
      <div class="signature-line">Validé par<br><strong>Le Directeur</strong><br>(Direction)</div>
    </div>
  </div>
  
  <div class="footer">
    <span class="footer-logo">${hospitalConfig.hospitalName}</span> - 
    ${hospitalConfig.footerText || 'Système de Gestion Hospitalière'}<br>
    Document généré automatiquement - ${currentDate}
  </div>
  
  <script>
    window.onload = function() { 
      setTimeout(function() { window.print(); }, 500);
    };
  </script>
</body>
</html>`;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  // Fonction d'impression d'un tarif spécifique
  const handlePrintSingleTarif = (tarif) => {
    const printWindow = window.open('', '_blank');
    const currentDate = format(new Date(), 'dd MMMM yyyy', { locale: fr });
    const cat = getCategory(tarif.category);
    
    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Fiche Tarif - ${tarif.name}</title>
  <style>
    @page { size: A5; margin: 15mm; }
    * { box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid ${hospitalConfig.primaryColor || '#059669'};
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .ministry {
      font-size: 9pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #444;
      margin-bottom: 5px;
    }
    .hospital-name {
      font-size: 20pt;
      font-weight: 900;
      color: ${hospitalConfig.primaryColor || '#059669'};
      margin: 8px 0;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .document-title {
      text-align: center;
      font-size: 14pt;
      font-weight: 700;
      color: #1a1a1a;
      margin: 20px 0 15px;
      text-transform: uppercase;
      letter-spacing: 2px;
      border: 2px solid ${hospitalConfig.primaryColor || '#059669'};
      padding: 8px 16px;
      display: inline-block;
      width: 100%;
    }
    .tarif-card {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border: 2px solid ${hospitalConfig.primaryColor || '#059669'};
      border-radius: 8px;
      padding: 25px;
      margin: 20px 0;
      text-align: center;
    }
    .tarif-name {
      font-size: 18pt;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 10px;
    }
    .tarif-category {
      display: inline-block;
      background: ${hospitalConfig.primaryColor || '#059669'};
      color: white;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 15px;
    }
    .tarif-price {
      font-size: 32pt;
      font-weight: 900;
      color: ${hospitalConfig.primaryColor || '#059669'};
      font-family: 'Courier New', monospace;
      margin: 15px 0;
    }
    .tarif-id {
      font-size: 9pt;
      color: #666;
      margin-top: 10px;
    }
    .validity {
      margin-top: 30px;
      padding: 15px;
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      border-radius: 4px;
      font-size: 10pt;
      color: #856404;
    }
    .footer {
      margin-top: 40px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 8pt;
      color: #777;
    }
    .signature-section {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
    }
    .signature-box {
      width: 45%;
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #333;
      margin-top: 40px;
      padding-top: 5px;
      font-size: 9pt;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="ministry">${hospitalConfig.ministryName || 'MINISTÈRE DE LA SANTÉ'}</div>
    <div class="hospital-name">${hospitalConfig.hospitalName || 'INUA AFYA'}</div>
    <div style="font-size: 9pt; color: #555; margin-top: 5px;">
      📍 ${hospitalConfig.address || '---'} | 📞 ${hospitalConfig.phoneNumber || '---'}
    </div>
  </div>
  
  <div class="document-title">Fiche Tarifaire</div>
  
  <div class="tarif-card">
    <div class="tarif-category">${cat.label}</div>
    <div class="tarif-name">${tarif.name || 'Sans nom'}</div>
    <div class="tarif-price">${(tarif.price || 0).toLocaleString('fr-FR')} $US</div>
    <div class="tarif-id">Réf: TARIF-${tarif.id || '000'} | Catégorie: ${tarif.category || 'N/A'}</div>
  </div>
  
  <div class="validity">
    <strong>ℹ Information:</strong> Ce tarif est en vigueur à compter du ${currentDate}. 
    Les modifications de tarifs s'appliquent uniquement aux nouvelles facturations.
  </div>
  
  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-line">Établi par<br><strong>${user?.username || '---'}</strong><br>Service Finance</div>
    </div>
    <div class="signature-box">
      <div class="signature-line">Le Directeur<br><strong>Dr. Directeur</strong><br>Direction</div>
    </div>
  </div>
  
  <div class="footer">
    <strong>${hospitalConfig.hospitalName}</strong> - ${hospitalConfig.footerText || 'Système de Gestion Hospitalière'}<br>
    Document généré le ${currentDate} | © Tous droits réservés
  </div>
  
  <script>
    window.onload = function() { 
      setTimeout(function() { window.print(); }, 500);
    };
  </script>
</body>
</html>`;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'USD', minimumFractionDigits: 0,
    }).format(amount || 0);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  /* ── Config catégories (departement backend → category frontend) ── */
  const categoryConfig = {
    'Admission': { label: 'Admissions', color: '#3B82F6', icon: Building2 },
    'Laboratoire': { label: 'Laboratoire', color: '#8B5CF6', icon: FlaskConical },
    'Pharmacie': { label: 'Pharmacie', color: '#14B8A6', icon: Pill },
    'Consultation': { label: 'Consultation', color: '#F59E0B', icon: Stethoscope },
    'Imagerie': { label: 'Imagerie', color: '#EC4899', icon: Tag },
    'Urgence': { label: 'Urgence', color: '#EF4444', icon: Tag },
  };

  const getCategory = (cat) => {
    // Essayer match exact, puis insensible à la casse
    const key = Object.keys(categoryConfig).find(
      k => k.toLowerCase() === (cat || '').toLowerCase()
    );
    return key ? categoryConfig[key] : { label: cat || 'Autre', color: '#6B7280', icon: Tag };
  };

  /* ── Filtrage + Tri ── */
  const filtered = useMemo(() => {
    let result = [...tarifs];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter((t) =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q)
      );
    }
    // Filtre par catégorie/département (category = departement du backend)
    if (typeFilter !== 'ALL') result = result.filter((t) => t.category === typeFilter);
    // deptFilter est également sur category pour compatibilité legacy
    if (deptFilter !== 'ALL') result = result.filter((t) => t.category === deptFilter);

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

  /* ── Stats par catégorie ── */
  const categoryStats = useMemo(() => {
    const stats = {};
    tarifs.forEach((t) => {
      const d = t.category || 'AUTRE';
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
              onClick={handlePrintTarifs}
              variant="outline" size="sm"
              className="rounded-xl font-bold border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimer PDF
            </Button>
            {isAdmin && (
              <Button
                onClick={handleCreate}
                size="sm"
                className="rounded-xl font-bold bg-indigo-500 hover:bg-indigo-600 text-white gap-2 shadow-lg shadow-indigo-500/20"
              >
                <Plus className="w-4 h-4" />
                Nouveau tarif
              </Button>
            )}
          </div>
        </div>

        {/* Compteurs par département */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-card rounded-xl border border-border shadow-sm">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total</span>
            <span className="text-lg font-black text-foreground ml-1">{tarifs.length}</span>
          </div>
          {Object.entries(categoryConfig).map(([key, cfg]) => {
            const stat = categoryStats[key];
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
                <option value="ALL">Tous départements</option>
                <option value="MAIEH">MAIEH</option>
                <option value="PAS">PAS</option>
                <option value="Laboratoire">Laboratoire (Examens)</option>
                <option value="Pharmacie">Pharmacie</option>
                <option value="Imagerie">Imagerie</option>
                <option value="Urgence">Urgence</option>
                <option value="Consultation">Consultation</option>
                <option value="Admission">Admission</option>
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
                    const cat = getCategory(tarif.category);
                    const CatIcon = cat.icon;
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
                              style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                            >
                              <CatIcon className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-sm text-foreground truncate">
                              {tarif.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <span
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                            style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                          >
                            {cat.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 hidden sm:table-cell">
                          <span
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                            style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                          >
                            {cat.label}
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
                              className="rounded-xl h-8 w-8 hover:bg-emerald-500/10 text-emerald-500"
                              onClick={(e) => { e.stopPropagation(); handlePrintSingleTarif(tarif); }}
                              title="Imprimer"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            {isAdmin && (
                              <>
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
                              </>
                            )}
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
                const cat = getCategory(selectedTarif.category);
                const CatIcon = cat.icon;
                return (
                  <div className="p-5 border-b border-border/50" style={{ backgroundColor: `${cat.color}05` }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center"
                          style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                        >
                          <CatIcon className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-lg font-black text-foreground truncate">
                            {selectedTarif.name}
                          </h3>
                          <p className="text-xs text-muted-foreground font-medium">
                            {cat.label}
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
                      label: 'Catégorie',
                      value: (() => {
                        const c = getCategory(selectedTarif.category);
                        return (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase"
                            style={{ backgroundColor: `${c.color}15`, color: c.color }}>
                            {c.label}
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

                {/* Actions - Impression accessible à tous */}
                <div className="space-y-3 pt-2">
                  <Button
                    onClick={() => handlePrintSingleTarif(selectedTarif)}
                    className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <Printer className="w-5 h-5" />
                    Imprimer cette fiche
                  </Button>
                </div>

                {/* Actions - Admin uniquement */}
                {isAdmin && (
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
                )}
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

            <div className="space-y-2">
              <Label htmlFor="category" className="text-xs font-bold uppercase tracking-wider">
                Catégorie
              </Label>
              <Select
                value={formData.department || formData.type}
                onValueChange={(val) => setFormData({ ...formData, department: val, type: val })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Choisir une catégorie..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Consultation">Consultation</SelectItem>
                  <SelectItem value="Laboratoire">Laboratoire</SelectItem>
                  <SelectItem value="Imagerie">Imagerie</SelectItem>
                  <SelectItem value="Pharmacie">Pharmacie</SelectItem>
                  <SelectItem value="Admission">Admission</SelectItem>
                  <SelectItem value="Urgence">Urgence</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price" className="text-xs font-bold uppercase tracking-wider">
                Prix (USD)
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
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