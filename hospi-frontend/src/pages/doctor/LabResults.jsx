import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../../services/api/api';

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import MedicationSelector from '../../components/doctor/MedicationSelector';
import PrescriptionView from './PrescriptionView';

import { 
  FileText, 
  Send, 
  RefreshCw,
  Calendar,
  Trash2,
  Plus,
  Shield,
  ArrowLeft,
  FlaskConical,
  AlertCircle,
  Beaker
} from 'lucide-react';

const statusColor = {
  TERMINE: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
  RESULTAT_DISPONIBLE: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
  EN_ATTENTE: 'bg-orange-500/10 text-orange-400 border border-orange-500/30',
  EN_COURS: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
  DEFAULT: 'bg-muted text-muted-foreground border border-border'
};

const LabResultsDoctor = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [consultations, setConsultations] = useState([]);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [isPrescribing, setIsPrescribing] = useState(false);
  const [medications, setMedications] = useState([]);
  const [newMedication, setNewMedication] = useState({
    medication: null, // Objet médicament complet
    dosage: '',
    frequency: '',
    duration: '',
    quantityPerDose: '',
    instructions: ''
  });

  useEffect(() => {
    loadLabResults();
  }, []);

  const loadLabResults = async () => {
    try {
      setLoading(true);
      // ✅ NOUVEL ENDPOINT : Récupère les consultations groupées
      const response = await api.get('/lab-tests/doctor/consultations');
      const data = response.data;
      // ✅ Filtrer pour exclure les consultations déjà traitées (TERMINE)
      const activeConsultations = (data.data || []).filter(c => c.status !== 'TERMINE');
      setConsultations(activeConsultations);
    } catch (error) {
      console.error('❌ Erreur chargement résultats:', error);
      toast.error('Impossible de charger les résultats de laboratoire');
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    return statusColor[status] || statusColor.DEFAULT;
  };

  const handleStartPrescription = () => {
    if (!selectedConsultation) {
      toast.error('Veuillez sélectionner une consultation');
      return;
    }
    setIsPrescribing(true);
  };

  const handleCancelPrescription = () => {
    setIsPrescribing(false);
  };

  const handlePrescriptionSuccess = () => {
    // ✅ Afficher message de succès
    toast.success('✅ Prescription validée, dossier archivé');
    
    // ✅ Supprimer la consultation de la liste locale
    setConsultations(prev => prev.filter(c => c.consultationId !== selectedConsultation.consultationId));
    
    // ✅ Réinitialiser l'état
    setIsPrescribing(false);
    setMedications([]);
    setSelectedConsultation(null);
    
    // ✅ Recharger la liste (au cas où)
    loadLabResults();
  };

  const handleMedicationSelect = (medication) => {
    setNewMedication({ 
      ...newMedication, 
      medication,
      // Pré-remplir automatiquement certaines informations si disponible
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

  const handleSendToPharmacy = async () => {
    if (!selectedConsultation) {
      toast.error('Aucune consultation sélectionnée');
      return;
    }
    if (medications.length === 0) {
      toast.error('Veuillez ajouter au moins un médicament');
      return;
    }

    try {
      // ✅ Utilise directement l'ID de la consultation sélectionnée
      const consultationId = selectedConsultation.consultationId;
      
      if (!consultationId) {
        toast.error('❌ Aucune consultation associée. Veuillez contacter l\'administrateur.');
        return;
      }
      
      // Transformer les médicaments en PrescriptionItemDTO
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
        notes: selectedConsultation.globalInterpretation,
        status: 'EN_ATTENTE'
      };

      const token = localStorage.getItem('token');
      const response = await fetch('/api/prescriptions/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(prescriptionData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Échec de l\'envoi à la pharmacie';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = `Erreur ${response.status}: ${errorText.substring(0, 100)}`;
        }
        toast.error(`❌ Erreur: ${errorMessage}`);
        return;
      }

      const result = await response.json();
      toast.success('✅ Prescription envoyée à la pharmacie avec succès');
      setShowPrescriptionModal(false);
      setMedications([]);
      setSelectedConsultation(null);
      loadLabResults();
    } catch (error) {
      console.error("❌ Erreur envoi pharmacie:", error);
      toast.error('❌ Échec de l\'envoi à la pharmacie');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="flex items-center justify-center mb-4">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          </div>
          <p className="text-sm font-medium">Chargement des résultats de laboratoire...</p>
        </div>
      </div>
    );
  }

  // ✅ MODE PRESCRIPTION : Affiche la vue double écran
  if (isPrescribing && selectedConsultation) {
    return (
      <PrescriptionView
        selectedConsultation={selectedConsultation}
        onCancel={handleCancelPrescription}
        onSuccess={handlePrescriptionSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
              Résultats de Laboratoire
            </h1>
            <p className="text-xs lg:text-sm text-muted-foreground mt-1">
              Consultez les résultats groupés par consultation et prescrivez les traitements.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl text-xs"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-3 h-3 mr-1" />
            Retour
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LISTE GAUCHE - CONSULTATIONS (BOÎTES) */}
          <div className="lg:col-span-1">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-primary" />
                    Résultats reçus
                  </span>
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                    {consultations.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {consultations.length === 0 ? (
                    <div className="py-10 text-center text-xs text-muted-foreground">
                      Aucun résultat reçu pour le moment.
                    </div>
                  ) : (
                    // ✅ AFFICHE TOUTES LES CONSULTATIONS AVEC DES RÉSULTATS DE LABO
                    (() => {
                      // Afficher toutes les consultations qui ont des résultats (hasResults === true)
                      // ou qui ont des examens (totalExams > 0)
                      const filteredConsultations = consultations.filter(c => 
                        c.hasResults === true || c.totalExams > 0 || c.examResults?.length > 0
                      );
                      
                      if (filteredConsultations.length === 0) {
                        return (
                          <div className="py-10 text-center text-xs text-muted-foreground">
                            Aucun résultat prêt à analyser pour le moment.
                          </div>
                        );
                      }
                      
                      return filteredConsultations.map((consultation) => {
                      const isSelected = selectedConsultation?.consultationId === consultation.consultationId;
                      const statusClass = getStatusClass(consultation.status);
                      // ✅ NOUVEAU : Toute consultation avec résultats non encore vue
                      const isNew = consultation.hasResults === true || consultation.status === 'RESULTAT_DISPONIBLE' || consultation.status === 'RESULTATS_PRETS';

                      return (
                        <button
                          key={consultation.consultationId}
                          onClick={() => setSelectedConsultation(consultation)}
                          className={[
                            'w-full text-left p-3 rounded-xl border transition-all cursor-pointer relative',
                            isSelected
                              ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                              : 'border-border hover:bg-muted/60'
                          ].join(' ')}
                        >
                          {/* Badge NOUVEAU */}
                          {isNew && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] px-1.5 py-0 rounded animate-pulse">
                              NOUVEAU
                            </span>
                          )}
                          
                          {/* Badge CRITIQUE */}
                          {consultation.criticalExams > 0 && (
                            <span className="absolute -top-1 -left-1 bg-rose-500 text-white text-[8px] px-1.5 py-0 rounded flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {consultation.criticalExams}
                            </span>
                          )}
                          
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-sm font-semibold truncate">
                              {consultation.patientName}
                            </p>
                            <Badge className={`text-[9px] ${statusClass}`}>
                              {consultation.status?.replace('_', ' ') || 'N/A'}
                            </Badge>
                          </div>

                          <div className="space-y-1 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {consultation.consultationDate
                                  ? new Date(consultation.consultationDate).toLocaleDateString()
                                  : 'Date inconnue'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Beaker className="w-3 h-3" />
                              <span className="truncate font-medium text-foreground">
                                {/* ✅ AFFICHE LE TITRE AVEC NOMBRE DE TESTS */}
                                {consultation.displayTitle || `${consultation.totalExams} test${consultation.totalExams > 1 ? 's' : ''}`}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    });
                  })()
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* DÉTAIL DROITE - TABLEAU DES EXAMENS */}
          <div className="lg:col-span-2">
            {selectedConsultation ? (
              <Card className="border-border bg-card shadow-sm">
                <CardHeader className="pb-4 border-b border-border/60">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg font-bold">
                        <FlaskConical className="w-5 h-5 text-primary" />
                        {/* ✅ TITRE DE LA CONSULTATION */}
                        {selectedConsultation.consultationTitle || 'Examens de laboratoire'}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        Patient : <span className="font-semibold">{selectedConsultation.patientName}</span>
                        {' '}• {selectedConsultation.totalExams} test{selectedConsultation.totalExams > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs font-semibold"
                        onClick={() => navigate(`/doctor/medical-report/${selectedConsultation.consultationId}`)}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Dossier complet
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold"
                        onClick={handleStartPrescription}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Prescrire
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-6">
                  {/* Infos patient */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/40 border border-border/60">
                    <div>
                      <Label className="text-[11px] uppercase text-muted-foreground font-semibold">
                        Patient
                      </Label>
                      <p className="text-sm font-medium mt-1">
                        {selectedConsultation.patientName}
                      </p>
                    </div>
                    <div>
                      <Label className="text-[11px] uppercase text-muted-foreground font-semibold">
                        Date de l'examen
                      </Label>
                      <p className="text-sm font-medium mt-1">
                        {selectedConsultation.consultationDate
                          ? new Date(selectedConsultation.consultationDate).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* ✅ TABLEAU DES RÉSULTATS - Structure correcte avec colonnes */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">
                      Résultats d'analyse
                    </h3>
                    <div className="rounded-lg border border-border/60 overflow-hidden">
                      {/* ✅ EN-TÊTE DU TABLEAU AVEC 4 COLONNES */}
                      <div className="grid grid-cols-12 gap-2 p-3 bg-muted/60 text-xs font-semibold uppercase text-muted-foreground">
                        <span className="col-span-4">Nom de l'examen</span>
                        <span className="col-span-2">Résultat</span>
                        <span className="col-span-2">Unité</span>
                        <span className="col-span-2">Référence</span>
                        <span className="col-span-2">Commentaire</span>
                      </div>
                      
                      {/* ✅ CORPS DU TABLEAU - MAP SUR LES EXAMENS */}
                      <div className="divide-y divide-border/30">
                        {selectedConsultation.examResults?.map((exam, index) => {
                          // ✅ PARSING DU JSON resultValue
                          let valeur = exam.resultValue;
                          let unite = exam.unit;
                          
                          if (exam.resultValue && typeof exam.resultValue === 'string' && exam.resultValue.startsWith('{')) {
                            try {
                              const parsed = JSON.parse(exam.resultValue);
                              valeur = parsed.valeur || parsed.value || exam.resultValue;
                              unite = parsed.unite || parsed.unit || exam.unit;
                            } catch (e) {
                              // Garder la valeur brute si parsing échoue
                            }
                          }
                          
                          // ✅ Alerte visuelle si valeur est "positif"
                          const isPositif = valeur && valeur.toString().toLowerCase() === 'positif';
                          
                          return (
                            <div 
                              key={exam.id} 
                              className={`grid grid-cols-12 gap-2 p-3 text-sm items-center text-center ${
                                index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                              }`}
                            >
                              {/* Colonne 1: Nom de l'examen */}
                              <span className="col-span-4 font-medium text-left">
                                {exam.examName}
                              </span>
                              
                              {/* Colonne 2: Résultat (valeur extraite) */}
                              <span className={`col-span-2 font-bold ${
                                isPositif ? 'text-rose-500' : 'text-emerald-500'
                              }`}>
                                {valeur || '-'}
                              </span>
                              
                              {/* Colonne 3: Unité (unite extraite) */}
                              <span className="col-span-2 text-muted-foreground">
                                {unite || '-'}
                              </span>
                              
                              {/* Colonne 4: Norme/Référence */}
                              <span className="col-span-2 text-xs text-muted-foreground">
                                {exam.referenceRange || '-'}
                              </span>
                              
                              {/* Colonne 5: Commentaire */}
                              <span className="col-span-2 text-xs text-muted-foreground truncate">
                                {exam.comment || '-'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Interprétation globale du biologiste */}
                  {selectedConsultation.globalInterpretation && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3">
                        Interprétation du biologiste
                      </h3>
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <p className="text-sm text-foreground">
                          {selectedConsultation.globalInterpretation}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed border-border bg-card/40">
                <CardContent className="py-16 text-center space-y-3">
                  <FlaskConical className="w-12 h-12 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">
                    Sélectionnez une consultation dans la liste de gauche pour afficher les résultats.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* MODAL PRESCRIPTION */}
        {showPrescriptionModal && selectedConsultation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border shadow-xl">
              <CardHeader className="border-b border-border/60">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items_center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Prescription médicamenteuse
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full"
                    onClick={() => setShowPrescriptionModal(false)}
                  >
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-6">
                {/* Infos patient et consultation */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border/60 text-sm">
                  <p className="font-semibold">
                    Patient : <span className="font-bold">{selectedConsultation.patientName}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Consultation : {selectedConsultation.consultationTitle || 'Examens laboratoire'}
                    {' '}({selectedConsultation.totalExams} test{selectedConsultation.totalExams > 1 ? 's' : ''})
                  </p>
                </div>

                {/* Liste des médicaments */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">
                    Médicaments prescrits
                  </h3>
                  {medications.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Aucun médicament ajouté pour l'instant.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {medications.map((med) => (
                        <div
                          key={med.id}
                          className="p-3 rounded-xl border border-border/70 bg-muted/40 text-sm"
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold">{med.name}</p>
                                {med.medicationCode && (
                                  <Badge variant="outline" className="text-xs">
                                    {med.medicationCode}
                                  </Badge>
                                )}
                              </div>
                              {med.genericName && (
                                <p className="text-xs text-muted-foreground mb-1">
                                  DCI : {med.genericName}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                Posologie : <span className="font-medium">{med.dosage}</span>
                                {med.frequency && <> • Fréquence : {med.frequency}</>}
                                {med.duration && <> • Durée : {med.duration}</>}
                              </p>
                              {med.instructions && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Instructions : {med.instructions}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-rose-500 hover:text-rose-600"
                              onClick={() => removeMedication(med.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ajout médicament */}
                <div className="border-t border-border/60 pt-4 space-y-3">
                  <h3 className="text-sm font-semibold mb-1">
                    Ajouter un médicament
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label>Médicament *</Label>
                      <MedicationSelector
                        selectedMedication={newMedication.medication}
                        onMedicationSelect={handleMedicationSelect}
                        placeholder="Sélectionner un médicament dans le stock..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Posologie *</Label>
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
                      <Label>Quantité par prise</Label>
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
                    <div>
                      <Label>Fréquence</Label>
                      <Input
                        value={newMedication.frequency}
                        onChange={(e) =>
                          setNewMedication({ ...newMedication, frequency: e.target.value })
                        }
                        placeholder="Ex: 3 fois par jour"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Durée</Label>
                      <Input
                        value={newMedication.duration}
                        onChange={(e) =>
                          setNewMedication({ ...newMedication, duration: e.target.value })
                        }
                        placeholder="Ex: 7 jours"
                        className="mt-1"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Instructions</Label>
                      <Textarea
                        value={newMedication.instructions}
                        onChange={(e) =>
                          setNewMedication({ ...newMedication, instructions: e.target.value })
                        }
                        placeholder="Instructions particulières..."
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={addMedication}
                    variant="outline"
                    className="mt-3 w-full rounded-xl text-sm"
                    disabled={!newMedication.medication}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter à la prescription
                  </Button>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/60">
                  <Button
                    variant="outline"
                    onClick={() => setShowPrescriptionModal(false)}
                    className="flex-1 rounded-xl text-sm"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSendToPharmacy}
                    disabled={medications.length === 0}
                    className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Envoyer à la pharmacie
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabResultsDoctor;