import React, { useState, useEffect } from 'react';
import {
  FileText,
  FlaskConical,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  History,
  AlertTriangle,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { labApi } from '@/services/labApi';

/**
 * ★ VUE RÉSULTATS POUR MÉDECIN
 * Affiche les résultats de laboratoire avec alertes et historique
 */
export function DoctorResultsView({ consultationId, patientName, onClose }) {
  const [box, setBox] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadResults();
  }, [consultationId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const response = await labApi.getBox(consultationId);
      if (response.data?.success) {
        setBox(response.data.data);
        // Marquer comme consulté
        await labApi.viewResults(consultationId);
      }
    } catch (error) {
      toast.error('Erreur chargement résultats');
    } finally {
      setLoading(false);
    }
  };

  const criticalExams = box?.exams?.filter(e => e.isCritical) || [];
  const normalExams = box?.exams?.filter(e => !e.isCritical && e.resultValue) || [];

  if (loading) {
    return (
      <div className="p-8 text-center">
        <FlaskConical className="w-12 h-12 mx-auto animate-pulse text-muted-foreground" />
        <p className="text-muted-foreground mt-4">Chargement des résultats...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Résultats de Laboratoire</h2>
            <p className="text-sm text-muted-foreground">{patientName || box?.patientName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
            <History className="w-4 h-4 mr-2" />
            Historique
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Alertes critiques */}
      {criticalExams.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h3 className="font-bold text-red-800">
              {criticalExams.length} Valeur{criticalExams.length > 1 ? 's' : ''} Critique{criticalExams.length > 1 ? 's' : ''}
            </h3>
          </div>
          <div className="space-y-2">
            {criticalExams.map(exam => (
              <div key={exam.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="font-medium">{exam.serviceName}</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-red-600">{exam.resultValue} {exam.unit}</span>
                  <p className="text-xs text-muted-foreground">Réf: {exam.referenceRangeText}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tous les résultats */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <FlaskConical className="w-5 h-5" />
              Tous les examens
            </h3>
            <Badge variant="secondary">
              {box?.exams?.filter(e => e.resultValue).length || 0} résultats
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {box?.exams?.filter(e => e.resultValue).map(exam => (
              <ExamResultRow key={exam.id} exam={exam} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Commentaires du labo */}
      {box?.exams?.some(e => e.labComment) && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Commentaires du Laboratoire
            </h4>
            <div className="space-y-2">
              {box.exams.filter(e => e.labComment).map(exam => (
                <p key={exam.id} className="text-sm text-blue-700">
                  <span className="font-medium">{exam.serviceName}:</span> {exam.labComment}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Fermer
        </Button>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Voir la suite du traitement
        </Button>
      </div>
    </div>
  );
}

function ExamResultRow({ exam }) {
  const isCritical = exam.isCritical;
  const isNormal = !isCritical && exam.resultValue;

  return (
    <div className={cn(
      'p-4 flex items-center justify-between',
      isCritical && 'bg-red-50'
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          isCritical ? 'bg-red-100 text-red-600' : 
          isNormal ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'
        )}>
          {isCritical ? <AlertTriangle className="w-4 h-4" /> : 
           isNormal ? <CheckCircle2 className="w-4 h-4" /> : <FlaskConical className="w-4 h-4" />}
        </div>
        <div>
          <p className="font-medium">{exam.serviceName}</p>
          <p className="text-xs text-muted-foreground">{exam.referenceRangeText}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={cn(
          'text-lg font-bold',
          isCritical ? 'text-red-600' : 'text-emerald-600'
        )}>
          {exam.resultValue} {exam.unit}
        </p>
        <p className="text-xs text-muted-foreground">
          {exam.resultEnteredAt && format(new Date(exam.resultEnteredAt), 'dd/MM HH:mm', { locale: fr })}
        </p>
      </div>
    </div>
  );
}
