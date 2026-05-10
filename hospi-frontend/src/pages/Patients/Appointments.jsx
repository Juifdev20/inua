import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar, Clock, Plus, ChevronRight, Loader2, 
  Search, MoreHorizontal, UserRound, AlertCircle, Trash2, Volume2, X
} from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../api/axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import BookAppointmentModal from './BookAppointmentModal';

// --- CONFIGURATION ---
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

const STATUS_CONFIG = {
  CONFIRMED: {
    label: 'Confirmé',
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    pulse: 'animate-pulse bg-emerald-500',
  },
  EN_ATTENTE: {
    label: 'En attente',
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    pulse: 'bg-amber-500',
  },
  CANCELLED: {
    label: 'Annulé',
    color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    pulse: 'bg-rose-500',
  },
  TERMINE: {
    label: 'Terminé',
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    pulse: 'bg-blue-500',
  }
};

const Appointments = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  const prevStatusesRef = useRef({});
  const audioRef = useRef(new Audio(NOTIFICATION_SOUND_URL));

  const normalizeStatus = (status) => {
    if (!status) return 'EN_ATTENTE';
    const s = status.toUpperCase().trim();
    if (s.includes('CONFIRM')) return 'CONFIRMED';
    if (s.includes('CANCEL') || s.includes('ANNUL')) return 'CANCELLED';
    if (s.includes('DONE') || s.includes('COMPLET') || s.includes('TERMIN')) return 'TERMINE';
    return 'EN_ATTENTE';
  };

  const fetchAppointments = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await api.get('/api/v1/consultations/my-appointments');
      
      // ✅ EXTRACTION DES DONNÉES (Adaptée à ApiResponse<List<ConsultationDTO>>)
      const rawData = response.data.data || [];
      
      const sortedData = [...rawData].sort((a, b) => 
        new Date(b.consultationDate) - new Date(a.consultationDate)
      );

      // Notification sonore si changement de statut
      let hasStatusChange = false;
      sortedData.forEach(apt => {
        const currentNorm = normalizeStatus(apt.status);
        if (prevStatusesRef.current[apt.id] && prevStatusesRef.current[apt.id] !== currentNorm) {
          hasStatusChange = true;
          toast.success(`Statut mis à jour pour votre RDV`);
        }
        prevStatusesRef.current[apt.id] = currentNorm;
      });

      if (hasStatusChange && isSilent) {
        audioRef.current.play().catch(() => {});
      }

      setAppointments(sortedData);
    } catch (error) {
      console.error("Fetch Error:", error);
      if (!isSilent) toast.error("Erreur lors de la récupération des rendez-vous");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchAppointments(); 
    const interval = setInterval(() => fetchAppointments(true), 15000); // Check toutes les 15s
    return () => clearInterval(interval);
  }, []);

  const handleAppointmentCreated = () => {
      setIsModalOpen(false);
      setFilter('all');
      fetchAppointments();
  };

  const handleDeleteAppointment = async (id) => {
    if (!window.confirm("Voulez-vous annuler ce rendez-vous ?")) return;
    try {
      await api.delete(`/api/v1/consultations/${id}`);
      toast.success("Rendez-vous annulé");
      fetchAppointments(true);
    } catch (e) {
      toast.error("Erreur lors de l'annulation");
    }
    setActiveMenuId(null);
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const norm = normalizeStatus(apt.status);
      const matchesFilter = filter === 'all' ? true : norm === filter;
      // ✅ Recherche plus robuste (gère doctorName ou l'objet doctor)
      const nameToSearch = (apt.doctorName || (apt.doctor ? `${apt.doctor.firstName} ${apt.doctor.lastName}` : "")).toLowerCase();
      return matchesFilter && nameToSearch.includes(searchQuery.toLowerCase());
    });
  }, [appointments, filter, searchQuery]);

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return { date: "N/A", time: "N/A" };
    const dateObj = new Date(dateTimeString);
    return {
      date: dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      time: dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  if (loading && appointments.length === 0) return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center">
      <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Synchronisation...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <BookAppointmentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={handleAppointmentCreated} 
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
        <div>
          <h1 className="text-5xl font-black tracking-tight text-foreground">
            Mes <span className="text-emerald-500">Séances</span>
            <span className="ml-4 text-2xl text-muted-foreground">({filteredAppointments.length})</span>
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" placeholder="Rechercher un médecin..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-6 py-4 rounded-2xl bg-muted/50 border-none w-full sm:w-64 outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black hover:bg-emerald-600 transition-all flex items-center justify-center gap-3">
            <Plus className="w-5 h-5" /> Nouveau RDV
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-10">
        {['all', 'CONFIRMED', 'EN_ATTENTE', 'CANCELLED', 'TERMINE'].map((status) => (
          <button
            key={status} onClick={() => setFilter(status)}
            className={cn(
              "px-5 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest border transition-all",
              filter === status ? 'bg-foreground text-background' : 'bg-card text-muted-foreground border-border'
            )}
          >
            {status === 'all' ? 'Toutes' : STATUS_CONFIG[status]?.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredAppointments.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-muted/20 rounded-[3rem] border-2 border-dashed border-border/50">
             <Calendar className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
             <p className="text-muted-foreground font-bold text-xs uppercase">Aucun rendez-vous trouvé</p>
          </div>
        ) : filteredAppointments.map((appointment) => {
          const { date, time } = formatDateTime(appointment.consultationDate);
          const currentNorm = normalizeStatus(appointment.status);
          const config = STATUS_CONFIG[currentNorm] || STATUS_CONFIG.EN_ATTENTE;

          return (
            <div key={appointment.id} className="bg-card border border-border rounded-[2.5rem] p-7 hover:shadow-xl transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-black uppercase text-xl">
                    {appointment.doctorName?.charAt(0) || <UserRound size={20}/>}
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Dr. {appointment.doctorName || "Médecin"}</h3>
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{appointment.departmentName || "Spécialiste"}</p>
                  </div>
                </div>

                <div className="relative">
                  <button onClick={() => setActiveMenuId(activeMenuId === appointment.id ? null : appointment.id)} className="text-muted-foreground hover:text-foreground p-1">
                    <MoreHorizontal size={20} />
                  </button>
                  {activeMenuId === appointment.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-2xl shadow-2xl z-20 py-2">
                      <button onClick={() => handleDeleteAppointment(appointment.id)} className="w-full px-4 py-2 text-left text-[10px] font-black uppercase flex items-center gap-3 hover:bg-rose-500/10 text-rose-600">
                        <Trash2 size={14}/> Annuler le RDV
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-muted/30 p-3 rounded-2xl">
                  <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Date</p>
                  <div className="flex items-center gap-2 text-foreground font-bold text-xs"><Calendar size={12}/> {date}</div>
                </div>
                <div className="bg-muted/30 p-3 rounded-2xl">
                  <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Heure</p>
                  <div className="flex items-center gap-2 text-foreground font-bold text-xs"><Clock size={12}/> {time}</div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border/50 pt-4">
                <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border", config.color)}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", config.pulse)} />
                  {config.label}
                </div>
                <button onClick={() => navigate(`/patient/appointments/${appointment.id}`)} className="p-3 rounded-xl bg-foreground text-background hover:bg-emerald-500 transition-all">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Appointments;