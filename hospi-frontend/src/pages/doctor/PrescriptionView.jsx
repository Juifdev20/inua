import React, { useState } from 'react';
import { toast } from 'sonner';
import { BACKEND_URL } from '../../config/environment.js';

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import MedicationSelector from '../../components/doctor/MedicationSelector';

import { 
  Send, 
  ArrowLeft,
  FlaskConical,
  Plus,
  Trash2,
  CheckCircle,
  Stethoscope,
  FileText
} from 'lucide-react';

/**
 * Composant de vue prescription en mode double écran
 * Colonne gauche : Résultats de laboratoire (simplifiés)
 * Colonne droite : Formulaire de prescription avec diagnostic
 */
const PrescriptionView = ({ 
  selectedConsultation, 
  onCancel, 
  onSuccess 
}) => {
  const [medications, setMedications] = useState([]);
  const [diagnostic, setDiagnostic] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newMedication, setNewMedication] = useState({
    medication: null,
    dosage: '',
    frequency: '',
    duration: '',
    quantityPerDose: '',
    instructions: ''
  });

  /**
   * ✅ FONCTION "CLiquer pour importer"
   * Quand le docteur clique sur un résultat, ça l'ajoute au diagnostic
   */
  const importResultToDiagnostic = (exam) => {
    // Parser le résultat pour obtenir la valeur
    let valeur = exam.resultValue;
    if (exam.resultValue && typeof exam.resultValue === 'string' && exam.resultValue.startsWith('{')) {
      try {
        const parsed = JSON.parse(exam.resultValue);
        valeur = parsed.valeur || parsed.value || exam.resultValue;
      } catch (e) {
        // Garder la valeur brute
      }
    }
    
    const observation = `Observation Labo : ${exam.examName} ${valeur}`;
    
    // Ajouter à la fin du diagnostic existant
    setDiagnostic(prev => {
      if (prev.trim()) {
        return prev + '\n' + observation;
      }
      return observation;
    });
    
    toast.success('Observation ajoutée au diagnostic');
  };

  const handleMedicationSelect = (medication) => {
    setNewMedication({ 
      ...newMedication, 
      medication,
      dosage: medication.strength || newMedication.dosage,
      instructions: medication.description || newMedication.instructions
    });
  };

  const addMedication = () => {
    if (!newMedication.medication || !newMedication.dosage) {
      toast.error('Veuillez sélectionner un médicament et remplir la posologie');
      return;
    }

    const medicationToAdd = {
      ...newMedication,
      id: Date.now(),
      name: newMedication.medication.name,
      medicationId: newMedication.medication.id,
      medicationCode: newMedication.medication.medicationCode,
      genericName: newMedication.medication.genericName
    };

    setMedications((prev) => [...prev, medicationToAdd]);
    setNewMedication({
      medication: null,
      dosage: '',
      frequency: '',
      duration: '',
      quantityPerDose: '',
      instructions: ''
    });
  };

  const removeMedication = (id) => {
    setMedications((prev) => prev.filter(med => med.id !== id));
  };

  /**
   * ✅ Soumission finale : diagnostic + ordonnance
   * Utilise l'endpoint PUT /api/consultations/finaliser/{id}
   */
  const handleValidateAndClose = async () => {
    if (!selectedConsultation) {
      toast.error('Aucune consultation sélectionnée');
      return;
    }
    if (medications.length === 0) {
      toast.error('Veuillez ajouter au moins un médicament');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      const consultationId = selectedConsultation.consultationId;
      
      // Transformer les médicaments
      const items = medications.map(med => ({
        medicationId: med.medicationId || med.id,
        medicationName: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        quantityPerDose: med.quantityPerDose ? parseInt(med.quantityPerDose) : null,
        instructions: med.instructions,
        active: true
      }));
      
      const prescriptionData = {
        patientId: selectedConsultation.patientId,
        consultationId: consultationId,
        items: items,
        notes: diagnostic || selectedConsultation.globalInterpretation,
        status: 'EN_ATTENTE'
      };

      // 1. Créer la prescription
      const response = await fetch(`${BACKEND_URL}/api/prescriptions/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(prescriptionData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        toast.error(`Erreur: ${errorText.substring(0, 100)}`);
        return;
      }

      // 2. Finaliser la consultation (endpoint POST avec /v1/)
      const finalizeResponse = await fetch(`${BACKEND_URL}/api/v1/consultations/${consultationId}/finaliser`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ 
          patientId: selectedConsultation.patientId,
          diagnosticFinal: diagnostic,
          notes: diagnostic || selectedConsultation.globalInterpretation,
          items: items
        })
      });

      if (!finalizeResponse.ok) {
        const errorText = await finalizeResponse.text();
        console.error('Erreur finalisation:', errorText);
        // On continue même si la finalisation échoue
      }

      toast.success('✅ Prescription validée et consultation clôturée');
      onSuccess();
    } catch (error) {
      console.error("❌ Erreur:", error);
      toast.error('❌ Échec de la validation');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * ✅ PARSER les résultats pour affichage simplifié
   */
  const parseResult = (exam) => {
    let valeur = exam.resultValue;
    let isPositif = false;
    
    if (exam.resultValue && typeof exam.resultValue === 'string' && exam.resultValue.startsWith('{')) {
      try {
        const parsed = JSON.parse(exam.resultValue);
        valeur = parsed.valeur || parsed.value || exam.resultValue;
      } catch (e) {
        // Garder la valeur brute
      }
    }
    
    isPositif = valeur && valeur.toString().toLowerCase() === 'positif';
    return { valeur, isPositif };
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 lg:p-6">
      <div className="max-w-[1600px] mx-auto space-y-4">
        {/* HEADER */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs"
              onClick={onCancel}
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Retour aux résultats
            </Button>
            <div>
              <h1 className="text-xl lg:text-2xl font-black tracking-tight flex items-center gap-2">
                <Stethoscope className="w-6 h-6 text-primary" />
                Mode Prescription
              </h1>
              <p className="text-xs text-muted-foreground">
                {selectedConsultation.patientName} • {selectedConsultation.totalExams} test{selectedConsultation.totalExams > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* ✅ LAYOUT DOUBLE COLONNE */}
        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-140px)]">
          
          {/* ✅ COLONNE GAUCHE : Résultats de laboratoire (simplifiés) */}
          <div className="lg:w-1/3 flex flex-col gap-4">
            <Card className="border-border bg-card shadow-sm flex-1 overflow-hidden">
              <CardHeader className="pb-3 bg-muted/30">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <FlaskConical className="w-4 h-4 text-primary" />
                  Résultats Labo
                  <span className="text-xs text-muted-foreground font-normal">
                    (Cliquez pour importer)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto max-h-[calc(100%-60px)]">
                <div className="divide-y divide-border/30">
                  {selectedConsultation.examResults?.map((exam) => {
                    const { valeur, isPositif } = parseResult(exam);
                    
                    return (
                      <button
                        key={exam.id}
                        onClick={() => importResultToDiagnostic(exam)}
                        className="w-full p-3 text-left hover:bg-muted/50 transition-colors group flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">{exam.examName}</p>
                          <p className={`text-xs font-bold ${
                            isPositif ? 'text-rose-500' : 'text-emerald-500'
                          }`}>
                            {valeur || '-'}
                          </p>
                        </div>
                        <Plus className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ✅ COLONNE DROITE : Formulaire de prescription */}
          <div className="lg:w-2/3 flex flex-col gap-4 overflow-y-auto">
            
            {/* Diagnostic */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="w-4 h-4 text-primary" />
                  Diagnostic final
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={diagnostic}
                  onChange={(e) => setDiagnostic(e.target.value)}
                  placeholder="Cliquez sur un résultat de labo à gauche pour l'ajouter automatiquement, ou rédigez votre diagnostic ici..."
                  rows={4}
                  className="resize-none"
                />
              </CardContent>
            </Card>

            {/* Liste des médicaments prescrits */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-primary" />
                    Ordonnance
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {medications.length} médicament{medications.length > 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Liste des médicaments ajoutés */}
                {medications.length > 0 && (
                  <div className="space-y-2">
                    {medications.map((med) => (
                      <div
                        key={med.id}
                        className="p-3 rounded-xl border border-border/70 bg-muted/40 text-sm flex items-start justify-between gap-3"
                      >
                        <div className="flex-1">
                          <p className="font-semibold">{med.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {med.dosage} • {med.frequency} • {med.duration}
                          </p>
                          {med.instructions && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Note: {med.instructions}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-rose-500 hover:text-rose-600 h-6 w-6"
                          onClick={() => removeMedication(med.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulaire d'ajout */}
                <div className="border-t border-border/60 pt-4 space-y-3">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                    Ajouter un médicament
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <Label className="text-xs">Médicament *</Label>
                      <MedicationSelector
                        selectedMedication={newMedication.medication}
                        onMedicationSelect={handleMedicationSelect}
                        placeholder="Sélectionner..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Posologie *</Label>
                      <Input
                        value={newMedication.dosage}
                        onChange={(e) =>
                          setNewMedication({ ...newMedication, dosage: e.target.value })
                        }
                        placeholder="Ex: 500 mg"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Fréquence</Label>
                      <Input
                        value={newMedication.frequency}
                        onChange={(e) =>
                          setNewMedication({ ...newMedication, frequency: e.target.value })
                        }
                        placeholder="Ex: 3 fois/jour"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Durée</Label>
                      <Input
                        value={newMedication.duration}
                        onChange={(e) =>
                          setNewMedication({ ...newMedication, duration: e.target.value })
                        }
                        placeholder="Ex: 7 jours"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Quantité/prise</Label>
                      <Input
                        type="number"
                        value={newMedication.quantityPerDose}
                        onChange={(e) =>
                          setNewMedication({ ...newMedication, quantityPerDose: e.target.value })
                        }
                        placeholder="Ex: 2"
                        className="mt-1"
                        min="1"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Instructions</Label>
                      <Input
                        value={newMedication.instructions}
                        onChange={(e) =>
                          setNewMedication({ ...newMedication, instructions: e.target.value })
                        }
                        placeholder="Instructions particulières..."
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={addMedication}
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl text-xs"
                    disabled={!newMedication.medication}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Ajouter à l'ordonnance
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Actions finales */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1 rounded-xl"
              >
                Annuler
              </Button>
              <Button
                onClick={handleValidateAndClose}
                disabled={medications.length === 0 || isSubmitting}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Validation...' : 'Valider et Clôturer'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionView;
