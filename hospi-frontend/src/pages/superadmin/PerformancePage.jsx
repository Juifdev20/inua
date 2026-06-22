import React, { useState, useEffect, useCallback } from 'react';
import { Cpu, MemoryStick, Activity, RefreshCw, Clock, Zap, Server, GitBranch } from 'lucide-react';
import superAdminApi from '../../services/superAdminApi';

export default function PerformancePage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await superAdminApi.getPerformanceMetrics();
      setMetrics(data);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('Metrics error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchMetrics]);

  const mem = metrics?.memory;
  const cpu = metrics?.cpu;
  const threads = metrics?.threads;
  const runtime = metrics?.runtime;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Performance Système</h1>
            <p className="text-sm text-muted-foreground">
              {lastRefresh ? `Dernière mise à jour : ${lastRefresh.toLocaleTimeString()}` : 'Chargement...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${autoRefresh ? 'bg-primary/10 text-primary border-primary/30' : 'border-border text-muted-foreground hover:bg-muted'}`}
          >
            {autoRefresh ? '⏱ Auto (10s)' : 'Auto OFF'}
          </button>
          <button onClick={fetchMetrics} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Rafraîchir
          </button>
        </div>
      </div>

      {loading && !metrics ? (
        <div className="flex justify-center py-16 text-muted-foreground">Chargement des métriques...</div>
      ) : !metrics ? (
        <div className="text-center py-16 text-muted-foreground">Données non disponibles</div>
      ) : (
        <>
          {/* Top cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={MemoryStick} label="RAM Heap"
              value={`${mem?.heapUsedMB ?? 0} MB`}
              sub={`sur ${mem?.heapMaxMB ?? 0} MB`}
              progress={mem?.heapUsedPercent ?? 0}
              color={mem?.heapUsedPercent > 80 ? 'text-rose-400' : mem?.heapUsedPercent > 60 ? 'text-amber-400' : 'text-emerald-400'}
            />
            <MetricCard
              icon={Cpu} label="CPU Processus"
              value={`${cpu?.processCpuPercent ?? '—'} %`}
              sub={`Système: ${cpu?.systemCpuPercent ?? '—'} %`}
              progress={cpu?.processCpuPercent ?? 0}
              color={(cpu?.processCpuPercent ?? 0) > 80 ? 'text-rose-400' : (cpu?.processCpuPercent ?? 0) > 50 ? 'text-amber-400' : 'text-emerald-400'}
            />
            <MetricCard
              icon={GitBranch} label="Threads"
              value={threads?.live ?? '—'}
              sub={`Peak: ${threads?.peak ?? '—'} | Daemon: ${threads?.daemon ?? '—'}`}
              color="text-blue-400"
            />
            <MetricCard
              icon={Clock} label="Uptime JVM"
              value={runtime?.uptimeFormatted ?? '—'}
              sub={runtime?.jvmName ?? ''}
              color="text-purple-400"
            />
          </div>

          {/* Memory detail */}
          <Section title="Mémoire JVM" icon={MemoryStick}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MemBar label="Heap utilisé" used={mem?.heapUsedMB} max={mem?.heapMaxMB} color="bg-primary" />
              <MemBar label="Heap alloué" used={mem?.heapCommittedMB} max={mem?.heapMaxMB} color="bg-blue-500" />
              <MemBar label="Non-Heap" used={mem?.nonHeapUsedMB} max={Math.max(mem?.nonHeapUsedMB + 50, 200)} color="bg-purple-500" />
            </div>
          </Section>

          {/* GC */}
          {metrics.gc?.length > 0 && (
            <Section title="Garbage Collector" icon={Zap}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {metrics.gc.map((gc, i) => (
                  <div key={i} className="bg-muted/30 rounded-xl p-4 flex items-start justify-between">
                    <div>
                      <div className="font-medium text-foreground text-sm">{gc.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{gc.count} collectes</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-amber-400">{gc.timeMs} ms</div>
                      <div className="text-xs text-muted-foreground">total</div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* HTTP Requests */}
          {metrics.httpRequests && Object.keys(metrics.httpRequests).length > 0 && (
            <Section title="Requêtes HTTP (top endpoints)" icon={Server}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Endpoint</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Appels</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Moy (ms)</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Max (ms)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(metrics.httpRequests).map(([key, v]) => (
                      <tr key={key} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="py-2 px-3 font-mono text-xs text-foreground">{key}</td>
                        <td className="py-2 px-3 text-right text-muted-foreground">{v.count}</td>
                        <td className="py-2 px-3 text-right text-blue-400 font-medium">{v.meanMs}</td>
                        <td className="py-2 px-3 text-right text-amber-400 font-medium">{v.maxMs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* Runtime info */}
          <Section title="Informations JVM" icon={Server}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <InfoItem label="VM" value={runtime?.jvmName} />
              <InfoItem label="Version" value={runtime?.jvmVersion} />
              <InfoItem label="CPUs disponibles" value={cpu?.availableProcessors} />
              <InfoItem label="Load Average" value={cpu?.systemLoadAverage?.toFixed(2)} />
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, progress, color }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider">
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      {progress !== undefined && (
        <div className="w-full bg-muted rounded-full h-1.5">
          <div className={`h-1.5 rounded-full transition-all ${progress > 80 ? 'bg-rose-400' : progress > 60 ? 'bg-amber-400' : 'bg-emerald-400'}`}
            style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2 font-semibold text-foreground">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </div>
      {children}
    </div>
  );
}

function MemBar({ label, used, max, color }) {
  const pct = max > 0 ? Math.round((used / max) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{used} / {max} MB ({pct}%)</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="bg-muted/30 rounded-lg p-3">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="font-medium text-foreground text-sm truncate">{value ?? '—'}</div>
    </div>
  );
}
