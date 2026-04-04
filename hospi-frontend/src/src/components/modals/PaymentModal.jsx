import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, CreditCard, Banknote, Smartphone, Check } from 'lucide-react';
import api from '../../services/api';  // 👈 Import de l'API générale
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';  // 👈 Pour notifications

// 👈 HARDCODE: API string (du CaisseLaboratoire) pour éviter l'import
const API = "http://localhost:8080/api/v1/finance";

// 👈 DUPLIQUÉ: Fonction formatCurrency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0
  }).format(amount || 0);
};

const PaymentModal = ({ invoice, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [selectedMethod, setSelectedMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);

  // 👈 LOG POUR DÉBOGAGE
  console.log('Props in PaymentModal:', invoice);

  const paymentMethods = [
    { id: 'cash', label: t('finance.payment.cash'), icon: Banknote },
    { id: 'card', label: t('finance.payment.card'), icon: CreditCard },
    { id: 'mobile', label: t('finance.payment.mobile'), icon: Smartphone }
  ];

  const handleConfirm = async () => {
    try {
      setProcessing(true);

      // 👈 CORRECTION: Mapping vers valeurs enum backend (ajustez si différent)
      let backendMethod;
      switch (selectedMethod) {
        case 'cash':
          backendMethod = 'ESPECES';  // Probablement 'ESPECES' pour cash
          break;
        case 'card':
          backendMethod = 'CARTE';  // Ou 'CARTE_BANCAIRE'
          break;
        case 'mobile':
          backendMethod = 'MOBILE';  // Ou 'MOBILE_MONEY'
          break;
        default:
          throw new Error('Méthode de paiement invalide');
      }

      // 👈 Appel API avec la valeur mappée
      const response = await api.post(`${API}/pay/${invoice.id}`, { 
        paymentMethod: backendMethod
      });
      toast.success('Paiement validé avec succès !');
      onSuccess();  // Refresh auto
    } catch (error) {
      console.error('Payment error:', error);
      // 👈 Meilleure gestion d'erreur: Extrait le message backend
      const errorMsg = error.response?.data?.error || 'Vérifiez la connexion ou les données';
      toast.error(`Erreur lors du paiement: ${errorMsg}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <Card className="relative z-10 w-full max-w-2xl rounded-[32px] max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-black uppercase italic">
              {t('finance.payment.confirm')}
            </CardTitle>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-accent"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Invoice Details */}
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">N° Facture</span>
              <span className="font-bold">{invoice.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Patient</span>
              <span className="font-bold">{invoice.patientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="font-bold">{invoice.type}</span>
            </div>
          </div>

          {/* Services Breakdown */}
          <div className="border-t border-b border-border py-4 space-y-2">
            <h4 className="font-bold mb-3">Détail des services :</h4>
            {(invoice.adjustedExams || invoice.services || []).map((service, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{service.serviceName || service.name}</span>
                <span className="font-medium">{formatCurrency(service.totalPrice || service.price)}</span>
              </div>
            ))}
            {(!invoice.adjustedExams && !invoice.services) || (invoice.adjustedExams?.length === 0 && invoice.services?.length === 0) ? (
              <p className="text-muted-foreground text-center">Aucun service à payer</p>
            ) : null}
          </div>

          {/* Total */}
          <div className="bg-primary/10 rounded-[20px] p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">TOTAL</span>
              <span className="text-3xl font-black text-primary">
                {formatCurrency(invoice.totalAmount || invoice.amount || 0)}
              </span>
            </div>
          </div>

          {/* Payment Methods */}
          <div>
            <h4 className="font-bold mb-3">{t('finance.payment.method')}</h4>
            <div className="grid grid-cols-3 gap-4">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`p-4 rounded-[20px] border-2 transition-all
                    ${selectedMethod === method.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                    }`}
                >
                  <method.icon className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm font-medium">{method.label}</p>
                  {selectedMethod === method.id && (
                    <Check className="w-5 h-5 mx-auto mt-2 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-[20px] border border-border
                       hover:bg-accent transition-colors"
              disabled={processing}
            >
              {t('finance.actions.cancel')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={processing}
              className="flex-1 px-6 py-3 rounded-[20px] bg-primary text-primary-foreground
                       font-bold hover:opacity-90 transition-opacity
                       disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="btn-valider-paiement"
            >
              {processing ? 'Traitement...' : t('finance.actions.validate')}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentModal;