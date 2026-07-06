import React, { useMemo, useState, useEffect } from 'react';
import { Search, History, TrendingUp, Loader2, AlertCircle, Filter, Calendar, Download, ChevronDown, X, Eye, ArrowUpDown, BarChart3, FileSpreadsheet, FileText, Lock, ChevronRight, FolderOpen, Folder, FileText as FileIcon } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Calendar as CalendarComponent } from '../../components/ui/calendar';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import api from '../../services/api/api';
import { toast } from 'sonner';
import { format as formatDateFn } from 'date-fns';
import { fr } from 'date-fns/locale';
import PatientResultComparison from './PatientResultComparison';
import { useHospitalConfig } from '../../hooks/useHospitalConfig';
import { resolveLogoUrl } from '../../utils/printUtils';
import { API_BASE_URL } from '../../config/environment.js';

const LabHistory = () => {
  const { config } = useHospitalConfig();
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filtres avancés
  const [patientFilter, setPatientFilter] = useState('');
  const [testFilter, setTestFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [statusFilter, setStatusFilter] = useState('TOUS');
  const [sortBy, setSortBy] = useState('date_desc');
  const [showFilters, setShowFilters] = useState(false);
  
  // État pour la comparaison
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  // État pour l'export
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [exporting, setExporting] = useState(false);
  
  // État pour l'expansion des consultations
  const [expandedConsultations, setExpandedConsultations] = useState(new Set());
  
  // État pour la vue détaillée
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get('/lab/history');
        if (response.data?.data) {
          setHistory(response.data.data);
          setTotal(response.data.data.length);
        }
      } catch (err) {
        console.error('Erreur historique:', err);
        setError('Erreur lors du chargement');
        toast.error('Erreur lors du chargement de l\'historique');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const filtered = useMemo(() => {
    let results = [...history];
    
    // Filtre par texte
    const q = query.trim().toLowerCase();
    if (q) {
      results = results.filter(
        (r) =>
          r.patient?.toLowerCase().includes(q) ||
          r.exam?.toLowerCase().includes(q) ||
          String(r.id).includes(q) ||
          r.result?.toLowerCase().includes(q)
      );
    }
    
    // Filtre par patient
    if (patientFilter) {
      results = results.filter(r => 
        r.patient?.toLowerCase().includes(patientFilter.toLowerCase()) ||
        r.patientCode?.toLowerCase().includes(patientFilter.toLowerCase())
      );
    }
    
    // Filtre par test
    if (testFilter) {
      results = results.filter(r => 
        r.exam?.toLowerCase().includes(testFilter.toLowerCase())
      );
    }
    
    // Filtre par date
    if (dateFrom) {
      results = results.filter(r => new Date(r.date) >= dateFrom);
    }
    if (dateTo) {
      results = results.filter(r => new Date(r.date) <= dateTo);
    }
    
    // Filtre par statut
    if (statusFilter !== 'TOUS') {
      results = results.filter(r => r.status === statusFilter);
    }
    
    // Tri
    results.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.date) - new Date(a.date);
        case 'date_asc':
          return new Date(a.date) - new Date(b.date);
        case 'patient_asc':
          return a.patient?.localeCompare(b.patient);
        case 'patient_desc':
          return b.patient?.localeCompare(a.patient);
        case 'test_asc':
          return a.exam?.localeCompare(b.exam);
        case 'test_desc':
          return b.exam?.localeCompare(a.exam);
        default:
          return 0;
      }
    });
    
    return results;
  }, [query, history, patientFilter, testFilter, dateFrom, dateTo, statusFilter, sortBy]);

  // Grouper par consultation (patient + date)
  const groupedByConsultation = useMemo(() => {
    const groups = {};
    filtered.forEach(result => {
      // Utiliser patientId + date comme clé unique pour une consultation
      const consultationKey = `${result.patientId}_${result.date}`;
      if (!groups[consultationKey]) {
        groups[consultationKey] = {
          id: consultationKey,
          patient: result.patient,
          patientCode: result.patientCode,
          patientId: result.patientId,
          date: result.date,
          results: []
        };
      }
      groups[consultationKey].results.push(result);
    });
    return Object.values(groups);
  }, [filtered]);

  // Pagination sur les consultations
  const paginatedConsultations = useMemo(() => {
    const start = (page - 1) * pageSize;
    return groupedByConsultation.slice(start, start + pageSize);
  }, [groupedByConsultation, page, pageSize]);

  const totalPages = Math.ceil(groupedByConsultation.length / pageSize);

  const toggleConsultation = (consultationId) => {
    const newExpanded = new Set(expandedConsultations);
    if (newExpanded.has(consultationId)) {
      newExpanded.delete(consultationId);
    } else {
      newExpanded.add(consultationId);
    }
    setExpandedConsultations(newExpanded);
  };

  const clearFilters = () => {
    setQuery('');
    setPatientFilter('');
    setTestFilter('');
    setDateFrom(null);
    setDateTo(null);
    setStatusFilter('TOUS');
    setSortBy('date_desc');
    setPage(1);
  };

  const hasActiveFilters = query || patientFilter || testFilter || dateFrom || dateTo || statusFilter !== 'TOUS';

  const handleComparePatient = (patient) => {
    setSelectedPatient({
      id: patient.patientId,
      name: patient.patient
    });
    setComparisonOpen(true);
  };

  const handlePrintConsultation = (consultation) => {
    const logoUrl = config.hospitalLogoUrl ? resolveLogoUrl(config.hospitalLogoUrl, API_BASE_URL) : '';
    const primaryColor = config.primaryColor || '#2563eb';
    const hospitalName = config.hospitalName || 'Hôpital';
    
    const printWindow = window.open('', '_blank');
    const printContent = `
      <html>
        <head>
          <title>Résultats Laboratoire - ${consultation.patient}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body { 
              font-family: 'Inter', Arial, sans-serif; 
              padding: 40px; 
              margin: 0;
              background: #fff;
            }
            .header {
              display: flex;
              align-items: center;
              gap: 20px;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid ${primaryColor};
            }
            .logo {
              width: 80px;
              height: 80px;
              object-fit: contain;
            }
            .hospital-info h1 {
              margin: 0 0 5px 0;
              font-size: 24px;
              font-weight: 700;
              color: ${primaryColor};
            }
            .hospital-info p {
              margin: 0;
              font-size: 12px;
              color: #666;
            }
            .document-title {
              background: ${primaryColor};
              color: white;
              padding: 15px 20px;
              border-radius: 8px;
              margin-bottom: 25px;
            }
            .document-title h2 {
              margin: 0;
              font-size: 18px;
              font-weight: 600;
            }
            .patient-info {
              background: #f8fafc;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 25px;
              border-left: 4px solid ${primaryColor};
            }
            .patient-info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
            }
            .info-item label {
              display: block;
              font-size: 11px;
              font-weight: 600;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }
            .info-item p {
              margin: 0;
              font-size: 14px;
              font-weight: 500;
              color: #1e293b;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 25px;
            }
            th { 
              background: ${primaryColor};
              color: white;
              padding: 12px 15px;
              text-align: left;
              font-weight: 600;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            th:first-child { border-radius: 8px 0 0 0; }
            th:last-child { border-radius: 0 8px 0 0; }
            td { 
              padding: 12px 15px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 14px;
            }
            tr:last-child td { border-bottom: none; }
            tr:nth-child(even) { background: #f8fafc; }
            .critical { 
              color: #dc2626; 
              font-weight: 700;
              background: #fef2f2;
              padding: 4px 8px;
              border-radius: 4px;
            }
            .badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
            }
            .badge-valid {
              background: #dcfce7;
              color: #166534;
            }
            .badge-terminated {
              background: #ede9fe;
              color: #6b21a8;
            }
            .footer { 
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              font-size: 11px;
              color: #64748b;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" class="logo" alt="Logo" onerror="this.style.display='none'" />` : ''}
            <div class="hospital-info">
              <h1>${hospitalName}</h1>
              <p>${config.hospitalAddress || ''}</p>
              <p>${config.hospitalPhone || ''}</p>
            </div>
          </div>
          
          <div class="document-title">
            <h2>📋 Rapport de Résultats Laboratoire</h2>
          </div>
          
          <div class="patient-info">
            <div class="patient-info-grid">
              <div class="info-item">
                <label>Patient</label>
                <p>${consultation.patient}</p>
              </div>
              <div class="info-item">
                <label>Code Patient</label>
                <p>${consultation.patientCode || 'N/A'}</p>
              </div>
              <div class="info-item">
                <label>Date</label>
                <p>${consultation.date}</p>
              </div>
              <div class="info-item">
                <label>Nombre d'examens</label>
                <p>${consultation.results.length}</p>
              </div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Examen</th>
                <th>Résultat</th>
                <th>Unité</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              ${consultation.results.map(result => `
                <tr>
                  <td>${result.exam || ''}</td>
                  <td>${result.isCritical ? `<span class="critical">${result.result || ''}</span>` : (result.result || '')}</td>
                  <td>${result.unit || '-'}</td>
                  <td><span class="badge ${result.status === 'RESULTS_AVAILABLE' || result.status === 'DELIVERED_TO_DOCTOR' ? 'badge-valid' : 'badge-terminated'}">${result.status === 'RESULTS_AVAILABLE' || result.status === 'DELIVERED_TO_DOCTOR' ? 'VALIDÉ' : 'TERMINÉ'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Document généré automatiquement le ${formatDateFn(new Date(), 'dd/MM/yyyy à HH:mm')}</p>
            <p>${hospitalName} - Service de Laboratoire</p>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  const handleExportConsultation = (consultation) => {
    const headers = ['Examen', 'Résultat', 'Unité', 'Statut', 'Critique', 'Date'];
    const csvContent = [
      headers.join(','),
      ...consultation.results.map(row => [
        `"${row.exam || ''}"`,
        `"${row.result || ''}"`,
        `"${row.unit || ''}"`,
        `"${row.status || ''}"`,
        row.isCritical ? 'Oui' : 'Non',
        `"${row.date || ''}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `lab_${consultation.patientCode || consultation.patient}_${formatDateFn(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    toast.success('Export CSV réussi');
  };

  const handleViewResult = (result) => {
    setSelectedResult(result);
    setViewDialogOpen(true);
  };

  const handleExport = async (exportFormat) => {
    try {
      setExporting(true);
      
      // Export côté client (CSV pour Excel, Print pour PDF)
      if (exportFormat === 'excel') {
        // Export CSV
        const headers = ['Patient', 'Code Patient', 'Date', 'Examen', 'Résultat', 'Unité', 'Statut', 'Critique'];
        const csvContent = [
          headers.join(','),
          ...filtered.map(row => [
            `"${row.patient || ''}"`,
            `"${row.patientCode || ''}"`,
            `"${row.date || ''}"`,
            `"${row.exam || ''}"`,
            `"${row.result || ''}"`,
            `"${row.unit || ''}"`,
            `"${row.status || ''}"`,
            row.isCritical ? 'Oui' : 'Non'
          ].join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `lab_results_${formatDateFn(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else if (exportFormat === 'pdf') {
        // Export PDF via impression navigateur
        const printWindow = window.open('', '_blank');
        const printContent = `
          <html>
            <head>
              <title>Export Résultats Laboratoire</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f5f5f5; }
                .critical { color: red; font-weight: bold; }
              </style>
            </head>
            <body>
              <h1>Résultats Laboratoire - ${formatDateFn(new Date(), 'dd/MM/yyyy HH:mm')}</h1>
              <p>Filtres: ${query || 'Aucun'} | ${patientFilter || 'Tous les patients'} | ${testFilter || 'Tous les examens'}</p>
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Date</th>
                    <th>Examen</th>
                    <th>Résultat</th>
                    <th>Unité</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  ${filtered.map(row => `
                    <tr>
                      <td>${row.patient || ''} (${row.patientCode || ''})</td>
                      <td>${row.date || ''}</td>
                      <td>${row.exam || ''}</td>
                      <td class="${row.isCritical ? 'critical' : ''}">${row.result || ''}</td>
                      <td>${row.unit || ''}</td>
                      <td>${row.status || ''}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <p>Total: ${filtered.length} résultats</p>
            </body>
          </html>
        `;
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
      }

      toast.success(`Export ${exportFormat.toUpperCase()} réussi`);
      setExportDialogOpen(false);
      setExportPassword('');
    } catch (err) {
      console.error('Erreur export:', err);
      toast.error('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Historique des Résultats</h1>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1 font-semibold">
            Consultation des résultats antérieurs et suivi longitudinal
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={hasActiveFilters ? 'border-primary text-primary' : ''}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtres
            {hasActiveFilters && <Badge className="ml-2 bg-primary text-primary-foreground">{filtered.length}</Badge>}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setExportDialogOpen(true)}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Panneau de filtres avancés */}
      {showFilters && (
        <Card className="border-primary/20">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">Filtres avancés</h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Effacer
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Recherche globale */}
              <div className="md:col-span-2 lg:col-span-4">
                <Label className="text-xs font-semibold mb-1 block">Recherche globale</Label>
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Patient, examen, résultat, ID..."
                    className="pl-9 rounded-lg"
                  />
                </div>
              </div>

              {/* Filtre patient */}
              <div>
                <Label className="text-xs font-semibold mb-1 block">Patient</Label>
                <Input
                  value={patientFilter}
                  onChange={(e) => setPatientFilter(e.target.value)}
                  placeholder="Nom ou code patient"
                  className="rounded-lg"
                />
              </div>

              {/* Filtre test */}
              <div>
                <Label className="text-xs font-semibold mb-1 block">Examen</Label>
                <Input
                  value={testFilter}
                  onChange={(e) => setTestFilter(e.target.value)}
                  placeholder="Nom d'examen"
                  className="rounded-lg"
                />
              </div>

              {/* Filtre date début */}
              <div>
                <Label className="text-xs font-semibold mb-1 block">Date début</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start rounded-lg">
                      <Calendar className="w-4 h-4 mr-2" />
                      {dateFrom ? format(dateFrom, 'dd/MM/yyyy', { locale: fr }) : 'Sélectionner'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Filtre date fin */}
              <div>
                <Label className="text-xs font-semibold mb-1 block">Date fin</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start rounded-lg">
                      <Calendar className="w-4 h-4 mr-2" />
                      {dateTo ? format(dateTo, 'dd/MM/yyyy', { locale: fr }) : 'Sélectionner'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Filtre statut */}
              <div>
                <Label className="text-xs font-semibold mb-1 block">Statut</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOUS">Tous les statuts</SelectItem>
                    <SelectItem value="RESULTS_AVAILABLE">Validé</SelectItem>
                    <SelectItem value="DELIVERED_TO_DOCTOR">Délivré</SelectItem>
                    <SelectItem value="TERMINÉ">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tri */}
              <div>
                <Label className="text-xs font-semibold mb-1 block">Trier par</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="rounded-lg">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date_desc">Date (récent → ancien)</SelectItem>
                    <SelectItem value="date_asc">Date (ancien → récent)</SelectItem>
                    <SelectItem value="patient_asc">Patient (A → Z)</SelectItem>
                    <SelectItem value="patient_desc">Patient (Z → A)</SelectItem>
                    <SelectItem value="test_asc">Examen (A → Z)</SelectItem>
                    <SelectItem value="test_desc">Examen (Z → A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="px-4 py-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Chargement...</p>
            </div>
          ) : error ? (
            <div className="px-4 py-8 text-center">
              <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            </div>
          ) : paginatedConsultations.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground italic">
              {hasActiveFilters ? 'Aucun résultat trouvé pour les filtres actuels.' : 'Aucun examen avec résultats.'}
            </div>
          ) : (
            <div className="divide-y divide-border/60 overflow-x-auto">
              {paginatedConsultations.map((consultation) => (
                <div key={consultation.id} className="border-b border-border/60 last:border-b-0 min-w-[600px]">
                  {/* En-tête de consultation */}
                  <div 
                    className="px-4 py-3 hover:bg-muted/20 cursor-pointer flex items-center justify-between"
                    onClick={() => toggleConsultation(consultation.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {expandedConsultations.has(consultation.id) ? (
                        <FolderOpen className="w-5 h-5 text-primary flex-shrink-0" />
                      ) : (
                        <Folder className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold truncate">{consultation.patient}</span>
                          {consultation.patientCode && (
                            <span className="text-xs text-muted-foreground flex-shrink-0">({consultation.patientCode})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex-shrink-0">{consultation.date}</span>
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {consultation.results.length} examen{consultation.results.length > 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintConsultation(consultation);
                        }}
                        title="Imprimer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportConsultation(consultation);
                        }}
                        title="Exporter CSV"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </Button>
                      <ChevronRight 
                        className={`w-5 h-5 text-muted-foreground transition-transform ${
                          expandedConsultations.has(consultation.id) ? 'rotate-90' : ''
                        }`} 
                      />
                    </div>
                  </div>

                  {/* Détails de la consultation (examen) */}
                  {expandedConsultations.has(consultation.id) && (
                    <div className="px-4 pb-4 pl-12 bg-muted/10">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[500px]">
                          <thead>
                            <tr className="text-left text-xs text-muted-foreground">
                              <th className="pb-2 font-semibold">Examen</th>
                              <th className="pb-2 font-semibold">Résultat</th>
                              <th className="pb-2 font-semibold">Unité</th>
                              <th className="pb-2 font-semibold">Statut</th>
                              <th className="pb-2 font-semibold">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {consultation.results.map((result) => (
                              <tr key={result.id} className="border-t border-border/40">
                                <td className="py-2 truncate max-w-[150px]">{result.exam}</td>
                                <td className="py-2">
                                  <span className={`inline-flex items-center gap-1 ${result.isCritical ? 'text-rose-500' : ''}`}>
                                    <TrendingUp className={`w-3.5 h-3.5 ${result.isCritical ? 'text-rose-500' : 'text-primary'}`} />
                                    {result.result}
                                  </span>
                                </td>
                                <td className="py-2 text-muted-foreground">{result.unit || '-'}</td>
                                <td className="py-2">
                                  <Badge
                                    className={`border ${
                                      result.status === 'RESULTS_AVAILABLE' || result.status === 'DELIVERED_TO_DOCTOR'
                                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                        : 'bg-violet-500/10 text-violet-600 border-violet-500/20'
                                    }`}
                                  >
                                    {result.status === 'RESULTS_AVAILABLE' || result.status === 'DELIVERED_TO_DOCTOR' ? 'VALIDÉ' : 'TERMINÉ'}
                                  </Badge>
                                </td>
                                <td className="py-2">
                                  <div className="flex gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-7 w-7 p-0"
                                      onClick={() => handleComparePatient(result)}
                                      title="Comparer les résultats"
                                    >
                                      <BarChart3 className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-7 w-7 p-0"
                                      onClick={() => handleViewResult(result)}
                                      title="Voir les détails"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-border gap-4">
              <p className="text-xs text-muted-foreground text-center sm:text-left">
                Affichage de {(page - 1) * pageSize + 1} à {Math.min(page * pageSize, groupedByConsultation.length)} sur {groupedByConsultation.length} consultations
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Précédent
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'default' : 'outline'}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de comparaison des résultats */}
      {selectedPatient && (
        <PatientResultComparison
          patientId={selectedPatient.id}
          patientName={selectedPatient.name}
          patientHistory={filtered}
          open={comparisonOpen}
          onClose={() => setComparisonOpen(false)}
        />
      )}

      {/* Modal d'export sécurisé */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-md" aria-describedby="export-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Export Sécurisé
            </DialogTitle>
            <p id="export-description" className="text-sm text-muted-foreground mt-1">
              Exportez les résultats de laboratoire au format Excel ou PDF
            </p>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                L'export des données de laboratoire nécessite une authentification pour des raisons de sécurité.
              </p>
            </div>

            <div>
              <Label className="text-sm font-semibold mb-2 block">Mot de passe (optionnel)</Label>
              <Input
                type="password"
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
                placeholder="Entrez votre mot de passe pour confirmer"
                className="rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleExport('excel')}
                disabled={exporting}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('pdf')}
                disabled={exporting}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                PDF
              </Button>
            </div>

            <div className="text-xs text-muted-foreground text-center">
              {filtered.length} résultats seront exportés
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de vue détaillée */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg" aria-describedby="view-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: config.primaryColor }}>
              <Eye className="w-5 h-5" />
              Détails du Résultat
            </DialogTitle>
            <p id="view-description" className="text-sm text-muted-foreground mt-1">
              Informations détaillées de l'examen
            </p>
          </DialogHeader>
          
          {selectedResult && (
            <div className="space-y-4">
              {/* Header avec logo et info hôpital */}
              <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: config.primaryColor + '20' }}>
                {config.hospitalLogoUrl && (
                  <img 
                    src={resolveLogoUrl(config.hospitalLogoUrl, API_BASE_URL)} 
                    alt="Logo" 
                    className="w-12 h-12 object-contain"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                )}
                <div>
                  <p className="font-bold text-sm" style={{ color: config.primaryColor }}>{config.hospitalName || 'Hôpital'}</p>
                  <p className="text-xs text-muted-foreground">Service de Laboratoire</p>
                </div>
              </div>

              {/* Info patient */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 p-3 rounded-lg">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Patient</Label>
                  <p className="font-medium text-sm mt-1">{selectedResult.patient}</p>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Code</Label>
                  <p className="font-medium text-sm mt-1">{selectedResult.patientCode || '-'}</p>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</Label>
                  <p className="font-medium text-sm mt-1">{selectedResult.date}</p>
                </div>
                <div className="bg-muted/30 p-3 rounded-lg">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Examen</Label>
                  <p className="font-medium text-sm mt-1">{selectedResult.exam}</p>
                </div>
              </div>

              {/* Résultat mis en évidence */}
              <Card className="border-2" style={{ borderColor: selectedResult.isCritical ? '#dc2626' : config.primaryColor + '30' }}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-xs font-semibold uppercase tracking-wide">Résultat</Label>
                    {selectedResult.isCritical && (
                      <Badge className="bg-rose-500 text-white text-xs font-semibold">
                        ⚠️ Critique
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-4xl font-bold ${selectedResult.isCritical ? 'text-rose-500' : ''}`} style={!selectedResult.isCritical ? { color: config.primaryColor } : {}}>
                      {selectedResult.result}
                    </p>
                    {selectedResult.unit && (
                      <span className="text-xl text-muted-foreground font-medium">{selectedResult.unit}</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Statut et ID */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Statut</Label>
                  <Badge
                    className={`mt-1 ${
                      selectedResult.status === 'RESULTS_AVAILABLE' || selectedResult.status === 'DELIVERED_TO_DOCTOR'
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : 'bg-violet-500/10 text-violet-600 border-violet-500/20'
                    }`}
                  >
                    {selectedResult.status === 'RESULTS_AVAILABLE' || selectedResult.status === 'DELIVERED_TO_DOCTOR' ? '✓ VALIDÉ' : '○ TERMINÉ'}
                  </Badge>
                </div>
                <div className="text-right">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ID</Label>
                  <p className="font-mono text-sm text-muted-foreground mt-1">#{selectedResult.id}</p>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t text-center text-xs text-muted-foreground">
                <p>Document généré le {formatDateFn(new Date(), 'dd/MM/yyyy HH:mm')}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LabHistory;