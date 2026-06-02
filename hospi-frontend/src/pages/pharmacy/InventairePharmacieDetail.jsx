import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Printer, Save, CheckCircle2, Clock, Lock,
  XCircle, User, Calendar, Package,
  TrendingUp, TrendingDown, Minus, AlertTriangle, RefreshCw
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { inventairePharmaAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useHospitalConfig } from '../../hooks/useHospitalConfig';
import { loadLogoAsDataUrl } from '../../utils/printUtils';
import { API_BASE_URL } from '../../config/environment.js';

// ─── Constantes ──────────────────────────────────────────────────────────────

const TYPES_LABEL = {
  QUOTIDIEN: 'Quotidien',
  HEBDO: 'Hebdomadaire',
  MENSUEL: 'Mensuel',
  ANNUEL: 'Annuel',
};

const STATUTS_INFO = {
  EN_COURS: { label: 'En cours',  Icon: Clock,        cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  APPROUVE: { label: 'Approuvé',  Icon: CheckCircle2, cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  REJETE:   { label: 'Rejeté',    Icon: XCircle,      cls: 'bg-red-100   text-red-700   dark:bg-red-900/40   dark:text-red-300'   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  if (n == null) return '—';
  const num = parseFloat(n);
  return isNaN(num) ? '—' : num.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtMoney(n) {
  if (n == null) return '—';
  const num = parseFloat(n);
  return isNaN(num) ? '—' : num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function calcKpis(lignes) {
  const total = lignes.length;
  const avecEcart = lignes.filter(l => parseFloat(l.ecart) !== 0).length;
  const valTotale = lignes.reduce((s, l) => s + parseFloat(l.valeurEcart || 0), 0);
  const conformite = total > 0 ? ((total - avecEcart) / total) * 100 : 100;
  return { total, avecEcart, valTotale, conformite };
}

// ─── Badge Statut ─────────────────────────────────────────────────────────────

function StatutBadge({ statut }) {
  const info = STATUTS_INFO[statut] || STATUTS_INFO.EN_COURS;
  const { Icon } = info;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${info.cls}`}>
      <Icon className="w-3.5 h-3.5" />
      {info.label}
    </span>
  );
}

// ─── Carte KPI ────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, color = 'text-foreground', sub }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Composant Principal ──────────────────────────────────────────────────────

export default function InventairePharmacieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { config } = useHospitalConfig();

  const [inventaire, setInventaire] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);

  // Rôles
  const role = user?.role?.toUpperCase() || '';
  const isPharmacy = ['PHARMACIE', 'PHARMACIST', 'PHARMACY', 'ADMIN'].includes(role);

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventairePharmaAPI.obtenir(id);
      const data = res.data;
      setInventaire(data);
      setLignes((data.lignes || []).map(l => ({ ...l, _dirty: false })));
    } catch (err) {
      toast.error('Inventaire introuvable');
      navigate('/pharmacy/inventaire');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { charger(); }, [charger]);

  // Mise à jour locale d'une ligne (calcul temps réel)
  const handleStockChange = (index, value) => {
    setLignes(prev => prev.map((l, i) => {
      if (i !== index) return l;
      const sp = value === '' ? '' : parseFloat(value) || 0;
      const st = parseFloat(l.stockTheorique) || 0;
      const pa = parseFloat(l.prixAchat) || 0;
      const ecart = sp === '' ? (0 - st) : sp - st;
      const valeurEcart = ecart * pa;
      return { ...l, stockPhysique: sp === '' ? '' : sp, ecart, valeurEcart, _dirty: true };
    }));
  };

  const handleObsChange = (index, value) => {
    setLignes(prev => prev.map((l, i) =>
      i === index ? { ...l, observation: value, _dirty: true } : l
    ));
  };

  // Sauvegarde des lignes
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        lignes: lignes.map(l => ({
          ligneId: l.id,
          stockPhysique: l.stockPhysique === '' ? 0 : parseFloat(l.stockPhysique) || 0,
          observation: l.observation || null,
        })),
      };
      await inventairePharmaAPI.majLignes(id, payload);
      toast.success('Lignes enregistrées avec succès !');
      charger();
    } catch (err) {
      const msg = err.response?.data?.error || 'Une erreur est survenue';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Clôturer l'inventaire (sauvegarde + finalisation)
  const handleCloturer = async () => {
    if (!window.confirm('Clôturer cet inventaire ? Les comptages seront enregistrés et l\'inventaire sera finalisé. Cette action est irréversible.')) return;
    setClosing(true);
    try {
      const payload = {
        lignes: lignes.map(l => ({
          ligneId: l.id,
          stockPhysique: l.stockPhysique === '' ? 0 : parseFloat(l.stockPhysique) || 0,
          observation: l.observation || null,
        })),
      };
      await inventairePharmaAPI.majLignes(id, payload);
      await inventairePharmaAPI.approuver(id);
      toast.success('Inventaire clôturé — comptages enregistrés !');
      charger();
    } catch (err) {
      const msg = err.response?.data?.error || 'Erreur lors de la clôture';
      toast.error(msg);
    } finally {
      setClosing(false);
    }
  };

  // ─── Impression PDF ─────────────────────────────────────────────────────────

  const handlePDF = async () => {
    if (!inventaire) return;
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pw = doc.internal.pageSize.getWidth();   // 297
      const ph = doc.internal.pageSize.getHeight();  // 210
      const kpis = calcKpis(lignes);
      const margin = 14;

      const hexToRgb = (hex) => {
        const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [5, 150, 105];
      };
      const [pr, pg, pb] = config?.primaryColor ? hexToRgb(config.primaryColor) : [5, 150, 105];
      const hospitalName = config?.hospitalName || 'HÔPITAL';

      // ═══════════════════════════════════════════════════════
      // ZONE A — EN-TÊTE (y: 0 → 32)
      // Fond gris très clair
      doc.setFillColor(247, 249, 250);
      doc.rect(0, 0, pw, 32, 'F');
      // Ligne de séparation bas de l'en-tête
      doc.setDrawColor(pr, pg, pb);
      doc.setLineWidth(0.8);
      doc.line(0, 32, pw, 32);

      // Logo (gauche)
      let textStartX = margin;
      if (config?.hospitalLogoUrl && config?.enableLogoOnDocuments !== false) {
        const logoDataUrl = await loadLogoAsDataUrl(config.hospitalLogoUrl, API_BASE_URL);
        if (logoDataUrl) {
          const img = new Image();
          img.src = logoDataUrl;
          await new Promise(res => { img.onload = res; });
          const logoH = 24;
          const logoW = logoH * (img.width / img.height);
          doc.addImage(logoDataUrl, 'PNG', margin, 4, logoW, logoH);
          textStartX = margin + logoW + 5;
        }
      }

      // Nom de l'hôpital (après logo)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(pr, pg, pb);
      doc.text(hospitalName.toUpperCase(), textStartX, 14);

      // Sous-titre
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(config?.headerSubtitle || 'Système de Gestion Hospitalière', textStartX, 20);

      // Contacts (droite)
      doc.setFontSize(7.5);
      doc.setTextColor(80, 80, 80);
      const contactLines = [
        config?.address,
        [config?.phoneNumber, config?.email].filter(Boolean).join('  |  '),
      ].filter(Boolean);
      contactLines.forEach((line, i) => {
        doc.text(line, pw - margin, 12 + i * 6, { align: 'right' });
      });

      // ═══════════════════════════════════════════════════════
      // ZONE B — BANDE TITRE (y: 33 → 47)
      doc.setFillColor(pr, pg, pb);
      doc.rect(0, 33, pw, 14, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text("FICHE D'INVENTAIRE PHARMACIE", pw / 2, 41, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Référence : INV-${inventaire.id}`, pw / 2, 45.5, { align: 'center' });

      // ═══════════════════════════════════════════════════════
      // ZONE C — INFOS GÉNÉRALES (y: 50 → 75)
      const infoY = 50;
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, infoY, pw - 2 * margin, 24, 'FD');

      const colW = (pw - 2 * margin) / 4;
      const row1Fields = [
        { label: 'Date', value: fmtDate(inventaire.date) },
        { label: 'Type', value: TYPES_LABEL[inventaire.type] || inventaire.type || '—' },
        { label: 'Statut', value: STATUTS_INFO[inventaire.statut]?.label || inventaire.statut || '—' },
        { label: 'Agent', value: `${inventaire.agentPrenom || ''} ${inventaire.agentNom || ''}`.trim() || '—' },
      ];

      row1Fields.forEach((f, i) => {
        const x = margin + 4 + i * colW;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(f.label.toUpperCase(), x, infoY + 6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 30, 30);
        doc.text(f.value, x, infoY + 12);
      });

      // Ligne séparatrice horizontale entre row1 et row2
      if (inventaire.pharmacienChefNom || inventaire.observations) {
        doc.setDrawColor(235, 235, 235);
        doc.line(margin, infoY + 14, margin + pw - 2 * margin, infoY + 14);

        const row2Fields = [];
        if (inventaire.pharmacienChefNom) {
          row2Fields.push({
            label: 'Pharmacien chef',
            value: `${inventaire.pharmacienChefPrenom || ''} ${inventaire.pharmacienChefNom}`.trim(),
          });
        }
        if (inventaire.observations) {
          row2Fields.push({ label: 'Observations', value: inventaire.observations });
        }
        row2Fields.forEach((f, i) => {
          const x = margin + 4 + i * colW * 2;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(120, 120, 120);
          doc.text(f.label.toUpperCase(), x, infoY + 18);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(30, 30, 30);
          const truncated = doc.splitTextToSize(f.value, colW * 2 - 8);
          doc.text(truncated[0] || '', x, infoY + 22);
        });
      }

      // ═══════════════════════════════════════════════════════
      // ZONE D — KPI CARDS (y: 77 → 92)
      const kpiY = 77;
      const kpiH = 14;
      const kpiW = (pw - 2 * margin) / 4;
      const kpiCards = [
        {
          label: 'Articles contrôlés',
          value: String(kpis.total),
          color: [pr, pg, pb],
        },
        {
          label: 'Avec écart',
          value: String(kpis.avecEcart),
          color: kpis.avecEcart > 0 ? [220, 38, 38] : [22, 163, 74],
        },
        {
          label: 'Valeur des écarts',
          value: fmtMoney(kpis.valTotale),
          color: kpis.valTotale < 0 ? [220, 38, 38] : [pr, pg, pb],
        },
        {
          label: 'Taux de conformité',
          value: `${kpis.conformite.toFixed(1)}%`,
          color: kpis.conformite >= 90 ? [22, 163, 74] : [245, 158, 11],
        },
      ];

      kpiCards.forEach((kpi, i) => {
        const kx = margin + i * kpiW;
        // Fond carte
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.rect(kx, kpiY, kpiW - 2, kpiH, 'FD');
        // Accent coloré en haut
        doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        doc.rect(kx, kpiY, kpiW - 2, 2, 'F');
        // Valeur (grande)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        doc.text(kpi.value, kx + (kpiW - 2) / 2, kpiY + 8, { align: 'center' });
        // Label (petit)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 100, 100);
        doc.text(kpi.label, kx + (kpiW - 2) / 2, kpiY + 12, { align: 'center' });
      });

      // ═══════════════════════════════════════════════════════
      // ZONE E — TABLEAU (y: 95+)
      const tableStartY = kpiY + kpiH + 4;
      const tableData = lignes.map(l => {
        const ecartNum = parseFloat(l.ecart) || 0;
        return [
          l.codeDci || '—',
          l.medicamentNom || '—',
          l.forme || '—',
          l.dosage || '—',
          l.unite || '—',
          fmt(l.stockTheorique),
          fmt(l.stockPhysique),
          ecartNum === 0 ? '0' : (ecartNum > 0 ? `+${fmt(ecartNum)}` : fmt(ecartNum)),
          fmtMoney(l.valeurEcart),
          l.observation || '',
        ];
      });

      autoTable(doc, {
        startY: tableStartY,
        head: [['Code DCI', 'Désignation', 'Forme', 'Dosage', 'Unité', 'Th.', 'Phys.', 'Écart', 'Val. Écart', 'Observation']],
        body: tableData,
        styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: [220, 220, 220], lineWidth: 0.2 },
        headStyles: { fillColor: [pr, pg, pb], textColor: 255, fontStyle: 'bold', fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: [250, 252, 250] },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 44 },
          2: { cellWidth: 18 },
          3: { cellWidth: 16 },
          4: { cellWidth: 14 },
          5: { cellWidth: 14, halign: 'center' },
          6: { cellWidth: 14, halign: 'center' },
          7: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
          8: { cellWidth: 24, halign: 'right' },
          9: { cellWidth: 'auto' },
        },
        didParseCell: (data) => {
          if (data.section === 'body') {
            const l = lignes[data.row.index];
            if (l) {
              const ecart = parseFloat(l.ecart) || 0;
              if (ecart !== 0) {
                data.cell.styles.fillColor = [255, 251, 235];
              }
              if (data.column.index === 7 && ecart !== 0) {
                data.cell.styles.textColor = ecart < 0 ? [220, 38, 38] : [22, 163, 74];
              }
            }
          }
        },
        margin: { left: margin, right: margin },
      });

      // ═══════════════════════════════════════════════════════
      // PIED DE PAGE
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(pr, pg, pb);
        doc.setLineWidth(0.4);
        doc.line(margin, ph - 10, pw - margin, ph - 10);
        doc.setFontSize(7);
        doc.setTextColor(130, 130, 130);
        doc.text(
          `Généré le ${new Date().toLocaleString('fr-FR')}  —  ${config?.footerText || hospitalName}`,
          margin, ph - 6
        );
        doc.text(`Page ${i} / ${totalPages}`, pw - margin, ph - 6, { align: 'right' });
      }

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      doc.save(`Inventaire_Pharmacie_${dateStr}.pdf`);
      toast.success('PDF généré avec succès');
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  // ─── Rendu ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64 gap-3">
        <span className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Chargement de l'inventaire...</span>
      </div>
    );
  }

  if (!inventaire) return null;

  const kpis = calcKpis(lignes);
  const enCours = inventaire.statut === 'EN_COURS';
  const readonly = !enCours;

  return (
    <div className="space-y-6">

      {/* ── En-tête ── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <button
          onClick={() => navigate('/pharmacy/inventaire')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à la liste
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-foreground">
              Inventaire {TYPES_LABEL[inventaire.type] || inventaire.type} — {fmtDate(inventaire.date)}
            </h1>
            <StatutBadge statut={inventaire.statut} />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              Agent : {inventaire.agentPrenom} {inventaire.agentNom}
            </span>
            {inventaire.pharmacienChefNom && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                Approuvé par : {inventaire.pharmacienChefPrenom} {inventaire.pharmacienChefNom}
              </span>
            )}
            {inventaire.dateApprobation && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {fmtDate(inventaire.dateApprobation)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => charger()}
            className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
            title="Actualiser"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            onClick={handlePDF}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Imprimer PDF</span>
          </button>

          {enCours && isPharmacy && (
            <>
              <button
                onClick={handleSave}
                disabled={saving || closing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-60"
              >
                {saving
                  ? <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  : <Save className="w-4 h-4" />}
                <span className="hidden sm:inline">Enregistrer</span>
              </button>
              <button
                onClick={handleCloturer}
                disabled={saving || closing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-60"
              >
                {closing
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Lock className="w-4 h-4" />}
                Clôturer
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={Package}
          label="Médicaments comptés"
          value={kpis.total}
          color="text-foreground"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Avec écart"
          value={kpis.avecEcart}
          color={kpis.avecEcart > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}
        />
        <KpiCard
          icon={kpis.valTotale < 0 ? TrendingDown : TrendingUp}
          label="Valeur totale des écarts"
          value={fmtMoney(kpis.valTotale)}
          color={kpis.valTotale < 0 ? 'text-red-600 dark:text-red-400' : kpis.valTotale > 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}
        />
        <KpiCard
          icon={CheckCircle2}
          label="Taux de conformité"
          value={`${kpis.conformite.toFixed(1)}%`}
          color={kpis.conformite >= 95 ? 'text-green-600 dark:text-green-400' : kpis.conformite >= 80 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}
          sub={`${kpis.total - kpis.avecEcart} / ${kpis.total} articles conformes`}
        />
      </div>

      {/* ── Feuille de comptage ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
          <p className="font-semibold text-foreground text-sm">
            Feuille de comptage — {lignes.length} médicament{lignes.length !== 1 ? 's' : ''}
          </p>
          {enCours && (
            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Saisie en cours — enregistrez régulièrement
            </span>
          )}
        </div>

        {lignes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="font-semibold text-foreground">Aucune ligne d'inventaire</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-3 py-3">Code DCI</th>
                  <th className="px-3 py-3">Désignation</th>
                  <th className="px-3 py-3 hidden md:table-cell">Forme</th>
                  <th className="px-3 py-3 hidden lg:table-cell">Dosage</th>
                  <th className="px-3 py-3 text-right">Stock Théor.</th>
                  <th className="px-3 py-3 text-right">Stock Phys.</th>
                  <th className="px-3 py-3 text-right">Écart</th>
                  <th className="px-3 py-3 text-right hidden sm:table-cell">Val. Écart</th>
                  <th className="px-3 py-3 hidden lg:table-cell">Observation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lignes.map((ligne, index) => {
                  const ecartNum = parseFloat(ligne.ecart) || 0;
                  const hasEcart = ecartNum !== 0;
                  const valEcart = parseFloat(ligne.valeurEcart) || 0;
                  return (
                    <tr
                      key={ligne.id}
                      className={`transition-colors ${hasEcart ? 'bg-amber-50/30 dark:bg-amber-950/10' : 'hover:bg-muted/10'}`}
                    >
                      {/* Code DCI */}
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {ligne.codeDci || '—'}
                      </td>
                      {/* Désignation */}
                      <td className="px-3 py-2">
                        <span className="font-medium text-foreground capitalize">{ligne.medicamentNom || '—'}</span>
                      </td>
                      {/* Forme */}
                      <td className="px-3 py-2 hidden md:table-cell text-xs text-muted-foreground capitalize">
                        {ligne.forme || '—'}
                      </td>
                      {/* Dosage */}
                      <td className="px-3 py-2 hidden lg:table-cell text-xs text-muted-foreground">
                        {ligne.dosage || '—'}
                      </td>
                      {/* Stock Théorique */}
                      <td className="px-3 py-2 text-right font-semibold text-foreground tabular-nums">
                        {fmt(ligne.stockTheorique)}
                      </td>
                      {/* Stock Physique */}
                      <td className="px-3 py-2 text-right">
                        {enCours ? (
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={ligne.stockPhysique === '' ? '' : ligne.stockPhysique}
                            onChange={e => handleStockChange(index, e.target.value)}
                            className="w-24 px-2 py-1 rounded border border-border bg-background text-right text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 tabular-nums"
                          />
                        ) : (
                          <span className="font-semibold text-foreground tabular-nums">{fmt(ligne.stockPhysique)}</span>
                        )}
                      </td>
                      {/* Écart */}
                      <td className="px-3 py-2 text-right tabular-nums">
                        <span className={`font-bold ${
                          ecartNum > 0 ? 'text-green-600 dark:text-green-400'
                          : ecartNum < 0 ? 'text-red-600 dark:text-red-400'
                          : 'text-muted-foreground'
                        }`}>
                          {ecartNum === 0 ? (
                            <span className="flex items-center justify-end gap-1"><Minus className="w-3 h-3" />0</span>
                          ) : ecartNum > 0 ? (
                            <span className="flex items-center justify-end gap-1"><TrendingUp className="w-3 h-3" />+{fmt(ecartNum)}</span>
                          ) : (
                            <span className="flex items-center justify-end gap-1"><TrendingDown className="w-3 h-3" />{fmt(ecartNum)}</span>
                          )}
                        </span>
                      </td>
                      {/* Valeur Écart */}
                      <td className="px-3 py-2 text-right hidden sm:table-cell tabular-nums">
                        <span className={`text-xs font-semibold ${
                          valEcart > 0 ? 'text-green-600 dark:text-green-400'
                          : valEcart < 0 ? 'text-red-600 dark:text-red-400'
                          : 'text-muted-foreground'
                        }`}>
                          {fmtMoney(valEcart)}
                        </span>
                      </td>
                      {/* Observation */}
                      <td className="px-3 py-2 hidden lg:table-cell">
                        {enCours ? (
                          <input
                            type="text"
                            value={ligne.observation || ''}
                            onChange={e => handleObsChange(index, e.target.value)}
                            placeholder="Note..."
                            className="w-full px-2 py-1 rounded border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">{ligne.observation || '—'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pied du tableau */}
        {lignes.length > 0 && (
          <div className="px-4 py-3 border-t border-border bg-muted/10 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>Total articles : <strong className="text-foreground">{kpis.total}</strong></span>
            <span>Avec écart : <strong className={kpis.avecEcart > 0 ? 'text-amber-600' : 'text-foreground'}>{kpis.avecEcart}</strong></span>
            <span>Valeur totale des écarts : <strong className={kpis.valTotale < 0 ? 'text-red-600' : kpis.valTotale > 0 ? 'text-green-600' : 'text-foreground'}>{fmtMoney(kpis.valTotale)}</strong></span>
            <span>Conformité : <strong className="text-foreground">{kpis.conformite.toFixed(1)}%</strong></span>
          </div>
        )}
      </div>

      {/* ── Boutons bas de page ── */}
      {enCours && isPharmacy && (
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || closing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-60"
          >
            {saving
              ? <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              : <Save className="w-4 h-4" />}
            Enregistrer
          </button>
          <button
            onClick={handleCloturer}
            disabled={saving || closing}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-60 shadow-sm"
          >
            {closing
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Lock className="w-4 h-4" />}
            Clôturer l'inventaire
          </button>
        </div>
      )}

      {inventaire.statut === 'APPROUVE' && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Inventaire approuvé. Les stocks ont été ajustés. Document en lecture seule.
        </div>
      )}
    </div>
  );
}
