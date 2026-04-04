import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, BellRing, Clock3 } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

const initialAlerts = [
  {
    id: 1,
    title: 'Examen urgent en attente',
    message: 'LAB-2026-0012 dépasse le temps standard de prise en charge.',
    type: 'CRITIQUE',
    time: 'Il y a 5 min',
    read: false,
  },
  {
    id: 2,
    title: 'Validation requise',
    message: 'Résultats prêts pour validation médicale (LAB-2026-0014).',
    type: 'INFO',
    time: 'Il y a 18 min',
    read: false,
  },
  {
    id: 3,
    title: 'Échantillon manquant',
    message: 'Prélèvement non reçu pour la demande LAB-2026-0016.',
    type: 'CRITIQUE',
    time: 'Il y a 32 min',
    read: true,
  },
];

const LabAlerts = () => {
  const [alerts, setAlerts] = useState(initialAlerts);

  const unreadCount = alerts.filter((a) => !a.read).length;

  const markOne = (id) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  };

  const markAll = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Alertes & Notifications</h1>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1 font-semibold">
            Suivi des événements critiques et notifications opérationnelles
          </p>
        </div>

        <Button variant="outline" className="rounded-xl" onClick={markAll}>
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Tout marquer comme lu
        </Button>
      </div>

      <Card className="border-amber-500/20">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm">Résumé alertes</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount} alerte(s) non lue(s) sur {alerts.length} au total.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {alerts.map((a) => (
          <Card
            key={a.id}
            className={`${!a.read ? 'border-primary/30 bg-primary/[0.03]' : 'border-border/70'}`}
          >
            <CardContent className="p-4 flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  a.type === 'CRITIQUE'
                    ? 'bg-rose-500/10 text-rose-600'
                    : 'bg-blue-500/10 text-blue-600'
                }`}
              >
                {a.type === 'CRITIQUE' ? <AlertTriangle className="w-5 h-5" /> : <Clock3 className="w-5 h-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold">{a.title}</p>
                  <Badge
                    className={`border ${
                      a.type === 'CRITIQUE'
                        ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                        : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                    }`}
                  >
                    {a.type}
                  </Badge>
                  {!a.read && <Badge className="bg-primary text-primary-foreground">NOUVEAU</Badge>}
                </div>

                <p className="text-xs text-muted-foreground mt-1">{a.message}</p>
                <p className="text-[11px] text-muted-foreground mt-2">{a.time}</p>
              </div>

              {!a.read && (
                <Button variant="ghost" size="sm" onClick={() => markOne(a.id)}>
                  Marquer lu
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default LabAlerts;