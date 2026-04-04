import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  User,
  Calendar,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Eye,
  ShoppingCart,
  Filter,
  Search,
  Printer
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { 
  getPendingPrescriptions, 
  convertPrescriptionToOrder,
  getPrescriptionById
} from '../../services/pharmacyApi/pharmacyApi.js';
import PrescriptionValidationModal from '../../components/modals/PrescriptionValidationModal.jsx';

/* ═══════════════════════════════════════════
   COMPOSANT PRESCRIPTION CARD
   ═══════════════════════════════════════════ */
const PrescriptionCard = ({ prescription, onView, onConvert, onPrint, loading }) => {
  console.log('🔍 [CARD DEBUG] Rendu de PrescriptionCard pour:', prescription);
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'EN_ATTENTE': { color: '#F59E0B', label: 'En attente' },
      'VALIDEE': { color: '#10B981', label: 'Validée' },
      'DELIVREE': { color: '#8B5CF6', label: 'Délivrée' },
      'PARTIELLEMENT_DELIVREE': { color: '#3B82F6', label: 'Partiellement délivrée' },
      'ANNULEE': { color: '#EF4444', label: 'Annulée' }
    };
    
    const config = statusMap[status] || { color: '#6B7280', label: status };
    return (
      <Badge 
        className="px-3 py-1 font-bold border-0"
        style={{ backgroundColor: config.color + '20', color: config.color }}
      >
        {config.label}
      </Badge>
    );
  };

  return (
    <Card className="border-none shadow-sm bg-card hover:shadow-md transition-all duration-200 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-1 mb-2 flex-wrap">
              <Badge className="bg-blue-500/10 text-blue-600 border-none px-1 py-0.5 font-bold text-xs">
                {prescription.prescriptionCode || `PR-${prescription.id}`}
              </Badge>
              {getStatusBadge(prescription.status)}
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                <User className="w-3 h-3 flex-shrink-0" />
                <span className="font-medium truncate">
                  Dr. {prescription.doctorName || 'Non spécifié'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{formatDate(prescription.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <FileText className="w-3 h-3 flex-shrink-0" />
                <span>{prescription.items?.length || 0} méd.</span>
              </div>
              {prescription.patientName && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                  <User className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">Pat: {prescription.patientName}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 px-3 pb-3">
        {prescription.notes && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
            {prescription.notes}
          </p>
        )}
        
        <div className="flex flex-col gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(prescription.id)}
            className="rounded-lg font-bold border-2 w-full h-7 text-xs"
          >
            <Eye className="w-3 h-3 mr-1" />
            Voir
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPrint(prescription.id)}
            className="rounded-lg font-bold border-2 w-full h-7 text-xs"
          >
            <Printer className="w-3 h-3 mr-1" />
            Imprimer
          </Button>
          
          {prescription.status === 'EN_ATTENTE' && (
            <Button
              size="sm"
              onClick={() => onConvert(prescription.id)}
              disabled={loading}
              className="rounded-lg font-bold bg-emerald-600 hover:bg-emerald-700 w-full h-7 text-xs"
            >
              {loading ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <ShoppingCart className="w-3 h-3 mr-1" />
              )}
              Convertir
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/* ═══════════════════════════════════════════
   PAGE PRESCRIPTIONS PHARMACIE
   ═══════════════════════════════════════════ */
const PharmacyPrescriptions = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [loadingPrescription, setLoadingPrescription] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // ========================================
  // CHARGEMENT DES DONNÉES
  // ========================================
  const loadPrescriptions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getPendingPrescriptions();
      
      console.log('🔍 [DEBUG] Structure complète de la réponse:', response);
      console.log('🔍 [DEBUG] response.data:', response.data);
      console.log('🔍 [DEBUG] response.data.data:', response.data?.data);
      console.log('🔍 [DEBUG] Type de response.data:', typeof response.data);
      console.log('🔍 [DEBUG] Est un tableau?', Array.isArray(response.data));
      
      if (response.data && response.data.data) {
        console.log('🔍 [DEBUG] Utilisation de response.data.data');
        setPrescriptions(response.data.data);
      } else {
        console.log('🔍 [DEBUG] Utilisation de response.data directement');
        console.log('🔍 [DEBUG] Contenu du tableau response.data:', response.data);
        console.log('🔍 [DEBUG] Premier élément du tableau:', response.data[0]);
        console.log('🔍 [DEBUG] Deuxième élément du tableau:', response.data[1]);
        setPrescriptions(response.data || []);
      }
      
      console.log('🔍 [DEBUG] Prescriptions finales:', prescriptions);
    } catch (error) {
      console.error('Erreur chargement prescriptions:', error);
      toast.error('Erreur lors du chargement des prescriptions', {
        description: 'Veuillez vérifier votre connexion au serveur'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  // 🔍 DEBUG: Surveiller les changements de l'état prescriptions
  useEffect(() => {
    console.log('🔍 [DEBUG] L\'état prescriptions a changé:', prescriptions);
    console.log('🔍 [DEBUG] Nombre de prescriptions:', prescriptions.length);
  }, [prescriptions]);

  // ========================================
  // HANDLERS
  // ========================================
  const handleViewPrescription = async (prescriptionId) => {
    try {
      setLoadingPrescription(true);
      const response = await getPrescriptionById(prescriptionId);
      setSelectedPrescription(response.data);
      setShowValidationModal(true);
    } catch (error) {
      console.error('Erreur chargement prescription:', error);
      toast.error('Erreur lors du chargement de la prescription');
    } finally {
      setLoadingPrescription(false);
    }
  };

  const handlePrintPrescription = async (prescriptionId) => {
    try {
      setLoadingPrescription(true);
      const response = await getPrescriptionById(prescriptionId);
      const prescription = response.data;
      
      const printContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
            <h1 style="margin: 0; color: #333; font-size: 24px;">ORDONNANCE MÉDICALE</h1>
            <p style="margin: 5px 0; color: #666;">Hôpital Inua Afia</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <p><strong>Patient:</strong> ${prescription?.patientName || 'N/A'}</p>
            <p><strong>Docteur:</strong> ${prescription?.doctorName || 'N/A'}</p>
            <p><strong>Date:</strong> ${prescription?.createdAt ? new Date(prescription.createdAt).toLocaleDateString('fr-FR') : 'N/A'}</p>
            <p><strong>Code Prescription:</strong> ${prescription?.prescriptionCode || 'N/A'}</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px;">Médicaments Prescrits:</h3>
            ${prescription?.items?.map(item => `
              <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #eee; border-radius: 5px;">
                <p><strong>${item.medicationName}</strong></p>
                <p style="margin: 2px 0;">Posologie: ${item.dosage || 'N/A'}</p>
                <p style="margin: 2px 0;">Fréquence: ${item.frequency || 'N/A'}</p>
                <p style="margin: 2px 0;">Durée: ${item.duration || 'N/A'}</p>
                <p style="margin: 2px 0;">Quantité: ${item.quantity || 0}</p>
                ${item.quantityPerDose ? `<p style="margin: 2px 0;">Quantité par prise: ${item.quantityPerDose}</p>` : ''}
                ${item.instructions ? `<p style="margin: 2px 0; font-style: italic;">Instructions: ${item.instructions}</p>` : ''}
              </div>
            `).join('') || '<p>Aucun médicament</p>'}
          </div>
          
          ${prescription?.notes ? `
            <div style="margin-bottom: 20px;">
              <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px;">Notes:</h3>
              <p>${prescription.notes}</p>
            </div>
          ` : ''}
          
          <div style="margin-top: 40px; text-align: center;">
            <p style="color: #666; font-size: 12px;">Signature et cachet du médecin</p>
            <div style="margin-top: 30px; border-top: 1px solid #ccc; width: 200px; margin-left: auto; margin-right: auto;">
              <p style="color: #666;">${prescription?.doctorName || 'Médecin'}</p>
            </div>
          </div>
        </div>
      `;
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Prescription - ${prescription?.prescriptionCode || 'N/A'}</title>
            <style>
              body { margin: 0; padding: 0; }
              @media print {
                body { margin: 0; padding: 0; }
              }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
      
      toast.success('Impression lancée avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'impression:', error);
      toast.error('Erreur lors de l\'impression de la prescription');
    } finally {
      setLoadingPrescription(false);
    }
  };

  const handleValidationComplete = (validatedPrescription) => {
    // Recharger la liste des prescriptions
    loadPrescriptions();
    setShowValidationModal(false);
    setSelectedPrescription(null);
    
    // Afficher le message de succès avec numéro de facture
    if (validatedPrescription?.invoice?.invoiceCode) {
      toast.success(`Facture n°${validatedPrescription.invoice.invoiceCode} envoyée à la caisse`, {
        duration: 5000,
        icon: '🧾',
        description: 'Le patient peut procéder au paiement à la caisse pharmacie'
      });
      
      // Redirection optionnelle vers la caisse
      setTimeout(() => {
        navigate('/finance/caisse-pharmacie');
      }, 2000);
    } else {
      toast.success('Prescription validée avec succès');
    }
  };

  const handleCloseModal = () => {
    setShowValidationModal(false);
    setSelectedPrescription(null);
  };

  const handleConvertToOrder = async (prescriptionId) => {
    try {
      setConverting(prescriptionId);
      const response = await convertPrescriptionToOrder(prescriptionId);
      
      toast.success('Prescription convertie avec succès', {
        description: 'La prescription a été transformée en commande pharmacie'
      });
      
      // Rediriger vers la commande créée
      if (response.data?.data?.id) {
        navigate(`/pharmacy/orders/${response.data.data.id}`);
      } else {
        // Recharger la liste si pas de redirection
        loadPrescriptions();
      }
    } catch (error) {
      console.error('Erreur conversion prescription:', error);
      if (error.response?.status === 501) {
        toast.error('Fonctionnalité non implémentée', {
          description: 'La conversion de prescriptions sera bientôt disponible'
        });
      } else {
        toast.error('Erreur lors de la conversion', {
          description: error.response?.data?.message || 'Une erreur est survenue'
        });
      }
    } finally {
      setConverting(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPrescriptions();
  };

  // ========================================
  // FILTRAGE
  // ========================================
  const statusFilters = [
    { key: 'ALL', label: 'Toutes', color: '#6B7280' },
    { key: 'EN_ATTENTE', label: 'En attente', color: '#F59E0B' },
    { key: 'VALIDEE', label: 'Validées', color: '#10B981' },
    { key: 'PAYEE', label: 'Payées', color: '#3B82F6' },
    { key: 'PARTIELLEMENT_DELIVREE', label: 'Partielles', color: '#8B5CF6' },
  ];

  const filteredPrescriptions = prescriptions.filter(prescription => {
    const codeMatch = (prescription.prescriptionCode || `PR-${prescription.id}`).toLowerCase().includes(searchQuery.toLowerCase());
    const doctorMatch = (prescription.doctorName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const patientMatch = (prescription.patientName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const statusMatch = statusFilter === 'ALL' || prescription.status === statusFilter;
    
    return (codeMatch || doctorMatch || patientMatch) && statusMatch;
  });
  
  console.log('🔍 [FILTER DEBUG] prescriptions originales:', prescriptions.length);
  console.log('🔍 [FILTER DEBUG] searchQuery:', searchQuery);
  console.log('🔍 [FILTER DEBUG] filteredPrescriptions:', filteredPrescriptions.length);

  // ========================================
  // RENDU PRINCIPAL
  // ========================================
  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-foreground">
              Prescriptions Médicales
            </h1>
            <p className="text-muted-foreground font-medium mt-1">
              Chargement des prescriptions en attente...
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="border-none shadow-sm bg-card">
              <CardHeader>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full mb-4" />
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-32" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-full overflow-hidden">
      {/* ======== HEADER ======== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge className="bg-blue-500/10 text-blue-600 border-none mb-3 px-3 py-1 font-bold">
            PRESCRIPTIONS
          </Badge>
          <h1 className="text-4xl font-black tracking-tight text-foreground">
            Prescriptions Médicales
          </h1>
          <p className="text-muted-foreground font-medium mt-1 uppercase text-sm tracking-widest">
            {prescriptions.length} prescription{prescriptions.length > 1 ? 's' : ''} en attente
          </p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une prescription..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-muted bg-muted/20 focus:bg-background transition-all w-64"
            />
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-xl font-bold border-2"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* ======== STATUS FILTER TABS ======== */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => {
          const count = filter.key === 'ALL' 
            ? prescriptions.length 
            : prescriptions.filter(p => p.status === filter.key).length;
          const isActive = statusFilter === filter.key;
          
          return (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 border-2",
                isActive 
                  ? "text-white border-transparent" 
                  : "bg-muted/30 text-muted-foreground border-muted hover:bg-muted/50"
              )}
              style={{
                backgroundColor: isActive ? filter.color : undefined,
              }}
            >
              {filter.label} ({count})
            </button>
          );
        })}
      </div>

      {/* ======== PRESCRIPTIONS GRID ======== */}
      {filteredPrescriptions.length === 0 ? (
        <Card className="border-none shadow-sm bg-card rounded-2xl">
          <CardContent className="py-24 text-center">
            <div className="inline-flex p-4 rounded-full bg-muted mb-4">
              <FileText className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium italic">
              {searchQuery
                ? `Aucun résultat pour "${searchQuery}"`
                : prescriptions.length === 0
                ? 'Aucune prescription en attente'
                : 'Aucune prescription trouvée'}
            </p>
            {prescriptions.length === 0 && !searchQuery && (
              <p className="text-sm text-muted-foreground mt-2">
                Les prescriptions envoyées par les docteurs apparaîtront ici
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          {filteredPrescriptions.map((prescription) => (
            <PrescriptionCard
              key={prescription.id}
              prescription={prescription}
              onView={handleViewPrescription}
              onConvert={handleConvertToOrder}
              onPrint={handlePrintPrescription}
              loading={converting === prescription.id}
            />
          ))}
        </div>
      )}

      {/* Modal de validation */}
      <PrescriptionValidationModal
        prescription={selectedPrescription}
        isOpen={showValidationModal}
        onClose={handleCloseModal}
        onValidationComplete={handleValidationComplete}
      />
    </div>
  );
};

export default PharmacyPrescriptions;
