import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, BellRing, Clock3, Loader2, Filter, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import api from '../../services/api/api';
import { toast } from 'sonner';

// Formater le temps relatif
const formatRelativeTime = (dateString) => {
  if (!dateString) return 'Date inconnue';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

const LabAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'critical'
  const [currentUser, setCurrentUser] = useState(null);

  // Récupérer l'utilisateur connecté depuis le localStorage
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      } catch (e) {
        console.error('Erreur parsing user:', e);
      }
    }
  }, []);

  // Récupérer les notifications
  const fetchAlerts = useCallback(async () => {
    if (!currentUser?.id) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/notifications/user/${currentUser.id}`);
      if (response.data) {
        // Transformer les notifications backend au format attendu par le frontend
        const formattedAlerts = response.data.map(n => ({
          id: n.id,
          title: n.title || 'Notification',
          message: n.message || '',
          type: n.type === 'EXAMEN_A_REALISER' || n.type === 'RESULTAT_ANALYSE' ? 'CRITIQUE' : 'INFO',
          time: formatRelativeTime(n.createdAt),
          read: n.read || false,
          createdAt: n.createdAt,
          referenceId: n.referenceId,
          rawType: n.type
        }));
        setAlerts(formattedAlerts);
      }
    } catch (err) {
      console.error('Erreur récupération alertes:', err);
      toast.error('Erreur lors du chargement des alertes');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Charger les alertes au montage et quand l'utilisateur change
  useEffect(() => {
    fetchAlerts();
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Marquer une alerte comme lue
  const markOne = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
      toast.success('Alerte marquée comme lue');
    } catch (err) {
      console.error('Erreur marquage lu:', err);
      toast.error('Erreur lors du marquage');
    }
  };

  // Marquer toutes comme lues
  const markAll = async () => {
    if (!currentUser?.id) return;
    try {
      await api.post(`/notifications/user/${currentUser.id}/mark-all-read`);
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
      toast.success('Toutes les alertes marquées comme lues');
    } catch (err) {
      console.error('Erreur marquage tout lu:', err);
      toast.error('Erreur lors du marquage');
    }
  };

  // Filtrer les alertes
  const filteredAlerts = alerts.filter(a => {
    if (filter === 'unread') return !a.read;
    if (filter === 'critical') return a.type === 'CRITIQUE';
    return true;
  });

  const unreadCount = alerts.filter((a) => !a.read).length;
  const criticalCount = alerts.filter((a) => a.type === 'CRITIQUE' && !a.read).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Alertes & Notifications</h1>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1 font-semibold">
            Suivi des événements critiques et notifications opérationnelles
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" onClick={fetchAlerts}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Rafraîchir
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={markAll}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Tout marquer lu
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button 
          variant={filter === 'all' ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => setFilter('all')}
          className="rounded-full"
        >
          Toutes ({alerts.length})
        </Button>
        <Button 
          variant={filter === 'unread' ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => setFilter('unread')}
          className="rounded-full"
        >
          Non lues ({unreadCount})
        </Button>
        <Button 
          variant={filter === 'critical' ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => setFilter('critical')}
          className="rounded-full"
        >
          Critiques ({criticalCount})
        </Button>
      </div>

      <Card className="border-amber-500/20">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm">Résumé alertes</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount} alerte(s) non lue(s) sur {alerts.length} au total.
              {criticalCount > 0 && (
                <span className="text-rose-500 font-semibold ml-1">({criticalCount} critique{criticalCount > 1 ? 's' : ''})</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Chargement des alertes...</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <p className="font-semibold text-lg">Aucune alerte</p>
            <p className="text-sm text-muted-foreground mt-1">
              {filter === 'all' ? 'Tout va bien ! Aucune notification pour le moment.' :
               filter === 'unread' ? 'Toutes les alertes ont été lues.' :
               'Aucune alerte critique en ce moment.'}
            </p>
          </CardContent>
        </Card>
      ) : (
      <div className="space-y-3">
        {filteredAlerts.map((a) => (
          <Card
            key={a.id}
            className={`${!a.read ? 'border-primary/30 bg-primary/[0.03]' : 'border-border/70'}`}
          >
            <CardContent className="p-4 flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  a.type === 'CRITIQUE'
                    ? 'bg-rose-500/10 text-rose-600'
                    : 'bg-blue-500/10 text-blue-600'
                }`}
              >
                {a.type === 'CRITIQUE' ? <AlertTriangle className="w-5 h-5" /> : <Clock3 className="w-5 h-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold">{a.title}</p>
                  <Badge
                    className={`border ${
                      a.type === 'CRITIQUE'
                        ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                        : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                    }`}
                  >
                    {a.type}
                  </Badge>
                  {!a.read && <Badge className="bg-primary text-primary-foreground">NOUVEAU</Badge>}
                </div>

                <p className="text-xs text-muted-foreground mt-1">{a.message}</p>
                <p className="text-[11px] text-muted-foreground mt-2">{a.time}</p>
              </div>

              {!a.read && (
                <Button variant="ghost" size="sm" onClick={() => markOne(a.id)}>
                  Marquer lu
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      )}
    </div>
  );
};

export default LabAlerts;