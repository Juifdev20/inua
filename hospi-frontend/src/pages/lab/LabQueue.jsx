import React, { useState, useEffect, useMemo } from 'react';
import { 
  FlaskConical, 
  ClipboardList, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  Microscope,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  Info
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { labApi } from '@/services/labApi';
import { ResultEntryModal } from '@/components/modals/ResultEntryModal';

/**
 * ★ PAGE FILE D'ATTENTE LABORATOIRE - Layout Split-Pane
 * Gauche: Liste des patients (boîtes)
 * Droite: Examens du patient sélectionné pour saisie
 */
export default function LabQueue() {
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBox, setSelectedBox] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);

  const loadQueue = async () => {
    try {
      setLoading(true);
      const response = await labApi.getQueue();
      if (response.data?.success) {
        const boxesData = response.data.data || [];
        setBoxes(boxesData);
        // Auto-select first box if none selected
        if (boxesData.length > 0 && !selectedBox) {
          setSelectedBox(boxesData[0]);
        }
      }
    } catch (error) {
      toast.error('Erreur chargement file d\'attente');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const stats = useMemo(() => ({
    total: boxes.length,
    pending: boxes.filter(b => b.pendingExams > 0).length,
    critical: boxes.reduce((sum, b) => sum + (b.criticalExams || 0), 0)
  }), [boxes]);

  const handleSelectBox = (box) => {
    setSelectedBox(box);
    setSelectedExam(null);
  };

  const handleEnterResult = (exam) => {
    setSelectedExam(exam);
    setShowResultModal(true);
  };

  const handleResultSaved = () => {
    setShowResultModal(false);
    setSelectedExam(null);
    loadQueue();
  };

  // Update selected box when boxes refresh
  useEffect(() => {
    if (selectedBox && boxes.length > 0) {
      const updated = boxes.find(b => b.consultationId === selectedBox.consultationId);
      if (updated) {
        setSelectedBox(updated);
      }
    }
  }, [boxes]);

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">
              <Microscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Saisie des Résultats</h1>
              <p className="text-sm text-slate-400">Laboratoire - File d'attente</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-3 text-sm">
              <StatBadge label="Total" value={stats.total} color="blue" />
              <StatBadge label="En Attente" value={stats.pending} color="amber" />
              <StatBadge label="Critiques" value={stats.critical} color="red" />
            </div>
            <Button onClick={loadQueue} variant="outline" size="sm">
              <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
              Actualiser
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Split Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Patient List */}
        <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Examens à traiter
            </h2>
            <Badge variant="secondary" className="mt-2">
              {boxes.length} patient{boxes.length > 1 ? 's' : ''}
            </Badge>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <FlaskConical className="w-8 h-8 mx-auto animate-pulse text-slate-500" />
              </div>
            ) : boxes.length === 0 ? (
              <div className="p-8 text-center">
                <FlaskConical className="w-8 h-8 mx-auto text-slate-500" />
                <p className="text-slate-400 text-sm mt-2">Aucun examen en attente</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {boxes.map(box => (
                  <PatientListItem 
                    key={box.consultationId} 
                    box={box} 
                    isSelected={selectedBox?.consultationId === box.consultationId}
                    onClick={() => handleSelectBox(box)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Exam Details */}
        <div className="flex-1 bg-slate-950 overflow-y-auto">
          {selectedBox ? (
            <ExamDetailsPanel 
              box={selectedBox} 
              onEnterResult={handleEnterResult}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <FlaskConical className="w-16 h-16 mx-auto text-slate-600" />
                <p className="text-slate-500 mt-4">Sélectionnez un patient pour voir les examens</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showResultModal && selectedExam && (
        <ResultEntryModal
          exam={selectedExam}
          patientName={selectedBox?.patientName}
          onClose={() => setShowResultModal(false)}
          onSave={handleResultSaved}
        />
      )}
    </div>
  );
}

function StatBadge({ label, value, color }) {
  const colors = {
    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    red: 'bg-red-500/20 text-red-300 border-red-500/30'
  };
  return (
    <div className={cn('px-3 py-1 rounded-lg border text-xs font-medium', colors[color])}>
      <span className="opacity-70">{label}:</span> {value}
    </div>
  );
}

function PatientListItem({ box, isSelected, onClick }) {
  const pendingCount = box.exams?.filter(e => !e.resultValue && e.active).length || 0;
  const totalCount = box.exams?.filter(e => e.active).length || 0;
  const criticalCount = box.exams?.filter(e => e.isCritical).length || 0;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-3 rounded-xl text-left transition-all',
        isSelected 
          ? 'bg-cyan-500/20 border border-cyan-500/50' 
          : 'bg-slate-800/50 border border-slate-700 hover:bg-slate-800 hover:border-slate-600'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold',
            isSelected ? 'bg-cyan-500' : 'bg-slate-700'
          )}>
            {box.patientName?.charAt(0) || '?'}
          </div>
          <div>
            <p className={cn('font-semibold text-sm', isSelected ? 'text-cyan-300' : 'text-slate-200')}>
              {box.patientName}
            </p>
            <p className="text-xs text-slate-500">{box.patientCode}</p>
          </div>
        </div>
        {criticalCount > 0 && (
          <AlertCircle className="w-4 h-4 text-red-500" />
        )}
      </div>
      
      <div className="mt-2 flex items-center justify-between">
        <Badge 
          variant={pendingCount > 0 ? 'default' : 'secondary'} 
          className="text-xs"
        >
          {pendingCount > 0 ? 'EN COURS' : 'TERMINE'}
        </Badge>
        <span className="text-xs text-slate-400">
          {pendingCount}/{totalCount} test{totalCount > 1 ? 's' : ''}
        </span>
      </div>
    </button>
  );
}

