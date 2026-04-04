import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, AlertCircle, UserRound, TestTube2, Clock3, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';

import { getQueue, updateStatus } from '../../services/api/labTestService'; // <-- utiliser le service central

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const statusStyles = {
  EN_ATTENTE: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  EN_COURS: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  TERMINE: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  VALIDE: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
};

const priorityStyles = {
  URGENT: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  NORMALE: 'bg-muted text-muted-foreground border-border',
  NORMAL: 'bg-muted text-muted-foreground border-border',
};

function normalizeStatus(raw) {
  const s = String(raw || '').toUpperCase().trim();
  if (['EN_ATTENTE', 'PENDING', 'WAITING'].includes(s)) return 'EN_ATTENTE';
  if (['EN_COURS', 'IN_PROGRESS', 'PROCESSING'].includes(s)) return 'EN_COURS';
  if (['TERMINE', 'TERMINÉ', 'DONE', 'COMPLETED'].includes(s)) return 'TERMINE';
  if (['VALIDE', 'VALIDÉ', 'VALIDATED'].includes(s)) return 'VALIDE';
  return s || 'EN_ATTENTE';
}

function normalizePriority(raw) {
  const p = String(raw || '').toUpperCase().trim();
  if (['URGENT', 'CRITICAL', 'HIGH'].includes(p)) return 'URGENT';
  return 'NORMALE';
}

function normalizeRow(item) {
  return {
    id: item.id ?? item.exam_id ?? item.request_id,
    code: item.testCode ?? item.code ?? item.reference ?? item.exam_code ?? 'N/A',
    patient:
      item.patientName ||
      item.patient_name ||
      item.patient?.full_name ||
      item.patient?.name ||
      `${item.patient?.first_name || ''} ${item.patient?.last_name || ''}`.trim() ||
      'Patient inconnu',
    exam: item.testName ?? item.exam_name ?? item.service_name ?? 'Examen',
    receivedAt: item.requestedAt ?? item.received_at ?? item.created_at ?? item.requested_at ?? null,
    status: normalizeStatus(item.status),
    priority: normalizePriority(item.priority),
    fromFinance: Boolean(item.fromFinance ?? item.from_finance ?? item.isFromFinance),
  };
}

/**
 * extrait la "page" du backend en acceptant plusieurs formats
 * (tolérant : ApiResponse wrapper, PageResponse, arrays…)
 */
function extractListPayload(json) {
  // Si wrapper ApiResponse { success: true, data: ... }
  const payload = json?.data ?? json;

  // Si payload est PageResponse { content, page, size, totalElements, totalPages }
  if (payload?.content && Array.isArray(payload.content)) {
    return {
      items: payload.content,
      total: payload.totalElements ?? payload.total ?? payload.total_count ?? payload.count ?? payload.content.length,
      page: Number(payload.page ?? payload.number ?? payload.pageNumber ?? 0),
      pageSize: Number(payload.size ?? payload.pageSize ?? payload.limit ?? payload.per_page ?? payload.content.length),
    };
  }

  // Cas commun { items, total, page, pageSize }
  if (payload?.items && Array.isArray(payload.items)) {
    return {
      items: payload.items,
      total: payload.total ?? payload.count ?? payload.items.length,
      page: Number(payload.page ?? 0),
      pageSize: Number(payload.pageSize ?? payload.per_page ?? payload.limit ?? payload.items.length),
    };
  }

  // Cas { data: [...] } (déjà extrait plus haut)
  if (Array.isArray(payload)) {
    return { items: payload, total: payload.length, page: 0, pageSize: payload.length || 10 };
  }

  return { items: [], total: 0, page: 0, pageSize: 10 };
}

