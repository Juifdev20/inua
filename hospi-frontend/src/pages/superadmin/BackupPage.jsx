import React, { useState, useEffect } from 'react';
import { HardDrive, Play, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, Database } from 'lucide-react';
import superAdminApi from '../../services/superAdminApi';

const STATUS_COLOR = {
  SUCCESS: 'text-emerald-400 bg-emerald-400/10',
  FAILED: 'text-rose-400 bg-rose-400/10',
  IN_PROGRESS: 'text-amber-400 bg-amber-400/10',
  PENDING: 'text-blue-400 bg-blue-400/10',
};
const STATUS_ICON = { SUCCESS: CheckCircle, FAILED: XCircle, IN_PROGRESS: Clock, PENDING: Clock };

export default function BackupPage() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [msg, setMsg] = useState('');

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 5000); };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [h, s] = await Promise.all([
        superAdminApi.getBackupHistory(),
        superAdminApi.getBackupStats(),
      ]);
      setHistory(Array.isArray(h) ? h : []);
      setStats(s || {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleTrigger = async () => {
    if (!window.confirm('Déclencher un backup maintenant ?')) return;
    setTriggering(true);
    try {
      const r = await superAdminApi.triggerBackup();
      flash(`Backup déclenché — ${r?.filename || 'en cours...'}`);
      setTimeout(fetchData, 3000);
    } catch (e) { flash('Erreur: ' + (e?.response?.data?.message || e.message)); }
    finally { setTriggering(false); }
  };

  const formatSize = (kb) => {
    if (!kb || kb === 0) return '—';
    if (kb < 1024) return kb + ' KB';
    return (kb / 1024).toFixed(1) + ' MB';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <HardDrive className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Backup & Restauration</h1>
            <p className="text-sm text-muted-foreground">Sauvegarde PostgreSQL via pg_dump</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={handleTrigger} disabled={triggering}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
            <Play className="w-4 h-4" />
            {triggering ? 'Déclenchement...' : 'Backup maintenant'}
          </button>
        </div>
      </div>

      {msg && (
        <div className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium">{msg}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total backups"  value={stats.total    ?? 0} color="text-foreground" icon={Database} />
        <StatCard label="Réussis"         value={stats.success  ?? 0} color="text-emerald-400" icon={CheckCircle} />
        <StatCard label="Échoués"         value={stats.failed   ?? 0} color="text-rose-400" icon={XCircle} />
        <StatCard label="En cours"        value={stats.inProgress ?? 0} color="text-amber-400" icon={Clock} />
      </div>

      {/* Disk info */}
      {stats.diskTotalGB && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 font-semibold text-foreground mb-3">
            <HardDrive className="w-4 h-4 text-primary" /> Espace disque (répertoire backups)
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              Libre: <span className="text-emerald-400 font-bold">{stats.diskFreeGB} GB</span>
            </span>
            <span className="text-muted-foreground">
              Total: <span className="font-bold">{stats.diskTotalGB} GB</span>
            </span>
            {stats.lastBackup && (
              <span className="text-muted-foreground">
                Dernier: <span className="font-medium">{new Date(stats.lastBackup).toLocaleString('fr-FR')}</span>
              </span>
            )}
          </div>
          <div className="mt-2 w-full bg-muted rounded-full h-2">
            <div className="h-2 rounded-full bg-emerald-400"
              style={{ width: `${Math.min((stats.diskFreeGB / stats.diskTotalGB) * 100, 100)}%` }} />
          </div>
        </div>
      )}

      {/* Note about pg_dump */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-400 flex gap-3">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <strong>Note :</strong> Le backup utilise <code className="bg-amber-500/10 px-1 rounded">pg_dump</code> installé sur le serveur.
          En production (Render/Supabase), utilisez le backup intégré de la plateforme.
          La variable d'environnement <code className="bg-amber-500/10 px-1 rounded">PGPASSWORD</code> ou{' '}
          <code className="bg-amber-500/10 px-1 rounded">DB_PASSWORD</code> doit être configurée.
        </div>
      </div>

      {/* History Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border font-semibold text-foreground flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" /> Historique des backups
        </div>
        {loading ? (
          <div className="flex justify-center py-16 text-muted-foreground">Chargement...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">Aucun backup effectué</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Fichier</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Taille</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Statut</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Déclenché par</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map(b => {
                  const Icon = STATUS_ICON[b.status] || Clock;
                  return (
                    <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{b.filename}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 bg-muted rounded font-medium">{b.type}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatSize(b.fileSizeKb)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[b.status] || ''}`}>
                          <Icon className="w-3 h-3" /> {b.status}
                        </span>
                        {b.errorMessage && (
                          <div className="text-xs text-rose-400 mt-1 max-w-xs truncate" title={b.errorMessage}>
                            {b.errorMessage}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{b.triggeredBy || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {b.createdAt ? new Date(b.createdAt).toLocaleString('fr-FR') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
