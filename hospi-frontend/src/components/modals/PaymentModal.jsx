import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, CreditCard, Banknote, Smartphone, Check, Receipt, User, FileText, DollarSign, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const API = `${import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/finance`;

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'CDF',
    minimumFractionDigits: 0
  }).format(amount || 0);
};

const PaymentModal = ({ invoice, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [selectedMethod, setSelectedMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);

  const paymentMethods = [
    { id: 'cash', label: 'Espèces', icon: Banknote, color: 'emerald', desc: 'Paiement comptant' },
    { id: 'card', label: 'Carte', icon: CreditCard, color: 'blue', desc: 'Carte bancaire' },
    { id: 'mobile', label: 'Mobile', icon: Smartphone, color: 'violet', desc: 'Mobile Money' }
  ];

  const handleConfirm = async () => {
    try {
      setProcessing(true);

      let backendMethod;
      switch (selectedMethod) {
        case 'cash':
          backendMethod = 'ESPECES';
          break;
        case 'card':
          backendMethod = 'CARTE';
          break;
        case 'mobile':
          backendMethod = 'MOBILE';
          break;
        default:
          throw new Error('Méthode de paiement invalide');
      }

      const response = await api.post(`${API}/pay/${invoice.id}`, { 
        paymentMethod: backendMethod
      });
      toast.success('Paiement validé avec succès !');
      onSuccess();
    } catch (error) {
      console.error('Payment error:', error);
      const errorMsg = error.response?.data?.error || 'Vérifiez la connexion ou les données';
      toast.error(`Erreur lors du paiement: ${errorMsg}`);
    } finally {
      setProcessing(false);
    }
  };

  const selectedMethodData = paymentMethods.find(m => m.id === selectedMethod);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <Card className="relative z-10 w-full max-w-xl rounded-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-violet-500/5 to-purple-500/5 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-black text-foreground">
                  Confirmer le paiement
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Examens laboratoire
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-xl hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Informations patient */}
          <div className="bg-muted/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Patient</p>
                <p className="font-bold text-foreground">{invoice.patientName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Référence</p>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-foreground">{invoice.consultationCode || `REF-${invoice.id}`}</p>
                  <Badge variant="outline" className="text-xs">{invoice.type || 'Laboratoire'}</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="w-4 h-4 text-violet-500" />
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Détail des examens
              </h4>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {(invoice.adjustedExams || invoice.services || []).map((service, idx) => (
                <div 
                  key={idx} 
                  className="flex justify-between items-center p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </div>
                    <span className="text-sm font-medium">{service.serviceName || service.name}</span>
                  </div>
                  <span className="font-bold text-violet-600">{formatCurrency(service.totalPrice || service.price)}</span>
                </div>
              ))}
              {(!invoice.adjustedExams && !invoice.services) || (invoice.adjustedExams?.length === 0 && invoice.services?.length === 0) ? (
                <p className="text-muted-foreground text-center py-4">Aucun service à payer</p>
              ) : null}
            </div>
          </div>

          {/* Total */}
          <div className="rounded-2xl p-5 border-2 bg-gradient-to-br from-violet-500/10 to-purple-500/5 border-violet-200">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-muted-foreground">Total à payer</span>
              <ShieldCheck className="w-5 h-5 text-violet-500" />
            </div>
            <div className="flex justify-between items-end">
              <span className="text-3xl font-black text-violet-600">
                {formatCurrency(invoice.totalAmount || invoice.amount || 0)}
              </span>
              <span className="text-xs text-violet-500/70 font-medium">CDF</span>
            </div>
          </div>

          {/* Payment Methods */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">
              Méthode de paiement
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={cn(
                    'relative p-4 rounded-2xl border-2 transition-all duration-200 text-left group',
                    selectedMethod === method.id
                      ? `border-${method.color}-500 bg-${method.color}-50 shadow-lg shadow-${method.color}-500/20`
                      : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50'
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors',
                    selectedMethod === method.id
                      ? `bg-${method.color}-500 text-white shadow-lg shadow-${method.color}-500/30`
                      : 'bg-muted text-muted-foreground group-hover:bg-background'
                  )}>
                    <method.icon className="w-5 h-5" />
                  </div>
                  <p className={cn(
                    'font-bold text-sm',
                    selectedMethod === method.id ? `text-${method.color}-700` : 'text-foreground'
                  )}>
                    {method.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">{method.desc}</p>
                  {selectedMethod === method.id && (
                    <div className="absolute top-2 right-2">
                      <div className={cn('w-5 h-5 rounded-full bg-${method.color}-500 flex items-center justify-center')}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={processing}
              className="flex-1 h-14 rounded-xl font-bold border-2 hover:bg-muted transition-all"
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={processing}
              className={cn(
                'flex-1 h-14 rounded-xl font-black gap-2 transition-all shadow-lg',
                `bg-${selectedMethodData.color}-600 hover:bg-${selectedMethodData.color}-700 text-white shadow-${selectedMethodData.color}-500/25 hover:shadow-xl hover:shadow-${selectedMethodData.color}-500/30 hover:-translate-y-0.5 disabled:shadow-none disabled:translate-y-0`
              )}
            >
              {processing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <selectedMethodData.icon className="w-5 h-5" />
                  Valider le paiement
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentModal;
