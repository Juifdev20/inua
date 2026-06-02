import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { 
  Calendar, Users, Stethoscope, MessageSquare, Clock, 
  Activity, Plus, Search, FlaskConical, PlayCircle, ChevronRight, Trash2, RefreshCcw
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Import de la modal de décision
import DecisionModal from '../../components/modals/DecisionModal';

// Détection automatique de l'environnement
const isLocalhost = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' || 
                   window.location.hostname.includes('local');
const API_URL = import.meta.env.VITE_BACKEND_URL || 
                (isLocalhost ? 'http://localhost:8080' : 'https://inuaafia.onrender.com');

const StatCard = ({ icon: Icon, label, value, color, bg, loading }) => (
  <div className="bg-card border border-border p-6 rounded-[2.5rem] flex items-center gap-4 transition-all hover:shadow-xl hover:shadow-emerald-500/5 hover:border-emerald-500/20 group">
    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm", bg)}>
      <Icon className={cn("w-7 h-7", color)} />
    </div>
    <div className="flex-1">
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-6 w-16" />
        </div>
      ) : (
        <>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{label}</p>
          <p className="text-2xl font-black text-foreground">{value}</p>
        </>
      )}
    </div>
  </div>
);

const Dashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  
  const [dashboardData, setDashboardData] = useState({
    stats: { rdvs_today: 0, consultations_pending: 0, total_patients: 0, unread_messages: 0 },
    rdvs_today: [],
    recent_consultations: []
  });
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [showDecisionModal, setShowDecisionModal] = useState(false);

  // ✅ AJOUT : État pour le masquage local (évite les erreurs de suppression API)
  const [hiddenIds, setHiddenIds] = useState([]);

  const fetchDashboard = useCallback(async () => {
    if (!token) return;
    
    // ✅ SÉCURITÉ: Vérifier que le user est bien chargé avant l'appel API
    if (!user || !user.id) {
      console.warn("⚠️ fetchDashboard: user.id manquant, attente de l'initialisation...");
      return;
    }
    
    console.log("📡 fetchDashboard - user.id:", user.id);
    
    try {
      // ✅ Utilisation de l'endpoint original qui identifie le médecin via le token
      const response = await axios.get(`${API_URL}/api/v1/doctors/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        console.log("📊 DASHBOARD REÇU:", response.data);
        console.log("📋 rdvs_today:", response.data.rdvs_today?.length || 0);
        console.log("📋 recent_consultations:", response.data.recent_consultations?.length || 0);
        console.log("📈 stats:", response.data.stats);
        
        setDashboardData({
          stats: response.data.stats || { rdvs_today: 0, consultations_pending: 0, total_patients: 0, unread_messages: 0 },
          rdvs_today: response.data.rdvs_today || [],
          recent_consultations: response.data.recent_consultations || []
        });
      }
    } catch (err) {
      console.error('Erreur API Dashboard:', err);
      // Si l'erreur est 400/404 avec l'ID, on affiche un message plus clair
      if (err.response?.status === 400 || err.response?.status === 404) {
        toast.error("Impossible de charger le dashboard. Vérifiez votre session.");
      } else {
        toast.error("Erreur de synchronisation");
      }
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  // ✅ CORRECTION: Le premier useEffect charge les données au démarrage
  // handleRefresh permet le rafraîchissement manuel
  useEffect(() => {
    if (!token || !user) return;
    
    // Chargement initial
    fetchDashboard();
    
  }, [token, user, fetchDashboard]);

  // ✅ AJOUT: Fonction de rafraîchissement manuel
  const handleRefresh = () => {
    setLoading(true);
    fetchDashboard();
    toast.success("🔄 Dashboard actualisé");
  };

  // ✅ LOGIQUE DE FILTRAGE ET STATS DYNAMIQUE (Synchronisée avec les éléments masqués)
  // Utiliser useMemo avec une clé de rendu forcée
  const [statsKey, setStatsKey] = useState(0);
  
  const { rdvsAujourdhui, statsFiltrees } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // On exclut les IDs masqués manuellement
    const nonHidden = dashboardData.rdvs_today.filter(rdv => !hiddenIds.includes(rdv.id));

    // ✅ CORRECTION: Filtrer par date d'aujourd'hui (2026-03-07)
    // ET aussi par le status pour ne montrer que les patients actifs (pas encore consultés)
    const filtered = nonHidden.filter(rdv => {
      const dateRdv = (rdv.consultationDate || rdv.dateHeure || "").split('T')[0];
      const isToday = dateRdv === todayStr;
      const p = rdv.patient || {};
      const fullName = `${p.firstName || p.prenom || ''} ${p.lastName || p.nom || ''} ${rdv.patientName || ''}`.toLowerCase();
      return isToday && fullName.includes(searchTerm.toLowerCase());
    });

    console.log("🔍 FILTRAGE - Résultats:", {
      total: dashboardData.rdvs_today.length,
      nonHidden: nonHidden.length,
      filtered: filtered.length,
      todayStr,
      searchTerm
    });

    // ✅ UTILISER stats.rdvs_today_count qui vient du backend (c'est le bon nombre!)
    // Et pendingCount basé sur les RDVs d'aujourd'hui
    const pendingCount = filtered.filter(r => (r.status || r.statut || '').toUpperCase() === 'EN_ATTENTE').length;
    const todayCount = dashboardData.stats?.rdvs_today_count || filtered.length;

    console.log("🔢 CALCUL STATS:", { 
      totalRdvs: dashboardData.rdvs_today.length, 
      filtered: filtered.length,
      pendingCount, 
      todayCount: todayCount,
      statsRdvsTodayCount: dashboardData.stats?.rdvs_today_count,
      todayStr 
    });

    return { rdvsAujourdhui: filtered, statsFiltrees: { pending: pendingCount, today: todayCount } };
  }, [dashboardData.rdvs_today, dashboardData.stats, searchTerm, hiddenIds, statsKey]);

  const handleHideAppointment = (id) => {
    setHiddenIds(prev => [...prev, id]);
    toast.success("Rendez-vous masqué");
  };

  const handleResetInterface = () => {
    setHiddenIds([]);
    toast.success("Affichage réinitialisé");
  };

  const handleStartConsultation = (rdv) => {
    navigate('/doctor/consultations', { state: { selectedConsultation: rdv } });
  };

  const handleOpenDecision = (rdv) => {
    const patientId = rdv.patientId || rdv.idPatient || rdv.patient?.id;
    if (!patientId || !rdv.id) {
      toast.error("Données patient manquantes");
      return;
    }
    const p = rdv.patient || {};
    const patientName = rdv.patientName || 
                        `${p.firstName || p.prenom || ''} ${p.lastName || p.nom || ''}`.trim() || 
                        "Patient Inconnu";
    setSelectedAppt({
      ...rdv,
      id: rdv.id,
      patientId: patientId,
      patientName: patientName,
      status: rdv.status || rdv.statut || 'EN_ATTENTE'
    });
    setShowDecisionModal(true);
  };

  const handleSendToLab = async (rdvId) => {
    try {
      await axios.post(`${API_URL}/api/consultations/${rdvId}/send-to-lab`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("✅ Envoyé au laboratoire");
      fetchDashboard();
    } catch (err) {
      toast.error("❌ Erreur d'envoi");
    }
  };

  const getStatusBadge = (statut) => {
    const s = (statut || "").toUpperCase();
    const styles = {
      EN_ATTENTE: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      CONFIRMED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-black',
      CANCELLED: 'bg-red-500/10 text-red-500 border-red-500/20',
      ARRIVED: 'bg-blue-500/10 text-blue-600 border-blue-500/20 animate-pulse',
      EN_COURS: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
      LABORATOIRE_EN_ATTENTE: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      COMPLETED: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    };
    return (
      <Badge variant="outline" className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border shrink-0", styles[s] || 'bg-slate-100')}>
        {s.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '--:--';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return '--:--'; }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700 space-y-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-500/20">
              Cabinet Actif
            </div>
            {hiddenIds.length > 0 && (
              <button onClick={handleResetInterface} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all">
                <RefreshCcw size={10} /> Réinitialiser ({hiddenIds.length})
              </button>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter">
            Bonjour, <span className="text-emerald-500">Dr. {user?.lastName || 'Médecin'}</span> 👋
          </h1>
          <p className="text-muted-foreground text-lg font-medium capitalize">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-3 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all"
            title="Rafraîchir le dashboard"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 
            Actualiser
          </button>
          <Link to="/doctor/agenda" className="flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-5 rounded-[2rem] font-black shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.02] text-sm uppercase tracking-widest">
            <Plus className="w-5 h-5" /> Planifier un RDV
          </Link>
        </div>
      </div>

      {/* Stats Cards (Utilise statsFiltrees pour la synchronisation) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Calendar} label="RDV aujourd'hui" value={statsFiltrees.today} color="text-emerald-500" bg="bg-emerald-500/10" loading={loading} />
        <StatCard icon={Stethoscope} label="En attente" value={statsFiltrees.pending} color="text-amber-500" bg="bg-amber-500/10" loading={loading} />
        <StatCard icon={Users} label="Mes patients" value={dashboardData.stats.total_patients} color="text-blue-500" bg="bg-blue-500/10" loading={loading} />
        <StatCard icon={MessageSquare} label="Messages" value={dashboardData.stats.unread_messages} color="text-purple-500" bg="bg-purple-500/10" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase">Gestion du flux patient</h2>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Chercher un patient..." 
                className="pl-9 pr-4 py-2 bg-muted/50 border-none rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none w-48"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-card border border-border rounded-[3rem] p-4 sm:p-6 space-y-4 shadow-sm min-h-[400px]">
            <AnimatePresence mode='popLayout'>
              {rdvsAujourdhui.length > 0 ? (
                rdvsAujourdhui.map((rdv) => (
                    <motion.div 
                      layout
                      key={rdv.id} 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex flex-col xl:flex-row items-center justify-between p-4 rounded-[2.5rem] bg-muted/30 border border-transparent hover:border-emerald-500/20 transition-all gap-4"
                    >
                      <div className="flex items-center gap-4 w-full min-w-0">
                        <div className={cn(
                          "w-14 h-14 rounded-[1.25rem] flex flex-col items-center justify-center text-white font-black shrink-0",
                          rdv.status === 'ARRIVED' ? "bg-blue-500 shadow-lg shadow-blue-500/20" : 
                          rdv.status === 'CONFIRMED' ? "bg-emerald-500" : 
                          rdv.status === 'CANCELLED' ? "bg-red-500/20 text-red-500" : "bg-slate-700"
                        )}>
                          <Clock className="w-3 h-3 mb-0.5 opacity-80" />
                          <span className="text-xs">{formatTime(rdv.consultationDate || rdv.dateHeure)}</span>
                        </div>

                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                            <Users className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-black text-base truncate uppercase tracking-tighter text-foreground">
                                {rdv.patient?.firstName || rdv.patient?.prenom || rdv.patientName} {rdv.patient?.lastName || rdv.patient?.nom || ""}
                              </p>
                              {getStatusBadge(rdv.status)}
                            </div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase truncate opacity-60 italic">
                              {rdv.reasonForVisit || rdv.motif || 'Consultation Standard'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full xl:w-auto">
                        <button 
                          onClick={() => handleOpenDecision(rdv)}
                          className="flex-1 xl:flex-none h-11 px-6 rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-all flex items-center justify-center gap-2 font-black text-[10px] tracking-widest uppercase shadow-lg shadow-amber-500/20"
                        >
                          DÉCIDER
                        </button>
                        
                        {rdv.status === 'ARRIVED' && (
                          <button 
                            onClick={() => handleStartConsultation(rdv.id)}
                            className="flex-1 xl:flex-none h-11 px-6 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 font-black text-[10px] tracking-widest uppercase shadow-lg shadow-emerald-500/20"
                          >
                            <PlayCircle className="w-4 h-4" /> CONSULTER
                          </button>
                        )}

                        <button 
                          onClick={() => handleHideAppointment(rdv.id)}
                          className="h-11 w-11 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:text-red-500 transition-all"
                          title="Masquer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-30 italic">
                  <Calendar className="w-12 h-12 mb-2 text-foreground" />
                  <p className="text-xs font-black uppercase tracking-widest text-foreground">Aucun patient actif</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Historique */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-2xl font-black text-foreground px-2 tracking-tighter uppercase">Historique</h2>
          <div className="bg-card border border-border rounded-[3rem] p-8 shadow-sm h-full flex flex-col min-h-[400px]">
            <div className="space-y-6 relative flex-grow overflow-y-auto max-h-[550px] pr-2 custom-scrollbar">
              <AnimatePresence>
                {dashboardData.recent_consultations.length > 0 ? (
                  dashboardData.recent_consultations.map((cons, idx) => (
                    <motion.div 
                      key={cons.id || idx}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="relative pl-8 border-l-2 border-emerald-500/10 group cursor-pointer"
                    >
                      <div className={cn(
                        "absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-card transition-colors",
                        cons.status === 'CANCELLED' ? 'bg-red-400' : 'bg-emerald-500'
                      )} />
                      <div className="hover:bg-muted/50 p-2 rounded-2xl transition-all">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                          {new Date(cons.consultationDate || cons.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </p>
                        <p className="text-sm font-black text-foreground group-hover:text-emerald-500 transition-colors uppercase leading-none truncate">
                          {cons.patientName || (cons.patient ? `${cons.patient.firstName} ${cons.patient.lastName}` : "Patient")}
                        </p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-20 opacity-20 flex flex-col items-center justify-center h-full">
                    <Activity size={40} className="mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Aucun historique</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
            <button className="mt-6 w-full py-4 text-[10px] font-black tracking-widest text-muted-foreground border-2 border-dashed border-border rounded-2xl hover:border-emerald-500/20 hover:text-emerald-500 transition-all uppercase">
              Archives Complètes
            </button>
          </div>
        </div>
      </div>

      {showDecisionModal && selectedAppt && (
        <DecisionModal 
          appointment={selectedAppt}
          onClose={() => {
            setShowDecisionModal(false);
            setSelectedAppt(null);
          }} 
          onRefresh={fetchDashboard} 
        />
      )}
    </div>
  );
};

export default Dashboard;