import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, RotateCcw, Send, Trash2, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import superAdminApi from '../../services/superAdminApi';

const STATUS_COLOR = {
  SENT: 'text-emerald-400 bg-emerald-400/10',
  FAILED: 'text-rose-400 bg-rose-400/10',
  PENDING: 'text-amber-400 bg-amber-400/10',
  PERMANENTLY_FAILED: 'text-red-600 bg-red-600/10',
};
const STATUS_ICON = {
  SENT: CheckCircle, FAILED: XCircle, PENDING: Clock, PERMANENTLY_FAILED: AlertTriangle,
};

export default function EmailManagementPage() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsData, statsData] = await Promise.all([
        superAdminApi.getEmailLogs(),
        superAdminApi.getEmailStats(),
      ]);
      setLogs(logsData?.content || logsData || []);
      setStats(statsData || {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRetry = async () => {
    setRetryLoading(true);
    try {
      const r = await superAdminApi.retryFailedEmails();
      flash(`${r?.retried ?? 0} email(s) relancé(s)`);
      fetchData();
    } catch (e) { flash('Erreur retry: ' + (e?.response?.data?.message || e.message)); }
    finally { setRetryLoading(false); }
  };

  const handleTest = async () => {
    if (!testEmail.trim()) return;
    setTestLoading(true);
    try {
      await superAdminApi.testSmtp(testEmail);
      flash(`Email de test envoyé à ${testEmail}`);
    } catch (e) { flash('Erreur SMTP: ' + (e?.response?.data?.message || e.message)); }
    finally { setTestLoading(false); }
  };

  const handleClear = async () => {
    if (!window.confirm('Supprimer les logs de plus de 30 jours ?')) return;
    try {
      const r = await superAdminApi.clearOldEmailLogs();
      flash(r?.message || 'Logs anciens supprimés');
      fetchData();
    } catch (e) { flash('Erreur: ' + e.message); }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestion des Emails</h1>
            <p className="text-sm text-muted-foreground">Logs, retry et test SMTP</p>
          </div>
        </div>
        <button onClick={fetchData} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {msg && (
        <div className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium">{msg}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { key: 'TOTAL', label: 'Total', color: 'text-foreground' },
          { key: 'SENT', label: 'Envoyés', color: 'text-emerald-400' },
          { key: 'FAILED', label: 'Échoués', color: 'text-rose-400' },
          { key: 'PERMANENTLY_FAILED', label: 'Définitifs', color: 'text-red-600' },
        ].map(({ key, label, color }) => (
          <div key={key} className="bg-card border border-border rounded-xl p-4">
            <div className={`text-2xl font-bold ${color}`}>{stats[key] ?? 0}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Test SMTP */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Send className="w-4 h-4 text-primary" /> Test SMTP
          </div>
          <div className="flex gap-2">
            <input value={testEmail} onChange={e => setTestEmail(e.target.value)}
              placeholder="destinataire@example.com" type="email"
              className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <button onClick={handleTest} disabled={testLoading || !testEmail.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {testLoading ? '...' : 'Envoyer'}
            </button>
          </div>
        </div>

        {/* Retry + Clear */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <RotateCcw className="w-4 h-4 text-amber-400" /> Actions
          </div>
          <div className="flex gap-2">
            <button onClick={handleRetry} disabled={retryLoading}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-sm font-medium hover:bg-amber-500/20 disabled:opacity-50 transition-colors">
              <RotateCcw className="w-4 h-4" />
              {retryLoading ? 'Retry...' : 'Relancer échoués'}
            </button>
            <button onClick={handleClear}
              className="flex items-center gap-2 px-3 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-sm font-medium hover:bg-rose-500/20 transition-colors">
              <Trash2 className="w-4 h-4" />
              Purger
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground">Chargement...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Aucun log email</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Destinataire</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Sujet</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Statut</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tentatives</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const StatusIcon = STATUS_ICON[log.status] || Clock;
                return (
                  <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium text-foreground">{log.recipient}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{log.subject}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[log.status] || ''}`}>
                        <StatusIcon className="w-3 h-3" />
                        {log.status}
                      </span>
                      {log.errorMessage && (
                        <div className="text-xs text-rose-400 mt-1 max-w-xs truncate" title={log.errorMessage}>
                          {log.errorMessage}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{log.retryCount} / {log.maxRetries}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString('fr-FR') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
