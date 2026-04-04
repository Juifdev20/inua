import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  X, 
  Trash2, 
  Plus, 
  AlertCircle, 
  Package,
  DollarSign,
  FileText,
  User,
  Calendar,
  Printer
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  validatePrescription, 
  removePrescriptionItem,
  updatePrescriptionItem 
} from '../../services/pharmacyApi/pharmacyApi.js';

const PrescriptionValidationModal = ({ 
  prescription, 
  isOpen, 
  onClose, 
  onValidationComplete 
}) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [removingItemId, setRemovingItemId] = useState(null);
  const [showRemoveReason, setShowRemoveReason] = useState(false);
  const [removeReason, setRemoveReason] = useState('');
  const [selectedItemId, setSelectedItemId] = useState(null);

  // Initialiser les items quand la prescription change
  useEffect(() => {
    if (prescription?.items) {
      setItems(prescription.items.map(item => {
        // Calculer la quantité initiale: quantityPerDose * frequency * duration
        let calculatedQuantity = item.quantity || 0;
        
        if (item.quantityPerDose && item.frequency && item.duration) {
          // Extraire les nombres de frequency et duration
          const frequencyNum = parseInt(item.frequency) || 1;
          const durationNum = parseInt(item.duration) || 1;
          calculatedQuantity = item.quantityPerDose * frequencyNum * durationNum;
        }
        
        return {
          ...item,
          stockQuantity: item.stockQuantity || 0,
          unitPrice: item.unitPrice || 0,
          quantity: calculatedQuantity,
          subtotal: calculatedQuantity * (item.unitPrice || 0)
        };
      }));
    }
  }, [prescription]);

  // Calculer le total en temps réel
  useEffect(() => {
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
    setTotalAmount(total);
  }, [items]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePrintPrescription = () => {
    const printContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
          <h1 style="margin: 0; color: #333; font-size: 24px;">ORDONNANCE MÉDICALE</h1>
          <p style="margin: 5px 0; color: #666;">Hôpital Inua Afia</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <p><strong>Patient:</strong> ${prescription?.patientName || 'N/A'}</p>
          <p><strong>Docteur:</strong> ${prescription?.doctorName || 'N/A'}</p>
          <p><strong>Date:</strong> ${prescription?.createdAt ? formatDate(prescription.createdAt) : 'N/A'}</p>
          <p><strong>Code Prescription:</strong> ${prescription?.prescriptionCode || 'N/A'}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px;">Médicaments Prescrits:</h3>
          ${items.map(item => `
            <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #eee; border-radius: 5px;">
              <p><strong>${item.medicationName}</strong></p>
              <p style="margin: 2px 0;">Posologie: ${item.dosage || 'N/A'}</p>
              <p style="margin: 2px 0;">Fréquence: ${item.frequency || 'N/A'}</p>
              <p style="margin: 2px 0;">Durée: ${item.duration || 'N/A'}</p>
              <p style="margin: 2px 0;">Quantité: ${item.quantity || 0}</p>
              ${item.quantityPerDose ? `<p style="margin: 2px 0;">Quantité par prise: ${item.quantityPerDose}</p>` : ''}
              ${item.instructions ? `<p style="margin: 2px 0; font-style: italic;">Instructions: ${item.instructions}</p>` : ''}
            </div>
          `).join('')}
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
  };

  const handleRemoveItem = (itemId) => {
    setSelectedItemId(itemId);
    setShowRemoveReason(true);
    setRemoveReason('');
  };

  const confirmRemoveItem = async () => {
    if (!removeReason.trim()) {
      toast.error('Veuillez spécifier un motif de suppression');
      return;
    }

    try {
      setRemovingItemId(selectedItemId);
      await removePrescriptionItem(selectedItemId, { reason: removeReason });
      
      setItems(items.filter(item => item.id !== selectedItemId));
      toast.success('Médicament retiré de la prescription');
      
      setShowRemoveReason(false);
      setRemoveReason('');
      setSelectedItemId(null);
    } catch (error) {
      console.error('Erreur suppression item:', error);
      toast.error('Erreur lors de la suppression du médicament');
    } finally {
      setRemovingItemId(null);
    }
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity < 0) return;
    
    setItems(items.map(item => {
      if (item.id === itemId) {
        const updatedItem = {
          ...item,
          quantity: newQuantity,
          subtotal: newQuantity * item.unitPrice
        };
        return updatedItem;
      }
      return item;
    }));
  };

  const handleValidatePrescription = async () => {
    if (items.length === 0) {
      toast.error('La prescription ne contient aucun médicament');
      return;
    }

    // Vérifier que les médicaments ont des prix
    const itemsSansPrix = items.filter(item => !item.unitPrice || item.unitPrice === 0);
    if (itemsSansPrix.length > 0) {
      toast.error(`Certains médicaments n'ont pas de prix: ${itemsSansPrix.map(i => i.medicationName).join(', ')}`);
      return;
    }

    try {
      setLoading(true);
      
      console.log('🔍 [VALIDATION] Validation prescription:', prescription.id);
      console.log('🔍 [VALIDATION] Items:', items.map(i => ({ id: i.id, name: i.medicationName, qty: i.quantity, price: i.unitPrice })));
      console.log('🔍 [VALIDATION] Total:', totalAmount);
      
      // 1. Valider la prescription
      const response = await validatePrescription(prescription.id, {
        items: items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })),
        totalAmount
      });

      console.log('🔍 [VALIDATION] Réponse:', response.data);

      // Vérifier si la facture a été créée
      if (!response.data.success) {
        toast.error(response.data.message || 'Erreur lors de la création de la facture');
        return;
      }

      if (!response.data.invoice) {
        toast.error('La facture n\'a pas été créée. Vérifiez les logs backend.');
        return;
      }

      toast.success(`Facture ${response.data.invoice.invoiceCode} créée avec succès!`);

      onValidationComplete?.(response.data);
      onClose();
    } catch (error) {
      console.error('❌ [VALIDATION] Erreur:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Erreur inconnue';
      toast.error(`Erreur: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (item) => {
    if (item.stockQuantity >= item.quantity) {
      return { color: 'text-green-600', label: 'Disponible', bgColor: 'bg-green-100' };
    } else if (item.stockQuantity > 0) {
      return { color: 'text-amber-600', label: 'Stock partiel', bgColor: 'bg-amber-100' };
    } else {
      return { color: 'text-red-600', label: 'Rupture', bgColor: 'bg-red-100' };
    }
  };

  if (!isOpen || !prescription) return null;

  const isAlreadyPaid = prescription?.status === 'PAYEE' || prescription?.status === 'VALIDEE';

  const isAlreadyPaidMessage = prescription?.status === 'PAYEE' 
    ? 'Cette prescription a déjà été payée. Elle ne peut pas être validée à nouveau.'
    : prescription?.status === 'VALIDEE' 
    ? 'Cette prescription a déjà été validée et envoyée à la caisse.'
    : '';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-card border border-border w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Badge className="bg-blue-500/10 text-blue-600 border-none px-2 py-1 font-bold text-xs">
                {prescription.prescriptionCode || `PR-${prescription.id}`}
              </Badge>
              <Badge className="bg-emerald-500/10 text-emerald-600 border-none px-2 py-1 font-bold text-xs">
                {prescription.status}
              </Badge>
            </div>
            <h3 className="text-xl font-black tracking-tighter uppercase text-foreground mb-1">
              Validation Prescription
            </h3>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>Dr. {prescription.doctorName || 'Non spécifié'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(prescription.createdAt)}</span>
              </div>
              {prescription.patientName && (
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>Pat: {prescription.patientName}</span>
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Notes */}
          {prescription.notes && (
            <Card className="mb-6 border-none shadow-sm bg-muted/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Notes médicales</p>
                    <p className="text-sm text-foreground">{prescription.notes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Liste des médicaments */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black uppercase tracking-wider text-foreground">
                Médicaments Prescrits ({items.length})
              </h4>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Stock disponible</span>
              </div>
            </div>

            {items.length === 0 ? (
              <Card className="border-none shadow-sm bg-card">
                <CardContent className="py-8 text-center">
                  <AlertCircle className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">
                    Aucun médicament dans cette prescription
                  </p>
                </CardContent>
              </Card>
            ) : (
              items.map((item) => {
                const stockStatus = getStockStatus(item);
                return (
                  <Card key={item.id} className="border-none shadow-sm bg-card">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Info médicament */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-bold text-foreground">{item.medicationName}</h5>
                            <Badge className={`text-xs ${stockStatus.bgColor} ${stockStatus.color} border-none`}>
                              {stockStatus.label}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                            <div>
                              <span className="text-muted-foreground">Dosage:</span>
                              <p className="font-bold text-foreground">{item.dosage || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Fréquence:</span>
                              <p className="font-bold text-foreground">{item.frequency || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Durée:</span>
                              <p className="font-bold text-foreground">{item.duration || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Qté/prise:</span>
                              <p className="font-bold text-foreground">{item.quantityPerDose || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Stock:</span>
                              <p className="font-bold text-foreground">{item.stockQuantity} unités</p>
                            </div>
                          </div>
                        </div>

                        {/* Contrôles */}
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col items-end gap-1">
                            <label className="text-xs text-muted-foreground">Quantité</label>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                className="w-6 h-6 p-0 rounded"
                              >
                                -
                              </Button>
                              <Input
                                type="number"
                                value={item.quantity || 0}
                                onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                                className="w-16 h-8 text-center text-xs font-bold"
                                min="1"
                                max={item.stockQuantity}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                disabled={item.quantity >= item.stockQuantity}
                                className="w-6 h-6 p-0 rounded"
                              >
                                +
                              </Button>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={removingItemId === item.id}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Sous-total */}
                      <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
                        <div>
                          <span className="text-xs text-muted-foreground">Sous-total</span>
                          <p className="text-xs text-muted-foreground">{item.unitPrice.toFixed(2)} $ / unité</p>
                        </div>
                        <span className="text-sm font-bold text-foreground">
                          {item.subtotal.toFixed(2)} $
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Footer avec total */}
        <div className="p-6 border-t border-border bg-muted/20">
          {isAlreadyPaid && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span className="text-sm text-amber-700">{isAlreadyPaidMessage}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              <span className="text-sm text-muted-foreground">Total à payer:</span>
            </div>
            <span className="text-2xl font-black text-emerald-600">
              {totalAmount.toFixed(2)} $
            </span>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-xl font-bold"
            >
              Annuler
            </Button>
            <Button
              variant="outline"
              onClick={handlePrintPrescription}
              className="rounded-xl font-bold"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimer
            </Button>
            <Button
              onClick={handleValidatePrescription}
              disabled={loading || items.length === 0 || isAlreadyPaid}
              className="flex-1 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Validation...' : isAlreadyPaid ? 'Déjà validée' : 'Valider la prescription'}
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de motif de suppression */}
      {showRemoveReason && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <Card className="w-full max-w-md border-none shadow-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-black">Motif de suppression</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Pourquoi ce médicament est-il retiré de la prescription ?
              </p>
              
              <div className="space-y-2">
                {[
                  { value: 'REFUS_PATIENT', label: 'Refus du patient' },
                  { value: 'RUPTURE_STOCK', label: 'Rupture de stock' },
                  { value: 'EFFET_SECONDAIRE', label: 'Effet secondaire' },
                  { value: 'INTERACTION', label: 'Interaction médicamenteuse' },
                  { value: 'AUTRE', label: 'Autre' }
                ].map((reason) => (
                  <label key={reason.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="removeReason"
                      value={reason.value}
                      checked={removeReason === reason.value}
                      onChange={(e) => setRemoveReason(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{reason.label}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowRemoveReason(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={confirmRemoveItem}
                  disabled={!removeReason || removingItemId}
                  className="flex-1 bg-red-500 hover:bg-red-600"
                >
                  {removingItemId ? 'Suppression...' : 'Confirmer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PrescriptionValidationModal;
