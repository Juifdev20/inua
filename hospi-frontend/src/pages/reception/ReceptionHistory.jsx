import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  History,
  Printer,
  Search,
  User,
  X,
} from 'lucide-react';
import { admissionService } from '../../services/admissionService';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';

/* ================================================================
   Page Historique Reception
   ----------------------------------------------------------------
   3 niveaux :
   1) Blocs Annees                -> 2) Patients de l'annee
   2) Patients de l'annee         -> 3) Fiches du patient
   3) Fiches du patient           -> clic -> /reception/medical-report/:id
   ================================================================ */

const ReceptionHistory = () => {
  const navigate = useNavigate();

  /* ---------- Etats ---------- */
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('years');          // 'years' | 'patients' | 'records'
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [search, setSearch] = useState('');

  /* ---------- Pagination ---------- */
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 50;

  /* ---------- Chargement ---------- */
  useEffect(() => {
    loadData(0);
  }, []);

  const loadData = async (targetPage = 0) => {
    setLoading(true);
    try {
      const response = await admissionService.getAdmissions(targetPage, pageSize);
      const raw = Array.isArray(response)
        ? response
        : response?.content || response?.data?.content || response?.data || [];
      const tPages = response?.totalPages || response?.data?.totalPages || 1;
      const tElements = response?.totalElements || response?.data?.totalElements || raw.length;

      setConsultations(raw);
      setPage(targetPage);
      setTotalPages(tPages);
      setTotalElements(tElements);
      // Retour a la vue annees quand on change de page
      setView('years');
      setSelectedYear(null);
      setSelectedPatient(null);
      setSearch('');
    } catch (err) {
      console.error('Erreur chargement historique:', err);
      toast.error("Impossible de charger l'historique");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Grouping par annee ---------- */
  const yearsMap = useMemo(() => {
    const map = {};
    consultations.forEach((c) => {
      const dateStr = c.createdAt || c.consultationDate || c.date;
      if (!dateStr) return;
      const year = new Date(dateStr).getFullYear();
      if (!map[year]) map[year] = [];
      map[year].push(c);
    });
    // Tri decroissant (annee la plus recente en premier)
    return Object.fromEntries(
      Object.entries(map).sort(([a], [b]) => Number(b) - Number(a))
    );
  }, [consultations]);

  const years = useMemo(() => Object.keys(yearsMap).map(Number), [yearsMap]);

  /* ---------- Patients pour l'annee selectionnee ---------- */
  const patientsForYear = useMemo(() => {
    if (!selectedYear) return [];
    const list = yearsMap[selectedYear] || [];
    const patientMap = new Map();

    list.forEach((c) => {
      const pid = c.patientId || c.patient?.id;
      const pName = c.patientName || `${c.patient?.firstName || ''} ${c.patient?.lastName || ''}`.trim();
      const pCode = c.patientCode || c.patient?.patientCode || c.patient?.code;
      const pPhoto = c.patientPhoto || c.patient?.photoUrl;

      if (!patientMap.has(pid)) {
        patientMap.set(pid, {
          patientId: pid,
          patientName: pName || 'Patient inconnu',
          patientCode: pCode,
          patientPhoto: pPhoto,
          consultations: [],
        });
      }
      patientMap.get(pid).consultations.push(c);
    });

    let arr = Array.from(patientMap.values());
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (p) =>
          p.patientName.toLowerCase().includes(q) ||
          (p.patientCode && p.patientCode.toLowerCase().includes(q))
      );
    }
    // Tri alphabetique
    arr.sort((a, b) => a.patientName.localeCompare(b.patientName));
    return arr;
  }, [selectedYear, yearsMap, search]);

  /* ---------- Fiches pour le patient selectionne ---------- */
  const recordsForPatient = useMemo(() => {
    if (!selectedPatient) return [];
    return [...selectedPatient.consultations].sort(
      (a, b) => new Date(b.createdAt || b.consultationDate) - new Date(a.createdAt || a.consultationDate)
    );
  }, [selectedPatient]);

  /* ---------- Helpers ---------- */
  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    const s = String(status || '').toUpperCase();
    if (s === 'TERMINE' || s === 'COMPLETED' || s === 'SOLDE') return 'bg-emerald-100 text-emerald-700';
    if (s === 'EN_COURS' || s === 'IN_PROGRESS' || s === 'WITH_DOCTOR') return 'bg-blue-100 text-blue-700';
    if (s === 'EN_ATTENTE' || s === 'PENDING' || s === 'WAITING_PAYMENT') return 'bg-amber-100 text-amber-700';
    if (s === 'ANNULE' || s === 'CANCELLED') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  /* ---------- Navigation ---------- */
  const openYear = (year) => {
    setSelectedYear(year);
    setSearch('');
    setView('patients');
  };

  const openPatient = (patient) => {
    setSelectedPatient(patient);
    setView('records');
  };

  const goBack = () => {
    if (view === 'records') {
      setSelectedPatient(null);
      setView('patients');
    } else if (view === 'patients') {
      setSelectedYear(null);
      setSearch('');
      setView('years');
    }
  };

  const viewMedicalReport = (consultationId) => {
    if (!consultationId) return;
    navigate(`/reception/medical-report/${consultationId}`);
  };

  /* ---------- Rendu : Chargement ---------- */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground font-bold text-sm sm:text-base">Chargement de l'historique...</p>
      </div>
    );
  }

  /* ---------- Rendu : Aucune donnee ---------- */
  if (years.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <History className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-base sm:text-lg font-bold text-muted-foreground">Aucun historique disponible</h2>
        <p className="text-xs sm:text-sm text-muted-foreground/60 mt-1">Les consultations apparaitront ici une fois creees.</p>
      </div>
    );
  }

  /* ================================================================
     VUE 1 : BLOCS ANNEES
     ================================================================ */
  if (view === 'years') {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-600/20">
              <History className="text-white w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Historique des Fiches</h1>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm ml-12 sm:ml-[60px]">
            Selectionnez une annee pour consulter les patients et leurs fiches medicales.
          </p>
        </div>

        {/* Grille annees */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {years.map((year) => {
            const count = yearsMap[year]?.length || 0;
            return (
              <button
                key={year}
                onClick={() => openYear(year)}
                className={cn(
                  'group relative bg-card border border-border rounded-[2rem] p-8 text-left',
                  'transition-all duration-300 hover:shadow-xl hover:border-emerald-500/30 hover:-translate-y-1'
                )}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <Calendar className="w-7 h-7 text-emerald-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                </div>
                <h2 className="text-3xl font-black text-foreground mb-1">{year}</h2>
                <p className="text-sm text-muted-foreground font-medium">
                  {count} fiche{count > 1 ? 's' : ''} enregistree{count > 1 ? 's' : ''}
                </p>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-b-[2rem] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-8 bg-card border border-border rounded-2xl p-4">
            <p className="text-xs sm:text-sm text-muted-foreground">
              <span className="font-bold text-foreground">{totalElements}</span> fiche{totalElements > 1 ? 's' : ''} au total
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl gap-1"
                disabled={page === 0 || loading}
                onClick={() => loadData(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Precedent</span>
              </Button>
              <span className="text-sm font-bold px-3 py-1 bg-emerald-500/10 text-emerald-700 rounded-lg">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl gap-1"
                disabled={page >= totalPages - 1 || loading}
                onClick={() => loadData(page + 1)}
              >
                <span className="hidden sm:inline">Suivant</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ================================================================
     VUE 2 : PATIENTS DE L'ANNEE
     ================================================================ */
  if (view === 'patients') {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={goBack} className="rounded-xl h-9 w-9">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Annee {selectedYear}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {patientsForYear.length} patient{patientsForYear.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un patient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl h-10 sm:h-11"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Liste patients */}
        {patientsForYear.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <User className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">Aucun patient trouve</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {patientsForYear.map((patient) => (
              <button
                key={patient.patientId}
                onClick={() => openPatient(patient)}
                className={cn(
                  'group flex items-center gap-3 sm:gap-4 bg-card border border-border rounded-2xl p-4 sm:p-5',
                  'text-left transition-all duration-200 hover:shadow-md hover:border-emerald-500/30'
                )}
              >
                <div className="shrink-0">
                  {patient.patientPhoto ? (
                    <img
                      src={patient.patientPhoto}
                      alt={patient.patientName}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-border"
                    />
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <User className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground text-sm sm:text-base truncate">{patient.patientName}</h3>
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-mono mt-0.5">
                    {patient.patientCode || `ID: ${patient.patientId}`}
                  </p>
                  <p className="text-[10px] sm:text-xs text-emerald-600 font-medium mt-1">
                    {patient.consultations.length} fiche{patient.consultations.length > 1 ? 's' : ''}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ================================================================
     VUE 3 : FICHES DU PATIENT
     ================================================================ */
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 sm:mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={goBack} className="rounded-xl h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            {selectedPatient.patientPhoto ? (
              <img
                src={selectedPatient.patientPhoto}
                alt={selectedPatient.patientName}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover border border-border"
              />
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              </div>
            )}
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight">{selectedPatient.patientName}</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-mono">
                {selectedPatient.patientCode || `ID: ${selectedPatient.patientId}`} - Annee {selectedYear}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Liste fiches */}
      <div className="space-y-4">
        {recordsForPatient.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <FileText className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">Aucune fiche pour ce patient</p>
          </div>
        ) : (
          recordsForPatient.map((record) => {
            const rid = record.id;
            const status = record.status || record.statut || 'EN_ATTENTE';
            const date = record.createdAt || record.consultationDate;
            const doctor = record.doctorName || record.doctor?.fullName || 'Medecin inconnu';
            const motif = record.reasonForVisit || record.motif || 'Non renseigne';
            const code = record.consultationCode || `#${rid}`;

            return (
              <div
                key={rid}
                className={cn(
                  'bg-card border border-border rounded-2xl p-5',
                  'transition-all duration-200 hover:shadow-md hover:border-emerald-500/20'
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Infos fiche */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-foreground">Fiche {code}</h3>
                        <Badge className={cn('text-[10px] font-bold uppercase', getStatusColor(status))}>
                          {status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDateTime(date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Dr. {doctor}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        Motif : {motif}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-1.5"
                      onClick={() => viewMedicalReport(rid)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Voir</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => {
                        viewMedicalReport(rid);
                        setTimeout(() => window.print(), 800);
                      }}
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Imprimer</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ReceptionHistory;
