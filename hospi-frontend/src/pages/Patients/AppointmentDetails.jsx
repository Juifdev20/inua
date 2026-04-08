import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, Clock, MapPin, User, Check,
  FileText, AlertCircle, CalendarClock, Loader2, XCircle
} from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

const AppointmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await api.get(`/api/v1/consultations/${id}`);
      
      // ✅ CORRECTION : On accède à .data.data car le backend utilise ApiResponse<T>
      if (response.data && response.data.success) {
        setAppointment(response.data.data);
      } else {
        toast.error("Données introuvables");
      }
    } catch (error) {
      console.error("Erreur chargement détails:", error);
      toast.error("Impossible de charger les détails");
      navigate('/patient/appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (id) fetchDetails(); 
  }, [id]);

  // ✅ ACCEPTER LE REPORT (Endpoint PUT /api/v1/consultations/{id}/accept-reschedule)
  const handleAcceptReschedule = async () => {
    try {
      setIsProcessing(true);
      const token = localStorage.getItem('token');
      await api.put(`/api/v1/consultations/${id}/accept-reschedule`);
      toast.success("Nouveau créneau confirmé !");
      fetchDetails(); // Rafraîchir les données locales
    } catch (error) {
      toast.error("Erreur lors de la confirmation");
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ ANNULER LE RDV (Endpoint DELETE /api/v1/consultations/{id})
  const handleCancelAppointment = async () => {
    if (!window.confirm("Voulez-vous vraiment annuler ce rendez-vous ?")) return;
    try {
      setIsProcessing(true);
      const token = localStorage.getItem('token');
      await api.delete(`/api/v1/consultations/${id}`);
      toast.success("Rendez-vous annulé");
      navigate('/patient/appointments');
    } catch (error) {
      toast.error("Erreur lors de l'annulation");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
    </div>
  );

  // ✅ LOGIQUE DE STATUT DYNAMIQUE
  const status = appointment?.status || "EN_ATTENTE";
  const isCancelled = ["CANCELLED", "ANNULE", "RESCHEDULED", "REPORTE"].includes(status);
  const hasProposal = appointment?.proposedNewDate !== null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="font-bold text-sm uppercase tracking-widest">Retour</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Colonne Gauche : Docteur */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-[2.5rem] p-8 text-center shadow-sm">
            <div className="w-24 h-24 rounded-3xl bg-muted mx-auto mb-4 overflow-hidden border-4 border-background shadow-xl">
              {appointment?.doctorPhoto ? (
                <img src={appointment.doctorPhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={40} className="text-muted-foreground" />
                </div>
              )}
            </div>
            <h2 className="text-xl font-black text-foreground">
              Dr. {appointment?.doctorName || "Non assigné"}
            </h2>
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-tight mb-6">
              {appointment?.specialty || "Généraliste"}
            </p>
            
            <div className={cn(
              "py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border",
              isCancelled ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
            )}>
              {status}
            </div>
          </div>
        </div>

        {/* Colonne Droite : Contenu */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section Report / Décision */}
          {(appointment?.decisionNote || (hasProposal && isCancelled)) && (
            <div className="bg-rose-500/5 border-2 border-rose-500/20 rounded-[2.5rem] p-8 animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-3 mb-4 text-rose-600">
                <AlertCircle className="w-6 h-6" />
                <h3 className="font-black text-lg">Note du Cabinet</h3>
              </div>
              
              {appointment?.decisionNote && (
                <div className="bg-background/80 p-5 rounded-3xl mb-6 border border-rose-500/10 shadow-inner">
                  <p className="text-sm font-bold text-foreground leading-relaxed italic">
                    "{appointment.decisionNote}"
                  </p>
                </div>
              )}

              {hasProposal && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm font-black text-rose-600 uppercase tracking-tighter bg-rose-500/10 p-4 rounded-2xl">
                    <CalendarClock className="w-6 h-6" />
                    Nouveau créneau : {new Date(appointment.proposedNewDate).toLocaleString('fr-FR', {
                      day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={handleAcceptReschedule}
                      disabled={isProcessing}
                      className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={14}/> : <Check size={14}/>}
                      Accepter la nouvelle date
                    </button>
                    <button 
                      onClick={() => navigate('/patient/appointments')}
                      className="px-6 bg-card border border-border text-foreground py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-muted transition-all"
                    >
                      Plus tard
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Carte Détails Principale */}
          <div className="bg-card border border-border rounded-[2.5rem] p-8 space-y-8 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Date prévue</p>
                <div className="flex items-center gap-3 font-bold text-foreground">
                  <div className="p-2 bg-muted rounded-xl"><Calendar size={18} className="text-emerald-500" /></div>
                  {appointment?.consultationDate ? 
                    new Date(appointment.consultationDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) 
                    : "--"}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Heure</p>
                <div className="flex items-center gap-3 font-bold text-foreground">
                  <div className="p-2 bg-muted rounded-xl"><Clock size={18} className="text-emerald-500" /></div>
                  {appointment?.consultationDate ? 
                    new Date(appointment.consultationDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) 
                    : "--"}
                </div>
              </div>
            </div>

            <div className="h-px bg-border w-full opacity-50" />

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-muted rounded-2xl"><FileText size={20} className="text-emerald-500" /></div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Motif</p>
                  <p className="text-sm font-medium text-foreground italic">
                    "{appointment?.reasonForVisit || "Non spécifié"}"
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="p-3 bg-muted rounded-2xl"><MapPin size={20} className="text-emerald-500" /></div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Localisation</p>
                  <p className="text-sm font-medium text-foreground">
                    Cabinet Médical Principal<br/>
                    <span className="text-muted-foreground text-xs italic">Vérifiez l'adresse sur votre profil</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions de Bas de Page */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => window.print()}
              className="flex-1 bg-foreground text-background py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl active:scale-95"
            >
              Imprimer le reçu
            </button>
            
            {!isCancelled && status !== 'TERMINE' && (
              <button 
                onClick={handleCancelAppointment}
                disabled={isProcessing}
                className="flex-1 bg-transparent border-2 border-rose-500/20 text-rose-500 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={14}/> : <XCircle size={14}/>}
                Annuler le rendez-vous
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetails;