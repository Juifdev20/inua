import React, { useMemo, useState, useEffect } from 'react';
import { Search, History, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import api from '../../services/api/api';
import { toast } from 'sonner';

const LabHistory = () => {
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get('/lab/history');
        if (response.data?.data) {
          setHistory(response.data.data);
        }
      } catch (err) {
        console.error('Erreur historique:', err);
        setError('Erreur lors du chargement');
        toast.error('Erreur lors du chargement de l\'historique');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      (r) =>
        r.patient?.toLowerCase().includes(q) ||
        r.exam?.toLowerCase().includes(q) ||
        String(r.id).includes(q)
    );
  }, [query, history]);

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
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">Chargement...</p>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center">
                      <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
                      <p className="mt-2 text-sm text-muted-foreground">{error}</p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground italic">
                      {query ? 'Aucun résultat trouvé.' : 'Aucun examen avec résultats.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="border-t border-border/60 hover:bg-muted/20">
                      <td className="px-4 py-3 font-semibold">
                        {r.patient}
                        {r.patientCode && <span className="block text-xs text-muted-foreground font-normal">{r.patientCode}</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.date}</td>
                      <td className="px-4 py-3">{r.exam}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 ${r.isCritical ? 'text-rose-500' : ''}`}>
                          <TrendingUp className={`w-3.5 h-3.5 ${r.isCritical ? 'text-rose-500' : 'text-primary'}`} />
                          {r.result}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={`border ${
                            r.status === 'RESULTS_AVAILABLE' || r.status === 'DELIVERED_TO_DOCTOR'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : 'bg-violet-500/10 text-violet-600 border-violet-500/20'
                          }`}
                        >
                          {r.status === 'RESULTS_AVAILABLE' || r.status === 'DELIVERED_TO_DOCTOR' ? 'VALIDÉ' : 'TERMINÉ'}
                        </Badge>
                      </td>
                    </tr>
                  ))
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