import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Wallet,
  CreditCard,
  Clock,
  Receipt,
  Search,
  Eye,
  Loader2,
  RefreshCw,
  Users,
  ArrowRight,
  HelpCircle,
  AlertTriangle,
  Package,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Trash2,
  Filter,
  Download,
  Calendar,
  Printer,
  Pill,
  User,
  ShoppingCart,
  Stethoscope,
  BarChart3,
  Activity,
  Zap,
  AlertCircle
} from 'lucide-react';
import { format, startOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { usePharmacyOffline } from '../../hooks/offline';
import hospitalConfigService, { defaultHospitalConfig } from '../../services/hospitalConfigService';
import { resolveLogoUrl } from '../../utils/printUtils';
import { API_BASE_URL } from '../../config/environment.js';
import MedicationForm from '../../components/pharmacy/MedicationForm';

/* ═══════════════════════════════════════════
   COMPOSANT MEDICATION CARD
   ═══════════════════════════════════════════ */
const MedicationCard = ({ medication, onEdit, onStockUpdate, onCheckStock }) => {
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'USD', minimumFractionDigits: 0,
    }).format(amount || 0);

  // 🔧 Calcul du bénéfice
  const calculateProfit = () => {
    const purchasePrice = parseFloat(medication.price) || 0;
    const sellingPrice = parseFloat(medication.unitPrice) || 0;
    const stock = parseInt(medication.currentStock) || 0;
    const profit = (sellingPrice - purchasePrice) * stock;
    
    // 🔍 DEBUG LOG
    console.log(`💊 Calcul bénéfice pour ${medication.medicationName}:`);
    console.log(`  - Prix achat: $${purchasePrice}`);
    console.log(`  - Prix vente: $${sellingPrice}`);
    console.log(`  - Stock: ${stock}`);
    console.log(`  - Bénéfice: $${profit}`);
    
    return profit;
  };

  const profit = calculateProfit();

  const getStockLevel = (current, minimum) => {
    const ratio = current / minimum;
    if (ratio <= 0) return { level: 'OUT_OF_STOCK', color: '#DC2626', label: 'Rupture', icon: XCircle };
    if (ratio <= 0.5) return { level: 'CRITICAL', color: '#EF4444', label: 'Critique', icon: AlertTriangle };
    if (ratio <= 1) return { level: 'LOW', color: '#F59E0B', label: 'Bas', icon: AlertCircle };
    return { level: 'OK', color: '#10B981', label: 'OK', icon: CheckCircle };
  };

  const stockStatus = getStockLevel(medication.currentStock, medication.minimumStock);
  const Icon = stockStatus.icon;

  return (
    <Card className="border-none shadow-sm bg-card overflow-hidden rounded-2xl hover:shadow-md hover:bg-muted/50 dark:hover:bg-muted/30 transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg bg-emerald-500">
              <Pill size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">
                {medication.medicationName}
              </h3>
              <p className="text-xs font-medium text-muted-foreground">
                {medication.medicationCode || 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Icon className="w-4 h-4" style={{ color: stockStatus.color }} />
            <span
              className="px-2 py-1 rounded text-[9px] font-bold"
              style={{ backgroundColor: `${stockStatus.color}15`, color: stockStatus.color }}
            >
              {stockStatus.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase">
              Stock actuel
            </p>
            <p className="text-lg font-black text-foreground">
              {medication.currentStock || 0}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase">
              Stock minimum
            </p>
            <p className="text-lg font-black text-foreground">
              {medication.minimumStock || 0}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase">
              Prix unitaire
            </p>
            <p className="text-lg font-black text-foreground">
              {formatCurrency(medication.unitPrice || 0)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase">
              Valeur stock
            </p>
            <p className="text-lg font-black text-foreground">
              {formatCurrency((medication.currentStock || 0) * (medication.unitPrice || 0))}
            </p>
          </div>
        </div>

        {/* 🔧 NOUVEAU: Affichage du bénéfice */}
        <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-emerald-700 uppercase">
                Bénéfice total
              </p>
              <p className={`text-lg font-black ${profit > 0 ? 'text-emerald-600' : profit < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {formatCurrency(profit)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {profit > 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-600">Profit</span>
                </>
              ) : profit < 0 ? (
                <>
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-bold text-red-600">Perte</span>
                </>
              ) : (
                <>
                  <span className="text-xs font-bold text-gray-600">Neutre</span>
                </>
              )}
            </div>
          </div>
        </div>

        {medication.genericName && (
          <div className="mb-4">
            <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">
              Nom générique
            </p>
            <p className="text-sm text-muted-foreground">
              {medication.genericName}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();  // Empêche toute redirection
              onEdit(medication);
            }}
            className="rounded-lg hover:bg-blue-500/10"
          >
            <Edit className="w-4 h-4 mr-1" />
            Modifier
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onStockUpdate(medication)}
            className="rounded-lg hover:bg-emerald-500/10 text-emerald-600"
          >
            <Package className="w-4 h-4 mr-1" />
            Stock
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCheckStock(medication)}
            className="rounded-lg hover:bg-purple-500/10 text-purple-600"
          >
            <Search className="w-4 h-4 mr-1" />
            Vérifier
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

/* ═══════════════════════════════════════════
   PAGE INVENTAIRE PHARMACIE
   ═══════════════════════════════════════════ */
const PharmacyInventory = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getMedicines, updateStock, addInventoryMovement, isOnline } = usePharmacyOffline();
  const [loading, setLoading] = useState(true);
  const [medications, setMedications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [showStockModal, setShowStockModal] = useState(false);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);  // Nouveau modal pour les détails
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [stockQuantity, setStockQuantity] = useState('');
  const [isStockPurchase, setIsStockPurchase] = useState(false);
  const [purchaseCurrency, setPurchaseCurrency] = useState('CDF');
  const [purchaseSupplier, setPurchaseSupplier] = useState('');
  // 🔧 NOUVEAUX CHAMPS pour formulaire complet
  const [stockAction, setStockAction] = useState('ADD'); // 'ADD' ou 'REMOVE'
  const [motif, setMotif] = useState('ACHAT'); // 'ACHAT', 'INVENTAIRE', 'AUTRE'
  const [lotNumber, setLotNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [justificatifFile, setJustificatifFile] = useState(null);
  const [pendingMovements, setPendingMovements] = useState([]); // 🔧 Mouvements en attente de validation
  const [loadingPending, setLoadingPending] = useState(false);

  const stockFilterOptions = [
    { value: 'ALL', label: 'Tous', color: '#6B7280' },
    { value: 'OUT_OF_STOCK', label: 'Rupture', color: '#DC2626' },
    { value: 'CRITICAL', label: 'Critique', color: '#EF4444' },
    { value: 'LOW', label: 'Bas', color: '#F59E0B' },
    { value: 'OK', label: 'OK', color: '#10B981' }
  ];

  // ═══════════════════════════════════════
  // CHARGEMENT DES DONNÉES
  // ═══════════════════════════════════════
  
  // 🔧 Charger les mouvements de stock en attente de validation
  const loadPendingMovements = async () => {
    try {
      setLoadingPending(true);
      const response = await medicationAPI.getStockMovementsByStatus('EN_ATTENTE_VALIDATION');
      setPendingMovements(response.data || []);
    } catch (err) {
      console.error('Erreur chargement mouvements en attente:', err);
    } finally {
      setLoadingPending(false);
    }
  };

  const loadInventory = async () => {
    try {
      setLoading(true);

      // Charger les médicaments depuis le hook offline
      const result = await getMedicines();
      const medicationsList = result.data || [];

      // Transformer les données pour correspondre au format attendu
      const transformedMedications = medicationsList.map(med => ({
        id: med.id,
        medicationCode: med.medicationCode,
        medicationName: med.name,
        genericName: med.genericName,
        currentStock: med.stockQuantity || 0,
        minimumStock: med.minimumStock || 10,
        unitPrice: med.unitPrice || 0,
        price: med.price || 0, // 🔧 Ajout du prix d'achat pour le calcul du bénéfice
        supplier: med.supplierName || med.supplier_name || med.supplier || med.vendor || med.provider || med.fournisseur || med.source || null,
        isActive: med.isActive !== false
      }));

      setMedications(transformedMedications);
      
      if (!isOnline) {
        toast.info('Mode hors ligne : inventaire local chargé');
      }

    } catch (err) {
      console.error('Error loading inventory:', err);
      toast.error('Erreur lors du chargement de l\'inventaire');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    loadInventory(); 
    loadPendingMovements();
  }, []);

  // ═══════════════════════════════════════
  // FILTRAGE
  // ═══════════════════════════════════════
  const getStockLevel = (current, minimum) => {
    const ratio = current / minimum;
    if (ratio <= 0) return 'OUT_OF_STOCK';
    if (ratio <= 0.5) return 'CRITICAL';
    if (ratio <= 1) return 'LOW';
    return 'OK';
  };

  const filteredMedications = medications.filter((med) => {
    // Filtre de recherche
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!(
        (med.medicationName || '').toLowerCase().includes(q) ||
        (med.medicationCode || '').toLowerCase().includes(q) ||
        (med.genericName || '').toLowerCase().includes(q)
      )) {
        return false;
      }
    }

    // Filtre de stock
    if (stockFilter !== 'ALL') {
      const level = getStockLevel(med.currentStock, med.minimumStock);
      if (level !== stockFilter) return false;
    }

    return true;
  });

  // ═══════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════
  const handleEditMedication = (medication) => {
    console.log('📝 Modification du médicament:', medication.name || medication.medicationName);
    console.log('📝 Structure complète des données reçues:', medication);
    console.log('📝 Type de medication:', typeof medication);
    console.log('📝 Clés disponibles:', Object.keys(medication));
    
    // Afficher chaque champ avec sa valeur
    Object.keys(medication).forEach(key => {
      console.log(`  🔍 ${key}: "${medication[key]}" (type: ${typeof medication[key]})`);
    });
    
    // Vérifier spécifiquement les champs qui pourraient manquer
    console.log('🔍 Vérification des champs spécifiques:');
    console.log(`  - form: "${medication.form || medication.medicationForm || medication.medication_form || 'NON TROUVÉ'}"`);
    console.log(`  - strength: "${medication.strength || medication.dosage || 'NON TROUVÉ'}"`);
    console.log(`  - supplier: "${medication.supplier || medication.supplier_name || 'NON TROUVÉ'}"`);
    console.log(`  - manufacturer: "${medication.manufacturer || medication.manufacturer_name || 'NON TROUVÉ'}"`);
    console.log(`  - category: "${medication.category || medication.drug_category || 'NON TROUVÉ'}"`);
    console.log(`  - description: "${medication.description || medication.details || 'NON TROUVÉ'}"`);
    
    // Empêcher toute redirection et utiliser le formulaire existant
    setSelectedMedication(medication);
    setShowMedicationForm(true);  // Utilise le formulaire existant en mode édition
    
    console.log('✅ Formulaire d\'édition ouvert pour:', medication.name || medication.medicationName);
  };

  const handleStockUpdate = (medication) => {
    setSelectedMedication(medication);
    setStockQuantity('');
    setIsStockPurchase(false);
    setPurchaseCurrency('CDF');
    setPurchaseSupplier(medication.supplier || '');
    // 🔧 Réinitialiser les nouveaux champs
    setStockAction('ADD');
    setMotif('ACHAT');
    setLotNumber('');
    setExpiryDate('');
    setJustificatifFile(null);
    setShowStockModal(true);
  };

  const handlePrintInventory = async () => {
    console.log('🖨️ Impression de l\'inventaire avec config admin...');
    
    // 📦 Récupérer la configuration admin
    let hospitalConfig;
    try {
      hospitalConfig = await hospitalConfigService.getConfig();
      console.log('✅ Config admin chargée pour impression:', hospitalConfig);
    } catch (error) {
      console.warn('⚠️ Erreur chargement config admin, utilisation fallback:', error);
      hospitalConfig = defaultHospitalConfig;
    }
    
    // Créer une fenêtre d'impression
    const printWindow = window.open('', '_blank');
    
    // Préparer les données pour l'impression
    const printData = filteredMedications.map(med => ({
      name: med.name || med.medicationName || 'Non spécifié',
      code: med.medicationCode || med.medication_code || 'N/A',
      stock: med.currentStock || med.stockQuantity || med.stock_quantity || 0,
      minStock: med.minimumStock || 10,
      price: med.price || 0,
      unitPrice: med.unitPrice || med.unit_price || 0,
      supplier: med.supplierName || med.supplier_name || med.supplierName || med.supplier || med.vendor || med.provider || med.fournisseur || med.source || med.source_name || med.distributor || '-',
      status: (() => {
        const current = med.currentStock || med.stockQuantity || med.stock_quantity || 0;
        const minimum = med.minimumStock || 10;
        if (current <= 0) return 'RUPTURE';
        if (current <= minimum * 0.5) return 'CRITIQUE';
        if (current <= minimum) return 'BAS';
        return 'OK';
      })()
    }));

    // Calculer les statistiques
    const totalValue = printData.reduce((sum, med) => sum + (med.price * med.stock), 0);
    const totalPotentialValue = printData.reduce((sum, med) => sum + (med.unitPrice * med.stock), 0);
    const totalItems = printData.reduce((sum, med) => sum + med.stock, 0);
    
    // Créer le contenu HTML pour l'impression
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Stock Médicaments - ${new Date().toLocaleDateString('fr-FR')}</title>
        <style>
          @page { margin: 20mm; }
          body { 
            font-family: Arial, sans-serif; 
            font-size: 12px; 
            line-height: 1.4;
            color: #333;
          }
          .header { 
            text-align: center; 
            margin-bottom: 10px; 
            padding-bottom: 5px; 
          }
          .header h1 { 
            margin: 0; 
            font-size: 22px; 
            color: ${hospitalConfig?.primaryColor || '#009966'}; 
          }
          .header .subtitle {
            font-style: italic;
            color: #666;
            font-size: 12px;
            margin: 3px 0;
          }
          .header .info {
            font-size: 10px;
            color: #666;
            margin: 2px 0;
          }
          .stats { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 20px; 
            background: #f5f5f5; 
            padding: 15px; 
            border-radius: 5px; 
          }
          .stat-item { 
            text-align: center; 
          }
          .stat-value { 
            font-size: 18px; 
            font-weight: bold; 
            color: ${hospitalConfig?.primaryColor || '#009966'}; 
          }
          .stat-label { 
            font-size: 11px; 
            color: #666; 
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 20px; 
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left; 
          }
          th { 
            background-color: #f8f9fa; 
            font-weight: bold; 
            font-size: 11px; 
          }
          td { 
            font-size: 11px; 
          }
          .status-ok { color: #28a745; font-weight: bold; }
          .status-low { color: #ffc107; font-weight: bold; }
          .status-critical { color: #fd7e14; font-weight: bold; }
          .status-out { color: #dc3545; font-weight: bold; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .footer { 
            margin-top: 30px; 
            text-align: center; 
            font-size: 10px; 
            color: #666; 
            border-top: 1px solid #ddd; 
            padding-top: 20px; 
          }
          .no-print { display: none; }
        </style>
      </head>
      <body>
        <!-- Ministry line at top -->
        <div style="text-align: center; font-size: 9px; color: #666; margin-bottom: 8px;">
          ${[hospitalConfig?.ministryName, hospitalConfig?.departmentName, hospitalConfig?.zoneName, hospitalConfig?.region].filter(Boolean).join(' | ').toUpperCase()}
        </div>
        
        <!-- Main Header: Logo/Info Left, Title Right -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
          <!-- Left: Logo + Hospital Info -->
          <div style="flex: 1; text-align: left;">
            ${hospitalConfig?.enableLogoOnDocuments && hospitalConfig?.hospitalLogoUrl ? `
            <div style="margin-bottom: 8px;">
              <img src="${resolveLogoUrl(hospitalConfig.hospitalLogoUrl, API_BASE_URL)}" alt="Logo" style="max-width: 120px; max-height: 120px; object-fit: contain;" onerror="this.style.display='none'" />
            </div>
            ` : ''}
            <div style="font-size: 20px; font-weight: bold; color: ${hospitalConfig?.primaryColor || '#009966'}; margin: 0;">
              ${hospitalConfig?.hospitalName || 'CLINIQUE CI UCBC'}
            </div>
            <div style="font-style: italic; color: #666; font-size: 12px; margin: 2px 0;">
              ${hospitalConfig?.headerSubtitle || 'Système de Gestion Hospitalière'}
            </div>
            ${hospitalConfig?.hospitalCode ? `<div style="font-size: 10px; color: #666; margin: 2px 0;">Code Établissement: ${hospitalConfig.hospitalCode}</div>` : ''}
            <div style="font-size: 10px; color: #333; margin: 3px 0;">
              ${[hospitalConfig?.address, hospitalConfig?.city, hospitalConfig?.country, hospitalConfig?.postalCode].filter(Boolean).join(', ')}
            </div>
            <div style="font-size: 10px; color: #333; margin: 2px 0;">
              ${[hospitalConfig?.phoneNumber ? `Tél: ${hospitalConfig.phoneNumber}` : null, hospitalConfig?.email ? `Email: ${hospitalConfig.email}` : null, hospitalConfig?.website ? `Web: ${hospitalConfig.website}` : null].filter(Boolean).join(' | ')}
            </div>
          </div>
          
          <!-- Right: Document Title -->
          <div style="text-align: right;">
            <div style="font-size: 32px; font-weight: bold; color: ${hospitalConfig?.primaryColor || '#009966'}; margin: 0; line-height: 1;">
              STOCK
            </div>
            <div style="font-size: 11px; color: #666; margin-top: 5px;">
              Date: ${new Date().toLocaleDateString('fr-FR')}
            </div>
          </div>
        </div>
        
        <!-- Separator Line -->
        <div style="height: 3px; background: ${hospitalConfig?.primaryColor || '#009966'}; margin: 15px 0 20px 0;"></div>

        <div class="stats">
          <div class="stat-item">
            <div class="stat-value">${printData.length}</div>
            <div class="stat-label">Médicaments</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${totalItems}</div>
            <div class="stat-label">Unités totales</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">$${totalValue.toFixed(2)}</div>
            <div class="stat-label">Investissement</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">$${totalPotentialValue.toFixed(2)}</div>
            <div class="stat-label">Valeur potentielle</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>N°</th>
              <th>Nom du médicament</th>
              <th>Code</th>
              <th class="text-center">Stock</th>
              <th class="text-center">Min</th>
              <th class="text-right">Prix achat</th>
              <th class="text-right">Prix vente</th>
              <th class="text-right">Valeur</th>
              <th class="text-center">Statut</th>
              <th>Fournisseur</th>
            </tr>
          </thead>
          <tbody>
            ${printData.map((med, index) => `
              <tr>
                <td>${index + 1}</td>
                <td><strong>${med.name}</strong></td>
                <td>${med.code}</td>
                <td class="text-center">${med.stock}</td>
                <td class="text-center">${med.minStock}</td>
                <td class="text-right">$${med.price.toFixed(2)}</td>
                <td class="text-right">$${med.unitPrice.toFixed(2)}</td>
                <td class="text-right">$${(med.price * med.stock).toFixed(2)}</td>
                <td class="text-center">
                  <span class="status-${med.status.toLowerCase() === 'ok' ? 'ok' : 
                                    med.status.toLowerCase() === 'bas' ? 'low' : 
                                    med.status.toLowerCase() === 'critique' ? 'critical' : 'out'}">
                    ${med.status}
                  </span>
                </td>
                <td>${med.supplier}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background-color: #f8f9fa; font-weight: bold;">
              <td colspan="7" class="text-right"><strong>TOTAUX:</strong></td>
              <td class="text-right">$${totalValue.toFixed(2)}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>

        <!-- Footer -->
        <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid ${hospitalConfig?.primaryColor || '#009966'}; padding-top: 15px;">
          <p style="color: ${hospitalConfig?.primaryColor || '#009966'}; font-style: italic; margin: 0 0 5px 0;">© INUA AFYA - Tous droits réservés</p>
          <p style="font-weight: bold; margin: 0;">- ${hospitalConfig?.hospitalName || 'CLINIQUE CI UCBC'} -</p>
        </div>
        
        <!-- Signatures -->
        <div style="margin-top: 30px; display: flex; justify-content: space-between;">
          <div style="text-align: center; width: 200px;">
            <p style="font-size: 10px; color: #666; margin: 0 0 5px 0;">Pharmacien Responsable</p>
            <div style="border-top: 1px solid #666; margin-top: 30px;"></div>
          </div>
          <div style="text-align: center; width: 200px;">
            <p style="font-size: 10px; color: #666; margin: 0 0 5px 0;">Direction / Cachet</p>
            <div style="border-top: 1px solid #666; margin-top: 30px;"></div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Écrire le contenu dans la fenêtre d'impression
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Lancer l'impression
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
    
    toast.success('🖨️ Impression de l\'inventaire lancée');
  };

  const handleCheckStock = async (medication) => {
    console.log('🔍 Vérification détaillée pour:', medication.name || medication.medicationName);
    
    // Ouvrir un modal avec toutes les informations détaillées
    setSelectedMedication(medication);
    setShowDetailsModal(true);
  };

  const handleConfirmStockUpdate = async () => {
    console.log('🚀 handleConfirmStockUpdate appelé');
    console.log('🚀 selectedMedication:', selectedMedication);
    console.log('🚀 stockQuantity:', stockQuantity);
    console.log('🚀 stockAction:', stockAction);
    console.log('🚀 motif:', motif);

    if (!selectedMedication || !stockQuantity) return;

    try {
      const quantity = parseInt(stockQuantity, 10);
      if (quantity <= 0) {
        throw new Error('La quantité doit être supérieure à 0');
      }

      const currentStock = selectedMedication.currentStock || selectedMedication.stockQuantity || 0;
      // 🔧 Calcul selon l'action (ADD ou REMOVE)
      const newStock = stockAction === 'ADD' 
        ? currentStock + quantity 
        : currentStock - quantity;

      if (newStock < 0) {
        throw new Error(`Stock insuffisant. Stock actuel: ${currentStock}, retrait demandé: ${quantity}`);
      }

      console.log('📦 Calcul nouveau stock:', { action: stockAction, current: currentStock, quantity, newStock });

      // 🔧 Si c'est un retrait non-achat, pas de transaction finance
      const isAchat = stockAction === 'ADD' && motif === 'ACHAT';

      // 🔧 Upload fichier si présent (avant création transaction)
      let justificatifUrl = null;
      if (justificatifFile && isAchat) {
        try {
          console.log('📎 Upload fichier justificatif:', justificatifFile.name);
          const uploadResponse = await medicationAPI.uploadJustificatif(justificatifFile, 'justificatifs-pharmacie');
          justificatifUrl = uploadResponse.data?.url || uploadResponse.url;
          console.log('✅ Fichier uploadé, URL:', justificatifUrl);
          toast.success('📎 Justificatif uploadé');
        } catch (uploadErr) {
          console.error('❌ Erreur upload justificatif:', uploadErr);
          toast.error('Erreur upload justificatif: ' + (uploadErr.response?.data?.error || uploadErr.message));
          // On continue sans justificatif (non bloquant)
        }
      }

      // 1. Payload pour mise à jour médicament
      const payload = {
        // Champs obligatoires
        id: selectedMedication.id,
        medicationCode: selectedMedication.medicationCode || selectedMedication.medication_code || '',
        name: selectedMedication.name || selectedMedication.medicationName || '',
        
        // Champs numériques
        price: parseFloat(Number(selectedMedication.price || 0).toFixed(2)),
        unitPrice: parseFloat(Number(selectedMedication.unitPrice || 0).toFixed(2)),
        stockQuantity: parseInt(newStock, 10),
        
        // 🔧 NOUVEAU: Champs mouvement de stock
        isStockPurchase: isAchat,
        quantityAdded: stockAction === 'ADD' ? quantity : 0,
        quantityRemoved: stockAction === 'REMOVE' ? quantity : 0,
        purchaseCurrency: isAchat ? purchaseCurrency : null,
        supplier: (isAchat ? purchaseSupplier : null) || selectedMedication.supplier || '',
        lotNumber: lotNumber || null,
        expiryDate: (() => {
          const d = expiryDate || selectedMedication.expiryDate;
          if (!d) return null;
          return d.includes('T') ? d : d + 'T00:00:00';
        })(),
        motif: motif,
        stockAction: stockAction,
        justificatifUrl: justificatifUrl,
        
        // Champs optionnels
        genericName: selectedMedication.genericName || '',
        description: selectedMedication.description || '',
        manufacturer: selectedMedication.manufacturer || '',
        category: selectedMedication.category || '',
        form: selectedMedication.form || null,
        strength: selectedMedication.strength || '',
        minimumStock: selectedMedication.minimumStock || 10,
        purchaseDate: (() => {
          const d = selectedMedication.purchaseDate;
          if (!d) return null;
          return d.includes('T') ? d : d + 'T00:00:00';
        })(),
        isActive: selectedMedication.isActive !== false,
        requiresPrescription: selectedMedication.requiresPrescription !== false
      };

      // Validation finale
      console.log("📦 Payload final:", payload);
      
      if (!payload.medicationCode?.trim()) throw new Error('Code médicament obligatoire');
      if (!payload.name?.trim()) throw new Error('Nom médicament obligatoire');
      if (payload.price <= 0) throw new Error('Prix d\'achat doit être positif');
      if (payload.unitPrice <= 0) throw new Error('Prix de vente doit être positif');
      if (payload.stockQuantity < 0) throw new Error('Stock ne peut pas être négatif');

      console.log("✅ Payload validé:", payload);
      
      await medicationAPI.updateMedication(selectedMedication.id, payload);
      
      const actionLabel = stockAction === 'ADD' ? 'ajouté' : 'retiré';
      
      // Message différent selon le type d'opération
      if (stockAction === 'ADD' && motif === 'ACHAT') {
        toast.success(
          `🛒 Achat de ${quantity} unité(s) soumis pour validation finance. Le stock sera mis à jour après validation.`,
          { duration: 5000 }
        );
      } else {
        toast.success(`${quantity} unité(s) ${actionLabel}. Nouveau stock: ${newStock}`);
      }
      
      setShowStockModal(false);
      loadInventory();
      loadPendingMovements(); // 🔧 Recharger les mouvements en attente
    } catch (err) {
      console.error('❌ Erreur détaillée:', err);
      
      // Debugging avancé - Extraction des erreurs de validation Spring Boot
      if (err.response?.data?.data) {
        console.table('🔍 Erreurs de validation par champ:', err.response.data.data);
        
        // Afficher chaque erreur de façon claire
        const validationErrors = err.response.data.data;
        Object.entries(validationErrors).forEach(([field, message]) => {
          console.error(`❌ Champ "${field}": ${message}`);
        });
        
        toast.error(`Erreur de validation: ${Object.values(validationErrors).join(', ')}`);
      } else {
        console.error('❌ Erreur complète:', err);
        toast.error('Erreur lors de la mise à jour du stock: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  // ═══════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════
  const stats = {
    total: medications.length,
    outOfStock: medications.filter(m => getStockLevel(m.currentStock, m.minimumStock) === 'OUT_OF_STOCK').length,
    critical: medications.filter(m => getStockLevel(m.currentStock, m.minimumStock) === 'CRITICAL').length,
    low: medications.filter(m => getStockLevel(m.currentStock, m.minimumStock) === 'LOW').length,
    ok: medications.filter(m => getStockLevel(m.currentStock, m.minimumStock) === 'OK').length,
  };

  /* ── LOADING STATE ── */
  if (loading && medications.length === 0) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-72" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  /* ── RENDU PRINCIPAL ── */
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge className="bg-emerald-500/10 text-emerald-600 border-none mb-3 px-3 py-1 font-bold">
            GESTION DES STOCKS
          </Badge>
          <h1 className="text-4xl font-black tracking-tight text-foreground">
            Stock Médicaments
          </h1>
          <p className="text-muted-foreground font-medium mt-1 uppercase text-sm tracking-widest">
            {filteredMedications.length} médicament{filteredMedications.length > 1 ? 's' : ''} trouvé{filteredMedications.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowMedicationForm(true)}
            className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau médicament
          </Button>
          <Button
            onClick={handlePrintInventory}
            variant="outline"
            className="rounded-xl font-bold border-2"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimer le stock
          </Button>
          <Button
            onClick={loadInventory}
            variant="outline"
            size="sm"
            className="rounded-xl font-bold border-2"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* ═══ STATS CARDS ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-card overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Total médicaments
                </p>
                <h3 className="text-3xl font-black text-foreground">{stats.total}</h3>
              </div>
              <div className="p-4 rounded-2xl bg-blue-500/10 text-primary">
                <Package size={28} strokeWidth={2.5} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Rupture de stock
                </p>
                <h3 className="text-3xl font-black text-red-600">{stats.outOfStock}</h3>
              </div>
              <div className="p-4 rounded-2xl bg-red-500/10 text-red-600">
                <XCircle size={28} strokeWidth={2.5} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Stock critique
                </p>
                <h3 className="text-3xl font-black text-orange-600">{stats.critical}</h3>
              </div>
              <div className="p-4 rounded-2xl bg-orange-500/10 text-orange-600">
                <AlertTriangle size={28} strokeWidth={2.5} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Stock bas
                </p>
                <h3 className="text-3xl font-black text-yellow-600">{stats.low}</h3>
              </div>
              <div className="p-4 rounded-2xl bg-yellow-500/10 text-yellow-600">
                <AlertCircle size={28} strokeWidth={2.5} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ ACHATS EN ATTENTE DE VALIDATION ═══ */}
      {pendingMovements.length > 0 && (
        <div className="animate-in slide-in-from-top-2 duration-300">
          <Card className="border-amber-500/30 shadow-md bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-600 animate-pulse">
                    <Clock size={28} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-amber-700 dark:text-amber-400 flex items-center gap-2">
                      <span>⏳ Achats en attente de validation</span>
                      <Badge className="bg-amber-500 text-white border-none">
                        {pendingMovements.length}
                      </Badge>
                    </h3>
                    <p className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-1">
                      {pendingMovements.reduce((sum, m) => sum + (m.quantityChange || 0), 0)} unités en attente - 
                      Stock non mis à jour tant que la finance n'a pas validé
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={loadPendingMovements}
                    className="rounded-xl font-bold border-amber-500/30 text-amber-700 hover:bg-amber-500/10"
                  >
                    <RefreshCw className={cn("w-4 h-4 mr-2", loadingPending && "animate-spin")} />
                    Actualiser
                  </Button>
                  <Button
                    onClick={() => navigate('/finance/depenses')}
                    className="rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Voir chez la Finance
                  </Button>
                </div>
              </div>
              
              {/* Liste détaillée des mouvements en attente */}
              <div className="mt-4 space-y-2">
                {pendingMovements.slice(0, 3).map((movement) => (
                  <div 
                    key={movement.id} 
                    className="flex items-center justify-between p-3 bg-white/50 dark:bg-black/20 rounded-xl border border-amber-500/20"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-amber-600" />
                      <div>
                        <p className="font-bold text-foreground">{movement.medication?.name || 'Médicament'}</p>
                        <p className="text-xs text-muted-foreground">
                          +{movement.quantityChange} unités • {movement.notes || 'Achat fournisseur'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-amber-500/50 text-amber-700">
                      En attente
                    </Badge>
                  </div>
                ))}
                {pendingMovements.length > 3 && (
                  <p className="text-center text-sm text-muted-foreground py-2">
                    +{pendingMovements.length - 3} autres mouvements en attente...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ FILTERS ═══ */}
      <Card className="border-none shadow-sm bg-card rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un médicament..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl border-muted bg-muted/20 focus:bg-background transition-all"
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {stockFilterOptions.map((filter) => (
              <Button
                key={filter.value}
                variant={stockFilter === filter.value ? "default" : "outline"}
                size="sm"
                onClick={() => setStockFilter(filter.value)}
                className={cn(
                  "rounded-xl font-bold",
                  stockFilter === filter.value && "border-none",
                  stockFilter === filter.value && {
                    backgroundColor: `${filter.color}15`,
                    color: filter.color
                  }
                )}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* ═══ MEDICATIONS GRID ═══ */}
      {filteredMedications.length === 0 ? (
        <Card className="border-none shadow-sm bg-card rounded-2xl">
          <CardContent className="py-24 text-center">
            <div className="inline-flex p-4 rounded-full bg-muted mb-4">
              <Package className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium italic">
              {searchQuery
                ? `Aucun résultat pour "${searchQuery}"`
                : 'Aucun médicament trouvé'}
            </p>
            <Button
              onClick={() => setShowMedicationForm(true)}
              className="mt-4 rounded-xl bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un médicament
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMedications.map((medication) => (
            <MedicationCard
              key={medication.id}
              medication={medication}
              onEdit={handleEditMedication}
              onStockUpdate={handleStockUpdate}
              onCheckStock={handleCheckStock}
            />
          ))}
        </div>
      )}

      {/* ═══ MOUVEMENT DE STOCK - FORMULAIRE PROFESSIONNEL ═══ */}
      {showStockModal && selectedMedication && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black">Mouvement de Stock</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedMedication.medicationName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Stock actuel</p>
                  <p className="text-2xl font-black text-primary">{selectedMedication.currentStock}</p>
                </div>
              </div>

              {/* Action: Ajout ou Retrait */}
              <div className="mb-4">
                <p className="text-xs font-black text-muted-foreground uppercase mb-2">
                  Action *
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStockAction('ADD')}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                      stockAction === 'ADD'
                        ? 'bg-emerald-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 inline mr-2" />
                    Ajout Stock (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockAction('REMOVE')}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                      stockAction === 'REMOVE'
                        ? 'bg-red-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4 inline mr-2" />
                    Retrait Stock (-)
                  </button>
                </div>
              </div>

              {/* Quantité */}
              <div className="mb-4">
                <p className="text-xs font-black text-muted-foreground uppercase mb-2">
                  Quantité *
                </p>
                <Input
                  type="number"
                  placeholder={stockAction === 'ADD' ? "Quantité à ajouter" : "Quantité à retirer"}
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="rounded-xl text-lg font-bold"
                  min="1"
                />
              </div>

              {/* Motif */}
              <div className="mb-4">
                <p className="text-xs font-black text-muted-foreground uppercase mb-2">
                  Motif *
                </p>
                <select
                  value={motif}
                  onChange={(e) => {
                    setMotif(e.target.value);
                    // Auto-coche achat si motif = ACHAT
                    setIsStockPurchase(e.target.value === 'ACHAT');
                  }}
                  className="w-full p-3 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="ACHAT">🛒 Achat Fournisseur</option>
                  <option value="INVENTAIRE">📋 Inventaire / Correction</option>
                  <option value="RETOUR">↩️ Retour fournisseur</option>
                  <option value="PERTE">⚠️ Perte / Cassé / Volé</option>
                  <option value="EXPIRE">🗑️ Expiration / Périmé</option>
                  <option value="AUTRE">❓ Autre</option>
                </select>
              </div>

              {/* Numéro de Lot + Date de péremption (sur la même ligne) */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-xs font-black text-muted-foreground uppercase mb-2">
                    N° Lot
                  </p>
                  <Input
                    type="text"
                    placeholder="N° Lot"
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <p className="text-xs font-black text-muted-foreground uppercase mb-2">
                    Date péremption
                  </p>
                  <Input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Valeur financière - calcul automatique */}
              {stockAction === 'ADD' && motif === 'ACHAT' && stockQuantity && (
                <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 rounded-xl border-2 border-amber-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
                    <p className="text-sm font-black text-amber-700 uppercase">
                      Workflow Validation Finance
                    </p>
                  </div>
                  
                  <p className="text-xs text-amber-600/80 mb-3">
                    ⚠️ Le stock <strong>ne sera pas mis à jour immédiatement</strong>. 
                    L'achat sera envoyé à la Finance pour validation. Le stock sera ajusté uniquement après validation.
                  </p>
                  
                  <div className="flex items-baseline gap-2 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                    <span className="text-2xl font-black text-foreground">
                      {(parseInt(stockQuantity || 0) * (selectedMedication.price || 0)).toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground font-bold">
                      = {stockQuantity} × {selectedMedication.price || 0} $USD
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-3 p-2 bg-amber-500/10 rounded-lg">
                    <ArrowRight className="w-4 h-4 text-amber-600" />
                    <p className="text-xs text-amber-700">
                      <strong>Prochaines étapes:</strong> 1. Soumission → 2. Validation Finance → 3. Mise à jour stock
                    </p>
                  </div>
                </div>
              )}

              {/* Section Finance - s'affiche uniquement si achat */}
              {motif === 'ACHAT' && stockAction === 'ADD' && (
                <div className="mb-4 p-4 bg-warning/10 rounded-xl border border-warning/30">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="w-5 h-5 text-warning" />
                    <p className="font-bold text-warning-foreground">Transmission Finance</p>
                  </div>

                  {/* Devise */}
                  <div className="mb-3">
                    <p className="text-xs font-black text-warning uppercase mb-2">
                      Devise d'achat *
                    </p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setPurchaseCurrency('USD')}
                        className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all text-sm ${
                          purchaseCurrency === 'USD'
                            ? 'bg-primary text-primary-foreground shadow-lg'
                            : 'bg-card text-foreground border border-border hover:bg-muted'
                        }`}
                      >
                        💵 USD ($)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPurchaseCurrency('CDF')}
                        className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all text-sm ${
                          purchaseCurrency === 'CDF'
                            ? 'bg-primary text-primary-foreground shadow-lg'
                            : 'bg-card text-foreground border border-border hover:bg-muted'
                        }`}
                      >
                        💰 CDF (FC)
                      </button>
                    </div>
                  </div>

                  {/* Fournisseur */}
                  <div className="mb-3">
                    <p className="text-xs font-black text-warning uppercase mb-2">
                      Fournisseur *
                    </p>
                    <Input
                      type="text"
                      placeholder="Nom du fournisseur"
                      value={purchaseSupplier}
                      onChange={(e) => setPurchaseSupplier(e.target.value)}
                      className="rounded-xl bg-card"
                    />
                  </div>

                  {/* Upload pièce justificative */}
                  <div className="mb-2">
                    <p className="text-xs font-black text-warning uppercase mb-2">
                      Pièce justificative (facture, bon de livraison)
                    </p>
                    <label className="flex items-center gap-3 p-3 bg-card rounded-xl border-2 border-dashed border-warning/50 cursor-pointer hover:bg-warning/10 transition-all">
                      <FileText className="w-5 h-5 text-warning" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-warning-foreground">
                          {justificatifFile ? justificatifFile.name : 'Cliquez pour ajouter une pièce'}
                        </p>
                        <p className="text-xs text-warning">
                          PDF, JPG, PNG (max 5MB)
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setJustificatifFile(e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                    {justificatifFile && (
                      <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Fichier sélectionné: {justificatifFile.name}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Boutons */}
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleConfirmStockUpdate}
                  className={`flex-1 rounded-xl font-bold ${
                    stockAction === 'ADD'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                  disabled={!stockQuantity || parseInt(stockQuantity) <= 0}
                >
                  {stockAction === 'ADD' ? (
                    <><Package className="w-4 h-4 mr-2" /> Confirmer l'ajout</>
                  ) : (
                    <><TrendingDown className="w-4 h-4 mr-2" /> Confirmer le retrait</>
                  )}
                </Button>
                <Button
                  onClick={() => setShowStockModal(false)}
                  variant="outline"
                  className="flex-1 rounded-xl"
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ MEDICATION FORM MODAL ═══ */}
      {showMedicationForm && (
        <MedicationForm
          medication={selectedMedication}  // Passe le médicament pour le mode édition
          onMedicationAdded={() => {
            setShowMedicationForm(false);
            setSelectedMedication(null);  // Réinitialise après l'ajout/modification
            loadInventory();
          }}
          onClose={() => {
            setShowMedicationForm(false);
            setSelectedMedication(null);  // Réinitialise à la fermeture
          }}
        />
      )}

      {/* ═══ DETAILS MODAL ═══ */}
      {showDetailsModal && selectedMedication && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl animate-in zoom-in-95 duration-300">
            <CardContent className="p-8">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    🔍 Détails du médicament
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    {selectedMedication.name || selectedMedication.medicationName || 'Non spécifié'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedMedication(null);
                  }}
                  className="text-muted-foreground hover:text-foreground text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Informations principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Code du médicament</p>
                    <p className="font-semibold">
                      {selectedMedication.medicationCode || selectedMedication.medication_code || 'Non spécifié'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Nom générique</p>
                    <p className="font-semibold">
                      {selectedMedication.genericName || selectedMedication.generic_name || selectedMedication.active_ingredient || 'Non spécifié'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Forme</p>
                    <p className="font-semibold">
                      {selectedMedication.form || selectedMedication.medicationForm || selectedMedication.medication_form || selectedMedication.dosage_form || 'Non spécifié'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Force</p>
                    <p className="font-semibold">
                      {selectedMedication.strength || selectedMedication.dosage || selectedMedication.concentration || selectedMedication.strength_dosage || 'Non spécifié'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Fournisseur</p>
                    <p className="font-semibold">
                      {selectedMedication.supplier || selectedMedication.supplier_name || selectedMedication.vendor || selectedMedication.provider || 'Non spécifié'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Fabricant</p>
                    <p className="font-semibold">
                      {selectedMedication.manufacturer || selectedMedication.manufacturer_name || selectedMedication.brand || selectedMedication.producer || 'Non spécifié'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Catégorie</p>
                    <p className="font-semibold">
                      {selectedMedication.category || selectedMedication.drug_category || selectedMedication.medicine_category || selectedMedication.type || 'Non spécifié'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Date d'achat</p>
                    <p className="font-semibold">
                      {selectedMedication.purchaseDate || selectedMedication.purchase_date || selectedMedication.date_added || 'Non spécifié'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Analyse des stocks */}
              <div className="bg-muted rounded-xl p-6 mb-6">
                <h3 className="text-lg font-bold text-foreground mb-4">📊 Analyse des stocks</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-primary mb-1">Stock actuel</p>
                    <p className="text-2xl font-bold text-foreground">
                      {selectedMedication.currentStock || selectedMedication.stockQuantity || selectedMedication.stock_quantity || 0}
                    </p>
                    <p className="text-xs text-primary">unités</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-primary mb-1">Stock minimum</p>
                    <p className="text-2xl font-bold text-foreground">
                      {selectedMedication.minimumStock || 10}
                    </p>
                    <p className="text-xs text-primary">unités</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-primary mb-1">Statut</p>
                    <p className="text-lg font-bold text-foreground">
                      {(() => {
                        const current = selectedMedication.currentStock || selectedMedication.stockQuantity || selectedMedication.stock_quantity || 0;
                        const minimum = selectedMedication.minimumStock || 10;
                        if (current <= 0) return 'RUPTURE';
                        if (current <= minimum * 0.5) return 'CRITIQUE';
                        if (current <= minimum) return 'BAS';
                        return 'OK';
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Analyse financière */}
              <div className="bg-green-50 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-bold text-green-800 mb-4">💰 Analyse financière</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-green-600 mb-1">Prix d'achat</p>
                    <p className="text-xl font-bold text-green-800">
                      ${selectedMedication.price || 0}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-green-600 mb-1">Prix de vente</p>
                    <p className="text-xl font-bold text-green-800">
                      ${selectedMedication.unitPrice || selectedMedication.unit_price || 0}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-green-600 mb-1">Bénéfice/unité</p>
                    <p className="text-xl font-bold text-green-800">
                      ${((selectedMedication.unitPrice || selectedMedication.unit_price || 0) - (selectedMedication.price || 0)).toFixed(2)}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-green-200">
                  <div className="text-center">
                    <p className="text-sm text-green-600 mb-1">Investissement total</p>
                    <p className="text-2xl font-bold text-green-800">
                      ${((selectedMedication.price || 0) * (selectedMedication.currentStock || selectedMedication.stockQuantity || selectedMedication.stock_quantity || 0)).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-green-600 mb-1">Valeur potentielle</p>
                    <p className="text-2xl font-bold text-green-800">
                      ${((selectedMedication.unitPrice || selectedMedication.unit_price || 0) * (selectedMedication.currentStock || selectedMedication.stockQuantity || selectedMedication.stock_quantity || 0)).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-2">📝 Description</h3>
                <p className="text-gray-700">
                  {selectedMedication.description || selectedMedication.details || selectedMedication.notes || selectedMedication.indications || 'Aucune description disponible'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PharmacyInventory;
