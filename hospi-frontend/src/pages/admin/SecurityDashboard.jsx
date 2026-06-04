import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  AlertTriangle,
  Users,
  Activity,
  Lock,
  Server,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LogOut,
  Wrench,
  Power,
  Crown,
  Smartphone,
  Ban
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import superAdminApi from '../../services/superAdminApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { toast } from 'sonner';

const SecurityDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logsPage, setLogsPage] = useState(0);
  const [logsTotal, setLogsTotal] = useState(0);
  const [users, setUsers] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const location = useLocation();
  const navigate = useNavigate();

  // Nouveaux states
  const [timeline, setTimeline] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [maintenance, setMaintenance] = useState(false);
  const [health, setHealth] = useState(null);
  const [superAdmins, setSuperAdmins] = useState([]);
  const [devices, setDevices] = useState([]);

  const LOGS_PER_PAGE = 20;

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsData, alertsData, logsData, usersData, timelineData, sessionsData, maintenanceData, healthData, superAdminsData, devicesData] = await Promise.all([
        superAdminApi.getSecurityStats(),
        superAdminApi.getSecurityAlerts(),
        superAdminApi.getAuditLogs({}, 0, LOGS_PER_PAGE),
        superAdminApi.getAllUsers(),
        superAdminApi.getTimeline(24),
        superAdminApi.getActiveSessions(),
        superAdminApi.getMaintenanceStatus(),
        superAdminApi.getSystemHealth(),
        superAdminApi.getSuperAdmins(),
        superAdminApi.getDevices()
      ]);
      setStats(statsData || {});
      setAlerts(alertsData || []);
      setLogs(logsData?.content || logsData || []);
      setLogsTotal(logsData?.totalElements || logsData?.length || 0);
      setUsers(usersData || []);
      setTimeline(timelineData || []);
      setSessions(sessionsData || []);
      setMaintenance(maintenanceData?.maintenance || false);
      setHealth(healthData || null);
      setSuperAdmins(superAdminsData || []);
      setDevices(devicesData || []);
    } catch (err) {
      toast.error('Erreur chargement dashboard sécurité');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // 🔗 Synchronise l'onglet actif avec l'URL (pour la navigation SuperAdmin)
  useEffect(() => {
    const path = location.pathname;
    const tabMap = {
      '/superadmin/alerts': 'alerts',
      '/superadmin/users': 'users',
      '/superadmin/sessions': 'sessions',
      '/superadmin/devices': 'devices',
      '/superadmin/system': 'system',
      '/superadmin/devs': 'devs',
      '/superadmin/logs': 'logs',
    };
    if (tabMap[path]) {
      setActiveTab(tabMap[path]);
    } else if (path === '/superadmin') {
      setActiveTab('overview');
    }
  }, [location.pathname]);

  const loadLogsPage = async (page) => {
    try {
      const data = await superAdminApi.getAuditLogs({
        user: searchFilter || undefined,
      }, page, LOGS_PER_PAGE);
      setLogs(data?.content || data || []);
      setLogsTotal(data?.totalElements || data?.length || 0);
      setLogsPage(page);
    } catch (err) {
      toast.error('Erreur chargement logs');
    }
  };

  const handleToggleUser = async (userId, currentStatus) => {
    try {
      await superAdminApi.toggleUserActive(userId, !currentStatus);
      toast.success(`Compte ${!currentStatus ? 'activé' : 'suspendu'}`);
      loadAll();
    } catch (err) {
      toast.error('Erreur modification statut');
    }
  };

  const handleForceReset = async (userId) => {
    try {
      await superAdminApi.forcePasswordReset(userId);
      toast.success('Réinitialisation forcée envoyée');
    } catch (err) {
      toast.error('Erreur réinitialisation');
    }
  };

  const handleForceLogout = async (userId) => {
    try {
      await superAdminApi.forceLogout(userId);
      toast.success('Utilisateur déconnecté de tous ses appareils');
      loadAll();
    } catch (err) {
      toast.error('Erreur déconnexion forcée');
    }
  };

  const handleToggleMaintenance = async () => {
    try {
      const newStatus = !maintenance;
      await superAdminApi.setMaintenanceStatus(newStatus, newStatus ? 'Maintenance planifiée' : '');
      toast.success(newStatus ? 'Mode maintenance activé' : 'Mode maintenance désactivé');
      setMaintenance(newStatus);
    } catch (err) {
      toast.error('Erreur mode maintenance');
    }
  };

  const handlePromoteToSuperAdmin = async (userId) => {
    try {
      await superAdminApi.promoteToSuperAdmin(userId);
      toast.success('Utilisateur promu Super Admin');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur promotion');
    }
  };

  const handleBlockDevice = async (deviceId) => {
    try {
      await superAdminApi.blockDevice(deviceId);
      toast.success('Appareil bloqué');
      loadAll();
    } catch (err) {
      toast.error('Erreur blocage appareil');
    }
  };

  const handleUnblockDevice = async (deviceId) => {
    try {
      await superAdminApi.unblockDevice(deviceId);
      toast.success('Appareil débloqué');
      loadAll();
    } catch (err) {
      toast.error('Erreur déblocage appareil');
    }
  };

  const severityColor = (sev) => {
    switch (sev) {
      case 'CRITICAL': return 'bg-red-100 text-red-700 border-red-300';
      case 'WARNING': return 'bg-amber-100 text-amber-700 border-amber-300';
      default: return 'bg-blue-100 text-blue-700 border-blue-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-10 w-10 text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">Chargement du tableau de bord sécurité...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-7 h-7 text-primary" />
            Super Admin — Gouvernance & Sécurité
          </h1>
          <p className="text-muted-foreground">Contrôle complet du système Inua Afya</p>
        </div>
        <Button variant="outline" onClick={loadAll} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Rafraîchir
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2 overflow-x-auto">
        {[
          { key: 'overview', label: 'Vue d\'ensemble', icon: Activity },
          { key: 'alerts', label: 'Alertes', icon: AlertTriangle },
          { key: 'users', label: 'Utilisateurs', icon: Users },
          { key: 'sessions', label: 'Sessions', icon: LogOut },
          { key: 'devices', label: 'Appareils', icon: Smartphone },
          { key: 'system', label: 'Système', icon: Wrench },
          { key: 'devs', label: 'Développeurs', icon: Crown },
          { key: 'logs', label: 'Logs détaillés', icon: Eye },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              const pathMap = {
                overview: '/superadmin',
                alerts: '/superadmin/alerts',
                users: '/superadmin/users',
                sessions: '/superadmin/sessions',
                system: '/superadmin/system',
                devices: '/superadmin/devices',
                devs: '/superadmin/devs',
                logs: '/superadmin/logs',
              };
              navigate(pathMap[tab.key] || '/superadmin');
              setActiveTab(tab.key);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.key === 'alerts' && alerts.length > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
                {alerts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── TAB OVERVIEW ─── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Logs 24h</CardDescription>
                <CardTitle className="text-3xl">{stats.totalLogs24h ?? 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Événements enregistrés</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Accès Patients 24h</CardDescription>
                <CardTitle className="text-3xl">{stats.patientDataAccess24h ?? 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Traçés par AuditLogAspect</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-red-600">Échecs Login 24h</CardDescription>
                <CardTitle className="text-3xl text-red-600">{stats.failedLogins24h ?? 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {stats.bruteForceSuspects ?? 0} suspects brute-force
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Alertes actives</CardDescription>
                <CardTitle className="text-3xl">{alerts.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {alerts.filter(a => a.severity === 'CRITICAL').length} critiques
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 📊 Graphique Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Activité du système (24 dernières heures)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top utilisateurs Patient */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Top utilisateurs — Accès données patients (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.topPatientDataUsers24h?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead className="text-right">Accès</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.topPatientDataUsers24h.map((u, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{u.user}</TableCell>
                        <TableCell className="text-right">{u.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-sm">Aucun accès patient enregistré les dernières 24h.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── TAB ALERTES ─── */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-medium">Aucune alerte active</h3>
              <p className="text-muted-foreground">Le système est stable.</p>
            </div>
          ) : (
            alerts.map((alert, idx) => (
              <Card key={idx} className={`border-l-4 ${alert.severity === 'CRITICAL' ? 'border-l-red-500' : 'border-l-amber-500'}`}>
                <CardContent className="p-4 flex items-start gap-4">
                  {alert.severity === 'CRITICAL' ? (
                    <AlertTriangle className="w-6 h-6 text-red-500 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{alert.title}</h4>
                      <Badge className={severityColor(alert.severity)}>{alert.severity}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(alert.timestamp).toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ─── TAB UTILISATEURS ─── */}
      {activeTab === 'users' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Gestion des comptes utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Auth</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell className="text-sm">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role?.replace('ROLE_', '')}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <span className="flex items-center gap-1 text-green-600 text-sm"><CheckCircle2 className="w-3 h-3" /> Actif</span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 text-sm"><XCircle className="w-3 h-3" /> Suspendu</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.oauthProvider ? `OAuth (${user.oauthProvider})` : 'Local'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant={user.isActive ? "destructive" : "default"}
                        onClick={() => handleToggleUser(user.id, user.isActive)}
                      >
                        {user.isActive ? 'Suspendre' : 'Activer'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleForceReset(user.id)}
                      >
                        <Lock className="w-3 h-3 mr-1" />
                        Reset MDP
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── TAB SESSIONS ─── */}
      {activeTab === 'sessions' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="w-5 h-5" />
              Sessions récentes (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">Aucune connexion récente</TableCell>
                    </TableRow>
                  ) : (
                    sessions.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{s.utilisateur}</TableCell>
                        <TableCell className="text-xs font-mono">{s.ip}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{new Date(s.date).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          {/* On associe à l'utilisateur pour force-logout si trouvé */}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const u = users.find(u => u.username === s.utilisateur || u.email === s.utilisateur);
                              if (u) handleForceLogout(u.id);
                              else toast.error('Utilisateur non trouvé');
                            }}
                          >
                            <Power className="w-3 h-3 mr-1" />
                            Déconnecter
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── TAB APPAREILS ─── */}
      {activeTab === 'devices' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Appareils connectés
            </CardTitle>
            <CardDescription>
              Bloquez un appareil pour empêcher tout utilisateur de s'y connecter, même en changeant de compte.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Appareil</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Navigateur</TableHead>
                    <TableHead>Dernière activité</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">Aucun appareil enregistré</TableCell>
                    </TableRow>
                  ) : (
                    devices.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-xs max-w-[120px] truncate" title={d.deviceId}>{d.deviceId}</TableCell>
                        <TableCell className="font-medium text-sm">{d.username}</TableCell>
                        <TableCell className="text-xs font-mono">{d.ipAddress}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate" title={d.userAgent}>{d.userAgent}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{d.lastSeen ? new Date(d.lastSeen).toLocaleString() : '—'}</TableCell>
                        <TableCell>
                          {d.blocked ? (
                            <Badge variant="destructive" className="gap-1"><Ban className="w-3 h-3" /> Bloqué</Badge>
                          ) : (
                            <Badge variant="default" className="bg-green-600 gap-1"><CheckCircle2 className="w-3 h-3" /> Actif</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {d.blocked ? (
                            <Button size="sm" variant="outline" onClick={() => handleUnblockDevice(d.deviceId)}>
                              Débloquer
                            </Button>
                          ) : (
                            <Button size="sm" variant="destructive" onClick={() => handleBlockDevice(d.deviceId)}>
                              <Ban className="w-3 h-3 mr-1" />
                              Bloquer
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── TAB SYSTÈME ─── */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {/* Mode Maintenance */}
          <Card className={maintenance ? 'border-red-500' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                Mode Maintenance
              </CardTitle>
              <CardDescription>
                Lorsque le mode maintenance est actif, seuls les administrateurs peuvent accéder au système.
                Tous les autres utilisateurs verront un message de maintenance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">{maintenance ? 'Maintenance active' : 'Système opérationnel'}</p>
                  <p className="text-sm text-muted-foreground">
                    {maintenance ? 'Seuls les ADMIN peuvent se connecter.' : 'Tous les utilisateurs peuvent accéder au système.'}
                  </p>
                </div>
                <Button
                  variant={maintenance ? 'destructive' : 'default'}
                  onClick={handleToggleMaintenance}
                >
                  {maintenance ? 'Désactiver' : 'Activer'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Santé système */}
          {health && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-emerald-500" />
                  Santé du serveur
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Java</p>
                    <p className="font-mono text-sm">{health.javaVersion}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">OS</p>
                    <p className="font-mono text-sm">{health.os}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Mémoire utilisée</p>
                    <p className="font-mono text-sm">{health.memory?.usedMb} / {health.memory?.totalMb} MB</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Processeurs</p>
                    <p className="font-mono text-sm">{health.processors}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─── TAB DÉVELOPPEURS (Super Admins) ─── */}
      {activeTab === 'devs' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                Super Admins — Développeurs du système
              </CardTitle>
              <CardDescription>
                Liste des comptes disposant du contrôle total du système Inua Afya.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {superAdmins.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Aucun Super Admin défini.</p>
                  <div className="bg-muted p-4 rounded-lg text-left text-sm font-mono">
                    <p className="font-semibold mb-2">Pour créer le premier Super Admin (SQL uniquement) :</p>
                    <code className="text-emerald-600">
                      UPDATE users SET role_id = (SELECT id FROM roles WHERE nom = 'ROLE_SUPERADMIN') WHERE email = 'votre-email@example.com';
                    </code>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Créé le</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {superAdmins.map((sa) => (
                        <TableRow key={sa.id}>
                          <TableCell className="font-medium">{sa.firstName} {sa.lastName}</TableCell>
                          <TableCell className="text-sm">{sa.email}</TableCell>
                          <TableCell className="text-sm">{sa.username}</TableCell>
                          <TableCell>
                            {sa.isActive ? (
                              <span className="flex items-center gap-1 text-green-600 text-sm"><CheckCircle2 className="w-3 h-3" /> Actif</span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-600 text-sm"><XCircle className="w-3 h-3" /> Inactif</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{sa.createdAt ? new Date(sa.createdAt).toLocaleDateString() : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Promotion */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Promouvoir un utilisateur en Super Admin
              </CardTitle>
              <CardDescription>
                Attention : cette action donne un accès complet et irrévocable au système.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rôle actuel</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users
                      .filter(u => u.role !== 'ROLE_SUPERADMIN')
                      .map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.username}</TableCell>
                          <TableCell className="text-sm">{u.email}</TableCell>
                          <TableCell><Badge variant="outline">{u.role?.replace('ROLE_', '')}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handlePromoteToSuperAdmin(u.id)}
                            >
                              <Crown className="w-3 h-3 mr-1" />
                              Promouvoir
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── TAB LOGS ─── */}
      {activeTab === 'logs' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Logs d'audit détaillés
            </CardTitle>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Filtrer par utilisateur..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="max-w-sm"
              />
              <Button onClick={() => loadLogsPage(0)}>
                <Search className="w-4 h-4 mr-1" />
                Rechercher
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Cible</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(log.date).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{log.action}</TableCell>
                      <TableCell className="text-sm">{log.utilisateur}</TableCell>
                      <TableCell className="text-sm">{log.cible}</TableCell>
                      <TableCell>
                        <Badge variant={log.type === 'success' ? 'default' : log.type === 'failure' ? 'destructive' : 'secondary'}>
                          {log.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{log.ip}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {logsPage + 1} — {logs.length} résultats
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={logsPage === 0}
                  onClick={() => loadLogsPage(logsPage - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={logs.length < LOGS_PER_PAGE}
                  onClick={() => loadLogsPage(logsPage + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SecurityDashboard;
