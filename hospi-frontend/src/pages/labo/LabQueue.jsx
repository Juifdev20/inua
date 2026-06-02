import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, AlertCircle, UserRound, TestTube2, Clock3, ArrowRight, Eye, FileText, Beaker, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { labApi } from '../../services/labApi';

// ✅ FIX: Suppression de la pagination - affichage sur une seule page
const PAGE_SIZE_OPTIONS = [50, 100, 200];

const statusStyles = {
  EN_ATTENTE: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  EN_COURS: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  TERMINE: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  VALIDE: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  RESULTAT_DISPONIBLE: 'bg-green-500/10 text-green-600 border-green-500/20',
};

const priorityStyles = {
  URGENT: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  NORMALE: 'bg-muted text-muted-foreground border-border',
  NORMAL: 'bg-muted text-muted-foreground border-border',
};

const LabQueue = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('TOUS');
  const [priorityFilter, setPriorityFilter] = useState('TOUS');
  const [pageSize, setPageSize] = useState(100);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [takeLoading, setTakeLoading] = useState(false);
  const [error, setError] = useState('');

  // ✅ FIX: Use labApi.getQueue which returns boxes grouped by patient
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      console.log('🔄 [LABQUEUE] Fetching lab queue...');

      const res = await labApi.getQueue();
      
      // La réponse de /api/lab/queue a la structure: { success, data: [...], message }
      let boxes = [];
      if (res.data?.success && Array.isArray(res.data.data)) {
        boxes = res.data.data;
      } else if (Array.isArray(res.data)) {
        boxes = res.data;
      }

      console.log('📡 [LABQUEUE] Data received:', { boxCount: boxes.length });

      // ✅ FIX: Transform boxes to rows format for display
      // Each box from /api/lab/queue is already grouped by patient (consultation)
      const transformedRows = boxes.map(box => {
        // Map exams from the box - filtrer uniquement les examens actifs
        const allTests = box.exams?.filter(e => e.active !== false).map(exam => ({
          id: exam.id,
          testName: exam.serviceName,
          code: exam.serviceName,
          status: exam.resultValue ? 'RESULTAT_DISPONIBLE' : (exam.status || 'EN_ATTENTE'),
          results: exam.resultValue || null,
          interpretation: exam.labComment || null,
          unit: exam.unit || 'N/A',
          normalRange: exam.referenceRangeText || 'N/A',
          isCritical: exam.isCritical || false,
          active: true,
        })) || [];

        const completedTests = allTests.filter(t => t.results).length;
        const pendingTests = allTests.filter(t => !t.results).length;
        
        // Determine display status
        let displayStatus = 'EN_ATTENTE';
        if (pendingTests === 0 && allTests.length > 0) {
          displayStatus = 'RESULTAT_DISPONIBLE';
        } else if (completedTests > 0) {
          displayStatus = 'EN_COURS';
        }

        return {
          id: box.consultationId,
          code: box.patientCode || `LAB-${box.consultationId}`,
          patient: box.patientName || 'Patient inconnu',
          patientId: box.patientId,
          consultationId: box.consultationId,
          priority: box.criticalExams > 0 ? 'URGENT' : 'NORMALE',
          fromFinance: true,
          receivedAt: box.createdAt || box.updatedAt,
          status: displayStatus,
          testCount: allTests.length,
          allTests: allTests,
          displayStatus: displayStatus,
          completedCount: completedTests,
          pendingCount: pendingTests,
        };
      });
      
      // Filter by search query if provided
      let filteredRows = transformedRows;
      if (query && query.trim()) {
        const searchTerm = query.toLowerCase();
        filteredRows = transformedRows.filter(row => 
          row.patient.toLowerCase().includes(searchTerm) ||
          row.code.toLowerCase().includes(searchTerm) ||
          row.allTests.some(t => t.testName.toLowerCase().includes(searchTerm))
        );
      }
      
      // Filter by status if not TOUS
      if (statusFilter !== 'TOUS') {
        filteredRows = filteredRows.filter(row => row.displayStatus === statusFilter);
      }
      
      // Filter by priority if not TOUS  
      if (priorityFilter !== 'TOUS') {
        filteredRows = filteredRows.filter(row => row.priority === priorityFilter);
      }
      
      setRows(filteredRows);
      setTotal(filteredRows.length);

      console.log('✅ [LABQUEUE] Displayed rows:', filteredRows.length);
      
    } catch (e) {
      console.error('❌ [LABQUEUE] Fetch error:', e);
      const errorMessage = e?.response?.data?.message || e?.message || 'Erreur de chargement';
      setError(errorMessage);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter, priorityFilter]);

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 [LABQUEUE] Auto-refresh triggered');
      fetchQueue();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const handleManualRefresh = async () => {
    await fetchQueue();
    toast.success('File d\'attente actualisée');
  };

  const handleTakeInCharge = async (group) => {
    if (!group.allTests || group.allTests.length === 0) {
      toast.error('Aucun test à prendre en charge');
      return;
    }

    const trueId = group.consultationId || group.patientId || group.id;

    if (!trueId) {
      toast.error('Erreur critique : Identifiant introuvable');
      return;
    }

    console.log('🧪 [LABQUEUE] Taking charge:', { 
      patient: group.patient,
      testCount: group.testCount,
      trueId: trueId,
    });

    setTakeLoading(true);
    setUpdatingId(group.patient);

    try {
      // Update local state to show as EN_COURS
      setRows((prev) =>
        prev.map((r) => {
          if (r.patient === group.patient) {
            return {
              ...r,
              displayStatus: 'EN_COURS',
              allTests: r.allTests.map(t => ({ ...t, status: 'EN_COURS' }))
            };
          }
          return r;
        })
      );

      toast.success(`✅ Dossier pris en charge`, {
        description: `${group.patient} - Redirection vers la saisie...`,
        duration: 3000,
      });

      // Navigate to the labo results page with patient ID
      navigate(`/labo/results/${trueId}`);

    } catch (error) {
      console.error('❌ [LABQUEUE] Error:', error);
      toast.error('❌ Erreur lors de la prise en charge');
    } finally {
      setTakeLoading(false);
      setUpdatingId(null);
    }
  };

  const handleViewDetails = (group) => {
    const trueId = group.consultationId || group.patientId || group.id;
    navigate(`/labo/results/${trueId}`);
  };

  const getCompletionStats = (group) => {
    const completed = group.allTests.filter(t => t.results).length;
    const total = group.allTests.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  };

  const getUniqueKey = (group, index) => {
    return `group_${group.consultationId || group.id || index}_${Date.now()}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">File d'attente Laboratoire</h1>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1 font-semibold">
            🟢 Total: {total} patient{total > 1 ? 's' : ''}
          </p>
        </div>

        <Button variant="outline" className="rounded-xl" onClick={handleManualRefresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4 border-b border-border/70 bg-muted/20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="relative lg:col-span-6">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher patient, code, examen..."
                className="pl-9 rounded-xl"
              />
            </div>

            <div className="lg:col-span-2">
              <select
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="TOUS">Tous statuts</option>
                <option value="EN_ATTENTE">En attente</option>
                <option value="EN_COURS">En cours</option>
                <option value="RESULTAT_DISPONIBLE">Résultats prêts</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <select
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="TOUS">Toutes priorités</option>
                <option value="URGENT">Urgent</option>
                <option value="NORMALE">Normale</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <select
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                value={String(pageSize)}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt} / page</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>

        <CardContent className="p-4">
          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Erreur de chargement</p>
                <p className="text-xs">{error}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={handleManualRefresh}>
                  Réessayer
                </Button>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="py-10 text-center text-muted-foreground text-sm">
              <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" />
              Chargement des examens...
            </div>
          )}

          {/* Empty State */}
          {!loading && rows.length === 0 && !error && (
            <div className="py-10 text-center text-muted-foreground text-sm italic">
              <TestTube2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Aucun examen trouvé pour ce filtre.
            </div>
          )}

          {/* Rows */}
          {!loading && rows.length > 0 && (
            <div className="space-y-3">
              {rows.map((group, index) => {
                const stats = getCompletionStats(group);

                return (
                  <div 
                    key={getUniqueKey(group, index)} 
                    className={`p-4 rounded-xl border transition-colors cursor-pointer ${
                      group.displayStatus === 'EN_COURS' 
                        ? 'border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20'
                        : group.displayStatus === 'RESULTAT_DISPONIBLE'
                        ? 'border-green-500/30 bg-green-500/5'
                        : 'border-border hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <UserRound className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm truncate">{group.patient}</p>

                          <Badge className={`border ${statusStyles[group.displayStatus] || 'bg-muted text-muted-foreground'}`}>
                            {group.displayStatus.replace('_', ' ')}
                          </Badge>

                          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 border">
                            <TestTube2 className="w-3 h-3 mr-1" />
                            {stats.completed}/{stats.total} test(s) remplis
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {group.code}
                        </p>

                        {group.allTests && group.allTests.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {group.allTests.slice(0, 3).map((t) => (
                              <Badge key={`badge_${t.id}_${t.testName}`} variant="outline" className="text-[10px]">
                                <Beaker className="w-2.5 h-2.5 mr-1" />
                                {t.testName.substring(0, 15) + (t.testName.length > 15 ? '...' : '')}
                              </Badge>
                            ))}
                            {group.allTests.length > 3 && (
                              <Badge variant="outline" className="text-[10px]">
                                +{group.allTests.length - 3} autres
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`border ${priorityStyles[group.priority] || priorityStyles.NORMALE}`}>
                          {group.priority}
                        </Badge>

                        {group.fromFinance && (
                          <Badge className="border bg-emerald-100 text-emerald-700">Finance</Badge>
                        )}

                        {group.displayStatus === 'EN_ATTENTE' && (
                          <Button
                            size="sm"
                            className="rounded-lg"
                            onClick={() => handleTakeInCharge(group)}
                            disabled={updatingId === group.patient || takeLoading}
                          >
                            {updatingId === group.patient ? (
                              <><RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />...</>
                            ) : (
                              <>Prendre en charge<ArrowRight className="w-3.5 h-3.5 ml-1" /></>
                            )}
                          </Button>
                        )}

                        {group.displayStatus === 'EN_COURS' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="rounded-lg"
                            onClick={() => navigate('/lab')}
                          >
                            <Clock3 className="w-3.5 h-3.5 mr-1" />
                            Continuer saisie
                          </Button>
                        )}

                        {group.displayStatus === 'RESULTAT_DISPONIBLE' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-lg"
                            onClick={() => handleViewDetails(group)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Voir résultats
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <TestTube2 className="w-3.5 h-3.5" />
                          Statut: {group.displayStatus}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle className={`w-3.5 h-3.5 ${group.displayStatus === 'RESULTAT_DISPONIBLE' ? 'text-green-600' : 'text-muted-foreground'}`} />
                          {stats.completed}/{stats.total} complétés
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            group.displayStatus === 'RESULTAT_DISPONIBLE' ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${stats.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {rows.length > 0 && (
            <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/30 border border-border">
              <div className="text-sm">
                <p className="text-muted-foreground">
                  Affichage <span className="font-bold text-foreground">1</span>-<span className="font-bold text-foreground">{total}</span> sur <span className="font-bold text-foreground">{total}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-lg font-semibold" disabled={loading} onClick={handleManualRefresh}>
                  Actualiser
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LabQueue;
