import React, { useState, useEffect } from 'react';
import { 
  History, 
  FileText, 
  Beaker, 
  Pill, 
  Calendar,
  ChevronDown,
  ChevronRight,
  Eye,
  X
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import api from '../../services/api';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

/**
 * Panneau d'historique médical du patient (LECTURE SEULE)
 * Affiche les consultations passées sans polluer la consultation actuelle
 */
const PatientHistoryPanel = ({ patientId, currentConsultationId, onRenewPrescription }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    if (patientId) {
      loadPatientHistory();
    }
  }, [patientId]);

  const loadPatientHistory = async () => {
    setLoading(true);
    try {
      // Récupérer l'historique complet du patient
      const response = await api.get(`/v1/consultations/patient/${patientId}`);
      const consultations = response.data.data || [];
      
      // Filtrer pour exclure la consultation actuelle
      const pastConsultations = consultations.filter(
        c => c.id !== currentConsultationId && c.id !== parseInt(currentConsultationId)
      );
      
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      'TERMINEE': { color: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300', label: 'Terminée' },
      'termine': { color: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300', label: 'Terminée' },
      'EN_COURS': { color: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300', label: 'En cours' },
      'en_cours': { color: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300', label: 'En cours' },
      'EN_ATTENTE': { color: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300', label: 'En attente' },
      'en_attente': { color: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300', label: 'En attente' }
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300', label: status };
    return (
      <Badge className={cn("text-xs", config.color)}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
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
            {/* Header de la consultation */}
            <div 
              className="flex items-center justify-between p-3 sm:p-4 bg-muted/30 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => toggleExpand(consultation.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  #{history.length - index}
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{formatDate(consultation.consultationDate || consultation.createdAt)}</p>
                  <div className="mt-1">{getStatusBadge(consultation.status || consultation.statut)}</div>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center group-hover:shadow-sm transition-shadow">
                {expandedItems[consultation.id] ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Détails expansibles */}
            {expandedItems[consultation.id] && (
              <div className="p-3 sm:p-4 space-y-3 border-t border-border bg-background">
                {/* Motif */}
                {consultation.reasonForVisit && (
                  <div className="text-xs sm:text-sm">
                    <span className="font-medium text-muted-foreground">Motif:</span>
                    <p className="text-foreground mt-1">{consultation.reasonForVisit}</p>
                  </div>
                )}

                {/* Diagnostic */}
                {consultation.diagnosis && (
                  <div className="text-xs sm:text-sm">
                    <span className="font-medium text-muted-foreground">Diagnostic:</span>
                    <p className="text-foreground mt-1">{consultation.diagnosis}</p>
                  </div>
                )}

                {/* Traitement */}
                {consultation.treatment && (
                  <div className="text-xs sm:text-sm">
                    <span className="font-medium text-muted-foreground">Traitement:</span>
                    <p className="text-foreground mt-1">{consultation.treatment}</p>
                  </div>
                )}

                {/* Examens */}
                {consultation.prescribedExams && consultation.prescribedExams.length > 0 && (
                  <div className="text-xs sm:text-sm">
                    <span className="font-medium text-muted-foreground flex items-center gap-1">
                      <Beaker className="w-3 h-3" /> Examens:
                    </span>
                    <ul className="mt-1 space-y-1">
                      {consultation.prescribedExams.map((exam, idx) => (
                        <li key={idx} className="text-foreground text-xs pl-2 border-l-2 border-primary/30">
                          {exam.serviceName || exam.examType}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Prescriptions */}
                {consultation.prescriptions && consultation.prescriptions.length > 0 && (
                  <div className="text-xs sm:text-sm">
                    <span className="font-medium text-muted-foreground flex items-center gap-1">
                      <Pill className="w-3 h-3" /> Prescriptions:
                    </span>
                    <ul className="mt-1 space-y-1">
                      {consultation.prescriptions.map((prescription, idx) => (
                        <li key={idx} className="flex items-center justify-between gap-2">
                          <span className="text-foreground text-xs pl-2 border-l-2 border-emerald-500/30 flex-1">
                            {prescription.medicationName || prescription.prescriptionCode}
                          </span>
                          {onRenewPrescription && (
                            <Button 
                              size="xs" 
                              variant="ghost" 
                              className="text-[10px] text-primary hover:text-primary/80 whitespace-nowrap"
                              onClick={() => onRenewPrescription(prescription)}
                            >
                              Renouveler
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Constantes vitales */}
                {(consultation.tensionArterielle || consultation.poids || consultation.temperature) && (
                  <div className="text-xs sm:text-sm bg-muted/30 p-2 rounded-lg">
                    <span className="font-medium text-muted-foreground text-[10px] sm:text-xs">Signes vitaux:</span>
                    <div className="grid grid-cols-3 gap-1 sm:gap-2 mt-1 text-[10px] sm:text-xs text-foreground">
                      {consultation.tensionArterielle && (
                        <span>TA: {consultation.tensionArterielle}</span>
                      )}
                      {consultation.poids && (
                        <span>Poids: {consultation.poids} kg</span>
                      )}
                      {consultation.temperature && (
                        <span>Temp: {consultation.temperature}°C</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
      
      {/* Footer */}
      <div className="text-[10px] sm:text-xs text-muted-foreground text-center pt-4">
        Historique en lecture seule • Consultation actuelle: #{currentConsultationId}
      </div>
    </div>
  );
};

export default PatientHistoryPanel;
