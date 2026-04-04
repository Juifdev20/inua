import React, { useMemo, useState } from 'react';
import { Save, Beaker, FileCheck2 } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';

const pendingExams = [
  {
    id: 101,
    patient: 'KABILA Jean',
    code: 'LAB-2026-0012',
    tests: [
      { name: 'Hémoglobine', unit: 'g/dL', ref: '13-17', key: 'hemoglobine' },
      { name: 'Leucocytes', unit: 'G/L', ref: '4-10', key: 'leucocytes' },
    ],
  },
  {
    id: 102,
    patient: 'MUTOMBO Sarah',
    code: 'LAB-2026-0013',
    tests: [
      { name: 'Glycémie à jeun', unit: 'mg/dL', ref: '70-110', key: 'glycemie' },
    ],
  },
];

const parseRange = (ref) => {
  const parts = String(ref).split('-').map((x) => parseFloat(x.trim()));
  if (parts.length !== 2 || parts.some(Number.isNaN)) return null;
  return { min: parts[0], max: parts[1] };
};

const LabResults = () => {
  const [selectedId, setSelectedId] = useState(pendingExams[0]?.id || null);
  const [values, setValues] = useState({});
  const [comment, setComment] = useState('');

  const selectedExam = useMemo(
    () => pendingExams.find((e) => e.id === selectedId),
    [selectedId]
  );

  const setField = (key, val) => setValues((prev) => ({ ...prev, [key]: val }));

  const isOut = (value, ref) => {
    const r = parseRange(ref);
    const n = parseFloat(value);
    if (!r || Number.isNaN(n)) return false;
    return n < r.min || n > r.max;
  };

  const saveResults = () => {
    toast.success('Résultats enregistrés (starter mock)', {
      description: 'Intégration API backend à brancher ensuite.',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Saisie des Résultats de Laboratoire</h1>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1 font-semibold">
          Encodage des valeurs biologiques et validation technique
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Liste examens à saisir */}
        <Card className="xl:col-span-1">
          <CardContent className="p-4">
            <h3 className="font-bold mb-3">Examens à traiter</h3>
            <div className="space-y-2">
              {pendingExams.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedId === e.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <p className="text-sm font-bold">{e.patient}</p>
                  <p className="text-xs text-muted-foreground">{e.code}</p>
                  <Badge className="mt-2 bg-blue-500/10 text-blue-600 border-blue-500/20 border">
                    {e.tests.length} test(s)
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Formulaire */}
        <Card className="xl:col-span-2">
          <CardContent className="p-4 md:p-6">
            {!selectedExam ? (
              <p className="text-sm text-muted-foreground">Aucun examen sélectionné.</p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{selectedExam.patient}</h3>
                    <p className="text-xs text-muted-foreground">{selectedExam.code}</p>
                  </div>
                  <Badge className="bg-violet-500/10 text-violet-600 border-violet-500/20 border">
                    Saisie en cours
                  </Badge>
                </div>

                <div className="space-y-4">
                  {selectedExam.tests.map((t) => {
                    const abnormal = isOut(values[t.key], t.ref);
                    return (
                      <div key={t.key} className="p-4 rounded-xl border border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <Beaker className="w-4 h-4 text-primary" />
                          <p className="text-sm font-bold">{t.name}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label>Valeur</Label>
                            <Input
                              value={values[t.key] || ''}
                              onChange={(e) => setField(t.key, e.target.value)}
                              placeholder="Ex: 12.5"
                              className={abnormal ? 'border-rose-500 focus-visible:ring-rose-500' : ''}
                            />
                          </div>

                          <div className="space-y-1">
                            <Label>Unité</Label>
                            <Input value={t.unit} disabled />
                          </div>

                          <div className="space-y-1">
                            <Label>Valeur de référence</Label>
                            <Input value={t.ref} disabled />
                          </div>
                        </div>

                        {values[t.key] && (
                          <p className={`text-xs mt-2 font-semibold ${abnormal ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {abnormal ? '⚠️ Valeur hors norme' : '✅ Valeur dans la norme'}
                          </p>
                        )}
                      </div>
                    );
                  })}

                  <div className="space-y-1">
                    <Label>Commentaire du technicien</Label>
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Observation additionnelle..."
                      className="min-h-[90px]"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={saveResults} className="rounded-xl font-bold">
                      <Save className="w-4 h-4 mr-2" />
                      Enregistrer les résultats
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LabResults;