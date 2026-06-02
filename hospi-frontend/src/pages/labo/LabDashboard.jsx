import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FlaskConical,
  Clock3,
  ClipboardCheck,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  UserRound,
  Activity,
  Loader2
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { useLabOffline } from '../../hooks/offline';
import { toast } from 'sonner';
import api from '../../services/api/api';

const initialStats = [
  { label: 'Total examens', value: 0, icon: FlaskConical, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  { label: 'En attente', value: 0, icon: Clock3, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { label: 'Résultats saisis', value: 0, icon: ClipboardCheck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { label: 'Validés', value: 0, icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
];

const statusBadge = (status) => {
  switch (status) {
    case 'EN_ATTENTE':
      return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    case 'EN_COURS':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'TERMINÉ':
      return 'bg-violet-500/10 text-violet-600 border-violet-500/20';
    case 'VALIDÉ':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const priorityBadge = (priority) =>
  priority === 'URGENT'
    ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
    : 'bg-muted text-muted-foreground';

const quickLinks = [
  { to: '/labo/queue', label: 'Gérer la file d’attente', icon: Clock3 },
  { to: '/labo/results', label: 'Saisir les résultats', icon: ClipboardCheck },
  { to: '/labo/workflow', label: 'Suivre le workflow', icon: Activity },
  { to: '/labo/alerts', label: 'Voir les alertes', icon: AlertTriangle },
];

const LabDashboard = () => {
  const { getPendingExams, isOnline } = useLabOffline();
  const [stats, setStats] = useState(initialStats);
  const [queue, setQueue] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Récupérer les statistiques
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/lab/stats');
        if (response.data?.data) {
          const data = response.data.data;
          setStats([
            { label: 'Total examens', value: data.totalExams || 0, icon: FlaskConical, color: 'text-violet-500', bg: 'bg-violet-500/10' },
            { label: 'En attente', value: data.pendingExams || 0, icon: Clock3, color: 'text-orange-500', bg: 'bg-orange-500/10' },
            { label: 'Résultats saisis', value: data.resultsEntered || 0, icon: ClipboardCheck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Validés', value: data.validatedExams || 0, icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          ]);
        }
      } catch (err) {
        console.error('Erreur stats:', err);
        toast.error('Erreur lors du chargement des statistiques');
      }
    };

    const fetchQueue = async () => {
      try {
        const result = await getPendingExams();
        if (result.data) {
          const queueItems = result.data.slice(0, 5).map(item => ({
            id: item.consultationId,
            patient: item.patientName || 'Patient inconnu',
            code: item.patientCode || `LAB-${item.consultationId}`,
            exam: item.exams?.slice(0, 2).map(e => e.serviceName).join(', ') + (item.exams?.length > 2 ? '...' : '') || 'Examens',
            status: item.consultationStatus === 'AU_LABO' ? 'EN_COURS' : 
                    item.consultationStatus === 'EXAMENS_PAYES' ? 'EN_ATTENTE' : 
                    item.consultationStatus === 'RESULTATS_PRETS' ? 'TERMINÉ' : item.consultationStatus,
            priority: item.criticalExams > 0 ? 'URGENT' : 'NORMAL'
          }));
          setQueue(queueItems);
          
          if (!isOnline) {
            toast.info('Mode hors ligne : file d\'attente locale chargée');
          }
        }
      } catch (err) {
        console.error('Erreur file d\'attente:', err);
      }
    };

    const fetchAlerts = async () => {
      try {
        const response = await api.get('/lab/alerts');
        if (response.data?.data) {
          setAlerts(response.data.data.slice(0, 5));
        }
      } catch (err) {
        console.error('Erreur alertes:', err);
      }
    };

    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchQueue(), fetchAlerts()]);
      setLoading(false);
    };

    loadAll();
    
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(loadAll, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Tableau de bord Laboratoire</h1>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1 font-semibold">
            Vue globale des activités labo
          </p>
        </div>
        <Link to="/labo/queue">
          <Button className="rounded-xl font-bold">
            Aller à la file d’attente
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/70">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">{s.label}</p>
                <p className="text-2xl font-black text-foreground mt-1">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : s.value}
                </p>
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.bg}`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Queue preview */}
        <Card className="xl:col-span-2">
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-bold">File d’attente récente</h3>
              <Link to="/labo/queue" className="text-xs font-bold text-primary hover:underline">
                Voir tout
              </Link>
            </div>

            <div className="divide-y divide-border/60">
              {loading ? (
                <div className="px-4 py-8 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : queue.length === 0 ? (
                <div className="px-4 py-8 text-center text-muted-foreground">
                  <p>Aucun examen en file d'attente</p>
                </div>
              ) : (
                queue.map((r) => (
                  <Link key={r.id} to={`/labo/results/${r.id}`} className="block">
                    <div className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors cursor-pointer">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <UserRound className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{r.patient}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {r.code} • {r.exam}
                        </p>
                      </div>

                      <Badge className={`border ${priorityBadge(r.priority)}`}>{r.priority}</Badge>
                      <Badge className={`border ${statusBadge(r.status)}`}>{r.status.replace('_', ' ')}</Badge>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick actions + alert */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold mb-3">Actions rapides</h3>
              <div className="space-y-2">
                {quickLinks.map((item) => (
                  <Link key={item.to} to={item.to} className="block">
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left">
                      <item.icon className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold">{item.label}</span>
                    </button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className={alerts.length > 0 ? 'border-amber-500/30' : 'border-border/70'}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${alerts.length > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">
                    {alerts.length > 0 ? `${alerts.length} alerte${alerts.length > 1 ? 's' : ''} critique${alerts.length > 1 ? 's' : ''}` : 'Aucune alerte'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {alerts.length > 0 
                      ? 'Examens avec valeurs hors limites ou urgents en attente.'
                      : 'Tous les examens sont dans les normes.'}
                  </p>
                  {alerts.length > 0 && (
                    <div className="mt-2 space-y-1.5 max-h-28 overflow-y-auto pr-1">
                      {alerts.slice(0, 3).map((alert, idx) => (
                        <div key={idx} className="flex items-start gap-1 text-xs text-amber-700">
                          <span className="flex-shrink-0">•</span>
                          <span className="break-words leading-tight">
                            <span className="font-semibold">{alert.patientName}:</span>{' '}
                            <span className="text-amber-600/90">{alert.message}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <Link to="/labo/queue" className="inline-block mt-2 text-xs font-bold text-amber-600 hover:underline">
                    Voir la file d'attente
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LabDashboard;