function ExamDetailsPanel({ box, onEnterResult }) {
  const pendingExams = box.exams?.filter(e => !e.resultValue && e.active) || [];
  const completedExams = box.exams?.filter(e => e.resultValue && e.active) || [];
  const progress = box.exams?.length > 0 
    ? Math.round((completedExams.length / box.exams.filter(e => e.active).length) * 100) 
    : 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">{box.patientName}</h2>
            <p className="text-slate-400">
              CODE: {box.consultationCode || box.patientCode} • PATIENT: {box.patientName?.toUpperCase()}
            </p>
          </div>
          <Badge variant={progress === 100 ? 'success' : 'default'} className="text-sm">
            {pendingExams.length === 0 ? 'TERMINE' : 'EN COURS'}
          </Badge>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-slate-900 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-300 font-medium">Progression de saisie</span>
          <span className={cn(
            'text-lg font-bold',
            progress === 100 ? 'text-emerald-400' : 'text-cyan-400'
          )}>
            {progress}%
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2">
          <div 
            className={cn(
              'h-2 rounded-full transition-all',
              progress === 100 ? 'bg-emerald-500' : 'bg-cyan-500'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-slate-500 mt-2">
          {completedExams.length} paramètre(s) sur {box.exams?.filter(e => e.active).length || 0} rempli(s)
        </p>
      </div>

      {/* Exams List */}
      <div className="space-y-3">
        {box.exams?.filter(e => e.active).map(exam => (
          <div 
            key={exam.id}
            className={cn(
              'bg-slate-900 rounded-xl p-4 border',
              exam.isCritical ? 'border-red-500/50 bg-red-950/20' : 'border-slate-800'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  exam.resultValue 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-amber-500/20 text-amber-400'
                )}>
                  {exam.resultValue ? <CheckCircle2 className="w-5 h-5" /> : <FlaskConical className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-semibold text-white">{exam.serviceName}</p>
                  {exam.doctorNote && (
                    <p className="text-xs text-slate-400">Note: {exam.doctorNote}</p>
                  )}
                </div>
                {exam.isCritical && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    CRITIQUE
                  </Badge>
                )}
              </div>

              {exam.resultValue ? (
                <div className="text-right">
                  <p className={cn(
                    'text-lg font-bold',
                    exam.isCritical ? 'text-red-400' : 'text-emerald-400'
                  )}>
                    {exam.resultValue} {exam.unit}
                  </p>
                  <p className="text-xs text-slate-500">Ref: {exam.referenceRangeText}</p>
                </div>
              ) : (
                <Button 
                  size="sm"
                  onClick={() => onEnterResult(exam)}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  Saisir
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Comments */}
      {box.exams?.some(e => e.labComment) && (
        <div className="mt-6 bg-blue-950/30 border border-blue-500/30 rounded-xl p-4">
          <h4 className="font-semibold text-blue-300 mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Commentaires du biologiste
          </h4>
          <div className="space-y-2">
            {box.exams.filter(e => e.labComment).map(exam => (
              <p key={exam.id} className="text-sm text-blue-200">
                <span className="font-medium">{exam.serviceName}:</span> {exam.labComment}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
