import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { admissionService } from '../../services/admissionService';
import { 
  FileText, 
  Calendar, 
  Activity, 
  ArrowLeft, 
  Plus, 
  User, 
  ClipboardList,
  Phone,
  Printer,
  MapPin,
  Heart,
  Church,
  Baby,
  Briefcase,
  Pencil,
  Trash2,
  Archive,
  RefreshCcw,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

// IMPORT DES COMPOSANTS UI SHADCN
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

// ✅ LOGIQUE DE RÉSOLUTION D'IMAGE
const getCleanImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('data:image') || url.startsWith('http')) return url;
  const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
  let cleanPath = url.replace(/\\/g, '/');
  if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
  const finalPath = cleanPath.startsWith('uploads/') ? `/${cleanPath}` : `/uploads/${cleanPath}`;
  return `${backendUrl}${finalPath}`;
};

// --- COMPOSANT UTILITAIRE : InfoRow ---
const InfoRow = ({ label, value, icon: Icon, isDate = false }) => (
  <div className="flex justify-between items-center text-sm border-b border-border/30 pb-2 last:border-0">
    <div className="flex items-center gap-2">
      {Icon && <Icon size={12} className="text-emerald-500" />}
      <span className="text-muted-foreground font-bold uppercase text-[10px] tracking-wider">{label}</span>
    </div>
    <span className="font-black text-foreground text-right">
      {value ? (isDate ? new Date(value).toLocaleDateString('fr-FR') : value) : '---'}
    </span>
  </div>
);

// --- COMPOSANT UTILITAIRE : DiagnosticRow ---
const DiagnosticRow = ({ label, value }) => (
  <div className="py-3 border-b border-border/30 last:border-0">
    <div className="flex items-center gap-2 mb-1">
      <span className="text-muted-foreground font-bold uppercase text-[10px] tracking-wider">{label}</span>
    </div>
    <p className="text-foreground font-medium text-sm italic">
      {value || 'Non renseigné'}
    </p>
  </div>
);

