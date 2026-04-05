import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  Activity, 
  Clock, 
  User as UserIcon,
  AlertCircle,
  Stethoscope
} from 'lucide-react';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Separator } from '../../components/ui/separator';
import { toast } from "sonner";

const PatientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    const fetchFullDetails = async () => {
      try {
        setLoading(true);
        // Cette route appelle ton PatientController.getById(id)
        // Le DTO complet contient maintenant la liste medicalRecords grâce au mapper
        const response = await axios.get(`/patients/${id}`);
        setPatient(response.data.data);
      } catch (error) {
        toast.error("Erreur", { description: "Impossible de charger le dossier" });
      } finally {
        setLoading(false);
      }
    };
    fetchFullDetails();
  }, [id]);

  if (loading) return <div className="p-8 text-center">Chargement du dossier médical...</div>;
  if (!patient) return <div className="p-8 text-center text-destructive">Patient introuvable.</div>;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Barre d'outils supérieure */}
      <div className="p-4 border-b bg-card flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/admin/patients')} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Retour au répertoire
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" className="text-primary border-primary">Modifier le profil</Button>
          <Button className="bg-primary">Nouveau Rapport Médical</Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          
          {/* Header : Identité du Patient */}
          <div className="bg-card p-6 rounded-xl border shadow-sm flex flex-col md:flex-row gap-6">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
              {patient.firstName[0]}{patient.lastName[0]}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{patient.firstName} {patient.lastName}</h1>
                <span className="px-2 py-1 bg-muted rounded text-xs font-mono">{patient.patientCode}</span>
              </div>
              <p className="text-muted-foreground">{patient.email} • {patient.phoneNumber}</p>
              <div className="flex gap-4 mt-2">
                <div className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded font-bold border border-red-100">
                  Groupe: {patient.bloodType || 'Inconnu'}
                </div>
                <div className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold border border-blue-100">
                  {patient.gender === 'MALE' ? 'Masculin' : 'Féminin'}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation par Onglets */}
          <div className="flex gap-4 border-b">
            <button 
              onClick={() => setActiveTab('summary')}
              className={`pb-2 px-1 text-sm font-medium transition-colors ${activeTab === 'summary' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            >
              Résumé & Infos
            </button>
            <button 
              onClick={() => setActiveTab('records')}
              className={`pb-2 px-1 text-sm font-medium transition-colors ${activeTab === 'records' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            >
              Historique Médical ({patient.medicalRecords?.length || 0})
            </button>
          </div>

          {/* Contenu des onglets */}
          {activeTab === 'summary' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card p-5 rounded-xl border space-y-4">
                <h3 className="font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4 text-destructive" /> Alertes & Allergies</h3>
                <p className="text-sm p-3 bg-destructive/5 rounded-lg text-destructive font-medium border border-destructive/10">
                  {patient.allergies || "Aucune allergie connue"}
                </p>
                <Separator />
                <h3 className="font-bold flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500" /> Maladies Chroniques</h3>
                <p className="text-sm text-muted-foreground">{patient.chronicDiseases || "Néant"}</p>
              </div>

              <div className="bg-card p-5 rounded-xl border space-y-4">
                <h3 className="font-bold flex items-center gap-2"><UserIcon className="w-4 h-4" /> Contact d'urgence</h3>
                <div className="text-sm space-y-1">
                  <p className="font-medium">{patient.emergencyContact}</p>
                  <p className="text-muted-foreground">{patient.emergencyPhone}</p>
                </div>
                <Separator />
                <h3 className="font-bold flex items-center gap-2"><FileText className="w-4 h-4" /> Assurance</h3>
                <p className="text-sm text-muted-foreground">{patient.insuranceProvider} - {patient.insuranceNumber}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {patient.medicalRecords && patient.medicalRecords.length > 0 ? (
                patient.medicalRecords.map((record) => (
                  <div key={record.id} className="bg-card p-5 rounded-xl border hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                          <Stethoscope className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">Diagnostic : {record.diagnosis || "En cours..."}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {new Date(record.createdAt).toLocaleDateString('fr-FR')} par Dr. {record.doctorFullName}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase">
                        {record.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 bg-muted/30 p-3 rounded-lg text-xs mb-3">
                      <div><span className="text-muted-foreground">Tension:</span> {record.bloodPressure || '--'}</div>
                      <div><span className="text-muted-foreground">Temp:</span> {record.temperature}°C</div>
                      <div><span className="text-muted-foreground">Poids:</span> {record.weight}kg</div>
                    </div>
                    <p className="text-sm text-muted-foreground italic">"{record.symptoms}"</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-xl">
                  <p className="text-muted-foreground italic">Aucun acte médical enregistré pour ce patient.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default PatientDetails;
