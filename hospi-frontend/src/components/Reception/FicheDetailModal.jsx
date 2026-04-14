import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  X,
  Stethoscope,
  Beaker,
  Pill,
  CreditCard,
  Calendar,
  FileText,
  Printer,
  User,
  Clock
} from 'lucide-react';
import { cn } from '../../lib/utils';

const FicheDetailModal = ({ fiche, isOpen, onClose, patientInfo }) => {
  if (!fiche) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isNaN(date.getTime()) 
      ? dateString 
      : date.toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
  };

  const formatMontant = (montant) => {
    if (!montant && montant !== 0) return '0 CFA';
    return `${Number(montant).toLocaleString('fr-FR')} CFA`;
  };

  // Calculer le total des services
  const services = fiche.services || fiche.prescribedExams || [];
  const totalMontant = services.reduce((acc, service) => {
    return acc + (service.prix || service.price || 0);
  }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <FileText className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black">
                  Fiche Complète
                </DialogTitle>
                <DialogDescription className="text-xs font-bold uppercase tracking-wider">
                  {formatDate(fiche.date || fiche.createdAt)}
                </DialogDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Section Patient */}
          <div className="bg-muted/30 p-4 rounded-2xl border border-border">
            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <User className="w-4 h-4" /> Informations Patient
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Nom</p>
                <p className="font-bold text-foreground">
                  {patientInfo?.firstName || patientInfo?.prenom} {patientInfo?.lastName || patientInfo?.nom}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Code Patient</p>
                <p className="font-bold text-foreground">{patientInfo?.patientCode || patientInfo?.code || '---'}</p>
              </div>
            </div>
          </div>

          {/* Signes Vitaux */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-rose-50 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-200 dark:border-rose-800">
              <p className="text-[10px] font-black text-rose-600 uppercase">Tension</p>
              <p className="text-xl font-black text-foreground">{fiche.tension || '--/--'}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
              <p className="text-[10px] font-black text-amber-600 uppercase">Température</p>
              <p className="text-xl font-black text-foreground">{fiche.temperature || '--'}°C</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="text-[10px] font-black text-blue-600 uppercase">Poids</p>
              <p className="text-xl font-black text-foreground">{fiche.poids || '--'}kg</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <p className="text-[10px] font-black text-emerald-600 uppercase">Taille</p>
              <p className="text-xl font-black text-foreground">{fiche.taille || '--'}cm</p>
            </div>
          </div>

          {/* Motif */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
              <Stethoscope className="w-4 h-4" /> Motif de la Visite
            </h4>
            <p className="text-foreground font-medium">
              {fiche.motif || fiche.reasonForVisit || 'Non spécifié'}
            </p>
          </div>

          {/* Diagnostic & Traitement */}
          {(fiche.diagnostic || fiche.traitement || fiche.notesMedicales) && (
            <div className="space-y-4">
              {fiche.diagnostic && (
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                  <h4 className="text-xs font-black uppercase text-blue-600 mb-2 flex items-center gap-2">
                    <FileText className="w-3 h-3" /> Diagnostic
                  </h4>
                  <p className="text-sm font-medium italic text-foreground">{fiche.diagnostic}</p>
                </div>
              )}
              {fiche.traitement && (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <h4 className="text-xs font-black uppercase text-emerald-600 mb-2 flex items-center gap-2">
                    <Pill className="w-3 h-3" /> Traitement / Prescription
                  </h4>
                  <p className="text-sm font-medium italic text-foreground">{fiche.traitement}</p>
                </div>
              )}
              {fiche.notesMedicales && (
                <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
                  <h4 className="text-xs font-black uppercase text-amber-600 mb-2 flex items-center gap-2">
                    <FileText className="w-3 h-3" /> Notes Médicales
                  </h4>
                  <p className="text-sm font-medium text-foreground">{fiche.notesMedicales}</p>
                </div>
              )}
            </div>
          )}

          {/* Services / Examens Prescrits */}
          {services.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="bg-muted/50 p-3 border-b border-border">
                <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                  <Beaker className="w-4 h-4 text-primary" /> Services & Examens Prescrits
                </h4>
              </div>
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase">Service</th>
                    <th className="px-4 py-2 text-right text-[10px] font-bold uppercase">Prix</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service, idx) => (
                    <tr key={idx} className="border-t border-border">
                      <td className="px-4 py-3 text-sm font-medium">
                        {service.name || service.serviceName || service.nom || `Service #${idx + 1}`}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-right text-emerald-600">
                        {formatMontant(service.prix || service.price)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border bg-muted/30">
                    <td className="px-4 py-3 text-xs font-black uppercase">Total</td>
                    <td className="px-4 py-3 text-lg font-black text-right text-emerald-600">
                      {formatMontant(totalMontant)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Statut Paiement */}
          <div className="flex items-center justify-between bg-muted/30 p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
              <span className="font-bold text-foreground">Statut Paiement</span>
            </div>
            <Badge 
              variant={fiche.paymentStatus === 'SOLDE' || fiche.paymentStatus === 'PAYEE' ? 'default' : 'destructive'}
              className={cn(
                "font-black text-xs uppercase",
                (fiche.paymentStatus === 'SOLDE' || fiche.paymentStatus === 'PAYEE') && "bg-emerald-500 text-white"
              )}
            >
              {fiche.paymentStatus === 'SOLDE' || fiche.paymentStatus === 'PAYEE' 
                ? '✓ Payée' 
                : fiche.remainingCredit 
                  ? `Crédit: ${formatMontant(fiche.remainingCredit)}`
                  : 'En attente'
              }
            </Badge>
          </div>
        </div>

        <div className="border-t pt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button 
            onClick={() => window.print()} 
            className="bg-emerald-600 hover:bg-emerald-700 gap-2"
          >
            <Printer className="w-4 h-4" />
            Imprimer la Fiche
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FicheDetailModal;