// --- COMPOSANT IMPRESSION : PrintablePatientCard (ADAPTÉ POUR 1 SEULE PAGE) ---
const PrintablePatientCard = ({ patient, lastVisit, resolvedData }) => {
  if (!patient) return null;
  const uniquePrintId = useMemo(() => {
    const stamp = Date.now().toString().slice(-6);
    const code = patient.patientCode || patient.code || 'PX';
    return `${code}-${stamp}`.toUpperCase();
  }, [patient]);

  const photoUrl = getCleanImageUrl(patient.photoUrl || patient.photo);

  return (
    <div className="hidden print:block bg-white text-black font-serif w-[21cm] h-[29.7cm] mx-auto relative p-10">
      {/* Filigrane ID */}
      <div className="absolute top-4 right-8 text-[10px] font-mono text-gray-400">FICHE NO : {uniquePrintId}</div>
      
      {/* 1. Header Compact */}
      <div className="text-center border-b-2 border-black pb-4 mb-6">
        <h1 className="text-xl font-bold uppercase tracking-tight">UNIVERSITE CHRETIENNE BILINGUE DU CONGO</h1>
        <h2 className="text-md font-semibold uppercase italic">CLINIQUE CI/UCBC</h2>
        <div className="mt-4 inline-block border-2 border-black px-8 py-2 font-black text-xl uppercase">FICHE DE PATIENT</div>
      </div>

      {/* 2. Section Identité en Colonnes */}
      <div className="grid grid-cols-12 gap-6 mb-6 items-start">
        {/* Photo à gauche */}
        <div className="col-span-3">
          <div className="w-full aspect-[3/4] border-2 border-black flex items-center justify-center bg-gray-50 overflow-hidden">
            {photoUrl ? <img src={photoUrl} className="w-full h-full object-cover" alt="Patient" /> : <User className="w-12 h-12 text-gray-300" />}
          </div>
        </div>

        {/* Informations à droite sur 2 colonnes */}
        <div className="col-span-9 grid grid-cols-2 gap-x-6 gap-y-2 text-sm uppercase">
          <div className="border-b border-black pb-1"><span className="font-black text-[10px] block">Nom :</span> {patient.lastName || patient.nom || ''}</div>
          <div className="border-b border-black pb-1"><span className="font-black text-[10px] block">Prénom :</span> {patient.firstName || patient.prenom || ''}</div>
          <div className="border-b border-black pb-1"><span className="font-black text-[10px] block">Né(e) le :</span> {resolvedData.birthDate !== '---' ? new Date(resolvedData.birthDate).toLocaleDateString('fr-FR') : '---'}</div>
          <div className="border-b border-black pb-1"><span className="font-black text-[10px] block">Genre :</span> {resolvedData.gender}</div>
          <div className="border-b border-black pb-1"><span className="font-black text-[10px] block">Lieu de Naiss. :</span> {resolvedData.birthPlace}</div>
          <div className="border-b border-black pb-1"><span className="font-black text-[10px] block">État Civil :</span> {resolvedData.maritalStatus}</div>
          <div className="border-b border-black pb-1"><span className="font-black text-[10px] block">Profession :</span> {resolvedData.profession}</div>
          <div className="border-b border-black pb-1"><span className="font-black text-[10px] block">Téléphone :</span> {resolvedData.phone}</div>
          <div className="col-span-2 border-b-2 border-black pb-1 mt-2">
             <span className="font-black text-[10px] block">Code Patient :</span>
             <span className="font-mono font-bold text-xl">{patient.patientCode || patient.code || '---'}</span>
          </div>
        </div>
      </div>

      {/* 3. Section Triage Compacte (Horizontal) */}
      <div className="border-2 border-black bg-[#F0F9FF] p-6 shadow-sm">
        <h3 className="text-lg font-black uppercase mb-4 border-b border-black pb-1 flex justify-between items-center text-blue-900">
          <span>Données de Triage</span>
          <span className="text-[10px] font-normal italic">Le {lastVisit ? new Date(lastVisit.date || lastVisit.createdAt).toLocaleDateString() : '---'}</span>
        </h3>
        
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="flex flex-col border-r border-blue-200">
            <span className="font-bold uppercase text-[10px] text-blue-800">Tension</span>
            <span className="text-3xl font-black">{lastVisit?.tension || '---'}</span>
            <small className="text-[10px]">mmHg</small>
          </div>
          <div className="flex flex-col border-r border-blue-200">
            <span className="font-bold uppercase text-[10px] text-blue-800">Poids</span>
            <span className="text-3xl font-black">{lastVisit?.poids || '---'}</span>
            <small className="text-[10px]">kg</small>
          </div>
          <div className="flex flex-col border-r border-blue-200">
            <span className="font-bold uppercase text-[10px] text-blue-800">Température</span>
            <span className="text-3xl font-black">{lastVisit?.temperature || '---'}</span>
            <small className="text-[10px]">°C</small>
          </div>
          <div className="flex flex-col">
            <span className="font-bold uppercase text-[10px] text-blue-800">Taille</span>
            <span className="text-3xl font-black">{lastVisit?.taille || '---'}</span>
            <small className="text-[10px]">cm</small>
          </div>
        </div>

        <div className="mt-6 pt-3 border-t border-black">
          <span className="font-bold uppercase text-[10px] block mb-1 text-blue-800">Motif :</span>
          <p className="italic text-lg font-serif">"{lastVisit?.motif || lastVisit?.reasonForVisit || 'Non renseigné'}"</p>
        </div>
      </div>

      {/* 4. Footer Compact */}
      <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end italic text-[10px]">
        <div className="text-center">
          <div className="w-32 h-0.5 bg-black mb-1 mx-auto"></div>
          <p>Signature Patient</p>
        </div>
        <div className="text-center">
          <p className="font-bold not-italic text-right">Fiche ID: {uniquePrintId}</p>
          <div className="w-32 h-0.5 bg-black mb-1 mx-auto"></div>
          <p>Réception</p>
        </div>
      </div>
    </div>
  );
};

