import React, { useMemo, useState } from 'react';
import { Search, History, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';

const rows = [
  { id: 1, patient: 'KABILA Jean', date: '2026-03-14', exam: 'NFS', result: 'Normale', status: 'VALIDÉ' },
  { id: 2, patient: 'KABILA Jean', date: '2026-03-10', exam: 'CRP', result: 'Élevée', status: 'VALIDÉ' },
  { id: 3, patient: 'MUTOMBO Sarah', date: '2026-03-11', exam: 'Glycémie', result: 'Normale', status: 'VALIDÉ' },
  { id: 4, patient: 'ILUNGA David', date: '2026-03-12', exam: 'Créatinine', result: 'Légèrement élevée', status: 'TERMINÉ' },
];

const LabHistory = () => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.patient.toLowerCase().includes(q) ||
        r.exam.toLowerCase().includes(q) ||
        String(r.id).includes(q)
    );
  }, [query]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Historique des Résultats par Patient</h1>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1 font-semibold">
          Consultation des résultats antérieurs et suivi longitudinal
        </p>
      </div>

      <Card>
        <CardContent className="p-4 border-b border-border/70 bg-muted/20">
          <div className="relative max-w-lg">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher patient ou examen..."
              className="pl-9 rounded-xl"
            />
          </div>
        </CardContent>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="text-left">
                  <th className="px-4 py-3 font-bold">Patient</th>
                  <th className="px-4 py-3 font-bold">Date</th>
                  <th className="px-4 py-3 font-bold">Examen</th>
                  <th className="px-4 py-3 font-bold">Résultat</th>
                  <th className="px-4 py-3 font-bold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border/60 hover:bg-muted/20">
                    <td className="px-4 py-3 font-semibold">{r.patient}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.date}</td>
                    <td className="px-4 py-3">{r.exam}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-primary" />
                        {r.result}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={`border ${
                          r.status === 'VALIDÉ'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-violet-500/10 text-violet-600 border-violet-500/20'
                        }`}
                      >
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground italic">
                      Aucun résultat trouvé pour cette recherche.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LabHistory;