const LabQueue = () => {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('TOUS');
  const [priorityFilter, setPriorityFilter] = useState('TOUS');

  // Frontend pages are 1-based for users, backend expects 0-based
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState('');

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const fetchQueue = useCallback(
    async (signal) => {
      setLoading(true);
      setError('');

      try {
        // backend page is 0-based
        const backendPage = Math.max(0, page - 1);

        // appeler le service central (axios)
        const res = await getQueue(backendPage, pageSize, {
          params: {
            search: query || undefined,
            status: statusFilter !== 'TOUS' ? statusFilter : undefined,
            priority: priorityFilter !== 'TOUS' ? priorityFilter : undefined,
          },
        });

        // res structure : axios response
        const payload = extractListPayload(res?.data ?? {});
        const normalized = payload.items.map(normalizeRow);
        setRows(normalized);
        setTotal(Number(payload.total) || normalized.length);

        // backend page is 0-based -> convert to frontend (1-based)
        const backendReturnedPage = Number(payload.page ?? 0);
        const backendReturnedSize = Number(payload.pageSize ?? payload.size ?? pageSize);

        if (!Number.isNaN(backendReturnedPage)) setPage(backendReturnedPage + 1);
        if (!Number.isNaN(backendReturnedSize) && backendReturnedSize > 0) setPageSize(backendReturnedSize);
      } catch (e) {
        setError(e?.message || 'Erreur de chargement');
        setRows([]);
        setTotal(0);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [page, pageSize, query, statusFilter, priorityFilter]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchQueue(controller.signal);
    return () => controller.abort();
  }, [fetchQueue]);

  // Refresh auto toutes les 30s
  useEffect(() => {
    const id = setInterval(() => {
      const controller = new AbortController();
      fetchQueue(controller.signal);
    }, 30000);
    return () => clearInterval(id);
  }, [fetchQueue]);

  const handleManualRefresh = async () => {
    const controller = new AbortController();
    await fetchQueue(controller.signal);
    toast.success('File d’attente actualisée');
  };

  const handleTakeInCharge = async (row) => {
    if (!row?.id) return;
    setUpdatingId(row.id);

    try {
      // utiliser le service central pour PATCH
      await updateStatus(row.id, 'EN_COURS');

      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, status: 'EN_COURS' } : r))
      );

      toast.success(`Examen ${row.code} pris en charge`);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Échec de la mise à jour');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">File d’attente Laboratoire</h1>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1 font-semibold">
            Examens en attente via API
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
                onChange={(e) => {
                  setPage(1);
                  setQuery(e.target.value);
                }}
                placeholder="Rechercher patient, code, examen..."
                className="pl-9 rounded-xl"
              />
            </div>

            <div className="lg:col-span-2">
              <select
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                value={statusFilter}
                onChange={(e) => {
                  setPage(1);
                  setStatusFilter(e.target.value);
                }}
              >
                <option value="TOUS">Tous statuts</option>
                <option value="EN_ATTENTE">En attente</option>
                <option value="EN_COURS">En cours</option>
                <option value="TERMINE">Terminé</option>
                <option value="VALIDE">Validé</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <select
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                value={priorityFilter}
                onChange={(e) => {
                  setPage(1);
                  setPriorityFilter(e.target.value);
                }}
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
                onChange={(e) => {
                  setPage(1);
                  setPageSize(Number(e.target.value));
                }}
              >
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt} / page
                  </option>
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

          {/* Rows */}
          {!loading && rows.length === 0 && !error && (
            <div className="py-10 text-center text-muted-foreground text-sm italic">
              Aucun examen trouvé pour ce filtre.
            </div>
          )}

          {!loading && rows.length > 0 && (
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.id} className="p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <UserRound className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{row.patient}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {row.code} • {row.exam}
                        {row.receivedAt ? ` • Reçu: ${new Date(row.receivedAt).toLocaleString()}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`border ${priorityStyles[row.priority] || priorityStyles.NORMALE}`}>
                        {row.priority}
                      </Badge>

                      <Badge className={`border ${statusStyles[row.status] || 'bg-muted text-muted-foreground'}`}>
                        {row.status.replace('_', ' ')}
                      </Badge>

                      {row.fromFinance && (
                        <Badge className="border bg-emerald-100 text-emerald-700">
                          Finance
                        </Badge>
                      )}

                      {row.status === 'EN_ATTENTE' && (
                        <Button
                          size="sm"
                          className="rounded-lg"
                          onClick={() => handleTakeInCharge(row)}
                          disabled={updatingId === row.id}
                        >
                          {updatingId === row.id ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />
                              ...
                            </>
                          ) : (
                            <>
                              Prendre en charge
                              <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* mini infos secondaires */}
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <TestTube2 className="w-3.5 h-3.5" />
                      Examen labo
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="w-3.5 h-3.5" />
                      Statut: {row.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Total: <span className="font-bold text-foreground">{total}</span> • Page{' '}
              <span className="font-bold text-foreground">{page}</span> / {totalPages}
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Suivant
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LabQueue;