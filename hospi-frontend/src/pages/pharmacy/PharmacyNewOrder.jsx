import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  User,
  Package,
  DollarSign,
  FileText,
  Loader2,
  Save,
  X
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { 
  createOrder,
  getActiveSuppliers
} from '../../services/pharmacyApi/pharmacyApi.js';
import { patientService } from '../../services/patientService.js';
import { medicationAPI } from '../../api/medication.js';

/* =========================================
   PAGE NOUVELLE COMMANDE PHARMACIE
   ========================================= */
const PharmacyNewOrder = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Form states
  const [customerName, setCustomerName] = useState('');
  const [medicationSearch, setMedicationSearch] = useState('');
  const [medications, setMedications] = useState([]);
  const [loadingMedications, setLoadingMedications] = useState(false);
  
  const [orderItems, setOrderItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Search medications
  const searchMedicationsList = async (query) => {
    if (!query || query.length < 2) {
      setMedications([]);
      return;
    }
    try {
      setLoadingMedications(true);
      const response = await medicationAPI.getMedications();
      const allMedications = response?.data || response || [];
      const filtered = allMedications.filter(med => 
        med.name?.toLowerCase().includes(query.toLowerCase()) ||
        med.medicationCode?.toLowerCase().includes(query.toLowerCase())
      );
      setMedications(filtered);
    } catch (error) {
      console.error('Error searching medications:', error);
    } finally {
      setLoadingMedications(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => searchMedicationsList(medicationSearch), 300);
    return () => clearTimeout(timer);
  }, [medicationSearch]);

  // Add medication to order
  const addMedication = (medication) => {
    const existingItem = orderItems.find(item => item.medicationId === medication.id);
    if (existingItem) {
      toast.info('Ce médicament est déjà dans la commande');
      return;
    }
    
    const newItem = {
      medicationId: medication.id,
      medicationName: medication.name,
      medicationCode: medication.medicationCode,
      quantity: 1,
      unitPrice: medication.unitPrice || medication.price || 0,
      stockQuantity: medication.stockQuantity || 0,
      dosage: medication.dosage || '',
      totalPrice: (medication.unitPrice || medication.price || 0) * 1
    };
    
    setOrderItems([...orderItems, newItem]);
    setMedicationSearch('');
    setMedications([]);
    toast.success(`${medication.name} ajouté à la commande`);
  };

  // Update item quantity
  const updateQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    const updatedItems = [...orderItems];
    updatedItems[index].quantity = newQuantity;
    updatedItems[index].totalPrice = newQuantity * updatedItems[index].unitPrice;
    setOrderItems(updatedItems);
  };

  // Remove item
  const removeItem = (index) => {
    const updatedItems = orderItems.filter((_, i) => i !== index);
    setOrderItems(updatedItems);
  };

  // Calculate total
  const totalAmount = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);

  // Submit order
  const handleSubmit = async () => {
    if (!customerName.trim()) {
      toast.error('Veuillez entrer le nom du client');
      return;
    }
    if (orderItems.length === 0) {
      toast.error('Veuillez ajouter au moins un médicament');
      return;
    }

    try {
      setSubmitting(true);
      
      const orderData = {
        customerName: customerName.trim(),
        orderType: 'VENTE_DIRECTE',
        items: orderItems.map(item => ({
          medicationId: item.medicationId,
          medicationName: item.medicationName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          dosage: item.dosage
        })),
        totalAmount: totalAmount,
        notes: notes,
        status: 'EN_ATTENTE'
      };

      console.log('🔴 [FRONTEND] Envoi orderData:', JSON.stringify(orderData, null, 2));
      console.log('🔴 [FRONTEND] customerName value:', customerName, '| trimmed:', customerName.trim());

      await createOrder(orderData);
      toast.success('Commande créée avec succès !');
      navigate('/pharmacy/orders');
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Erreur lors de la création de la commande');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ======== HEADER ======== */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/pharmacy/orders')}
          className="rounded-xl"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
        <div>
          <Badge className="bg-blue-500/10 text-blue-600 border-none mb-2 px-3 py-1 font-bold">
            NOUVELLE COMMANDE
          </Badge>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Créer une commande
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ======== LEFT COLUMN: Patient & Medications ======== */}
        <div className="space-y-6">
          {/* Customer Name Input - OBLIGATOIRE */}
          <Card className="border-none shadow-sm bg-card rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Nom du client <span className="text-red-500">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nom du client (obligatoire)..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="pl-10 rounded-xl border-blue-300"
                  required
                />
              </div>
              {!customerName.trim() && (
                <p className="text-xs text-red-500 mt-2">Le nom du client est obligatoire</p>
              )}
            </CardContent>
          </Card>

          {/* Medication Selection */}
          <Card className="border-none shadow-sm bg-card rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                Ajouter des médicaments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un médicament..."
                  value={medicationSearch}
                  onChange={(e) => setMedicationSearch(e.target.value)}
                  className="pl-10 rounded-xl"
                />
                
                {/* Medication search results */}
                {medications.length > 0 && (
                  <Card className="absolute top-full left-0 right-0 mt-2 z-40 border-none shadow-lg">
                    <CardContent className="p-2 max-h-60 overflow-y-auto">
                      {medications.map((med) => (
                        <button
                          key={med.id}
                          onClick={() => addMedication(med)}
                          className="w-full p-3 text-left hover:bg-muted rounded-xl transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-sm text-foreground">{med.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Stock: {med.stockQuantity} | Prix: ${med.unitPrice || med.price || 0}
                              </p>
                            </div>
                            <Plus className="w-4 h-4 text-emerald-600" />
                          </div>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                )}
                
                {loadingMedications && (
                  <div className="absolute top-full left-0 right-0 mt-2">
                    <Skeleton className="h-12 rounded-xl" />
                  </div>
                )}
              </div>

              {/* Added items list */}
              {orderItems.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-sm font-bold text-muted-foreground uppercase">
                    Médicaments ajoutés ({orderItems.length})
                  </p>
                  {orderItems.map((item, index) => (
                    <div 
                      key={index} 
                      className="p-3 bg-muted/30 rounded-xl flex items-center gap-3"
                    >
                      <div className="flex-1">
                        <p className="font-bold text-sm text-foreground">{item.medicationName}</p>
                        <p className="text-xs text-muted-foreground">
                          ${item.unitPrice.toFixed(2)} / unité
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(index, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="w-7 h-7 p-0 rounded"
                          >
                            -
                          </Button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                            className="w-16 h-8 text-center text-sm font-bold"
                            min="1"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(index, item.quantity + 1)}
                            className="w-7 h-7 p-0 rounded"
                          >
                            +
                          </Button>
                        </div>
                        <p className="text-sm font-bold text-foreground w-20 text-right">
                          ${item.totalPrice.toFixed(2)}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ======== RIGHT COLUMN: Summary & Notes ======== */}
        <div className="space-y-6">
          {/* Order Summary */}
          <Card className="border-none shadow-sm bg-card rounded-2xl sticky top-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-600" />
                Récapitulatif
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Customer info */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-xs font-bold text-blue-600 uppercase mb-1">Client</p>
                <p className="font-bold text-blue-800">
                  {customerName.trim() || '⚠️ Nom requis'}
                </p>
              </div>

              {/* Items count */}
              <div className="p-4 bg-muted/30 rounded-xl">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Articles</p>
                <p className="font-bold text-foreground">
                  {orderItems.length} médicament{orderItems.length > 1 ? 's' : ''}
                </p>
              </div>

              {/* Total */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-emerald-700">Total à payer</p>
                  <p className="text-2xl font-black text-emerald-600">
                    ${totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notes (optionnel)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Instructions spéciales, allergies, etc."
                  className="w-full min-h-[100px] p-3 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Submit buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/pharmacy/orders')}
                  className="flex-1 rounded-xl font-bold"
                  disabled={submitting}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !customerName.trim() || orderItems.length === 0}
                  className="flex-1 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Créer la commande
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PharmacyNewOrder;
