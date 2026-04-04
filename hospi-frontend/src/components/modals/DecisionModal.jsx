import React, { useState } from 'react';
import api, { processDoctorDecision } from '../../services/patients/Api';
import { X, CheckCircle, Clock, XCircle, Beaker } from 'lucide-react';
import { toast } from 'react-hot-toast';

const DecisionModal = ({ appointment, onClose, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState({
    // ✅ CORRECTION: Utiliser les statuts de consultation (labo/termine) au lieu de RDV
    status: 'labo', // Options: 'labo' (envoyer au laboratoire) ou 'termine' (clôturer)
    decisionNote: '',
    proposedNewDate: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ VALIDATION CRITIQUE de l'ID avant l'appel API
      if (!appointment?.id) {
        toast.error("❌ Erreur: ID de la consultation manquant");
        setLoading(false);
        return;
      }

      console.log("📡 Envoi décision pour consultation ID:", appointment.id, "Status:", decision.status);

      // ✅ CORRECTION: Utiliser l'endpoint correct pour mettre à jour le statut de la consultation
      // Le backend utilise /consultations/{id}/status avec PUT
      await api.put(`/consultations/${appointment.id}/status`, null, { 
        params: { status: decision.status } 
      });

      toast.success(`Statut mis à jour : ${decision.status === 'labo' ? 'Envoyé au laboratoire' : 'Consultation terminée'}`);
      
      // Déclenche le rafraîchissement immédiat des listes
      if (onRefresh) onRefresh(); 
      
      onClose();
    } catch (error) {
      console.error("Erreur décision:", error);
      toast.error(error.response?.data?.message || "Erreur lors de l'envoi de la décision");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-card border border-border w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
          <div>
            <h3 className="text-xl font-black tracking-tighter uppercase text-foreground">Décision Médicale</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Patient: {appointment.patientName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Sélection du Statut */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Action à entreprendre</label>
            <div className="grid grid-cols-1 gap-2">
              {[
                // ✅ CORRECTION: Utiliser les statuts de consultation
                { id: 'labo', label: 'Envoyer au Laboratoire', icon: Beaker, color: 'text-blue-500', active: 'border-blue-500 bg-blue-500/5' },
                { id: 'termine', label: 'Terminer la Consultation', icon: CheckCircle, color: 'text-emerald-500', active: 'border-emerald-500 bg-emerald-500/5' },
                { id: 'en_cours', label: 'Remettre en Cours', icon: Clock, color: 'text-amber-500', active: 'border-amber-500 bg-amber-500/5' }
              ].map((opt) => (
                <div 
                  key={opt.id}
                  onClick={() => setDecision({...decision, status: opt.id})}
                  className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                    decision.status === opt.id ? opt.active : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <opt.icon className={`w-5 h-5 ${opt.color}`} />
                  <span className="font-bold text-sm text-foreground">{opt.label}</span>
                  {decision.status === opt.id && (
                    <div className={`ml-auto w-2 h-2 rounded-full ${opt.color.replace('text', 'bg')}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Date de report (si statut EN_ATTENTE) */}
          {decision.status === 'EN_ATTENTE' && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-black uppercase tracking-widest text-amber-500 ml-1">Nouvelle date suggérée</label>
              <input 
                type="datetime-local"
                className="w-full bg-muted border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-amber-500 outline-none text-foreground"
                value={decision.proposedNewDate}
                onChange={(e) => setDecision({...decision, proposedNewDate: e.target.value})}
                required={decision.status === 'EN_ATTENTE'}
              />
            </div>
          )}

          {/* Note de décision */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Message au patient</label>
            <textarea 
              className={`w-full bg-muted border-none rounded-2xl p-4 text-sm outline-none min-h-[100px] resize-none transition-all focus:ring-2 text-foreground ${
                decision.status === 'CONFIRMED' ? 'focus:ring-emerald-500' : 
                decision.status === 'CANCELLED' ? 'focus:ring-red-500' : 'focus:ring-amber-500'
              }`}
              placeholder="Instructions ou motif de la décision..."
              value={decision.decisionNote}
              onChange={(e) => setDecision({...decision, decisionNote: e.target.value})}
              required={decision.status !== 'CONFIRMED'}
            />
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-6 py-4 rounded-2xl bg-muted font-bold text-xs uppercase tracking-widest hover:bg-muted/80 transition-all text-foreground"
            >
              Fermer
            </button>
            <button 
              type="submit"
              disabled={loading}
              className={`flex-[2] px-6 py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-lg transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95 ${
                decision.status === 'CONFIRMED' ? 'bg-emerald-500 shadow-emerald-500/20' : 
                decision.status === 'CANCELLED' ? 'bg-red-500 shadow-red-500/20' : 'bg-amber-500 shadow-amber-500/20'
              }`}
            >
              {loading ? "Envoi..." : "Valider la décision"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DecisionModal;