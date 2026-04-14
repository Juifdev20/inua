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
      const response = await api.get(`/api/v1/consultations/patient/${patientId}`);
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
    <div className="space-y-3">
      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Chargement de l'historique...
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <History className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-sm sm:text-base">Aucun historique disponible</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Ce patient n'a pas de consultations antérieures</p>
        </div>
      ) : (
        history.map((consultation, index) => (
          <div 
            key={consultation.id} 
            className="border rounded-lg overflow-hidden bg-white dark:bg-gray-700/50 hover:shadow-md transition-shadow border-gray-200 dark:border-gray-600"
          >
            {/* Header de la consultation */}
            <div 
              className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 dark:bg-gray-700/30 cursor-pointer"
              onClick={() => toggleExpand(consultation.id)}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs sm:text-sm">
                  {history.length - index}
                </div>
                <div>
                  <p className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white">{formatDate(consultation.consultationDate || consultation.createdAt)}</p>
                  {getStatusBadge(consultation.status || consultation.statut)}
                </div>
              </div>
              {expandedItems[consultation.id] ? (
                <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              )}
            </div>

            {/* Détails expansibles */}
            {expandedItems[consultation.id] && (
              <div className="p-2 sm:p-3 space-y-2 sm:space-y-3 border-t border-gray-200 dark:border-gray-600">
                {/* Motif */}
                {consultation.reasonForVisit && (
                  <div className="text-xs sm:text-sm">
                    <span className="font-medium text-gray-600 dark:text-gray-400">Motif:</span>
                    <p className="text-gray-800 dark:text-gray-200 mt-1">{consultation.reasonForVisit}</p>
                  </div>
                )}

                {/* Diagnostic */}
                {consultation.diagnosis && (
                  <div className="text-xs sm:text-sm">
                    <span className="font-medium text-gray-600 dark:text-gray-400">Diagnostic:</span>
                    <p className="text-gray-800 dark:text-gray-200 mt-1">{consultation.diagnosis}</p>
                  </div>
                )}

                {/* Traitement */}
                {consultation.treatment && (
                  <div className="text-xs sm:text-sm">
                    <span className="font-medium text-gray-600 dark:text-gray-400">Traitement:</span>
                    <p className="text-gray-800 dark:text-gray-200 mt-1">{consultation.treatment}</p>
                  </div>
                )}

                {/* Examens */}
                {consultation.prescribedExams && consultation.prescribedExams.length > 0 && (
                  <div className="text-xs sm:text-sm">
                    <span className="font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Beaker className="w-3 h-3" /> Examens:
                    </span>
                    <ul className="mt-1 space-y-1">
                      {consultation.prescribedExams.map((exam, idx) => (
                        <li key={idx} className="text-gray-700 dark:text-gray-300 text-xs pl-2 border-l-2 border-blue-200 dark:border-blue-800">
                          {exam.serviceName || exam.examType}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Prescriptions */}
                {consultation.prescriptions && consultation.prescriptions.length > 0 && (
                  <div className="text-xs sm:text-sm">
                    <span className="font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Pill className="w-3 h-3" /> Prescriptions:
                    </span>
                    <ul className="mt-1 space-y-1">
                      {consultation.prescriptions.map((prescription, idx) => (
                        <li key={idx} className="flex items-center justify-between gap-2">
                          <span className="text-gray-700 dark:text-gray-300 text-xs pl-2 border-l-2 border-emerald-200 dark:border-emerald-800 flex-1">
                            {prescription.medicationName || prescription.prescriptionCode}
                          </span>
                          {onRenewPrescription && (
                            <Button 
                              size="xs" 
                              variant="ghost" 
                              className="text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 whitespace-nowrap"
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
                  <div className="text-xs sm:text-sm bg-gray-50 dark:bg-gray-700/30 p-2 rounded">
                    <span className="font-medium text-gray-600 dark:text-gray-400 text-[10px] sm:text-xs">Signes vitaux:</span>
                    <div className="grid grid-cols-3 gap-1 sm:gap-2 mt-1 text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">
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
      <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 text-center pt-4">
        Historique en lecture seule • Consultation actuelle: #{currentConsultationId}
      </div>
    </div>
  );
};

export default PatientHistoryPanel;
