import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { admissionService } from '@/services/admissionService';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { CheckCircle, Beaker, ChevronRight, RefreshCw, Search, User, Clock, DollarSign, FileText, Calendar } from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// ============================================================
// ✅ FONCTIONS UTILITAIRES
// ============================================================
const formatAmount = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num)) return '0 F';
  return `${num.toLocaleString('fr-FR')} F`;
};

// Fonction pour formater la date
const formatDateTime = (dateString) => {
  if (!dateString) return '--/--/---- --:--';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, 'dd/MM/yyyy HH:mm', { locale: fr });
  } catch (e) {
    return '--/--/---- --:--';
  }
};

// Fonction pour obtenir le label de date
const getDateLabel = (dateString) => {
  if (!dateString) return 'Date inconnue';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (isToday(date)) return "Aujourd'hui";
    if (isYesterday(date)) return 'Hier';
    return format(date, 'MMMM yyyy', { locale: fr });
  } catch (e) {
    return 'Date inconnue';
  }
};

// ============================================================
// ✅ COMPOSANT PRINCIPAL: ExamReception
// ============================================================
export const ExamReception = () => {
  const { token } = useAuth();
  const location = useLocation();
  const cardRef = useRef(null);
  
  // ✅ État pour le filtrage automatique depuis le Dashboard
  const [autoSelectedId, setAutoSelectedId] = useState(null);
  
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [examPaid, setExamPaid] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [examServices, setExamServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // ✅ NOUVEAU: État pour le mode historique (afficher toutes les fiches)
  const [showHistory, setShowHistory] = useState(false);

  // ✅ GESTION: Détecter si on arrive du Dashboard avec une consultation spécifique
  useEffect(() => {
    // Nouvelle logique: consultationId + autoOpen pour ouvrir directement
    if (location.state?.consultationId && location.state?.autoOpen) {
      console.log("🎯 ExamReception: Consultation spécifique depuis le Dashboard:", location.state.consultationId);
      setAutoSelectedId(location.state.consultationId);
      setShowHistory(true); // Afficher l'historique pour trouver la consultation
      window.scrollTo(0, 0);
    }
    // Ancienne logique: selectedPatientId pour compatibilité
    else if (location.state?.selectedPatientId) {
      console.log("🎯 ExamReception: Patient sélectionné depuis le Dashboard:", location.state.selectedPatientId);
      setAutoSelectedId(location.state.selectedPatientId);
      if (location.state.patientName) {
        setSearchTerm(location.state.patientName);
      }
      window.scrollTo(0, 0);
    }
  }, [location.state]);

  // ✅ AUTO-OPEN: Ouvrir automatiquement la consultation spécifique après chargement
  useEffect(() => {
    if (autoSelectedId && consultations.length > 0 && !selected) {
      const consultation = consultations.find(c => c.id === autoSelectedId);
      if (consultation) {
        console.log("🎯 ExamReception: Ouverture automatique de la consultation:", consultation.id);
        open(consultation);
      }
    }
  }, [autoSelectedId, consultations, selected]);

  // ✅ CORRECTION: Fonction de chargement avec le nouvel endpoint de la réception
  const load = useCallback(async () => {
    setLoading(true);
    try {
      console.log("📡 ExamReception: Chargement des données via nouvel endpoint...");
      
      // ✅ NOUVEAU: Appeler le nouvel endpoint spécifique à la réception
      const data = await admissionService.getPendingConsultations();
      const all = Array.isArray(data) ? data : (data.content || []);
      
      console.log("📋 ExamReception: Consultations reçues:", all.length);
      console.log("📋 ExamReception: Exemple de données:", all[0]);
      
      // Filter consultations with status PENDING_PAYMENT (with or without exams)
      const pending = all.filter(c => {
        const status = c.status || c.statut;
        // ✅ CORRECTION: Accepter PENDING_PAYMENT même sans exams
        const isPending = status === 'PENDING_PAYMENT' || status === 'ATTENTE_PAIEMENT_LABO' || status === 'labo';
        
        console.log(`📋 Consultation ${c.id}: status=${status}, isPending=${isPending}, exams=${c.exams?.length}, totalAmount=${c.totalAmount}, isToday=${c.isToday}`);
        
        return isPending;
      });
      
      console.log("📋 ExamReception: Consultations en attente:", pending.length);
      setConsultations(pending);
      
      // Charger les services pour les prix (si nécessaire pour l'affichage)
      const services = await admissionService.getAvailableServices();
      setExamServices(Array.isArray(services) ? services : []);
      
    } catch (e) {
      console.error("❌ ExamReception: Erreur chargement:", e);
      setConsultations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ CORRECTION: Auto-refresh avec chargement initial
  // Charge les données AU DÉMARRAGE puis toutes les 60 secondes
  useEffect(() => {
    if (!token) return;
    
    // 1. Chargement initial
    load();
    
    // 2. Auto-refresh toutes les 60 secondes
    const interval = setInterval(() => {
      console.log("🔄 ExamReception: Auto-refresh...");
      load();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [token, load]);

  // ✅ NOUVELLE LOGIQUE: Filtrer les consultations selon le mode (historique ou non)
  // Par défaut: dernières 24 heures (showHistory = false)
  // Avec historique: toutes les consultations (showHistory = true)
  const filteredConsultations = useMemo(() => {
    let result = consultations;
    
    // Filtrer par terme de recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => 
        (c.patientName || '').toLowerCase().includes(term) ||
        String(c.patientId || '').includes(term)
      );
    }
    
    // ✅ NOUVEAU: Filtrer par date si pas en mode historique
    if (!showHistory) {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      result = result.filter(c => {
        if (!c.createdAt) return false;
        const createdDate = new Date(c.createdAt);
        return createdDate >= twentyFourHoursAgo;
      });
    }
    
    return result;
  }, [consultations, searchTerm, showHistory]);

  // ✅ NOUVELLE LOGIQUE: Grouper les consultations par date
  const groupedConsultations = useMemo(() => {
    const groups = {};
    
    filteredConsultations.forEach(c => {
      const label = getDateLabel(c.createdAt);
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(c);
    });
    
    // Trier les groupes par ordre logique (Aujourd'hui, Hier, puis par mois)
    const sortedGroups = {};
    const priorityLabels = ["Aujourd'hui", 'Hier'];
    
    priorityLabels.forEach(label => {
      if (groups[label]) {
        sortedGroups[label] = groups[label];
        delete groups[label];
      }
    });
    
    // Ajouter le reste des groupes triés par date décroissante
    Object.keys(groups)
      .sort((a, b) => {
        const dateA = groups[a][0]?.createdAt ? new Date(groups[a][0].createdAt) : new Date(0);
        const dateB = groups[b][0]?.createdAt ? new Date(groups[b][0].createdAt) : new Date(0);
        return dateB - dateA;
      })
      .forEach(label => {
        sortedGroups[label] = groups[label];
      });
    
    return sortedGroups;
  }, [filteredConsultations]);

  // Calculer les statistiques
  const stats = useMemo(() => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const todayCount = consultations.filter(c => {
      if (!c.createdAt) return false;
      const createdDate = new Date(c.createdAt);
      return createdDate >= twentyFourHoursAgo;
    }).length;
    
    return {
      enAttente: consultations.length,
      aujourdhui: todayCount,
      historique: consultations.length - todayCount
    };
  }, [consultations]);

  const open = (c) => {
    console.log("📋 ExamReception: Ouverture consultation:", c.id, c.patientName);
    setSelected(c);
    setExamPaid(c.examAmountPaid || 0);
  };

  const examTotal = useMemo(() => {
    if (!selected) return 0;
    return (selected.exams || []).reduce((sum, ex) => {
      const svc = examServices.find(s => s.id?.toString() === ex.serviceId?.toString()) || {};
      return sum + (parseFloat(svc.price) || 0);
    }, 0);
  }, [selected, examServices]);

  const remaining = useMemo(() => Math.max(0, examTotal - (parseFloat(examPaid) || 0)), [examTotal, examPaid]);

  const handleSubmit = async () => {
    if (!selected) return;
    if (remaining > 0) {
      toast.error('Paiement incomplet');
      return;
    }
    setIsProcessing(true);
    try {
      console.log("📡 ExamReception: Traitement paiement pour:", selected.id);
      
      const payload = {
        serviceId: selected.serviceId,
        examAmountPaid: parseFloat(examPaid) || 0,
        status: 'labo'
      };
      
      await admissionService.updateAdmission(selected.id, payload);
      toast.success('Paiement reçu, dossier envoyé au laboratoire');
      load();
      setSelected(null);
    } catch (e) {
      console.error("❌ ExamReception: Erreur paiement:", e);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Réception Examens/Analyses</h1>
          <p className="text-muted-foreground">
            Gérez les paiements des examens prescrits par les médecins
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowHistory(!showHistory)} 
            variant={showHistory ? "default" : "outline"}
            className="gap-2"
          >
            <Calendar className="w-4 h-4" />
            {showHistory ? 'Dernières 24h' : 'Voir l\'historique'}
          </Button>
          <Button onClick={load} variant="outline" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom ou ID patient..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 rounded-xl"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-600 uppercase">Total en attente</p>
                <p className="text-xl font-black text-amber-700">{stats.enAttente}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase">Dernières 24h</p>
                <p className="text-xl font-black text-blue-700">{stats.aujourdhui}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100">
                <FileText className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-600 uppercase">Historique</p>
                <p className="text-xl font-black text-slate-700">{stats.historique}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        // Skeleton loading
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-14 h-14 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-40 mb-2" />
                    <Skeleton className="h-4 w-60" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : selected ? (
        // Detail view
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Examen pour {selected.patientName || `Patient #${selected.patientId}`}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                Retour
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Patient Info */}
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
              <Avatar className="w-12 h-12">
                <AvatarImage src={selected.patientPhoto} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {selected.patientName?.[0] || 'P'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold">{selected.patientName || `Patient #${selected.patientId}`}</p>
                <p className="text-sm text-muted-foreground">ID: {selected.patientId}</p>
              </div>
            </div>

            {/* Exams List */}
            <div className="space-y-2">
              <p className="font-bold">Examens prescrits :</p>
              {(selected.exams || []).map((ex, i) => {
                const svc = examServices.find(s => s.id?.toString() === ex.serviceId?.toString());
                return (
                  <div key={i} className="flex justify-between items-center p-3 bg-muted/30 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Beaker className="w-4 h-4 text-blue-500" />
                      <span>{svc ? svc.name : 'Examen'} {ex.note && `(${ex.note})`}</span>
                    </div>
                    <span className="font-bold">{svc ? formatAmount(svc.price) : ''}</span>
                  </div>
                );
              })}
            </div>

            {/* ✅ NOUVEAU: Diagnostic du Médecin */}
            {selected.diagnostic && (
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                <h4 className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400 mb-2">
                  Diagnostic du Médecin
                </h4>
                <p className="text-sm italic text-foreground">{selected.diagnostic}</p>
              </div>
            )}

            {/* Payment */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">Montant dû</label>
                <div className="text-2xl font-black text-blue-600">{formatAmount(examTotal)}</div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">Montant payé</label>
                <Input 
                  type="number" 
                  value={examPaid} 
                  onChange={(e) => setExamPaid(parseFloat(e.target.value) || 0)} 
                  className="h-12 text-xl font-bold"
                />
              </div>
            </div>

            {examPaid > 0 && (
              <div className={`p-3 rounded-xl ${remaining === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {remaining === 0 ? '✓ Montant exact!' : `Reste à payer: ${formatAmount(remaining)}`}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setSelected(null)} className="flex-1">
                Annuler
              </Button>
              <Button 
                disabled={remaining > 0 || isProcessing} 
                onClick={handleSubmit} 
                className="flex-[2] bg-emerald-500 hover:bg-emerald-600"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Valider paiement & envoyer
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        // ✅ NOUVELLE LISTE GROUPÉE PAR DATE
        <div className="space-y-6">
          {Object.keys(groupedConsultations).length > 0 ? (
            Object.entries(groupedConsultations).map(([dateLabel, consultationsInGroup]) => (
              <div key={dateLabel} className="space-y-3">
                {/* Titre du groupe */}
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-bold uppercase text-muted-foreground">
                    {dateLabel} ({consultationsInGroup.length} fiche{consultationsInGroup.length > 1 ? 's' : ''})
                  </h3>
                </div>
                
                {/* Cartes du groupe */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {consultationsInGroup.map(c => (
                    <Card 
                      key={c.id} 
                      // ✅ NOUVEAU: Bordure bleue si isToday, sinon amber
                      className={`cursor-pointer hover:shadow-md transition-all border-l-4 ${
                        c.isToday ? 'border-l-blue-500 bg-blue-50/30' : 'border-l-amber-500'
                      }`}
                      onClick={() => open(c)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar className="w-12 h-12 border-2 border-background flex-shrink-0">
                              <AvatarImage src={c.patientPhoto} />
                              <AvatarFallback className={c.isToday ? 'bg-blue-100 text-blue-600 font-bold' : 'bg-amber-100 text-amber-600 font-bold'}>
                                {c.patientName?.[0] || 'P'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-bold truncate">{c.patientName || `Patient #${c.patientId}`}</p>
                                {/* ✅ NOUVEAU: Badge "Nouveau" si isToday */}
                                {c.isToday && (
                                  <Badge className="bg-blue-500 text-white text-xs flex-shrink-0">
                                    Nouveau
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {(c.exams || []).length} examen(s) prescrit(s)
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right flex-shrink-0">
                            {/* ✅ NOUVEAU: Afficher le montant total depuis l'API */}
                            <p className="text-lg font-black text-blue-600">
                              {formatAmount(c.totalAmount || 0)}
                            </p>
                            {/* ✅ NOUVEAU: Badge avec date et heure */}
                            <div className="flex flex-col items-end gap-1 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {formatDateTime(c.createdAt)}
                              </span>
                              <Badge variant="outline" className={c.isToday ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>
                                <Clock className="w-3 h-3 mr-1" />
                                En attente
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <Card className="border-dashed border-2">
              <CardContent className="py-16 text-center">
                <div className="bg-muted/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Beaker className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-bold">Aucun dossier en attente</h3>
                <p className="text-muted-foreground text-sm">
                  {searchTerm 
                    ? 'Essayez avec d\'autres mots-clés' 
                    : showHistory 
                      ? 'Aucune fiche dans l\'historique'
                      : 'Les consultations des dernières 24 heures apparaîtront ici'}
                </p>
                {!showHistory && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setShowHistory(true)}
                  >
                    Voir l'historique complet
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default ExamReception;

