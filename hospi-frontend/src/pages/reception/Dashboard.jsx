import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card'; 
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Stethoscope,
  Users,
  MessageSquare,
  Search,
  Eye,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { admissionService } from '@/services/admissionService';

// --- COMPOSANT STATCARD ---
const StatCard = ({ label, value, icon: Icon, color }) => (
  <Card className="border-none shadow-sm bg-card overflow-hidden">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <h3 className="text-3xl font-black text-foreground">{value ?? 0}</h3>
        </div>
        <div 
          className="p-4 rounded-2xl transition-transform hover:scale-110" 
          style={{ backgroundColor: `${color}15`, color: color }}
        >
          <Icon size={28} strokeWidth={2.5} />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const Dashboard = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  
  // ✅ Fonction pour naviguer vers ExamensLabo avec la consultation spécifique
  const handleViewDetails = (admission) => {
    console.log("👁️ [DASHBOARD] Navigation vers ExamReception pour:", admission);
    navigate('/reception/exams', { 
      state: { 
        consultationId: admission.id,
        patientName: admission.patient?.name,
        autoOpen: true
      } 
    });
  };
  
  // ÉTATS RÉELS
  const [statistics, setStatistics] = useState({
    admissionsJour: 0,
    enAttente: 0,
    fichesTransmises: 0,
    terminees: 0
  });
  const [recentAdmissions, setRecentAdmissions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // RÉCUPÉRATION DES DONNÉES RÉELLES DEPUIS L'API
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log("📡 [DASHBOARD] Récupération des données...");
      
      const data = await admissionService.getDashboardStats();
      
      if (data) {
        console.log("✅ [DASHBOARD] Données reçues:", data);
        
        // Mettre à jour les statistiques
        setStatistics({
          admissionsJour: data.admissionsJour || 0,
          enAttente: data.enAttente || 0,
          fichesTransmises: data.fichesTransmises || 0,
          terminees: data.terminees || 0
        });
        
        // Mettre à jour les admissions récentes
        if (data.recentConsultations && Array.isArray(data.recentConsultations)) {
          setRecentAdmissions(data.recentConsultations.map(c => ({
            id: c.id,
            patient: { name: c.patientName },
            doctor: { name: c.serviceName || c.serviceName },
            service: { name: c.serviceName },
            createdAt: c.arrivalTime ? new Date().toISOString().split('T')[0] + 'T' + c.arrivalTime : null,
            status: c.status,
            statusLabel: c.statusLabel
          })));
        } else {
          setRecentAdmissions([]);
        }
      } else {
        console.warn("⚠️ [DASHBOARD] Pas de données reçues");
        setRecentAdmissions([]);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des données:', error);
      setRecentAdmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // FILTRAGE RÉEL
  const filteredAdmissions = recentAdmissions.filter(adm => 
    adm.patient?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = [
    { label: 'Admissions Jour', value: statistics.admissionsJour, icon: Calendar, color: '#10B981' },
    { label: 'En attente', value: statistics.enAttente, icon: Stethoscope, color: '#F59E0B' },
    { label: 'Fiches transmises', value: statistics.fichesTransmises, icon: Users, color: '#3B82F6' },
    { label: 'Terminées', value: statistics.terminees, icon: MessageSquare, color: '#8B5CF6' }
  ];

  const getStatusBadge = (status, statusLabel) => {
    // Si on a un statusLabel du backend, l'utiliser
    if (statusLabel) {
      const colorMap = {
        'En attente': { color: "bg-amber-500/10 text-amber-600", label: "En attente" },
        'Arrivé': { color: "bg-emerald-500/10 text-emerald-600", label: "Arrivé" },
        'En cours': { color: "bg-blue-500/10 text-blue-600", label: "En cours" },
        'Au laboratoire': { color: "bg-purple-500/10 text-purple-600", label: "Au laboratoire" },
        'En attente paiement': { color: "bg-orange-500/10 text-orange-600", label: "En attente paiement" },
        'Payé, en attente labo': { color: "bg-cyan-500/10 text-cyan-600", label: "Payé, en attente labo" },
        'Terminé': { color: "bg-emerald-500/10 text-emerald-600", label: "Terminé" },
        'Annulé': { color: "bg-red-500/10 text-red-600", label: "Annulé" }
      };
      const config = colorMap[statusLabel] || { color: "bg-slate-500/10 text-slate-600", label: statusLabel };
      return <Badge className={cn("border-none", config.color)}>{config.label}</Badge>;
    }
    
    // Fallback sur l'ancien comportement
    const map = {
      'EN_ATTENTE': { color: "bg-amber-500/10 text-amber-600", label: "En attente" },
      'AVEC_MEDECIN': { color: "bg-blue-500/10 text-blue-600", label: "Avec médecin" },
      'TERMINE': { color: "bg-emerald-500/10 text-emerald-600", label: "Terminé" }
    };
    const config = map[status] || { color: "bg-slate-500/10 text-slate-600", label: status };
    return <Badge className={cn("border-none", config.color)}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge className="bg-emerald-500/10 text-emerald-600 border-none mb-3 px-3 py-1 font-bold">
            RÉCEPTION TEMPS RÉEL
          </Badge>
          <h1 className="text-4xl font-black tracking-tight text-foreground">Tableau de bord</h1>
          <p className="text-muted-foreground font-medium mt-1 uppercase text-sm tracking-widest">
            {format(new Date(), 'EEEE dd MMMM yyyy', { locale: fr })}
          </p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline" size="sm" className="rounded-xl font-bold border-2">
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Synchroniser
        </Button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LISTE DES ADMISSIONS */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-none shadow-sm bg-card overflow-hidden rounded-2xl">
            <div className="p-6 border-b border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h2 className="text-xl font-black uppercase tracking-tight">Flux Patients</h2>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un dossier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl border-muted bg-muted/20 focus:bg-background transition-all"
                />
              </div>
            </div>

            <CardContent className="p-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4">
                  <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Chargement des données...</p>
                </div>
              ) : filteredAdmissions.length === 0 ? (
                <div className="py-24 text-center">
                  <div className="inline-flex p-4 rounded-full bg-muted mb-4">
                    <Users className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground font-medium italic">Aucun patient enregistré aujourd'hui.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {filteredAdmissions.map((admission) => (
                    <div key={admission.id} className="group flex items-center justify-between p-5 hover:bg-muted/30 transition-all">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white font-black">
                          {admission.patient?.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-lg">{admission.patient?.name}</p>
                          <p className="text-xs font-medium text-muted-foreground">
                            Médecin : <span className="text-foreground">{admission.doctor?.name || 'Non assigné'}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="hidden md:block text-right">
                          <p className="text-[10px] font-black text-muted-foreground uppercase">Heure</p>
                          <p className="text-sm font-black italic">
                            {admission.createdAt ? format(new Date(admission.createdAt), 'HH:mm') : '--:--'}
                          </p>
                        </div>
                        {getStatusBadge(admission.status, admission.statusLabel)}
                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-emerald-500 hover:text-white transition-all" onClick={() => handleViewDetails(admission)}>
                          <Eye className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SIDEBAR ACTIVITÉS */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-card rounded-2xl p-6">
            <h2 className="text-xl font-black uppercase tracking-tight mb-6">Journal</h2>
            {recentAdmissions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-4">Aucun log récent.</p>
            ) : (
              <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:to-transparent">
                {recentAdmissions.slice(0, 5).map((admission) => (
                  <div key={`log-${admission.id}`} className="relative pl-12">
                    <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-background border-4 border-emerald-500 flex items-center justify-center z-10">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                    <div>
                      <time className="text-[10px] font-black uppercase text-emerald-500 tracking-tighter">
                        {admission.createdAt ? format(new Date(admission.createdAt), 'HH:mm') : '--:--'}
                      </time>
                      <p className="text-sm font-bold text-foreground leading-none mt-1">Nouvelle admission</p>
                      <p className="text-xs font-medium text-muted-foreground mt-1 truncate">{admission.patient?.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="border-none bg-emerald-600 p-6 rounded-2xl text-white shadow-xl shadow-emerald-500/20">
            <h3 className="font-black text-lg leading-tight mb-2">Besoin d'aide ?</h3>
            <p className="text-emerald-100 text-xs font-medium mb-4 opacity-80">Consultez le guide de réception ou contactez l'administrateur.</p>
            <Button className="w-full bg-white text-emerald-600 hover:bg-emerald-50 font-black rounded-xl border-none shadow-lg">
              SUPPORT TECHNIQUE
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;