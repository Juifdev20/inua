import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  FileText,
  Beaker,
  Pill,
  Calendar,
  ChevronDown,
  ChevronRight,
  Eye,
  X,
  User,
  Stethoscope,
  Thermometer,
  Ruler,
  Activity,
  ClipboardList,
  HeartPulse,
  AlertCircle,
  Repeat,
  Clock,
  DollarSign,
  ExternalLink
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import api from '../../services/api';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

/**
 * Panneau d'historique médical complet du patient (LECTURE SEULE)
 * Affiche les consultations passées avec prescriptions détaillées, examens et signes vitaux
 */
const PatientHistoryPanel = ({ patientId, currentConsultationId, onRenewPrescription }) => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const [patientInfo, setPatientInfo] = useState(null);

  useEffect(() => {
    if (patientId) {
      loadPatientHistory();
    }
  }, [patientId]);

  const loadPatientHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/v1/consultations/patient/${patientId}`);
      const consultations = response.data.data || [];

      const pastConsultations = consultations.filter(
        c => c.id !== currentConsultationId && c.id !== parseInt(currentConsultationId)
      );

      // Extraire les infos patient depuis la première consultation disponible
      if (pastConsultations.length > 0) {
        const first = pastConsultations[0];
        setPatientInfo({
          name: first.patientName || `${first.patient?.firstName || ''} ${first.patient?.lastName || ''}`.trim(),
          photo: first.patientPhoto,
          gender: first.gender,
          dateOfBirth: first.dateOfBirth,
          phoneNumber: first.phoneNumber,
          profession: first.profession,
          maritalStatus: first.maritalStatus,
          birthPlace: first.birthPlace,
          nationality: first.nationality,
          religion: first.religion
        });
      }

      // Expand all consultations by default
      const allExpanded = pastConsultations.reduce((acc, c) => {
        acc[c.id] = true;
        return acc;
      }, {});
      setExpandedItems(allExpanded);

      setHistory(pastConsultations);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (consultationId) => {
    setExpandedItems(prev => ({
      ...prev,
      [consultationId]: !prev[consultationId]
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    if (amount == null) return '--';
    const symbol = currency === 'CDF' ? 'FC' : '$';
    return `${symbol} ${Number(amount).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'TERMINEE': { color: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300', label: 'Terminée' },
      'termine': { color: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300', label: 'Terminée' },
      'EN_COURS': { color: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300', label: 'En cours' },
      'en_cours': { color: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300', label: 'En cours' },
      'EN_ATTENTE': { color: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300', label: 'En attente' },
      'en_attente': { color: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300', label: 'En attente' },
      'TREATED': { color: 'bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300', label: 'Traitée' },
      'PHARMACIE_EN_ATTENTE': { color: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300', label: 'Pharmacie en attente' },
      'LABO_EN_ATTENTE': { color: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300', label: 'Labo en attente' },
      'PAYEE': { color: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300', label: 'Payée' },
      'PRESCRITE': { color: 'bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300', label: 'Prescrite' },
      'DELIVREE': { color: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300', label: 'Délivrée' }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300', label: status };
    return (
      <Badge className={cn("text-xs", config.color)}>
        {config.label}
      </Badge>
    );
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    try {
      const birth = new Date(dob);
      const diff = Date.now() - birth.getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* ─── FICHE PATIENT ─── */}
      {patientInfo && (
        <div className="rounded-xl border border-border bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20 shrink-0">
                {patientInfo.photo ? (
                  <img src={`${BACKEND_URL}${patientInfo.photo}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-primary" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-foreground">{patientInfo.name || 'Patient'}</h3>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {patientInfo.gender && <span>{patientInfo.gender === 'MALE' ? 'Homme' : patientInfo.gender === 'FEMALE' ? 'Femme' : patientInfo.gender}</span>}
                  {patientInfo.dateOfBirth && <span>{calculateAge(patientInfo.dateOfBirth)} ans</span>}
                  {patientInfo.phoneNumber && <span>Tél: {patientInfo.phoneNumber}</span>}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-lg text-xs"
              onClick={() => navigate(`/doctor/patients/${patientId}`)}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Voir fiche complète
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-muted-foreground">
            {patientInfo.profession && <span><span className="font-medium">Profession:</span> {patientInfo.profession}</span>}
            {patientInfo.maritalStatus && <span><span className="font-medium">État civil:</span> {patientInfo.maritalStatus}</span>}
            {patientInfo.nationality && <span><span className="font-medium">Nationalité:</span> {patientInfo.nationality}</span>}
            {patientInfo.religion && <span><span className="font-medium">Religion:</span> {patientInfo.religion}</span>}
            {patientInfo.birthPlace && <span className="col-span-2"><span className="font-medium">Né(e) à:</span> {patientInfo.birthPlace}</span>}
          </div>
        </div>
      )}

      {/* ─── HISTORIQUE ─── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
          <p className="text-sm font-medium">Chargement de l'historique...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-border">
          <div className="w-16 h-16 rounded-full bg-background border-2 border-border flex items-center justify-center mb-4">
            <History className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-base font-semibold mb-1 text-foreground">Aucun historique disponible</p>
          <p className="text-sm text-muted-foreground text-center max-w-xs">Ce patient n'a pas de consultations antérieures enregistrées</p>
        </div>
      ) : (
        history.map((consultation, index) => (
          <div
            key={consultation.id}
            className="group border rounded-xl overflow-hidden bg-background hover:shadow-md transition-all duration-200 border-border"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-3 sm:p-4 bg-muted/30 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => toggleExpand(consultation.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  #{history.length - index}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground">{formatDate(consultation.consultationDate || consultation.createdAt)}</p>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    {getStatusBadge(consultation.status || consultation.statut)}
                    {consultation.doctorName && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Stethoscope className="w-3 h-3" /> Dr. {consultation.doctorName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center group-hover:shadow-sm transition-shadow shrink-0">
                {expandedItems[consultation.id] ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Détails */}
            {expandedItems[consultation.id] && (
              <div className="p-3 sm:p-4 space-y-4 border-t border-border bg-background">

                {/* Section : Motif & Symptômes */}
                {(consultation.reasonForVisit || consultation.symptoms) && (
                  <div className="bg-slate-50 dark:bg-slate-900/40 rounded-lg p-3">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2">
                      <ClipboardList className="w-3.5 h-3.5 text-primary" /> Motif & Symptômes
                    </h4>
                    {consultation.reasonForVisit && (
                      <div className="text-xs sm:text-sm mb-1">
                        <span className="font-medium text-muted-foreground">Motif:</span>
                        <p className="text-foreground mt-0.5">{consultation.reasonForVisit}</p>
                      </div>
                    )}
                    {consultation.symptoms && (
                      <div className="text-xs sm:text-sm">
                        <span className="font-medium text-muted-foreground">Symptômes:</span>
                        <p className="text-foreground mt-0.5">{consultation.symptoms}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Section : Diagnostic & Traitement */}
                {(consultation.diagnosis || consultation.treatment || consultation.notes) && (
                  <div className="bg-slate-50 dark:bg-slate-900/40 rounded-lg p-3">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2">
                      <HeartPulse className="w-3.5 h-3.5 text-rose-500" /> Diagnostic & Traitement
                    </h4>
                    {consultation.diagnosis && (
                      <div className="text-xs sm:text-sm mb-1.5">
                        <span className="font-medium text-muted-foreground">Diagnostic:</span>
                        <p className="text-foreground mt-0.5">{consultation.diagnosis}</p>
                      </div>
                    )}
                    {consultation.treatment && (
                      <div className="text-xs sm:text-sm mb-1.5">
                        <span className="font-medium text-muted-foreground">Traitement:</span>
                        <p className="text-foreground mt-0.5">{consultation.treatment}</p>
                      </div>
                    )}
                    {consultation.notes && (
                      <div className="text-xs sm:text-sm">
                        <span className="font-medium text-muted-foreground">Notes:</span>
                        <p className="text-foreground mt-0.5 italic">{consultation.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Section : Signes vitaux */}
                {(consultation.tensionArterielle || consultation.poids || consultation.temperature || consultation.taille) && (
                  <div className="bg-slate-50 dark:bg-slate-900/40 rounded-lg p-3">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2">
                      <Activity className="w-3.5 h-3.5 text-amber-500" /> Signes vitaux
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {consultation.tensionArterielle && (
                        <div className="bg-background rounded-md p-2 border border-border text-center">
                          <span className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><HeartPulse className="w-3 h-3" /> TA</span>
                          <p className="text-sm font-semibold text-foreground">{consultation.tensionArterielle}</p>
                        </div>
                      )}
                      {consultation.poids && (
                        <div className="bg-background rounded-md p-2 border border-border text-center">
                          <span className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Thermometer className="w-3 h-3" /> Poids</span>
                          <p className="text-sm font-semibold text-foreground">{consultation.poids} kg</p>
                        </div>
                      )}
                      {consultation.temperature && (
                        <div className="bg-background rounded-md p-2 border border-border text-center">
                          <span className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Thermometer className="w-3 h-3" /> Temp</span>
                          <p className="text-sm font-semibold text-foreground">{consultation.temperature}°C</p>
                        </div>
                      )}
                      {consultation.taille && (
                        <div className="bg-background rounded-md p-2 border border-border text-center">
                          <span className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Ruler className="w-3 h-3" /> Taille</span>
                          <p className="text-sm font-semibold text-foreground">{consultation.taille} cm</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Section : Examens prescrits */}
                {consultation.prescribedExams && consultation.prescribedExams.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-900/40 rounded-lg p-3">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2">
                      <Beaker className="w-3.5 h-3.5 text-violet-500" /> Examens prescrits ({consultation.prescribedExams.length})
                    </h4>
                    <div className="space-y-2">
                      {consultation.prescribedExams.map((exam, idx) => (
                        <div key={idx} className="bg-background rounded-md p-2.5 border border-border text-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{exam.serviceName || exam.examType}</p>
                              {exam.doctorNote && <p className="text-muted-foreground mt-0.5 italic">Note: {exam.doctorNote}</p>}
                            </div>
                            <div className="text-right shrink-0">
                              {exam.unitPrice != null && (
                                <p className="font-semibold text-foreground">{formatCurrency(exam.unitPrice, exam.currency)}</p>
                              )}
                              {exam.status && (
                                <Badge className={cn("text-[10px] mt-1", exam.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : exam.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700')}>
                                  {exam.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {exam.referenceMin != null && exam.referenceMax != null && (
                            <p className="text-[10px] text-muted-foreground mt-1">Réf: {exam.referenceMin} - {exam.referenceMax} {exam.unit || ''}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section : Prescriptions détaillées */}
                {consultation.prescriptions && consultation.prescriptions.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-900/40 rounded-lg p-3">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2">
                      <Pill className="w-3.5 h-3.5 text-emerald-500" /> Ordonnances ({consultation.prescriptions.length})
                    </h4>
                    <div className="space-y-3">
                      {consultation.prescriptions.map((prescription, pIdx) => (
                        <div key={pIdx} className="bg-background rounded-md p-3 border border-border">
                          {/* Header ordonnance */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs font-semibold text-foreground">{prescription.prescriptionCode || `Ordonnance #${pIdx + 1}`}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {prescription.status && getStatusBadge(prescription.status)}
                              {onRenewPrescription && (
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  className="text-[10px] text-primary hover:text-primary/80 whitespace-nowrap h-6 px-2"
                                  onClick={() => onRenewPrescription(prescription)}
                                >
                                  <Repeat className="w-3 h-3 mr-1" /> Renouveler
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Notes ordonnance */}
                          {prescription.notes && (
                            <p className="text-[11px] text-muted-foreground italic mb-2">{prescription.notes}</p>
                          )}

                          {/* Items médicaments */}
                          {prescription.items && prescription.items.length > 0 && (
                            <div className="space-y-2">
                              {prescription.items.map((item, iIdx) => (
                                <div key={iIdx} className="rounded-md bg-slate-50 dark:bg-slate-800/50 p-2.5 border border-border/60">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-foreground truncate">{item.medicationName || 'Médicament inconnu'}</p>
                                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
                                        {item.dosage && <span className="flex items-center gap-0.5"><Pill className="w-3 h-3" /> {item.dosage}</span>}
                                        {item.frequency && <span className="flex items-center gap-0.5"><Repeat className="w-3 h-3" /> {item.frequency}</span>}
                                        {item.duration && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {item.duration}</span>}
                                        {item.quantity != null && <span className="flex items-center gap-0.5">Qté: {item.quantity}</span>}
                                      </div>
                                      {item.instructions && (
                                        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-start gap-1">
                                          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" /> {item.instructions}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right shrink-0">
                                      {item.unitPrice != null && (
                                        <p className="text-xs font-semibold text-foreground">{formatCurrency(item.unitPrice, prescription.currency)}</p>
                                      )}
                                      {item.totalPrice != null && item.totalPrice !== item.unitPrice && (
                                        <p className="text-[10px] text-muted-foreground">Total: {formatCurrency(item.totalPrice, prescription.currency)}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Total ordonnance */}
                          {(prescription.totalAmount != null || prescription.amountPaid != null) && (
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border text-[11px]">
                              <span className="text-muted-foreground">Total: <span className="font-semibold text-foreground">{formatCurrency(prescription.totalAmount, prescription.currency)}</span></span>
                              {prescription.amountPaid != null && (
                                <span className="text-muted-foreground">Payé: <span className="font-semibold text-emerald-600">{formatCurrency(prescription.amountPaid, prescription.currency)}</span></span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section : Décision / Date proposée */}
                {(consultation.decisionNote || consultation.proposedNewDate) && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                    <h4 className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 mb-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Décision du médecin
                    </h4>
                    {consultation.decisionNote && <p className="text-xs text-amber-800 dark:text-amber-200">{consultation.decisionNote}</p>}
                    {consultation.proposedNewDate && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">Nouvelle date proposée: {formatDate(consultation.proposedNewDate)}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}

      {/* Footer */}
      <div className="text-[10px] sm:text-xs text-muted-foreground text-center pt-2">
        Historique en lecture seule • Consultation actuelle: #{currentConsultationId}
      </div>
    </div>
  );
};

export default PatientHistoryPanel;
