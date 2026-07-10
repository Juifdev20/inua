import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { hospitalConfigService } from '../../services/hospitalConfigService';
import { BACKEND_URL } from '../../config/environment.js';
import { 
  CreditCard, CheckCircle, Clock, Download, Loader2, FileText, Search, ArrowUpDown,
  QrCode, X, ChevronRight, Pill, Stethoscope, FlaskConical, Receipt, AlertCircle,
  Calendar, DollarSign, FileDown, Eye, CreditCard as CardIcon, Smartphone, Banknote,
  Package, Truck, Timer, Bell
} from 'lucide-react';
import api from '../../services/patients/Api'; 
import { cn } from '../../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

// Charge une image (logo) et la convertit en dataURL pour jsPDF. Retourne null si échec.
const loadImageAsDataURL = (url) => new Promise((resolve) => {
  if (!url) return resolve(null);
  const full = (url.startsWith('http') || url.startsWith('data:'))
    ? url
    : `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve({ dataUrl: canvas.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
    } catch (e) { resolve(null); }
  };
  img.onerror = () => resolve(null);
  img.src = full;
});

const Billing = () => {
  const [billings, setBillings] = useState([]);
  const [stats, setStats] = useState({ totalPaid: 0, totalPending: 0, totalInvoiced: 0, paidCount: 0, pendingCount: 0 });
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [invoiceDetail, setInvoiceDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [pharmacyDetailOpen, setPharmacyDetailOpen] = useState(false);
  const [pharmacyDetail, setPharmacyDetail] = useState(null);
  const [loadingPharmacy, setLoadingPharmacy] = useState(false);
  const [hospitalConfig, setHospitalConfig] = useState(null);
  
  // Real-time updates with polling
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  // WebSocket notifications
  const { notifications, unreadCount } = useNotifications();
  const { user } = useAuth();

  // Config de l'hôpital (nom, logo, adresse…) pour l'en-tête des reçus PDF
  useEffect(() => {
    hospitalConfigService.getConfig().then(setHospitalConfig).catch(() => {});
  }, []);

  // 1. Chargement et Tri des données avec nouveau endpoint consolidé
  const fetchBillingData = useCallback(async () => {
    setLoading(true);
    try {
      // Vérifier la présence du token avant l'appel
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('🔒 [Billing] Token non trouvé, redirection vers login');
        window.location.href = '/login?expired=true';
        return;
      }

      const [statsRes, historyRes] = await Promise.all([
        api.get('/patient/billing/stats'),
        api.get('/patient/billing/history?size=100')
      ]);

      // Mapping des stats
      const s = statsRes.data;
      setStats({
        totalPaid: Number(s?.totalPaid || 0),
        totalPending: Number(s?.totalPending || 0),
        totalInvoiced: Number(s?.totalInvoiced || 0),
        paidCount: s?.paidCount || 0,
        pendingCount: s?.pendingCount || 0
      });
      
      // DEBUG: Log de la réponse complète
      console.log('🔍 [Billing DEBUG] historyRes.data:', historyRes.data);
      console.log('🔍 [Billing DEBUG] Type:', typeof historyRes.data);
      console.log('🔍 [Billing DEBUG] Is Array:', Array.isArray(historyRes.data));
      if (historyRes.data?.content) {
        console.log('🔍 [Billing DEBUG] content:', historyRes.data.content);
        console.log('🔍 [Billing DEBUG] content length:', historyRes.data.content.length);
      }
      
      // Extraction des données consolidées
      const invoiceData = historyRes.data?.content || (Array.isArray(historyRes.data) ? historyRes.data : []);
      console.log('🔍 [Billing DEBUG] invoiceData extrait:', invoiceData);
      setBillings(invoiceData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Erreur récupération facturation:", error);
      
      // Gestion spécifique de l'erreur 401
      if (error.response?.status === 401) {
        console.warn('🔒 [Billing] Session expirée (401)');
        // Le intercepteur d'API gère déjà la redirection
        return;
      }
      
      // Fallback sur l'ancien endpoint pour autres erreurs
      try {
        const [statsRes, invoicesRes] = await Promise.all([
          api.get('/invoices/patient/stats'),
          api.get('/invoices/patient/my-invoices?size=100')
        ]);
        const s = statsRes.data;
        setStats({
          totalPaid: Number(s?.totalPaid || 0),
          totalPending: Number(s?.totalPending || 0),
          totalInvoiced: Number(s?.totalInvoiced || 0)
        });
        const invoiceData = invoicesRes.data.content || (Array.isArray(invoicesRes.data) ? invoicesRes.data : []);
        setBillings(invoiceData);
      } catch (fallbackError) {
        console.error("Fallback aussi échoué:", fallbackError);
        // Afficher un message d'erreur utilisateur
        setBillings([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingData();
    
    // Polling pour mises à jour en temps réel (toutes les 30 secondes)
    const interval = setInterval(fetchBillingData, 30000);
    return () => clearInterval(interval);
  }, [fetchBillingData]);

  // 2. Téléchargement PDF
  // 📄 Génération du reçu PDF CÔTÉ CLIENT — fonctionne pour TOUS les types
  // (facture, admission, pharmacie, laboratoire), payés ou non. Aucune dépendance
  // à un PDF serveur : le reçu est construit à partir des données de l'item.
  const handleDownloadPDF = async (billing) => {
    if (!billing) { alert('Élément introuvable'); return; }
    const ref = billing.referenceNumber || billing.invoiceCode || billing.id;
    setDownloadingId(billing.originalId || billing.id);
    try {
      const cfg = hospitalConfig || {};
      const currency = billing.currency || 'USD';
      const money = (n) => `${Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
      const paid = billing.isPaid || billing.status === 'PAYEE';
      const partial = billing.status === 'PARTIEL' || billing.status === 'PARTIELLEMENT_PAYEE';
      const total = Number(billing.totalAmount || 0);
      const paidAmt = Number(billing.paidAmount || 0);
      const balance = billing.balance != null ? Number(billing.balance) : (total - paidAmt);

      // Palette
      const GREEN = [14, 124, 90];      // vert profond (marque)
      const GOLD = [201, 162, 39];      // accent doré
      const DARK = [33, 37, 41];
      const MUTED = [110, 116, 122];

      const logo = await loadImageAsDataURL(cfg.hospitalLogoUrl || cfg.logoUrl);

      const doc = new jsPDF('p', 'mm', 'a4');
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const M = 16; // marge

      // ── EN-TÊTE ──
      doc.setFillColor(...GREEN);
      doc.rect(0, 0, W, 38, 'F');
      // fine ligne dorée
      doc.setFillColor(...GOLD);
      doc.rect(0, 38, W, 1.2, 'F');

      let headerTextX = M;
      if (logo) {
        const ratio = logo.w && logo.h ? logo.w / logo.h : 1;
        const lh = 20, lw = Math.min(28, lh * ratio);
        // pastille blanche derrière le logo
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(M, 9, lw + 6, 24, 2, 2, 'F');
        doc.addImage(logo.dataUrl, 'PNG', M + 3, 11, lw, lh, undefined, 'FAST');
        headerTextX = M + lw + 12;
      }

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
      doc.text(cfg.hospitalName || cfg.headerTitle || 'INUA AFYA', headerTextX, 16);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
      let hy = 22;
      const headerLines = [
        cfg.headerSubtitle || cfg.ministryName,
        [cfg.address, cfg.city].filter(Boolean).join(', ') || null,
        [cfg.phoneNumber && `Tél: ${cfg.phoneNumber}`, cfg.email].filter(Boolean).join('  ·  ') || null,
        [cfg.website, cfg.country].filter(Boolean).join('  ·  ') || null,
      ].filter(Boolean);
      headerLines.slice(0, 4).forEach((t) => { doc.text(String(t), headerTextX, hy); hy += 4.5; });

      // ── TITRE + STATUT ──
      let y = 52;
      doc.setTextColor(...DARK);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
      doc.text('REÇU DE PAIEMENT', M, y);

      const badge = paid ? { t: 'PAYÉ', c: [16, 185, 129] } : partial ? { t: 'PARTIEL', c: [217, 119, 6] } : { t: 'EN ATTENTE', c: [220, 38, 38] };
      const bw = 42, bx = W - M - bw;
      doc.setFillColor(...badge.c);
      doc.roundedRect(bx, y - 7, bw, 10, 5, 5, 'F');
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
      doc.text(badge.t, bx + bw / 2, y, { align: 'center' });

      // Réf + date sous le titre
      y += 7;
      doc.setTextColor(...MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
      doc.text(`Référence : ${ref}`, M, y);
      doc.text(`Date : ${billing.createdAt ? new Date(billing.createdAt).toLocaleDateString('fr-FR') : '—'}`, W - M, y, { align: 'right' });

      // ── BLOC PATIENT ──
      y += 6;
      doc.setDrawColor(230); doc.setFillColor(248, 250, 249);
      doc.roundedRect(M, y, W - 2 * M, 18, 2, 2, 'FD');
      doc.setTextColor(...MUTED); doc.setFontSize(8);
      doc.text('PATIENT', M + 4, y + 6);
      doc.text('PRESTATION', W / 2, y + 6);
      doc.setTextColor(...DARK); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      doc.text(billing.patientName || '—', M + 4, y + 13);
      doc.setFontSize(10);
      doc.text(`${billing.type || billing.source || ''}`.trim() || '—', W / 2, y + 13);
      y += 24;

      // ── TABLEAU DES PRESTATIONS ──
      const rows = (Array.isArray(billing.items) && billing.items.length > 0)
        ? billing.items.map((it) => [
            it.description || it.name || it.serviceName || billing.title || 'Prestation',
            money(it.totalPrice ?? it.amount ?? it.unitPrice ?? 0),
          ])
        : [[billing.title || billing.description || 'Prestation', money(total)]];

      autoTable(doc, {
        startY: y,
        head: [['Désignation', 'Montant']],
        body: rows,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 3, textColor: DARK, lineColor: [230, 230, 230] },
        headStyles: { fillColor: GREEN, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
        columnStyles: { 1: { halign: 'right', cellWidth: 45 } },
        margin: { left: M, right: M },
      });
      y = doc.lastAutoTable.finalY + 8;

      // ── TOTAUX (encadré à droite) ──
      const boxW = 80, boxX = W - M - boxW;
      doc.setDrawColor(230); doc.setFillColor(250, 250, 250);
      doc.roundedRect(boxX, y, boxW, 30, 2, 2, 'FD');
      const totLine = (label, value, opts = {}) => {
        doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
        doc.setFontSize(opts.big ? 11 : 9.5);
        doc.setTextColor(...(opts.color || MUTED));
        doc.text(label, boxX + 4, y);
        doc.setTextColor(...(opts.color || DARK));
        doc.text(value, boxX + boxW - 4, y, { align: 'right' });
      };
      y += 8; totLine('Montant total', money(total));
      y += 7; totLine('Déjà payé', money(paidAmt));
      y += 2; doc.setDrawColor(220); doc.line(boxX + 4, y, boxX + boxW - 4, y);
      y += 7; totLine('Reste à payer', money(balance), { bold: true, big: true, color: balance > 0 ? [220, 38, 38] : [16, 185, 129] });

      // ── PIED DE PAGE ──
      const footY = H - 20;
      doc.setDrawColor(...GOLD); doc.setLineWidth(0.5); doc.line(M, footY, W - M, footY);
      doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...MUTED);
      const footer = cfg.footerText || `${cfg.hospitalName || 'Inua Afya'} — Merci de votre confiance.`;
      doc.text(footer, W / 2, footY + 5, { align: 'center', maxWidth: W - 2 * M });
      const legal = [cfg.registrationNumber && `RCCM: ${cfg.registrationNumber}`, cfg.taxId && `NIF: ${cfg.taxId}`, cfg.licenseNumber && `Autorisation: ${cfg.licenseNumber}`].filter(Boolean).join('   |   ');
      if (legal) doc.text(legal, W / 2, footY + 10, { align: 'center' });
      doc.setFontSize(7);
      doc.text(`Reçu généré le ${new Date().toLocaleString('fr-FR')} — Document électronique`, W / 2, H - 6, { align: 'center' });

      doc.save(`Recu-${ref}.pdf`);
    } catch (error) {
      console.error('❌ [Billing] Erreur génération PDF:', error);
      alert('Erreur lors de la génération du reçu PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  // 3. Ouvrir détail facture avec QR code
  const handleViewDetail = async (billing) => {
    setSelectedInvoice(billing);
    setDetailModalOpen(true);
    setLoadingDetail(true);
    
    try {
      const response = await api.get(`/patient/billing/${billing.id}/detail`);
      setInvoiceDetail(response.data);
    } catch (error) {
      console.error("Erreur chargement détail:", error);
      // Fallback: utiliser les données existantes
      setInvoiceDetail(billing);
    } finally {
      setLoadingDetail(false);
    }
  };

  // 4. Helper pour icône de type
  const getTypeIcon = (type) => {
    switch (type) {
      case 'PHARMACIE': return <Pill className="w-5 h-5 text-emerald-500" />;
      case 'CONSULTATION': return <Stethoscope className="w-5 h-5 text-blue-500" />;
      case 'LABORATOIRE': return <FlaskConical className="w-5 h-5 text-purple-500" />;
      case 'FICHE': return <Receipt className="w-5 h-5 text-amber-500" />;
      default: return <FileText className="w-5 h-5 text-slate-500" />;
    }
  };

  // WebSocket - Listen for billing notifications
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;
    
    const latestNotif = notifications[0];
    const message = latestNotif.message || latestNotif.content || '';
    
    // Check for NEW_INVOICE or PAYMENT_CONFIRMED events
    const isNewInvoice = message.includes('nouvelle facture') || 
                         message.includes('nouvelle admission') ||
                         message.includes('pharmacie') ||
                         latestNotif.type === 'NEW_INVOICE';
    const isPaymentConfirmed = message.includes('paiement confirm') || 
                               message.includes('payée') ||
                               latestNotif.type === 'PAYMENT_CONFIRMED';
    
    if (isNewInvoice || isPaymentConfirmed) {
      // Refresh billing data immediately
      fetchBillingData();
      
      // Show browser notification if permitted
      if (Notification.permission === 'granted') {
        new Notification('Inua Afya - Facturation', {
          body: message,
          icon: '/logo192.png'
        });
      }
    }
  }, [notifications]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Handle pharmacy detail view
  const handleViewPharmacyDetail = async (billing, e) => {
    if (e) e.stopPropagation();
    
    if (billing.type !== 'PHARMACIE') {
      handleViewDetail(billing);
      return;
    }
    
    setPharmacyDetailOpen(true);
    setLoadingPharmacy(true);
    
    try {
      // Try to get detailed pharmacy order info
      const response = await api.get(`/pharmacy/orders/${billing.id.replace('PHARMA-', '')}`);
      setPharmacyDetail({
        ...billing,
        medications: response.data.items || response.data.medications || [],
        status: response.data.status,
        deliveryStatus: response.data.deliveryStatus || 'PENDING'
      });
    } catch (error) {
      console.error("Erreur chargement détail pharmacie:", error);
      // Fallback with existing data
      setPharmacyDetail({
        ...billing,
        medications: billing.items || [],
        deliveryStatus: 'PENDING'
      });
    } finally {
      setLoadingPharmacy(false);
    }
  };

  // Get delivery status badge
  const getDeliveryStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            <CheckCircle className="w-3 h-3 mr-1" /> Livré
          </Badge>
        );
      case 'READY':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            <Package className="w-3 h-3 mr-1" /> Prêt
          </Badge>
        );
      case 'IN_TRANSIT':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            <Truck className="w-3 h-3 mr-1" /> En cours
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20">
            <Timer className="w-3 h-3 mr-1" /> En attente
          </Badge>
        );
    }
  };

  // 5. Helper pour badge statut
  const getStatusBadge = (status, isPaid) => {
    if (isPaid || status === 'PAYEE') {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">
          <CheckCircle className="w-3 h-3 mr-1" /> Payée
        </Badge>
      );
    }
    if (status === 'PARTIEL') {
      return (
        <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold">
          <Clock className="w-3 h-3 mr-1" /> Partiel
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold">
        <AlertCircle className="w-3 h-3 mr-1" /> En attente
      </Badge>
    );
  };

  // 3. Filtrage combiné
  const filteredBillings = billings.filter((bill) => {
    // Recherche sur referenceNumber OU invoiceCode (pour compatibilité)
    const searchField = (bill.referenceNumber || bill.invoiceCode || '').toLowerCase();
    const matchesSearch = searchField.includes(searchTerm.toLowerCase());
    const matchesFilter = 
      filter === 'all' ? true :
      filter === 'paid' ? bill.status === 'PAYEE' || bill.isPaid === true :
      bill.status !== 'PAYEE' && bill.isPaid !== true;

    return matchesSearch && matchesFilter;
  });

  // DEBUG: Log des filtres
  useEffect(() => {
    console.log('🔍 [Billing DEBUG] billings.length:', billings.length);
    console.log('🔍 [Billing DEBUG] filteredBillings.length:', filteredBillings.length);
    console.log('🔍 [Billing DEBUG] filter:', filter);
    console.log('🔍 [Billing DEBUG] searchTerm:', searchTerm);
    if (billings.length > 0) {
      console.log('🔍 [Billing DEBUG] Premier item:', billings[0]);
    }
  }, [billings, filteredBillings, filter, searchTerm]);

  // Skeleton Loader pour le chargement
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </div>
          ))}
        </div>
        
        {/* Table Skeleton */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <Skeleton className="h-10 w-full mb-4" />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full mb-2" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 animate-fadeIn">
      {/* Header Mobile-First */}
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-foreground tracking-tight mb-2">
            Gestion Facturation
          </h1>
          <p className="text-sm md:text-base text-muted-foreground font-medium">
            Historique classé par date d'émission
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Dernière mise à jour: {lastUpdate.toLocaleTimeString('fr-FR')}
          </p>
        </div>
        <div className="bg-emerald-500/10 text-emerald-600 px-3 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 border border-emerald-500/20">
          <ArrowUpDown className="w-4 h-4" />
          Trié par : Plus récent
        </div>
      </div>

      {/* Stats Cards - Mobile Optimisé */}
      <div className="grid grid-cols-3 md:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
        <div className="bg-card border border-emerald-500/20 rounded-2xl p-3 md:p-6 transition-all hover:scale-[1.02]">
          <p className="text-emerald-500 text-[10px] md:text-xs font-black uppercase mb-1">Total Payé</p>
          <h3 className="text-lg md:text-3xl font-black text-emerald-500">{(stats.totalPaid || 0).toLocaleString()} $</h3>
          <p className="text-[10px] text-muted-foreground mt-1 hidden md:block">{stats.paidCount || 0} factures</p>
        </div>

        <div className="bg-card border border-amber-500/20 rounded-2xl p-3 md:p-6 transition-all hover:scale-[1.02]">
          <p className="text-amber-500 text-[10px] md:text-xs font-black uppercase mb-1">Reste à Payer</p>
          <h3 className="text-lg md:text-3xl font-black text-amber-500">{(stats.totalPending || 0).toLocaleString()} $</h3>
          <p className="text-[10px] text-muted-foreground mt-1 hidden md:block">{stats.pendingCount || 0} en attente</p>
        </div>

        <div className="bg-card border border-blue-500/20 rounded-2xl p-3 md:p-6 transition-all hover:scale-[1.02]">
          <p className="text-blue-500 text-[10px] md:text-xs font-black uppercase mb-1">Documents</p>
          <h3 className="text-lg md:text-3xl font-black text-blue-500">{billings.length}</h3>
          <p className="text-[10px] text-muted-foreground mt-1 hidden md:block">Total transactions</p>
        </div>
      </div>

      {/* Toolbar: Search & Filters - Mobile Optimisé */}
      <div className="flex flex-col gap-3 mb-6 bg-muted/50 p-3 md:p-4 rounded-2xl border border-border/50 shadow-sm">
        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'Toutes', count: billings.length },
            { id: 'paid', label: 'Payées', count: stats.paidCount },
            { id: 'pending', label: 'Attentes', count: stats.pendingCount }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "px-3 md:px-5 py-2 rounded-xl font-bold text-[11px] md:text-xs transition-all border shrink-0 uppercase tracking-tighter flex items-center gap-1.5",
                filter === f.id
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
              )}
            >
              {f.label}
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[9px]",
                filter === f.id ? 'bg-white/20' : 'bg-emerald-500/10 text-emerald-500'
              )}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text"
            placeholder="N° de facture (ex: INV-2024...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-muted/30 border border-border/50 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 transition-all"
          />
        </div>
      </div>

      {/* Transactions List - Mobile Cards / Desktop Table */}
      <div className="space-y-3 md:space-y-0 md:bg-card md:border md:border-border md:rounded-2xl md:shadow-sm md:overflow-hidden">
        {filteredBillings.length > 0 ? (
          <>
            {/* Desktop Header */}
            <div className="hidden md:grid md:grid-cols-6 gap-4 px-5 py-3 bg-muted/30 border-b border-border text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              <div className="col-span-2">Facture</div>
              <div>Date</div>
              <div>Montant</div>
              <div>Statut</div>
              <div className="text-right">Actions</div>
            </div>
            
            {/* Items */}
            <div className="md:divide-y md:divide-border">
              {filteredBillings.map((billing) => (
                <div 
                  key={billing.id} 
                  onClick={() => billing.type === 'PHARMACIE' ? handleViewPharmacyDetail(billing) : handleViewDetail(billing)}
                  className="bg-card border border-border/50 md:border-0 rounded-xl md:rounded-none p-4 md:p-5 hover:bg-muted/50 transition-colors cursor-pointer group min-h-[44px]"
                >
                  {/* Mobile Layout */}
                  <div className="md:hidden space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          billing.isPaid ? "bg-emerald-500/10" : "bg-amber-500/10"
                        )}>
                          {getTypeIcon(billing.type)}
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground text-sm">{billing.referenceNumber || billing.invoiceCode}</h4>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{billing.title || billing.description}</p>
                        </div>
                      </div>
                      {getStatusBadge(billing.status, billing.isPaid)}
                    </div>
                    
                    {/* Actions Mobile */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/30">
                      <div className="text-xs text-muted-foreground">
                        {billing.createdAt ? new Date(billing.createdAt).toLocaleDateString('fr-FR') : 'N/A'}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-emerald-500 text-sm mr-1">{(billing.totalAmount || 0).toLocaleString()} {billing.currency || '$'}</span>
                        
                        {/* Bouton Voir Médicaments - Mobile */}
                        {billing.type === 'PHARMACIE' && (
                          <button
                            onClick={(e) => handleViewPharmacyDetail(billing, e)}
                            className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                            title="Voir les médicaments"
                          >
                            <Pill className="w-4 h-4" />
                          </button>
                        )}
                        
                        {/* Bouton Voir Détail - Mobile */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleViewDetail(billing); }}
                          className="p-2 rounded-lg bg-muted/50 hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                          title="Voir le détail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {/* Bouton Télécharger PDF - Mobile (si payé) */}
                        {billing.isPaid && (billing.type === 'INVOICE' || billing.type === 'LABORATOIRE' || billing.type === 'AUTRE' || billing.type === 'PHARMACIE' || billing.source === 'FINANCE') && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownloadPDF(billing); }}
                            disabled={String(downloadingId) === String(billing.originalId || billing.id)}
                            className="p-2 rounded-lg bg-muted/50 hover:bg-emerald-500 hover:text-white transition-colors disabled:opacity-50 min-w-[36px] min-h-[36px] flex items-center justify-center"
                            title="Télécharger le PDF"
                          >
                            {String(downloadingId) === String(billing.originalId || billing.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden md:grid md:grid-cols-6 gap-4 items-center">
                    <div className="col-span-2">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          billing.isPaid ? "bg-emerald-500/10" : "bg-amber-500/10"
                        )}>
                          {getTypeIcon(billing.type)}
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground">{billing.referenceNumber || billing.invoiceCode}</h4>
                          <p className="text-[11px] text-muted-foreground">{billing.title}</p>
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      {billing.createdAt ? new Date(billing.createdAt).toLocaleDateString('fr-FR') : 'N/A'}
                    </div>

                    <div className="font-black text-emerald-500">
                      {(billing.totalAmount || 0).toLocaleString()} {billing.currency || '$'}
                    </div>

                    <div>
                      {getStatusBadge(billing.status, billing.isPaid)}
                    </div>

                    <div className="flex justify-end gap-2">
                      {billing.type === 'PHARMACIE' && (
                        <button 
                          onClick={(e) => handleViewPharmacyDetail(billing, e)}
                          className="p-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                          title="Voir les médicaments"
                        >
                          <Pill className="w-5 h-5" />
                        </button>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleViewDetail(billing); }}
                        className="p-3 rounded-lg bg-muted/50 hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {billing.isPaid && (billing.type === 'INVOICE' || billing.type === 'LABORATOIRE' || billing.type === 'AUTRE' || billing.type === 'PHARMACIE' || billing.source === 'FINANCE') && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDownloadPDF(billing); }}
                          disabled={String(downloadingId) === String(billing.originalId || billing.id)}
                          className="p-3 rounded-lg bg-muted/50 hover:bg-emerald-500 hover:text-white transition-colors disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
                          title="Télécharger le PDF"
                        >
                          {String(downloadingId) === String(billing.originalId || billing.id) ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16 md:py-24 bg-card md:bg-transparent rounded-2xl md:rounded-none border border-border/50 md:border-0">
            <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Aucune facture trouvée</h3>
            <p className="text-sm text-muted-foreground">Modifiez votre recherche ou vos filtres.</p>
          </div>
        )}
      </div>

      {/* Toast Notification for Real-time Updates */}
      {unreadCount > 0 && (
        <div className="fixed bottom-4 right-4 z-50 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <span className="font-bold text-sm">{unreadCount} nouvelle{unreadCount > 1 ? 's' : ''} notification{unreadCount > 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* Detail Modal with QR Code */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-md md:max-w-lg bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedInvoice && getTypeIcon(selectedInvoice.type)}
              <span>Détail de la facture</span>
            </DialogTitle>
          </DialogHeader>
          
          {loadingDetail ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : invoiceDetail ? (
            <div className="space-y-6 py-4">
              {/* Header Info */}
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">N° Facture</p>
                  <p className="font-bold text-foreground">{invoiceDetail.referenceNumber || invoiceDetail.invoiceCode}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {invoiceDetail.createdAt ? new Date(invoiceDetail.createdAt).toLocaleDateString('fr-FR', { 
                      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                    }) : 'N/A'}
                  </p>
                </div>
                {getStatusBadge(invoiceDetail.status, invoiceDetail.isPaid)}
              </div>

              {/* Items List */}
              {invoiceDetail.items && invoiceDetail.items.length > 0 && (
                <div className="bg-muted/20 rounded-xl p-4 space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mb-3">Détails</p>
                  {invoiceDetail.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.description}</p>
                        <p className="text-xs text-muted-foreground">Qté: {item.quantity}</p>
                      </div>
                      <p className="font-bold text-emerald-500">{(item.totalPrice || 0).toLocaleString()} {invoiceDetail.currency || '$'}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Montant total</span>
                  <span className="font-bold">{(invoiceDetail.totalAmount || 0).toLocaleString()} {invoiceDetail.currency || '$'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payé</span>
                  <span className="text-emerald-500">{(invoiceDetail.paidAmount || 0).toLocaleString()} {invoiceDetail.currency || '$'}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
                  <span>Reste à payer</span>
                  <span className={invoiceDetail.balance > 0 ? "text-amber-500" : "text-emerald-500"}>
                    {(invoiceDetail.balance || 0).toLocaleString()} {invoiceDetail.currency || '$'}
                  </span>
                </div>
              </div>

              {/* QR Code for Pending Payments */}
              {!invoiceDetail.isPaid && invoiceDetail.paymentCode && (
                <div className="bg-muted rounded-xl p-6 text-center border border-amber-500/20">
                  <p className="text-amber-500 text-xs font-bold uppercase mb-4">Code de paiement - Présentez à la caisse</p>
                  <div className="bg-white p-4 rounded-xl inline-block mb-3">
                    <QrCode className="w-24 h-24 text-foreground" />
                  </div>
                  <p className="text-2xl font-black tracking-widest text-amber-500 font-mono">
                    {invoiceDetail.paymentCode}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ce code unique facilite le paiement rapide au guichet Finance
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1 h-11"
                  onClick={() => setDetailModalOpen(false)}
                >
                  Fermer
                </Button>
                {invoiceDetail.isPaid && (invoiceDetail.type === 'INVOICE' || invoiceDetail.type === 'LABORATOIRE' || invoiceDetail.type === 'AUTRE' || invoiceDetail.type === 'PHARMACIE' || invoiceDetail.source === 'FINANCE') ? (
                  <Button 
                    className="flex-1 h-11 bg-emerald-500 hover:bg-emerald-600"
                    onClick={() => handleDownloadPDF(invoiceDetail)}
                    disabled={String(downloadingId) === String(invoiceDetail.originalId || invoiceDetail.id)}
                  >
                    {String(downloadingId) === String(invoiceDetail.originalId || invoiceDetail.id) ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <FileDown className="w-4 h-4 mr-2" />
                    )}
                    Télécharger PDF
                  </Button>
                ) : invoiceDetail.isPaid ? (
                  <div className="flex-1 text-center text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-emerald-500 inline mr-2" />
                    Paiement confirmé
                  </div>
                ) : (
                  <Button 
                    className="flex-1 h-11 bg-amber-500 hover:bg-amber-600"
                    disabled
                  >
                    <Banknote className="w-4 h-4 mr-2" />
                    À payer à la caisse
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Pharmacy Detail Modal */}
      <Dialog open={pharmacyDetailOpen} onOpenChange={setPharmacyDetailOpen}>
        <DialogContent className="max-w-md md:max-w-lg bg-card border-border/50 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Pill className="w-6 h-6 text-emerald-500" />
              <span>Détail de la commande pharmacie</span>
            </DialogTitle>
          </DialogHeader>
          
          {loadingPharmacy ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : pharmacyDetail ? (
            <div className="space-y-6 py-4">
              {/* Header Info */}
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">N° Commande</p>
                  <p className="font-bold text-foreground">{pharmacyDetail.referenceNumber || pharmacyDetail.invoiceCode}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pharmacyDetail.createdAt ? new Date(pharmacyDetail.createdAt).toLocaleDateString('fr-FR', { 
                      day: 'numeric', month: 'long', year: 'numeric'
                    }) : 'N/A'}
                  </p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  {getStatusBadge(pharmacyDetail.status, pharmacyDetail.isPaid)}
                  {getDeliveryStatusBadge(pharmacyDetail.deliveryStatus)}
                </div>
              </div>

              {/* Medications List */}
              {pharmacyDetail.medications && pharmacyDetail.medications.length > 0 ? (
                <div className="bg-muted/20 rounded-xl p-4 space-y-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Médicaments réservés au POS
                  </p>
                  {pharmacyDetail.medications.map((med, idx) => (
                    <div key={idx} className="flex justify-between items-start py-3 border-b border-border/30 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{med.name || med.description || med.medicationName}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Qté: {med.quantity} × {(med.unitPrice || med.price || 0).toLocaleString()} {pharmacyDetail.currency || '$'}
                        </p>
                        {med.instructions && (
                          <p className="text-[10px] text-emerald-500 mt-1 italic">{med.instructions}</p>
                        )}
                      </div>
                      <p className="font-bold text-emerald-500 ml-2 shrink-0">
                        {((med.totalPrice || (med.quantity * (med.unitPrice || med.price || 0))) || 0).toLocaleString()} {pharmacyDetail.currency || '$'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-amber-500/10 rounded-xl p-4 text-center">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm text-amber-500">Détails des médicaments non disponibles</p>
                </div>
              )}

              {/* Delivery Info */}
              <div className="bg-muted rounded-xl p-4 border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-3 flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Statut de livraison
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Statut actuel</span>
                    <span className={cn(
                      "font-bold",
                      pharmacyDetail.deliveryStatus === 'DELIVERED' ? "text-emerald-500" : "text-amber-500"
                    )}>
                      {pharmacyDetail.deliveryStatus === 'DELIVERED' ? 'Livré au patient' : 
                       pharmacyDetail.deliveryStatus === 'READY' ? 'Prêt à la pharmacie' : 
                       'En attente de paiement'}
                    </span>
                  </div>
                  {pharmacyDetail.isPaid && pharmacyDetail.deliveryStatus !== 'DELIVERED' && (
                    <p className="text-xs text-emerald-500 mt-2 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Présentez votre reçu payé à la pharmacie pour récupérer vos médicaments
                    </p>
                  )}
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Montant total</span>
                  <span className="font-bold">{(pharmacyDetail.totalAmount || 0).toLocaleString()} {pharmacyDetail.currency || '$'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payé</span>
                  <span className="text-emerald-500">{(pharmacyDetail.paidAmount || 0).toLocaleString()} {pharmacyDetail.currency || '$'}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t border-border/50">
                  <span>Reste à payer</span>
                  <span className={pharmacyDetail.balance > 0 ? "text-amber-500" : "text-emerald-500"}>
                    {(pharmacyDetail.balance || 0).toLocaleString()} {pharmacyDetail.currency || '$'}
                  </span>
                </div>
              </div>

              {/* Expiration Warning */}
              {!pharmacyDetail.isPaid && (
                <div className="bg-rose-500/10 rounded-xl p-4 border border-rose-500/20">
                  <div className="flex items-start gap-3">
                    <Timer className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-rose-500">Attention - Réservation temporaire</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cette commande expire après 4 heures si non payée. Les médicaments seront remis en stock.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* QR Code for Pending Payments */}
              {!pharmacyDetail.isPaid && pharmacyDetail.paymentCode && (
                <div className="bg-muted rounded-xl p-6 text-center border border-amber-500/20">
                  <p className="text-amber-500 text-xs font-bold uppercase mb-4">Code de paiement - Présentez à la caisse</p>
                  <div className="bg-white p-4 rounded-xl inline-block mb-3">
                    <QrCode className="w-24 h-24 text-foreground" />
                  </div>
                  <p className="text-2xl font-black tracking-widest text-amber-500 font-mono">
                    {pharmacyDetail.paymentCode}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ce code unique facilite le paiement rapide au guichet Finance
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1 h-12 text-base"
                  onClick={() => setPharmacyDetailOpen(false)}
                >
                  Fermer
                </Button>
                {pharmacyDetail.isPaid ? (
                  <div className="flex-1 text-center text-sm text-muted-foreground">
                    <CheckCircle className="w-5 h-5 text-emerald-500 inline mr-2" />
                    Commande payée - Présentez-vous à la pharmacie
                  </div>
                ) : (
                  <Button 
                    className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 text-base"
                    disabled
                  >
                    <Banknote className="w-5 h-5 mr-2" />
                    À payer à la caisse
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billing;