import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  Info, 
  AlertTriangle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { useNotifications } from '../../context/NotificationContext';
import { toast } from 'sonner';

// ✅ URL dynamique - fonctionne en local et en production
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
const AUDIT_API_URL = `${API_BASE_URL}/api/audit`;

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  
  // 🔔 On utilise le contexte pour savoir quand rafraîchir
  const { notifications } = useNotifications(); 

  // Charger les données au montage du composant
  useEffect(() => {
    fetchLogs();
  }, []);

  // Rafraîchir la table quand une nouvelle notification arrive
  useEffect(() => {
    if (notifications.length > 0) {
        fetchLogs();
    }
  }, [notifications]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/logs`);
      setLogs(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Erreur logs:", error);
      toast.error("Impossible de récupérer les logs réels");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.utilisateur?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.cible?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || log.type?.toLowerCase() === typeFilter.toLowerCase();
    
    return matchesSearch && matchesType;
  });

  const getTypeIcon = (type) => {
    switch(type?.toLowerCase()) {
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getTypeBadgeColor = (type) => {
    switch(type?.toLowerCase()) {
      case 'success': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'warning': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'error': return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      default: return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    }
  };

  // ✅ Correction de la fonction Export pour gérer le téléchargement de fichier
  const handleExport = async () => {
    const exportPromise = new Promise(async (resolve, reject) => {
      try {
        const response = await axios.get(`${API_BASE_URL}/export`, { 
          responseType: 'blob' 
        });

        // Création du lien de téléchargement
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        link.setAttribute('download', `audit_report_${timestamp}.csv`);
        
        document.body.appendChild(link);
        link.click();
        
        // Nettoyage
        link.remove();
        window.URL.revokeObjectURL(url);
        resolve();
      } catch (error) {
        console.error("Export error:", error);
        reject(error);
      }
    });

    toast.promise(exportPromise, {
      loading: 'Préparation du fichier CSV...',
      success: 'Le fichier a été téléchargé avec succès',
      error: 'Erreur lors de la génération de l\'export',
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-space-grotesk font-bold text-foreground mb-2">
            Audit & Logs
          </h1>
          <p className="text-muted-foreground">
            Historique réel des actions effectuées dans le système
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchLogs} variant="outline" size="icon" disabled={loading} title="Actualiser">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
          <Button onClick={handleExport} variant="default" className="gap-2" disabled={logs.length === 0}>
            <Download className="w-4 h-4" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards Dynamiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total" value={logs.length} icon={<FileText className="w-6 h-6 text-slate-500" />} />
        <StatCard title="Succès" value={logs.filter(l => l.type?.toLowerCase() === 'success').length} color="text-emerald-600" bgColor="bg-emerald-500/10" icon={<CheckCircle className="w-6 h-6 text-emerald-600" />} />
        <StatCard title="Alertes" value={logs.filter(l => l.type?.toLowerCase() === 'warning').length} color="text-amber-600" bgColor="bg-amber-500/10" icon={<AlertTriangle className="w-6 h-6 text-amber-600" />} />
        <StatCard title="Erreurs" value={logs.filter(l => l.type?.toLowerCase() === 'error').length} color="text-rose-600" bgColor="bg-rose-500/10" icon={<AlertCircle className="w-6 h-6 text-rose-600" />} />
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm bg-card/50 backdrop-blur">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Rechercher par utilisateur, action, cible ou détails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-background"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Filtrer par type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="success">Succès</SelectItem>
                <SelectItem value="warning">Avertissement</SelectItem>
                <SelectItem value="error">Erreur</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-none shadow-lg overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="flex items-center justify-between">
            <span className="text-xl">Historique des Logs</span>
            <Badge variant="secondary" className="font-mono">{filteredLogs.length} entrée{filteredLogs.length > 1 ? 's' : ''}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground animate-pulse">Synchronisation avec le serveur...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[120px]">Type</TableHead>
                    <TableHead>Action & Détails</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Cible</TableHead>
                    <TableHead className="w-[180px]">Date & Heure</TableHead>
                    <TableHead className="text-right pr-6">IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Info className="w-8 h-8 opacity-20" />
                          <p className="italic">Aucun log ne correspond à vos critères de recherche.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/30 transition-colors group">
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 font-medium capitalize ${getTypeBadgeColor(log.type)}`}>
                            {getTypeIcon(log.type)}
                            {log.type || 'info'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                           <div className="flex flex-col">
                             <span className="font-semibold text-foreground">{log.action}</span>
                             <span className="text-xs text-muted-foreground line-clamp-1 group-hover:line-clamp-none transition-all">
                               {log.details}
                             </span>
                           </div>
                        </TableCell>
                        <TableCell className="font-medium">{log.utilisateur}</TableCell>
                        <TableCell>
                          <span className="text-sm px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                            {log.cible}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {log.date ? new Date(log.date).toLocaleDateString('fr-FR') : '---'}
                            </span>
                            <span>{log.date ? new Date(log.date).toLocaleTimeString('fr-FR') : '---'}</span>
                          </div>
                        </TableCell>
                        
                        {/* ✅ AFFICHAGE IP : Correction pour visibilité maximale (Texte blanc sur fond foncé) */}
                        <TableCell className="text-right pr-6">
                          <span className="font-mono text-[11px] font-bold text-white bg-slate-900 px-2 py-1 rounded border border-slate-700 select-all">
                            {log.ip || '0.0.0.0'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Sous-composant pour les cartes de stats
const StatCard = ({ title, value, icon, color = "", bgColor = "bg-muted" }) => (
  <Card className="border-none shadow-sm hover:shadow-md transition-all duration-300 group">
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className={cn("text-3xl font-space-grotesk font-bold tracking-tight", color)}>{value}</p>
        </div>
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300", bgColor)}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

// Helper function pour cn
function cn(...inputs) {
  return inputs.filter(Boolean).join(" ");
}

export default AuditLogs;