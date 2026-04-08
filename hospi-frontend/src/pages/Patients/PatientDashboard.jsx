import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, FileText, ArrowRight, Clock, CheckCircle, 
  Activity, Loader2, Plus, UserRound, CreditCard, History 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom'; 
import BookAppointmentModal from './BookAppointmentModal'; 

const PatientDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate(); 
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPatientProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error("Session expirée");

      const response = await api.get('/api/v1/patients/me');
      
      if (response.data && response.data.data) {
        setPatientData(response.data.data);
      }
    } catch (error) {
      console.error("Erreur profil:", error);
      if (error.response?.status === 404) {
        toast.error("Dossier patient introuvable", {
          description: "Veuillez compléter votre profil patient."
        });
        navigate('/patients/profile');
      } else if (error.response?.status !== 401) {
        toast.error("Données médicales indisponibles", {
          description: "Vérifiez votre connexion au serveur Inua Afia."
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatientProfile();
  }, [fetchPatientProfile]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-muted-foreground font-medium text-lg tracking-tight">Synchronisation de votre dossier médical...</p>
      </div>
    );
  }

  const consultations = patientData?.consultations || [];
  const nextAptData = consultations.length > 0 ? consultations[0] : null;
  const hasAppointment = !!nextAptData;

  const stats = [
    { 
      label: "Groupe Sanguin", 
      value: patientData?.bloodType || user?.bloodType || "N/A", 
      icon: Activity, 
      color: "text-rose-500", 
      bg: "bg-rose-500/10" 
    },
    { 
      label: "Documents", 
      value: `${patientData?.documentCount || 0} document(s)`, 
      icon: FileText, 
      color: "text-emerald-500", 
      bg: "bg-emerald-500/10" 
    },
    { 
      label: "Allergies", 
      value: patientData?.allergies || "Aucune", 
      icon: CheckCircle, 
      color: "text-amber-500", 
      bg: "bg-amber-500/10" 
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tight mb-3">
            Bonjour, <span className="text-emerald-500">{patientData?.firstName || user?.firstName || "Patient"}</span> 👋
          </h1>
          <p className="text-muted-foreground text-lg font-medium">
            Identifiant Patient : <span className="text-foreground font-bold">{patientData?.patientCode || "Chargement..."}</span>
          </p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Prendre un rendez-vous
        </button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {stats.map((stat, i) => (
          <div key={i} className="bg-card border border-border p-6 rounded-[2.5rem] flex items-center gap-4 transition-all hover:shadow-xl hover:border-emerald-500/20 group">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", stat.bg)}>
              <stat.icon className={cn("w-7 h-7", stat.color)} />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{stat.label}</p>
              <p className="text-xl font-black text-foreground truncate max-w-[150px]">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold text-foreground mb-4 ml-2">Votre prochain rendez-vous </h2>
          <div className={cn(
            "rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group transition-all duration-500",
            hasAppointment ? "bg-emerald-500 shadow-emerald-500/30" : "bg-slate-700 shadow-slate-900/20"
          )}>
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
            
            <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-4">
                <div className="inline-flex items-center px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                  {hasAppointment ? "Consultation Confirmée" : "Aucune visite prévue"}
                </div>
                
                {hasAppointment ? (
                  <div>
                    <h3 className="text-3xl md:text-4xl font-black mb-1">Dr. {nextAptData.doctorName}</h3>
                    <p className="text-emerald-50 text-lg font-medium opacity-90">{nextAptData.specialty || "Médecin Spécialiste"}</p>
                    <div className="flex flex-wrap gap-6 pt-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-emerald-200" />
                        <span className="font-bold">{new Date(nextAptData.consultationDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-emerald-200" />
                        <span className="font-bold">{new Date(nextAptData.consultationDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-3xl font-black mb-1">Besoin d'un médecin ?</h3>
                    <p className="text-slate-300 text-lg font-medium">Nos spécialistes sont à votre écoute.</p>
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => navigate('/patient/appointments')}
                className="bg-white text-emerald-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-emerald-50 transition-all shadow-xl active:scale-95"
              >
                {hasAppointment ? "Gérer mes RDV" : "Prendre RDV"}
              </button>
            </div>
          </div>

          {/* Section Services Hospitaliers CORRIGÉE */}
          <div className="mt-10">
            <h2 className="text-xl font-bold text-foreground mb-4 ml-2">Services Hospitaliers</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Historique', icon: History, path: '/patient/appointments', color: 'text-blue-500' },
                { label: 'Mes Documents', icon: FileText, path: '/patient/documents', color: 'text-emerald-500' },
                { label: 'Mon Profil', icon: UserRound, path: '/patient/profile', color: 'text-purple-500' },
                { label: 'Factures', icon: CreditCard, path: '/patient/billing', color: 'text-amber-500' },
              ].map((action, i) => (
                <button 
                  key={i} 
                  onClick={() => navigate(action.path)}
                  className="flex flex-col items-center justify-center p-6 bg-card border border-border rounded-[2rem] hover:border-emerald-500 hover:text-emerald-500 transition-all group shadow-sm hover:shadow-md active:scale-95"
                >
                  <action.icon className={cn("w-6 h-6 mb-3 group-hover:scale-110 transition-transform", action.color)} />
                  <span className="text-[10px] font-black uppercase text-center tracking-tighter">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Droite */}
        <div className="lg:col-span-1">
          <h2 className="text-xl font-bold text-foreground mb-4 ml-2">Fiche d'identité</h2>
          <div className="bg-card border border-border rounded-[2.5rem] p-6 space-y-6 shadow-sm">
            <div className="space-y-4">
                <div className="p-5 bg-muted/30 rounded-3xl border border-border hover:border-emerald-500/30 transition-colors">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Adresse Résidentielle</p>
                    <p className="text-sm font-black text-foreground">{patientData?.address || user?.address || "Non renseignée"}</p>
                </div>
                <div className="p-5 bg-muted/30 rounded-3xl border border-border hover:border-emerald-500/30 transition-colors">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Assurance</p>
                    <p className="text-sm font-black text-foreground">{patientData?.insuranceProvider || "Privé"}</p>
                    <p className="text-xs text-emerald-500 font-bold mt-1">N° {patientData?.insuranceNumber || "Non spécifié"}</p>
                </div>
            </div>
            
            <div className="pt-6 border-t border-border">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Affections chroniques</p>
                <div className="flex flex-wrap gap-2">
                    {patientData?.chronicDiseases ? patientData.chronicDiseases.split(',').map((d, i) => (
                        <span key={i} className="px-3 py-1.5 bg-rose-500/10 text-rose-500 rounded-xl text-[10px] font-black uppercase border border-rose-500/20">
                            {d.trim()}
                        </span>
                    )) : <span className="text-xs text-muted-foreground italic">Aucun antécédent majeur</span>}
                </div>
            </div>
          </div>
        </div>
      </div>

      <BookAppointmentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
          fetchPatientProfile(); 
          setIsModalOpen(false);
          toast.success("Rendez-vous enregistré !");
        }}
      />
    </div>
  );
};

export default PatientDashboard;