import React, { useState } from 'react';
import { GitBranch, Clock3, FlaskConical, Activity, ClipboardCheck, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

const steps = [
  { key: 'EN_ATTENTE', label: 'En attente', icon: Clock3 },
  { key: 'PREPARATION', label: 'Préparation', icon: FlaskConical },
  { key: 'EN_COURS', label: 'En cours', icon: Activity },
  { key: 'TERMINÉ', label: 'Terminé', icon: ClipboardCheck },
  { key: 'VALIDÉ', label: 'Validé', icon: ShieldCheck },
];

const items = [
  { id: 'LAB-2026-0012', patient: 'KABILA Jean', status: 'EN_ATTENTE' },
  { id: 'LAB-2026-0013', patient: 'MUTOMBO Sarah', status: 'EN_COURS' },
  { id: 'LAB-2026-0014', patient: 'KAYEMBE Aline', status: 'TERMINÉ' },
];

const statusColor = {
  EN_ATTENTE: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  PREPARATION: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  EN_COURS: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  TERMINÉ: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  VALIDÉ: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
};

const LabWorkflow = () => {
  const [selected, setSelected] = useState(items[0]);

  const currentIndex = steps.findIndex((s) => s.key === selected?.status);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Workflow des Examens (Pipeline visuel)</h1>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1 font-semibold">
          Suivi des étapes du cycle d’analyse
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Liste examens */}
        <Card className="xl:col-span-1">
          <CardContent className="p-4">
            <h3 className="font-bold mb-3">Examens en suivi</h3>
            <div className="space-y-2">
              {items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => setSelected(it)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selected?.id === it.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <p className="text-sm font-bold">{it.patient}</p>
                  <p className="text-xs text-muted-foreground">{it.id}</p>
                  <Badge className={`mt-2 border ${statusColor[it.status]}`}>{it.status.replace('_', ' ')}</Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pipeline */}
        <Card className="xl:col-span-2">
          <CardContent className="p-6">
            {!selected ? (
              <p className="text-sm text-muted-foreground">Sélectionnez un examen.</p>
            ) : (
              <>
                <div className="mb-6">
                  <h3 className="text-lg font-bold">{selected.patient}</h3>
                  <p className="text-xs text-muted-foreground">{selected.id}</p>
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[680px] flex items-center gap-2">
                    {steps.map((step, index) => {
                      const active = index <= currentIndex;
                      const isCurrent = index === currentIndex;
                      return (
                        <React.Fragment key={step.key}>
                          <div className="flex flex-col items-center gap-2">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                                active
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-muted text-muted-foreground border-border'
                              } ${isCurrent ? 'ring-2 ring-primary/30' : ''}`}
                            >
                              <step.icon className="w-5 h-5" />
                            </div>
                            <p className={`text-[11px] font-bold uppercase tracking-wider ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {step.label}
                            </p>
                          </div>

                          {index < steps.length - 1 && (
                            <div className={`h-1 w-16 rounded-full ${index < currentIndex ? 'bg-primary' : 'bg-border'}`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Button variant="outline" className="rounded-xl">Passer à l’étape suivante</Button>
                  <Button variant="outline" className="rounded-xl">Revenir à l’étape précédente</Button>
                  <Button className="rounded-xl">Valider le workflow</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LabWorkflow;