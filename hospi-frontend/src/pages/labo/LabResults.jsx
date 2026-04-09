import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  FlaskConical, 
  User, 
  CheckCircle, 
  AlertCircle, 
  Send, 
  ChevronRight,
  Beaker,
  ArrowLeft,
  FileText,
  Edit3,
  CheckSquare,
  RefreshCw,
  X,
  Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { labApi } from '../../services/labApi';
import api from '../../services/api';

/**
 * 🧪 LABORATOIRE 3-PANES - LabResults.jsx
 * 
 * Layout:
 * 1. GAUCHE: Liste des patients (boîtes de consultation)
 * 2. CENTRE: Examens du patient sélectionné
 * 3. DROITE: Formulaire de saisie pour l'examen sélectionné
 */

const MAX_COMMENT_CHARS = 2000;

const LabResults = () => {
  const navigate = useNavigate();
  const { patientId: urlPatientId } = useParams();
  
  // ═══════════════════════════════════════════════════════════════
  // ÉTATS - 3 niveaux de sélection
  // ═══════════════════════════════════════════════════════════════
  const [boxes, setBoxes] = useState([]);
  const [selectedBox, setSelectedBox] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  
  // Valeurs du formulaire
  const [resultValue, setResultValue] = useState('');
  const [unit, setUnit] = useState('');
  const [labComment, setLabComment] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // États pour transmission au médecin
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mobile navigation state
  const [mobileTab, setMobileTab] = useState('patients'); // 'patients', 'exams', 'form'

  // ═══════════════════════════════════════════════════════════════
  // CHARGEMENT DES BOÎTES (Patients)
  // ═══════════════════════════════════════════════════════════════
  const loadBoxes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await labApi.getQueue();
      const data = response.data?.data || [];
      
      const paidBoxes = data.filter(box => 
        box.consultationStatus === 'PAID' || 
        box.consultationStatus === 'EXAMENS_PAYES' ||
        box.consultationStatus === 'AU_LABO'
      );
      
      console.log('📦 Patients chargés:', paidBoxes.length);
      setBoxes(paidBoxes);
      
      // Auto-sélectionner le patient depuis l'URL ou le premier
      if (urlPatientId && paidBoxes.length > 0) {
        const foundBox = paidBoxes.find(b => 
          b.patientId?.toString() === urlPatientId || 
          b.consultationId?.toString() === urlPatientId
        );
        if (foundBox) {
          handleSelectBox(foundBox);
        } else {
          setSelectedBox(paidBoxes[0]);
        }
      } else if (paidBoxes.length > 0 && !selectedBox) {
        setSelectedBox(paidBoxes[0]);
      }
    } catch (error) {
      console.error('❌ Erreur chargement:', error);
      toast.error('Impossible de charger la file d\'attente');
    } finally {
      setLoading(false);
    }
  }, [urlPatientId]);

  useEffect(() => {
    loadBoxes();
  }, [loadBoxes]);

  // ═══════════════════════════════════════════════════════════════
  // CHARGEMENT DES MÉDECINS
  // ═══════════════════════════════════════════════════════════════
  const loadDoctors = useCallback(async () => {
    try {
      const response = await fetch('/api/lab-tests/available-doctors');
      if (!response.ok) throw new Error('Erreur lors du chargement des médecins');
      const data = await response.json();
      setDoctors(data.data || data || []);
    } catch (error) {
      console.error('❌ Erreur chargement médecins:', error);
    }
  }, []);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  // ═══════════════════════════════════════════════════════════════
  // SÉLECTION D'UN PATIENT
  // ═══════════════════════════════════════════════════════════════
  const handleSelectBox = (box) => {
    setSelectedBox(box);
    setSelectedExam(null);
    resetForm();
    // Auto-navigate to exams tab on mobile
    setMobileTab('exams');
  };

  // ═══════════════════════════════════════════════════════════════
  // SÉLECTION D'UN EXAMEN
  // ═══════════════════════════════════════════════════════════════
  const handleSelectExam = (exam) => {
    setSelectedExam(exam);
    setResultValue(exam.resultValue || '');
    setUnit(exam.unit || '');
    setLabComment(exam.labComment || '');
    // Auto-navigate to form tab on mobile
    setMobileTab('form');
  };

  // ═══════════════════════════════════════════════════════════════
  // RÉINITIALISATION DU FORMULAIRE
  // ═══════════════════════════════════════════════════════════════
  const resetForm = () => {
    setResultValue('');
    setUnit('');
    setLabComment('');
  };

  // ═══════════════════════════════════════════════════════════════
  // VÉRIFICATION HORS NORME
  // ═══════════════════════════════════════════════════════════════
  const isOutOfRange = useMemo(() => {
    if (!resultValue || !selectedExam?.referenceRangeText || selectedExam.referenceRangeText === 'N/A') {
      return false;
    }
    
    const parts = selectedExam.referenceRangeText.split(/[-–]/).map(p => parseFloat(p.trim()));
    if (parts.length !== 2 || parts.some(isNaN)) return false;
    
    const [min, max] = parts;
    const numericValue = parseFloat(resultValue);
    if (isNaN(numericValue)) return false;
    
    return numericValue < min || numericValue > max;
  }, [resultValue, selectedExam]);

  // ═══════════════════════════════════════════════════════════════
  // SAUVEGARDE DU RÉSULTAT
  // ═══════════════════════════════════════════════════════════════
  const handleSaveResult = async () => {
    if (!selectedExam) {
      toast.error('Aucun examen sélectionné');
      return;
    }

    if (!resultValue.trim()) {
      toast.error('Veuillez saisir une valeur');
      return;
    }

    setSubmitting(true);
    try {
      const response = await labApi.enterResult(selectedExam.id, {
        resultValue: resultValue,
        unit: unit || selectedExam.unit,
        labComment: labComment,
        isCritical: isOutOfRange,
        technicianName: localStorage.getItem('user_name') || 'Technicien'
      });

      if (response.data?.success) {
        toast.success('✅ Résultat enregistré');
        
        // Mettre à jour localement
        const updatedBoxes = boxes.map(box => {
          if (box.consultationId === selectedBox.consultationId) {
            return {
              ...box,
              exams: box.exams.map(exam => 
                exam.id === selectedExam.id 
                  ? { ...exam, resultValue, unit: unit || exam.unit, labComment, isCritical: isOutOfRange }
                  : exam
              )
            };
          }
          return box;
        });
        setBoxes(updatedBoxes);
        
        // Passer à l'examen suivant non rempli
        const currentIndex = selectedBox.exams.findIndex(e => e.id === selectedExam.id);
        const nextExam = selectedBox.exams.slice(currentIndex + 1).find(e => !e.resultValue);
        if (nextExam) {
          handleSelectExam(nextExam);
        }
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // VALIDATION COMPLÈTE DE LA BOÎTE
  // ═══════════════════════════════════════════════════════════════
  const handleSubmitResults = () => {
    if (!selectedBox) return;
    
    const pendingExams = selectedBox.exams.filter(e => !e.resultValue);
    if (pendingExams.length > 0) {
      toast.error(`${pendingExams.length} examen(s) non rempli(s)`);
      return;
    }
    
    setShowDoctorModal(true);
  };

  const handleSendToDoctor = async () => {
    if (!selectedDoctor) {
      toast.error('Veuillez sélectionner un médecin');
      return;
    }

    // Vérifier que tous les examens ont un résultat
    const emptyExams = selectedBox.exams.filter(e => !e.resultValue || e.resultValue.trim() === '');
    if (emptyExams.length > 0) {
      toast.error(`${emptyExams.length} examen(s) sans résultat. Veuillez les remplir avant l'envoi.`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Construire le DTO selon le format attendu par le backend
      const submissionData = {
        consultationId: Number(selectedBox.consultationId),
        doctorId: selectedDoctor ? Number(selectedDoctor) : null, // ✅ Envoyer l'ID du médecin sélectionné
        results: selectedBox.exams.map(exam => ({
          testId: Number(exam.id),
          value: exam.resultValue || '',
          comment: exam.labComment || ''
        }))
      };

      console.log('📤 Envoi des résultats:', submissionData);

      // Appel API unique avec le nouveau format
      const response = await api.post('/lab/box/submit', submissionData);

      if (response.data?.success) {
        toast.success('✅ Boîte validée et transmise au médecin');
        
        // Vider la sélection et recharger la liste
        setSelectedBox(null);
        setSelectedExam(null);
        setShowDoctorModal(false);
        
        // Recharger la liste des patients à gauche
        await loadBoxes();
        
        // Rediriger vers l'historique après un délai
        setTimeout(() => navigate('/labo/history'), 1500);
      } else {
        throw new Error(response.data?.message || 'Échec de la transmission');
      }
    } catch (error) {
      console.error('❌ Erreur transmission:', error);
      toast.error(error.response?.data?.message || 'Échec de la transmission');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // FILTRAGE
  // ═══════════════════════════════════════════════════════════════
  const filteredBoxes = useMemo(() => {
    if (!searchQuery.trim()) return boxes;
    
    const query = searchQuery.toLowerCase();
    return boxes.filter(box => 
      box.patientName?.toLowerCase().includes(query) ||
      box.patientCode?.toLowerCase().includes(query)
    );
  }, [boxes, searchQuery]);

  // ═══════════════════════════════════════════════════════════════
  // CALCULS
  // ═══════════════════════════════════════════════════════════════
  const progress = useMemo(() => {
    if (!selectedBox?.exams) return { filled: 0, total: 0 };
    const filled = selectedBox.exams.filter(e => e.resultValue).length;
    return { filled, total: selectedBox.exams.length };
  }, [selectedBox]);

  // ═══════════════════════════════════════════════════════════════
  // RENDU
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3 border-b bg-card gap-2">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <h1 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            Saisie des Résultats
          </h1>
          {selectedBox && (
            <Badge variant="outline" className="font-mono text-xs">
              <User className="w-3 h-3 mr-1" />
              {selectedBox.patientName}
            </Badge>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={() => navigate('/labo/queue')} className="w-full sm:w-auto">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour file d'attente
        </Button>
      </div>

      {/* LAYOUT 3 PANES - Responsive */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Mobile Tab Navigation */}
        <div className="md:hidden flex border-b bg-card sticky top-0 z-10">
          <button
            onClick={() => setMobileTab('patients')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              mobileTab === 'patients' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            Patients
          </button>
          <button
            onClick={() => setMobileTab('exams')}
            disabled={!selectedBox}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              !selectedBox ? 'opacity-50 cursor-not-allowed' : ''
            } ${mobileTab === 'exams' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
          >
            Examens
          </button>
          <button
            onClick={() => setMobileTab('form')}
            disabled={!selectedExam}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              !selectedExam ? 'opacity-50 cursor-not-allowed' : ''
            } ${mobileTab === 'form' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
          >
            Saisie
          </button>
        </div>

        {/* COLONNE 1: PATIENTS (Gauche) */}
        <div className={`${mobileTab === 'patients' ? 'flex' : 'hidden'} md:flex w-full md:w-72 border-r bg-muted/20 flex-col flex-shrink-0`}>
          <div className="p-3 border-b bg-card">
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher patient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg border bg-background text-sm"
              />
              <svg className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredBoxes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Beaker className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Aucun patient en attente</p>
              </div>
            ) : (
              filteredBoxes.map((box) => {
                const isSelected = selectedBox?.consultationId === box.consultationId;
                const pendingCount = box.exams?.filter(e => !e.resultValue).length || 0;
                const totalCount = box.exams?.length || 0;
                
                return (
                  <button
                    key={box.consultationId}
                    onClick={() => handleSelectBox(box)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/10 shadow-sm' 
                        : 'border-border bg-card hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">
                          {box.patientName || 'Patient inconnu'}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[10px] h-4 px-1">
                            {pendingCount}/{totalCount}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {box.patientCode}
                          </span>
                        </div>
                      </div>
                      
                      {isSelected && <ChevronRight className="w-4 h-4 text-primary" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* COLONNE 2: EXAMENS (Centre) */}
        <div className={`${mobileTab === 'exams' ? 'flex' : 'hidden'} md:flex w-full md:w-80 border-r bg-muted/10 flex-col flex-shrink-0`}>
          {!selectedBox ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
              <User className="w-12 h-12 mb-2 opacity-20" />
              <p className="text-sm">Sélectionnez un patient</p>
            </div>
          ) : (
            <>
              <div className="p-3 border-b bg-card">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Examens prescrits
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${progress.total > 0 ? (progress.filled / progress.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {progress.filled}/{progress.total}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {selectedBox.exams?.map((exam) => {
                  const isSelected = selectedExam?.id === exam.id;
                  const isFilled = !!exam.resultValue;
                  const isCritical = exam.isCritical;
                  
                  return (
                    <button
                      key={exam.id}
                      onClick={() => handleSelectExam(exam)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/10' 
                          : isFilled
                            ? 'border-emerald-500/30 bg-emerald-50/5'
                            : 'border-border bg-card hover:border-primary/20'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
                          isFilled 
                            ? 'bg-emerald-500/10 text-emerald-600' 
                            : 'bg-orange-500/10 text-orange-600'
                        }`}>
                          {isFilled ? <CheckSquare className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{exam.serviceName}</p>
                          
                          <div className="flex items-center gap-1.5 mt-1">
                            {isFilled ? (
                              <>
                                <span className="text-xs font-mono text-emerald-600">
                                  {exam.resultValue} {exam.unit}
                                </span>
                                {isCritical && (
                                  <Badge className="text-[9px] h-4 bg-rose-500/10 text-rose-600">
                                    <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                                    Critique
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-orange-600">En attente</span>
                            )}
                          </div>
                        </div>
                        
                        {isSelected && <ChevronRight className="w-4 h-4 text-primary" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Bouton valider la boîte */}
              {selectedBox.exams?.every(e => e.resultValue) && (
                <div className="p-3 border-t bg-card">
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={handleSubmitResults}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Valider la boîte
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* COLONNE 3: FORMULAIRE (Droite) */}
        <div className={`${mobileTab === 'form' ? 'flex' : 'hidden'} md:flex flex-1 overflow-y-auto bg-background`}>
          {!selectedExam ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Beaker className="w-16 h-16 mb-4 opacity-10" />
              <p className="text-lg font-medium">Sélectionnez un examen</p>
              <p className="text-sm text-muted-foreground">
                Cliquez sur un examen dans la liste du centre
              </p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto p-6 space-y-6">
              {/* En-tête de l'examen */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        <Beaker className="w-3 h-3 mr-1" />
                        Examen #{selectedExam.id}
                      </Badge>
                      <CardTitle className="text-xl">{selectedExam.serviceName}</CardTitle>
                    </div>
                    
                    {selectedExam.resultValue && (
                      <Badge className="bg-emerald-500/10 text-emerald-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Déjà saisi
                      </Badge>
                    )}
                  </div>
                  
                  {selectedExam.doctorNote && (
                    <p className="text-sm text-muted-foreground mt-2 bg-muted p-2 rounded">
                      <span className="font-medium">Note du médecin:</span> {selectedExam.doctorNote}
                    </p>
                  )}
                </CardHeader>
              </Card>

              {/* Formulaire de saisie */}
              <Card className={isOutOfRange ? 'border-rose-500/50' : ''}>
                <CardContent className="p-6 space-y-5">
                  {/* Résultat */}
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                      Résultat *
                      {isOutOfRange && (
                        <Badge className="bg-rose-500/10 text-rose-600 text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Hors norme
                        </Badge>
                      )}
                    </Label>
                    <div className="flex gap-3 mt-1.5">
                      <Input
                        type="text"
                        placeholder="Saisir la valeur..."
                        value={resultValue}
                        onChange={(e) => setResultValue(e.target.value)}
                        className={`flex-1 font-mono text-lg ${
                          isOutOfRange 
                            ? 'border-rose-500 focus-visible:ring-rose-500 bg-rose-50/5' 
                            : resultValue 
                              ? 'border-emerald-500 focus-visible:ring-emerald-500'
                              : ''
                        }`}
                        autoFocus
                      />
                      <Input
                        type="text"
                        placeholder="Unité"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="w-32"
                      />
                    </div>
                  </div>

                  {/* Valeur de référence */}
                  <div className="bg-muted p-4 rounded-lg">
                    <Label className="text-xs text-muted-foreground uppercase">
                      Valeurs de référence
                    </Label>
                    <p className="font-mono text-lg mt-1">
                      {selectedExam.referenceRangeText || 'Non définie'}
                    </p>
                  </div>

                  {/* Commentaire */}
                  <div>
                    <Label className="text-sm font-medium flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Commentaire du biologiste
                      </span>
                      <span className="text-xs text-muted-foreground font-normal">
                        {labComment.length} / {MAX_COMMENT_CHARS}
                      </span>
                    </Label>
                    <Textarea
                      placeholder="Observations particulières, contexte, etc..."
                      value={labComment}
                      onChange={(e) => setLabComment(e.target.value)}
                      className="mt-1.5 min-h-[100px]"
                      maxLength={MAX_COMMENT_CHARS}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Boutons d'action */}
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={resetForm}
                >
                  Effacer
                </Button>
                
                <Button
                  size="lg"
                  className="flex-[2]"
                  onClick={handleSaveResult}
                  disabled={submitting || !resultValue.trim()}
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {selectedExam.resultValue ? 'Mettre à jour' : 'Enregistrer'}
                    </>
                  )}
                </Button>
              </div>

              {/* Navigation rapide */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    const idx = selectedBox.exams.findIndex(e => e.id === selectedExam.id);
                    if (idx > 0) handleSelectExam(selectedBox.exams[idx - 1]);
                  }}
                  disabled={selectedBox.exams.findIndex(e => e.id === selectedExam.id) === 0}
                >
                  ← Précédent
                </Button>
                
                <span>
                  {selectedBox.exams.findIndex(e => e.id === selectedExam.id) + 1} / {selectedBox.exams.length}
                </span>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    const idx = selectedBox.exams.findIndex(e => e.id === selectedExam.id);
                    if (idx < selectedBox.exams.length - 1) handleSelectExam(selectedBox.exams[idx + 1]);
                  }}
                  disabled={selectedBox.exams.findIndex(e => e.id === selectedExam.id) === selectedBox.exams.length - 1}
                >
                  Suivant →
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE SÉLECTION DU MÉDECIN */}
      {showDoctorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md mx-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Transmettre au médecin</h3>
                <Button variant="ghost" size="sm" onClick={() => { setShowDoctorModal(false); setSelectedDoctor(''); }} disabled={isSubmitting}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Patient</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedBox?.patientName || 'Patient non spécifié'}</p>
                </div>
                <div>
                  <Label htmlFor="doctor-select" className="text-sm font-medium">Médecin destinataire *</Label>
                  <select 
                    id="doctor-select" 
                    value={selectedDoctor} 
                    onChange={(e) => setSelectedDoctor(e.target.value)} 
                    className="w-full mt-1 p-2 border border-border rounded-lg bg-background" 
                    disabled={isSubmitting}
                  >
                    <option value="">Sélectionner un médecin...</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.nom} {doctor.prenom} - {doctor.specialite || 'Médecin'}
                      </option>
                    ))}
                  </select>
                </div>
                {doctors.length === 0 && (
                  <p className="text-sm text-orange-600">⚠️ Aucun médecin disponible.</p>
                )}
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => { setShowDoctorModal(false); setSelectedDoctor(''); }} 
                    disabled={isSubmitting} 
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleSendToDoctor} 
                    disabled={!selectedDoctor || isSubmitting || doctors.length === 0} 
                    className="flex-1"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        Transmission...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Transmettre
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default LabResults;
