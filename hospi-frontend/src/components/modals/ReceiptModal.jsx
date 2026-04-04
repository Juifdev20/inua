import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, Download, CheckCircle2, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useReactToPrint } from 'react-to-print';
import { useRef } from 'react';

const ReceiptModal = ({ invoice, isOpen, onClose, onPrint }) => {
  const { t } = useTranslation();
  const printRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Reçu-${invoice?.id}`,
  });

  if (!invoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] rounded-[32px] p-0">
        <DialogHeader className="p-6 border-b">
          <DialogTitle className="flex items-center gap-3 text-2xl font-black">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
            {t('finance.receipt')} #{invoice.id}
          </DialogTitle>
          <DialogDescription className="text-lg">
            Paiement confirmé le {formatDate(invoice.paidAt)}
          </DialogDescription>
        </DialogHeader>

        {/* Preview & Print Section */}
        <div className="flex flex-col h-full">
          <div className="flex-1 p-6 overflow-y-auto">
            <div ref={printRef} className="max-w-md mx-auto">
              {/* Receipt Header */}
              <div className="text-center border-b pb-6 mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full mx-auto flex items-center justify-center mb-4">
                  <Printer className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-2xl font-black uppercase tracking-wider text-primary mb-1">
                  INUA AFIA
                </h1>
                <p className="text-sm text-muted-foreground uppercase tracking-wide mb-6">
                  Hôpital Universitaire
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>Tél: +243 999 123 456</div>
                  <div>contact@inuafia.cd</div>
                </div>
              </div>

              {/* Receipt Details */}
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-sm font-medium">
                  <span>{t('finance.receiptNumber')}</span>
                  <span>REC-{invoice.id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t('finance.patient')}</span>
                  <span className="font-semibold">{invoice.patientName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t('finance.invoice')}</span>
                  <span className="font-mono">INV-{invoice.id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t('finance.paymentMethod')}</span>
                  <span className="capitalize">{invoice.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t('finance.date')}</span>
                  <span>{formatDate(invoice.paidAt)}</span>
                </div>
              </div>

              {/* Services Table */}
              <div className="border rounded-2xl p-4 mb-6">
                <h3 className="font-bold mb-4 flex items-center gap-2 text-primary">
                  Services facturés
                </h3>
                <div className="space-y-2">
                  {invoice.services?.map((service, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{service.name}</span>
                      <span className="font-mono">{formatCurrency(service.price)}</span>
                    </div>
                  )) || (
                    <div className="text-center py-4 text-muted-foreground">
                      Services listés sur facture originale
                    </div>
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="border-t pt-6 space-y-2">
                <div className="flex justify-between text-lg font-bold text-primary">
                  <span>{t('finance.totalPaid')}</span>
                  <span>{formatCurrency(invoice.amount)}</span>
                </div>
                <Badge className="w-full justify-center text-lg py-2 bg-green-500 hover:bg-green-600">
                  ✅ {t('finance.paymentReceived')}
                </Badge>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t text-center text-xs text-muted-foreground space-y-1">
                <p>Merci pour votre confiance</p>
                <p>Ce reçu annule et remplace tout reçu contradictoire</p>
                <div className="flex justify-center gap-4 mt-4 text-[10px] uppercase tracking-widest">
                  <span>INUA AFIA Medical Center</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <DialogFooter className="p-6 border-t bg-muted/50 gap-3">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              Imprimer
            </Button>
            <Button onClick={onPrint} className="gap-2 bg-green-500 hover:bg-green-600">
              <CheckCircle2 className="w-4 h-4" />
              Marquer comme envoyé
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptModal;

