import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar, Clock, ChevronRight, Loader2, 
  Search, MoreHorizontal, UserRound, Trash2, Stethoscope, X, AlertTriangle, RefreshCcw
} from 'lucide-react';
import { cn } from '../../lib/utils';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import DecisionModal from '../../components/modals/DecisionModal'; 

const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

const STATUS_CONFIG = {
  CONFIRMED: { label: 'Confirmé', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', pulse: 'animate-pulse bg-emerald-500' },
  EN_ATTENTE: { label: 'En attente', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', pulse: 'bg-amber-500' },
  CANCELLED: { label: 'Annulé', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20', pulse: 'bg-rose-500' },
  TERMINE: { label: 'Terminé', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', pulse: 'bg-blue-500' }
};

const DoctorAppointments = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(''); 
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState(null);
  
  // ✅ ÉTATS POUR LES MODALS ET FILTRAGE
  const [hiddenIds, setHiddenIds] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  
  // ✅ ÉTATS POUR L'ALERTE DE CONFIRMATION
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);

  const prevCountRef = useRef(0);
  const audioRef = useRef(new Audio(NOTIFICATION_SOUND_URL));

  const normalizeStatus = (status) => {
    if (!status) return 'EN_ATTENTE';
    const s = status.toUpperCase().trim();
    if (s.includes('CONFIRM')) return 'CONFIRMED';
    if (s.includes('CANCEL') || s.includes('ANNUL')) return 'CANCELLED';
    if (s.includes('DONE') || s.includes('TERMIN')) return 'TERMINE';
    return 'EN_ATTENTE';
  };

  // Détection automatique de l'environnement
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' || 
                     window.location.hostname.includes('local');
  const API_URL = import.meta.env.VITE_BACKEND_URL || 
                  (isLocalhost ? 'http://localhost:8080' : 'https://inuaafia.onrender.com');

  const fetchDoctorData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/v1/doctors/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const rawData = response.data.rdvs_today || response.data.data || [];
      if (isSilent && rawData.length > prevCountRef.current) {
        audioRef.current.play().catch(() => {});
        toast.info("Nouveau rendez-vous ajouté");
      }
      prevCountRef.current = rawData.length;
      setAppointments(rawData);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ ACTION : Ouvrir l'alerte de confirmation
  const triggerDeleteConfirm = (apt) => {
    setAppointmentToDelete(apt);
    setShowDeleteAlert(true);
    setActiveMenuId(null);
  };

  // ✅ ACTION : Confirmation finale de l'archivage
  const handleConfirmDelete = () => {
    if (appointmentToDelete) {
      setHiddenIds(prev => [...prev, appointmentToDelete.id]);
      toast.success("Rendez-vous retiré de la liste");
      setShowDeleteAlert(false);
      setAppointmentToDelete(null);
    }
  };

  // ✅ CORRECTION: Auto-refresh avec chargement initial
  // Charge les données AU DÉMARRAGE puis toutes les 20 secondes
  useEffect(() => { 
    // 1. Chargement initial
    fetchDoctorData();
    
    // 2. Auto-refresh toutes les 20 secondes
    const interval = setInterval(() => {
      console.log("🔄 Agenda: Auto-refresh...");
      fetchDoctorData(true);
    }, 20000);
    
    return () => clearInterval(interval);
  }, []);

  const handleOpenDecision = (apt) => {
    setSelectedAppointment(apt);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      if (hiddenIds.includes(apt.id)) return false;
      const normStatus = normalizeStatus(apt.status);
      
      if (normStatus === 'TERMINE' || normStatus === 'CANCELLED') {
        const lastUpdate = new Date(apt.updatedAt || apt.consultationDate || apt.dateHeure);
        const hoursSinceFinished = (new Date() - lastUpdate) / (1000 * 60 * 60);
        if (hoursSinceFinished > 2) return false; 
      }

      const patientName = (apt.patientName || "").toLowerCase();
      const matchesSearch = patientName.includes(searchQuery.toLowerCase());
      const matchesStatus = filter === 'all' ? true : normStatus === filter;
      
      let matchesDate = true;
      if (selectedDate) {
        const aptDate = new Date(apt.consultationDate || apt.dateHeure).toISOString().split('T')[0];
        matchesDate = aptDate === selectedDate;
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [appointments, filter, searchQuery, selectedDate, hiddenIds]);

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return { date: "N/A", time: "N/A" };
    const dateObj = new Date(dateTimeString);
    return {
      date: dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
      time: dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      
      {isModalOpen && (
        <DecisionModal 
          appointment={selectedAppointment} 
          onClose={() => setIsModalOpen(false)} 
          onRefresh={() => fetchDoctorData(true)} 
        />
      )}

      {/* ✅ MODAL D'ALERTE : ADAPTÉE DARK MODE & TAILLE RÉDUITE */}
      {showDeleteAlert && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-[2rem] p-6 max-w-sm w-full mx-4 shadow-2xl transform animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/10 rounded-xl">
                <AlertTriangle className="text-red-500" size={20} />
              </div>
              <h2 className="text-lg font-black text-foreground uppercase tracking-tight">Archivage</h2>
            </div>
            
            <p className="text-muted-foreground text-sm font-medium mb-6 leading-relaxed">
              Voulez-vous vraiment retirer le rendez-vous de <br/>
              <span className="text-foreground font-bold">{appointmentToDelete?.patientName}</span> ?
            </p>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteAlert(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-border text-foreground font-bold uppercase text-[10px] hover:bg-muted transition-all"
              >
                Annuler
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-bold uppercase text-[10px] hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Planning */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
        <div className="space-y-1">
          <h1 className="text-6xl font-black tracking-tighter text-foreground">
            MON <span className="text-blue-600">PLANNING</span>
          </h1>
          <div className="flex items-center gap-4">
            <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest">
              {filteredAppointments.length} Consultation(s)
            </p>
            {hiddenIds.length > 0 && (
              <button 
                onClick={() => setHiddenIds([])} 
                className="flex items-center gap-2 text-[9px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full hover:bg-blue-100 transition-all"
              >
                <RefreshCcw size={10} /> Réinitialiser
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" placeholder="Rechercher..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-4 rounded-2xl bg-muted/50 border-none w-full outline-none font-bold text-sm text-foreground"
            />
          </div>
          <input 
            type="date" value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-6 py-4 rounded-2xl bg-blue-600 text-white border-none outline-none font-black text-xs uppercase cursor-pointer"
          />
        </div>
      </div>

      {/* Filtres de statuts */}
      <div className="flex flex-wrap items-center gap-3 mb-10">
        {['all', 'EN_ATTENTE', 'CONFIRMED', 'TERMINE'].map((status) => (
          <button
            key={status} onClick={() => setFilter(status)}
            className={cn(
              "px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] border-2 transition-all",
              filter === status ? 'bg-foreground text-background border-foreground' : 'bg-transparent text-muted-foreground border-border hover:border-blue-600/50'
            )}
          >
            {status === 'all' ? 'Tout' : STATUS_CONFIG[status]?.label}
          </button>
        ))}
      </div>

      {/* Grille des Rendez-vous */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {loading ? (
           <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={40} /></div>
        ) : filteredAppointments.length === 0 ? (
          <div className="col-span-full py-32 text-center bg-muted/10 rounded-[4rem] border-4 border-dashed border-border/50">
             <Calendar className="w-16 h-16 text-muted-foreground/20 mx-auto mb-6" />
             <p className="text-muted-foreground font-black text-sm uppercase tracking-widest">Planning vide</p>
          </div>
        ) : filteredAppointments.map((apt) => {
          const { date, time } = formatDateTime(apt.consultationDate || apt.dateHeure);
          const currentNorm = normalizeStatus(apt.status);
          const config = STATUS_CONFIG[currentNorm] || STATUS_CONFIG.EN_ATTENTE;

          return (
            <div key={apt.id} className="bg-card border-2 border-border rounded-[3rem] p-8 hover:border-blue-600/20 hover:shadow-xl transition-all group relative">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600 font-black text-xl uppercase">
                    {apt.patientName?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-foreground uppercase truncate max-w-[150px]">{apt.patientName}</h3>
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{apt.reasonForVisit || 'Consultation'}</p>
                  </div>
                </div>
                
                <div className="relative">
                  <button onClick={() => setActiveMenuId(activeMenuId === apt.id ? null : apt.id)} className="text-muted-foreground p-1 hover:bg-muted rounded-full">
                    <MoreHorizontal size={20} />
                  </button>
                  {activeMenuId === apt.id && (
                      <div className="absolute right-0 top-10 w-48 bg-card border-2 border-border rounded-2xl shadow-2xl z-[100] p-2 animate-in fade-in zoom-in-95">
                        <button onClick={() => handleOpenDecision(apt)} className="w-full px-4 py-3 text-left text-[9px] font-black uppercase flex items-center gap-2 hover:bg-blue-600/10 text-blue-600 rounded-lg">
                          <Stethoscope size={14}/> Gérer
                        </button>
                        <div className="h-px bg-border my-1" />
                        <button 
                          onClick={() => triggerDeleteConfirm(apt)} 
                          className="w-full px-4 py-3 text-left text-[9px] font-black uppercase flex items-center gap-2 hover:bg-red-500/10 text-red-500 rounded-lg"
                        >
                          <Trash2 size={14}/> Archiver
                        </button>
                      </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-6 text-muted-foreground font-bold text-[11px] uppercase">
                <div className="flex items-center gap-3"><Calendar size={14} className="text-blue-600/30" /> {date}</div>
                <div className="flex items-center gap-3"><Clock size={14} className="text-blue-600/30" /> {time}</div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className={cn("px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border-2", config.color)}>
                  {config.label}
                </div>
                <button onClick={() => handleOpenDecision(apt)} className="bg-foreground text-background px-4 py-2 rounded-xl font-black text-[9px] uppercase hover:bg-blue-600 transition-all">
                  Décider
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DoctorAppointments;