// --- COMPOSANT PRINCIPAL : PatientFolder ---
const PatientFolder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // États de données
  const [history, setHistory] = useState([]);
  const [patientInfo, setPatientInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printData, setPrintData] = useState(null);
  const [showArchives, setShowArchives] = useState(false);

  // ✅ États pour les Boîtes d'Alerte
  const [triageToArchive, setTriageToArchive] = useState(null);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [triageToRestore, setTriageToRestore] = useState(null);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [historyRes, patientRes] = await Promise.allSettled([
        admissionService.getPatientHistory(id),
        admissionService.getPatientById(id)
      ]);
      if (historyRes.status === 'fulfilled') setHistory(historyRes.value);
      if (patientRes.status === 'fulfilled') {
        const pData = patientRes.value;
        setPatientInfo(pData?.data || pData);
      }
    } catch (err) {
      console.error("Erreur de chargement", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  // ✅ ACTION : Confirmation Archivage
  const confirmArchive = async () => {
    if (!triageToArchive) return;
    try {
      await admissionService.updateStatus(triageToArchive.id, 'ARCHIVED');
      setHistory(prev => prev.map(item => 
        item.id === triageToArchive.id ? { ...item, status: 'ARCHIVED' } : item
      ));
      toast.success("Triage envoyé aux archives");
    } catch (err) {
      toast.error("Erreur lors de l'archivage");
    } finally {
      setIsArchiveDialogOpen(false);
      setTriageToArchive(null);
    }
  };

  // ✅ ACTION : Confirmation Restauration
  const confirmRestore = async () => {
    if (!triageToRestore) return;
    try {
      await admissionService.updateStatus(triageToRestore.id, 'ARRIVED');
      setHistory(prev => prev.map(item => 
        item.id === triageToRestore.id ? { ...item, status: 'ARRIVED' } : item
      ));
      toast.success("Triage restauré avec succès");
    } catch (err) {
      toast.error("Erreur lors de la restauration");
    } finally {
      setIsRestoreDialogOpen(false);
      setTriageToRestore(null);
    }
  };

  const handleIndividualPrint = (fiche) => {
    setPrintData(fiche);
    setTimeout(() => { window.print(); }, 100);
  };

  const filteredHistory = useMemo(() => {
    if (showArchives) {
      return history.filter(item => item.status === 'ARCHIVED');
    }
    return history.filter(item => item.status !== 'ARCHIVED');
  }, [history, showArchives]);

  const resolvedData = useMemo(() => {
    const p = patientInfo || {};
    const h = history[0] || {};
    const hp = h.patient || h.patientResponse || {}; 
    const findValue = (keys) => {
      for (const key of keys) {
        if (p[key]) return p[key]; 
        if (h[key]) return h[key]; 
        if (hp[key]) return hp[key]; 
      }
      return '---';
    };
    return {
      birthDate: findValue(['birthDate', 'dateOfBirth', 'date_of_birth', 'dateNaissance']),
      birthPlace: findValue(['birthPlace', 'birth_place', 'lieuNaissance', 'lieu_naissance']),
      gender: findValue(['gender', 'sexe']),
      maritalStatus: findValue(['maritalStatus', 'marital_status', 'etatCivil', 'etat_civil']),
      religion: findValue(['religion', 'confession']),
      healthArea: findValue(['healthArea', 'health_area', 'aireSante', 'aire_sante', 'zoneSante', 'zone_sante', 'health_zone', 'address']),
      phone: findValue(['phoneNumber', 'phone_number', 'telephone', 'phone']),
      profession: findValue(['profession', 'occupation', 'job'])
    };
  }, [patientInfo, history]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-background text-emerald-600">
      <Activity className="animate-spin mb-4" size={48} />
      <p className="text-muted-foreground font-bold">Chargement du dossier...</p>
    </div>
  );

  const profilePhotoUrl = getCleanImageUrl(patientInfo?.photoUrl || patientInfo?.photo);

  return (
    <div className="p-6 max-w-7xl mx-auto text-foreground bg-background min-h-screen">
      
      <PrintablePatientCard 
        patient={patientInfo} 
        lastVisit={printData || history[0]} 
        resolvedData={resolvedData} 
      />

      {/* Header Interfacce */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 print:hidden">
        <button onClick={() => navigate('/reception/patients')} className="flex items-center gap-2 text-muted-foreground hover:text-emerald-600 font-bold transition-colors">
          <ArrowLeft className="w-5 h-5" /> Retour à l'annuaire
        </button>
        <div className="flex gap-3">
          <button onClick={() => { setPrintData(null); window.print(); }} className="flex items-center gap-2 bg-secondary border border-border px-6 py-3 rounded-xl font-bold hover:bg-secondary/80 transition-all shadow-sm text-sm">
            <Printer className="w-4 h-4" /> Imprimer Dernier Triage
          </button>
          <button onClick={() => navigate('/reception/new-admission', { state: { patientId: id } })} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 text-sm">
            <Plus className="w-4 h-4" /> Nouvelle Admission
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden">
        
        {/* Identité (Sidebar gauche) */}
        <div className="lg:col-span-4">
          <div className="bg-card border border-border rounded-[2rem] p-8 shadow-sm">
            <div className="text-center">
              <div className={cn(
                "w-28 h-28 rounded-3xl mx-auto mb-6 flex items-center justify-center border-4 border-background overflow-hidden shadow-md", 
                profilePhotoUrl ? "bg-muted" : "bg-gradient-to-br from-emerald-500 to-emerald-600"
              )}>
                {profilePhotoUrl ? (
                  <img src={profilePhotoUrl} alt="Patient" className="w-full h-full object-cover" />
                ) : (
                  <User className="text-white w-10 h-10 opacity-50" />
                )}
              </div>
              <h2 className="text-3xl font-black capitalize tracking-tight leading-tight">
                {patientInfo?.firstName || patientInfo?.prenom} {patientInfo?.lastName || patientInfo?.nom}
              </h2>
              <span className="inline-block px-4 py-2 bg-emerald-500/10 rounded-2xl font-mono font-bold text-emerald-600 mt-4 border border-emerald-500/5">
                {patientInfo?.patientCode || `ID: ${id}`}
              </span>
            </div>
            
            <div className="mt-10 space-y-3 pt-8 border-t border-border/50">
              <InfoRow label="Né(e) le" value={resolvedData.birthDate} icon={Calendar} isDate />
              <InfoRow label="Lieu Naiss." value={resolvedData.birthPlace} icon={Baby} />
              <InfoRow label="Genre" value={resolvedData.gender} icon={User} />
              <InfoRow label="Profession" value={resolvedData.profession} icon={Briefcase} />
              <InfoRow label="État Civil" value={resolvedData.maritalStatus} icon={Heart} />
              <InfoRow label="Confession" value={resolvedData.religion} icon={Church} />
              <InfoRow label="Aire Santé" value={resolvedData.healthArea} icon={MapPin} />
              <InfoRow label="Téléphone" value={resolvedData.phone} icon={Phone} />
            </div>
          </div>
        </div>

        {/* Historique (Zone principale) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-3 rounded-2xl shadow-lg transition-all",
                showArchives ? "bg-amber-600 shadow-amber-600/20" : "bg-emerald-600 shadow-emerald-600/20"
              )}>
                {showArchives ? <Archive className="text-white w-6 h-6" /> : <ClipboardList className="text-white w-6 h-6" />}
              </div>
              <h3 className="text-2xl font-black tracking-tight">
                {showArchives ? "Corbeille des Triages" : "Chronologie Médicale"}
              </h3>
            </div>

            <button 
              onClick={() => setShowArchives(!showArchives)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-2",
                showArchives 
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-600" 
                  : "bg-muted border-border text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600"
              )}
            >
              {showArchives ? "Retour aux actifs" : "Voir la corbeille"}
            </button>
          </div>

          {filteredHistory.length > 0 ? (
            <div className="space-y-6">
              {filteredHistory.map((fiche, index) => (
                <div key={fiche.id || index} className={cn(
                  "bg-card border rounded-[2rem] overflow-hidden shadow-sm transition-all",
                  showArchives ? "border-amber-500/20 opacity-90" : "border-border hover:border-emerald-500/30"
                )}>
                  <div className="bg-muted/30 px-6 py-5 border-b border-border flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl border flex items-center justify-center font-black",
                        showArchives ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-background"
                      )}>
                        {history.length - index}
                      </div>
                      <div>
                        <p className="text-sm font-black">
                          {new Date(fiche.date || fiche.createdAt).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                          {showArchives ? "Dossier archivé" : "Visite Médicale"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {showArchives ? (
                        <button 
                          onClick={() => { setTriageToRestore(fiche); setIsRestoreDialogOpen(true); }}
                          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-tighter shadow-sm"
                        >
                          <RefreshCcw size={14} /> Restaurer
                        </button>
                      ) : (
                        <>
                          <button onClick={() => handleIndividualPrint(fiche)} className="p-2.5 bg-background border border-border hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all shadow-sm"><Printer size={16} /></button>
                          <button onClick={() => navigate(`/reception/edit-admission/${fiche.id}`)} className="p-2.5 bg-background border border-border hover:bg-amber-50 hover:text-amber-600 rounded-xl transition-all shadow-sm"><Pencil size={16} /></button>
                          <button onClick={() => { setTriageToArchive(fiche); setIsArchiveDialogOpen(true); }} className="p-2.5 bg-background border border-border hover:bg-red-50 hover:text-red-600 rounded-xl transition-all shadow-sm"><Trash2 size={16} /></button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="space-y-1"><p className="text-[10px] uppercase font-black text-rose-500">Tension</p><p className="text-2xl font-black">{fiche.tension || '--/--'}</p></div>
                    <div className="space-y-1"><p className="text-[10px] uppercase font-black text-amber-500">Temp.</p><p className="text-2xl font-black">{fiche.temperature || '--'}°C</p></div>
                    <div className="space-y-1"><p className="text-[10px] uppercase font-black text-blue-500">Poids</p><p className="text-2xl font-black">{fiche.poids || '--'}kg</p></div>
                    <div className="space-y-1"><p className="text-[10px] uppercase font-black text-emerald-500">Taille</p><p className="text-2xl font-black">{fiche.taille || '--'}cm</p></div>
                  </div>
                  
                  {/* ✅ NOUVEAU: Section Diagnostic du Médecin */}
                  {(fiche.diagnostic || fiche.traitement || fiche.notesMedicales || (fiche.exams && fiche.exams.length > 0)) && (
                    <div className="px-8 pb-8 space-y-4">
                      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-200 dark:border-blue-800">
                        <h4 className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                          <FileText className="w-3 h-3" /> Compte Rendu Médical
                        </h4>
                        
                        {fiche.diagnostic && (
                          <div className="mb-3">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Diagnostic</p>
                            <p className="text-sm font-medium italic text-foreground">{fiche.diagnostic}</p>
                          </div>
                        )}
                        
                        {fiche.traitement && (
                          <div className="mb-3">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Traitement/Prescription</p>
                            <p className="text-sm font-medium italic text-foreground">{fiche.traitement}</p>
                          </div>
                        )}
                        
                        {fiche.notesMedicales && (
                          <div className="mb-3">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Notes Médicales</p>
                            <p className="text-sm font-medium text-foreground">{fiche.notesMedicales}</p>
                          </div>
                        )}
                        
                        {fiche.exams && fiche.exams.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Examens Prescrits</p>
                            <div className="flex flex-wrap gap-2">
                              {fiche.exams.map((exam, idx) => (
                                <span key={idx} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-lg">
                                  {exam.name || exam.serviceName || `Examen #${exam.serviceId}`}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-muted/10 border-2 border-dashed border-border rounded-[3rem] p-20 text-center">
              <p className="text-muted-foreground font-bold">{showArchives ? "La corbeille est vide." : "Aucun triage actif."}</p>
            </div>
          )}
        </div>
      </div>

      {/* --- MODALES DE CONFIRMATION (SHADCN UI) --- */}
      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5"/> Attention
            </DialogTitle>
            <DialogDescription className="py-3">
              Action irréversible pour le triage du <strong>{triageToArchive && new Date(triageToArchive.date || triageToArchive.createdAt).toLocaleDateString()}</strong>. 
              Le triage sera déplacé vers les archives du patient.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsArchiveDialogOpen(false)}>Annuler</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={confirmArchive}>Confirmer l'archivage</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-emerald-600 flex items-center gap-2">
              <UserCheck className="w-5 h-5" /> Restaurer le triage
            </DialogTitle>
            <DialogDescription className="py-3">
              Souhaitez-vous restaurer cette fiche ? Elle sera de nouveau visible dans la chronologie active du patient.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRestoreDialogOpen(false)}>Annuler</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={confirmRestore}>Confirmer la restauration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A4; margin: 0mm !important; }
        @media print {
          html, body { height: 100%; margin: 0 !important; padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact; }
          body * { visibility: hidden !important; }
          .print\\:block, .print\\:block * { visibility: visible !important; }
          .print\\:block { position: absolute; left: 0; top: 0; width: 100%; display: block !important; }
        }
      `}} />
    </div>
  );
};

export default PatientFolder;