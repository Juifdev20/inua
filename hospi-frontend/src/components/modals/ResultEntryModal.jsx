import React, { useState, useMemo } from 'react';
import {
  FlaskConical,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  X,
  Save,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { labApi } from '@/services/labApi';

/**
 * ★ MODAL SAISIE RÉSULTAT - Avec détection des valeurs critiques
 */
export function ResultEntryModal({ exam, patientName, onClose, onSave }) {
  const [resultValue, setResultValue] = useState(exam?.resultValue || '');
  const [unit, setUnit] = useState(exam?.unit || '');
  const [referenceMin, setReferenceMin] = useState(exam?.referenceMin || '');
  const [referenceMax, setReferenceMax] = useState(exam?.referenceMax || '');
  const [referenceRangeText, setReferenceRangeText] = useState(exam?.referenceRangeText || '');
  const [labComment, setLabComment] = useState(exam?.labComment || '');
  const [analysisMethod, setAnalysisMethod] = useState(exam?.analysisMethod || '');
  const [saving, setSaving] = useState(false);

  // Détection automatique des valeurs critiques
  const criticalStatus = useMemo(() => {
    if (!resultValue || (!referenceMin && !referenceMax)) return null;
    
    // Essayer de parser la valeur comme nombre
    const numericValue = parseFloat(resultValue.replace(',', '.'));
    if (isNaN(numericValue)) return null;
    
    const min = referenceMin ? parseFloat(referenceMin) : null;
    const max = referenceMax ? parseFloat(referenceMax) : null;
    
    if (min !== null && numericValue < min) {
      return { 
        type: 'LOW', 
        message: `⚠️ Valeur basse : ${resultValue} < ${min}`,
        severity: 'critical'
      };
    }
    if (max !== null && numericValue > max) {
      return { 
        type: 'HIGH', 
        message: `⚠️ Valeur haute : ${resultValue} > ${max}`,
        severity: 'critical'
      };
    }
    
    return { type: 'NORMAL', message: '✓ Valeur dans les normes', severity: 'normal' };
  }, [resultValue, referenceMin, referenceMax]);

  // Mise à jour automatique du texte de référence
  const updateReferenceText = () => {
    if (referenceMin && referenceMax && unit) {
      setReferenceRangeText(`${referenceMin} - ${referenceMax} ${unit}`);
    }
  };

  const handleSave = async () => {
    if (!resultValue.trim()) {
      toast.error('Veuillez saisir une valeur');
      return;
    }

    setSaving(true);
    try {
      await labApi.enterResult(exam.id, {
        resultValue,
        unit,
        referenceMin,
        referenceMax,
        referenceRangeText: referenceRangeText || `${referenceMin || '-'} - ${referenceMax || '-'} ${unit || ''}`,
        labComment,
        technicianName: 'Technicien Labo',
        analysisMethod
      });

      if (criticalStatus?.severity === 'critical') {
        toast.warning('Résultat enregistré - VALEUR CRITIQUE signalée au médecin', {
          duration: 5000
        });
      } else {
        toast.success('Résultat enregistré avec succès');
      }

      onSave();
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FlaskConical className="w-6 h-6" />
              <div>
                <h3 className="font-bold">Saisie du résultat</h3>
                <p className="text-sm opacity-90">{patientName}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Info examen */}
          <div className="bg-muted/50 rounded-xl p-4">
            <p className="font-semibold text-lg">{exam?.serviceName}</p>
            {exam?.doctorNote && (
              <p className="text-sm text-muted-foreground mt-1">
                <Info className="w-4 h-4 inline mr-1" />
                Note du médecin : {exam.doctorNote}
              </p>
            )}
          </div>

          {/* Valeur résultat */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Valeur du résultat *</Label>
            <div className="flex gap-2">
              <Input
                value={resultValue}
                onChange={(e) => setResultValue(e.target.value)}
                placeholder="Ex: 1.25"
                className={cn(
                  'text-lg font-mono',
                  criticalStatus?.severity === 'critical' && 'border-red-500 bg-red-50'
                )}
                autoFocus
              />
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Unité"
                className="w-24"
              />
            </div>
          </div>

          {/* Alerte critique */}
          {criticalStatus && (
            <div className={cn(
              'p-3 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2',
              criticalStatus.severity === 'critical' 
                ? 'bg-red-100 border border-red-300 text-red-800' 
                : 'bg-emerald-100 border border-emerald-300 text-emerald-800'
            )}>
              {criticalStatus.severity === 'critical' ? (
                <AlertTriangle className="w-6 h-6 text-red-600" />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              )}
              <div>
                <p className="font-semibold">{criticalStatus.message}</p>
                {criticalStatus.severity === 'critical' && (
                  <p className="text-sm opacity-80">
                    Cette valeur sera signalée comme critique au médecin
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Valeurs de référence */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Valeur min réf.</Label>
              <Input
                value={referenceMin}
                onChange={(e) => { setReferenceMin(e.target.value); updateReferenceText(); }}
                placeholder="0.8"
                type="number"
                step="0.01"
              />
            </div>
            <div>
              <Label className="text-sm">Valeur max réf.</Label>
              <Input
                value={referenceMax}
                onChange={(e) => { setReferenceMax(e.target.value); updateReferenceText(); }}
                placeholder="1.2"
                type="number"
                step="0.01"
              />
            </div>
          </div>

          {/* Texte référence complet */}
          <div>
            <Label className="text-sm">Valeurs de référence (affichage)</Label>
            <Input
              value={referenceRangeText}
              onChange={setReferenceRangeText}
              placeholder="Ex: 0.8 - 1.2 g/L"
            />
          </div>

          {/* Méthode d'analyse */}
          <div>
            <Label className="text-sm">Méthode d'analyse</Label>
            <Input
              value={analysisMethod}
              onChange={(e) => setAnalysisMethod(e.target.value)}
              placeholder="Ex: Spectrophotométrie"
            />
          </div>

          {/* Commentaire */}
          <div>
            <Label className="text-sm">Commentaire du laborantin</Label>
            <textarea
              value={labComment}
              onChange={(e) => setLabComment(e.target.value)}
              placeholder="Commentaire ou interprétation..."
              className="w-full min-h-[80px] p-3 rounded-lg border border-input bg-background text-sm resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !resultValue.trim()}
            className={cn(
              'gap-2',
              criticalStatus?.severity === 'critical' && 'bg-red-600 hover:bg-red-700'
            )}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {criticalStatus?.severity === 'critical' ? 'Enregistrer (CRITIQUE)' : 'Enregistrer'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
