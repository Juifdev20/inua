import React from 'react';
import { Link } from 'react-router-dom';
import {
  FlaskConical,
  Clock3,
  ClipboardCheck,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  UserRound,
  Activity
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

const stats = [
  { label: 'Total examens', value: 128, icon: FlaskConical, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  { label: 'En attente', value: 24, icon: Clock3, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { label: 'Résultats saisis', value: 66, icon: ClipboardCheck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { label: 'Validés', value: 38, icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
];

const recentQueue = [
  { id: 1, patient: 'KABILA Jean', code: 'LAB-2026-0012', exam: 'NFS', status: 'EN_ATTENTE', priority: 'URGENT' },
  { id: 2, patient: 'MUTOMBO Sarah', code: 'LAB-2026-0013', exam: 'Glycémie', status: 'EN_COURS', priority: 'NORMAL' },
  { id: 3, patient: 'KAYEMBE Aline', code: 'LAB-2026-0014', exam: 'CRP', status: 'TERMINÉ', priority: 'NORMAL' },
  { id: 4, patient: 'ILUNGA David', code: 'LAB-2026-0015', exam: 'Créatinine', status: 'EN_ATTENTE', priority: 'URGENT' },
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
                <p className="text-2xl font-black text-foreground mt-1">{s.value}</p>
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
              {recentQueue.map((r) => (
                <div key={r.id} className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
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
              ))}
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

          <Card className="border-amber-500/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold">2 alertes critiques</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Certains examens urgents dépassent le délai standard de traitement.
                  </p>
                  <Link to="/labo/alerts" className="inline-block mt-2 text-xs font-bold text-amber-600 hover:underline">
                    Consulter les alertes
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