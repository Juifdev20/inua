import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Loader2, CheckCircle2, Stethoscope, Search } from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

const BookAppointmentModal = ({ isOpen, onClose, onSuccess }) => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchDoctor, setSearchDoctor] = useState('');
  const [formData, setFormData] = useState({
    doctorId: '',
    date: '',
    time: '',
    reason: ''
  });

  // 🔄 Charger les médecins disponibles
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await api.get('/api/v1/doctors/all');
        
        const doctorsData = Array.isArray(res.data) ? res.data : (res.data.data || []);
        setDoctors(doctorsData);
      } catch (error) {
        console.error("Erreur chargement médecins:", error);
        toast.error("Impossible de charger la liste des médecins");
      }
    };

    if (isOpen) fetchDoctors();
  }, [isOpen]);

  const getDoctorSpecialty = (doc) => {
    const dept = doc.department || doc.departement || doc.specialty;
    if (!dept) return "Médecine Générale";
    if (typeof dept === 'object') return dept.nom || "Médecine Générale";
    return dept;
  };

  const filteredDoctors = doctors.filter(doc => {
    const specialty = getDoctorSpecialty(doc);
    const searchString = `${doc.firstName || ""} ${doc.lastName || ""} ${specialty}`.toLowerCase();
    return searchString.includes(searchDoctor.toLowerCase());
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.doctorId || !formData.date || !formData.time) {
        toast.error("Veuillez remplir tous les champs obligatoires");
        return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const userData = JSON.parse(localStorage.getItem('user'));
      
      // Extraction sécurisée de l'ID patient
      const pId = userData?.id || userData?.patientId;

      if (!pId) {
        toast.error("Session invalide : ID patient introuvable");
        setLoading(false);
        return;
      }

      // ✅ PAYLOAD UNIFIÉ : Combine IDs plats et Objets JPA pour éviter toute erreur de validation
      const payload = {
        // Pour les validateurs DTO (ex: @NotNull Long patientId)
        patientId: Number(pId),
        doctorId: Number(formData.doctorId),
        
        // Pour le mapping d'entité JPA (ex: Patient patient)
        patient: { id: Number(pId) }, 
        doctor: { id: Number(formData.doctorId) },
        
        // Données du formulaire
        consultationDate: `${formData.date}T${formData.time}:00`,
        reasonForVisit: formData.reason,
        status: "EN_ATTENTE",
        isHospitalized: false
      };

      await api.post('/api/v1/consultations/book', payload);

      toast.success("Rendez-vous enregistré !");
      
      // Reset
      setFormData({ doctorId: '', date: '', time: '', reason: '' });
      setSearchDoctor('');
      if (onSuccess) onSuccess(); 
      onClose();
      
    } catch (error) {
      console.error("Détails erreur backend:", error.response?.data);
      
      // Extraction intelligente du message d'erreur
      const errorData = error.response?.data;
      if (typeof errorData === 'object' && !errorData.message) {
        // Si c'est une erreur de validation type { field: "message" }
        const validationMsg = Object.entries(errorData).map(([k, v]) => `${k}: ${v}`).join(' | ');
        toast.error(`Validation : ${validationMsg}`);
      } else {
        toast.error(errorData?.message || "Erreur lors de la réservation");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-xl p-4">
      <div className="bg-card w-full max-w-2xl rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
        
        <div className="p-8 pb-4 flex justify-between items-center border-b border-border/50">
          <div>
            <h2 className="text-3xl font-black text-foreground tracking-tighter">
              Réserver une <span className="text-emerald-500">Séance</span>
            </h2>
            <p className="text-sm text-muted-foreground font-medium">Planifiez votre consultation</p>
          </div>
          <button onClick={onClose} className="p-4 hover:bg-muted rounded-2xl transition-all">
            <X className="w-6 h-6 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-8">
          <form id="book-form" onSubmit={handleSubmit} className="space-y-8">
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">
                  Étape 1 : Choisir le médecin
                </label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <input 
                        type="text"
                        placeholder="Rechercher..."
                        value={searchDoctor}
                        onChange={(e) => setSearchDoctor(e.target.value)}
                        className="text-[10px] bg-muted/50 border-none rounded-full pl-8 pr-4 py-1 outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredDoctors.map(doc => (
                  <div 
                    key={doc.id}
                    onClick={() => setFormData({...formData, doctorId: doc.id})}
                    className={cn(
                      "group relative flex items-center p-4 rounded-2xl border-2 transition-all cursor-pointer hover:bg-muted/30",
                      formData.doctorId === doc.id ? "border-emerald-500 bg-emerald-500/5 shadow-lg shadow-emerald-500/10" : "border-border bg-muted/20"
                    )}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted border border-border">
                        {doc.photoUrl ? (
                            <img src={doc.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground"><User size={20} /></div>
                        )}
                    </div>
                    <div className="ml-4">
                        <p className="font-bold text-sm text-foreground">Dr. {doc.lastName || doc.lastName}</p>
                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">{getDoctorSpecialty(doc)}</p>
                    </div>
                    {formData.doctorId === doc.id && <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-emerald-500" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">
                Étape 2 : Date et Heure
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    <input 
                        type="date" required
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full bg-muted/30 border-2 border-border rounded-2xl p-4 pl-12 focus:border-emerald-500 outline-none text-foreground"
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                    />
                </div>
                <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    <input 
                        type="time" required
                        className="w-full bg-muted/30 border-2 border-border rounded-2xl p-4 pl-12 focus:border-emerald-500 outline-none text-foreground"
                        value={formData.time}
                        onChange={(e) => setFormData({...formData, time: e.target.value})}
                    />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">
                Étape 3 : Motif de visite
              </label>
              <textarea 
                placeholder="Raison de la consultation..."
                required
                className="w-full bg-muted/30 border-2 border-border rounded-[2rem] p-6 h-32 focus:border-emerald-500 outline-none transition-all text-foreground"
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
              ></textarea>
            </div>
          </form>
        </div>

        <div className="p-8 bg-muted/10 border-t border-border/50">
            <button 
              form="book-form"
              disabled={loading}
              className="w-full bg-emerald-500 text-white font-black py-6 rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50 hover:bg-emerald-600 transition-colors shadow-xl shadow-emerald-500/20"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Stethoscope size={20} /><span>Confirmer la réservation</span></>}
            </button>
        </div>
      </div>
    </div>
  );
};

export default BookAppointmentModal;