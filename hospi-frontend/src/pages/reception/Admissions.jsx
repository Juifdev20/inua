import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPortal,
  DialogOverlay
} from "@/components/ui/dialog";
import { patientService } from '@/services/patientService';
import { admissionService } from '@/services/admissionService';
import pricingService from '@/services/pricingService';
import {
  Plus,
  User,
  Send,
  Search,
  ChevronLeft,
  Loader2,
  Clock,
  DollarSign,
  Stethoscope,
  UserCheck,
  MapPin,
  Briefcase,
  Heart,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Banknote
} from 'lucide-react';
import { toast } from 'sonner';

const SUGGESTED_PROFESSIONS = [
  "Etudiant(e)", "Cultivateur/trice)", "Enseignant(e)",
  "Commercant(e)", "Sans profession", "Fonctionnaire", "Chauffeur"
];

const SUGGESTED_RELIGIONS = [
  "Catholique", "Protestant(e)", "Musulman(e)", "Kimbanguiste",
  "Salutiste", "Temoin de Jehovah", "Autre"
];

const STATUS_CONFIG = {
  ARRIVED: { label: 'En caisse', color: 'bg-amber-500/10 text-amber-600', icon: Banknote },
  WAITING_TRIAGE: { label: 'Attente triage', color: 'bg-slate-500/10 text-slate-600', icon: Clock },
  WAITING_PAYMENT: { label: 'En caisse', color: 'bg-amber-500/10 text-amber-600', icon: Banknote },
  EN_ATTENTE: { label: 'En attente', color: 'bg-amber-500/10 text-amber-600', icon: Clock },
  EN_COURS: { label: 'En consultation', color: 'bg-blue-500/10 text-blue-600', icon: Stethoscope },
  PAID: { label: 'Payé', color: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle2 },
  WITH_DOCTOR: { label: 'Chez le médecin', color: 'bg-blue-500/10 text-blue-600', icon: Stethoscope },
  TERMINE: { label: 'Terminé', color: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle2 },
  COMPLETED: { label: 'Terminé', color: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle2 },
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0,
  }).format(amount || 0);

export const Admissions = () => {
  const { theme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  // ★ AJOUT : état pour les médecins
  const [doctors, setDoctors] = useState([]);
  const [admissionsToday, setAdmissionsToday] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchPatient, setSearchPatient] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedServicePrice, setSelectedServicePrice] = useState(0);
  const [selectedService, setSelectedService] = useState('');

  const [pricingDetails, setPricingDetails] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const [triageData, setTriageData] = useState({
    taille: '',
    poids: '',
    tension: '',
    temperature: '',
    motif: '',
    // ★ AJOUT : doctorId pour compatibilité backend
    doctorId: '',
    address: '',
    profession: '',
    birthDate: '',
    birthPlace: '',
    maritalStatus: '',
    religion: '',
    city: '',
    healthArea: ''
  });

  const DEFAULT_FICHE_AMOUNT = 5;

  const canSubmit =
    selectedPatient &&
    selectedService &&
    triageData.taille &&
    triageData.poids &&
    triageData.tension &&
    triageData.temperature &&
    triageData.motif;

  const isNewPatient = !selectedPatient?.hasMedicalRecord && !selectedPatient?.consultations?.length;

  const ficheAmount = pricingDetails?.ficheAmount || (isNewPatient ? DEFAULT_FICHE_AMOUNT : 0);
  const consulAmount = selectedServicePrice;
  const totalAmount = ficheAmount + consulAmount;

  // ═══════════════════════════════════════
  // CHARGEMENT
  // ═══════════════════════════════════════
  const fetchDashboardData = async () => {
    try {
      const response = await admissionService.getDashboardStats();
      if (response && response.recentConsultations) {
        setAdmissionsToday(response.recentConsultations || []);
      }
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
      setAdmissionsToday([]);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedPatient?.id && selectedService) {
      calculatePricing(selectedPatient.id, selectedService);
    } else {
      setPricingDetails(null);
    }
  }, [selectedPatient?.id, selectedService]);

  const calculatePricing = async (patientId, serviceId) => {
    setIsCalculating(true);
    try {
      const result = await pricingService.calculateAdmissionAmount(patientId, serviceId);
      setPricingDetails(result);
    } catch (error) {
      console.error('Erreur calcul pricing:', error);
      setPricingDetails({
        ficheAmount: isNewPatient ? DEFAULT_FICHE_AMOUNT : 0,
        ficheRequired: isNewPatient,
        consulAmount: selectedServicePrice,
        totalAmount: selectedServicePrice + (isNewPatient ? DEFAULT_FICHE_AMOUNT : 0),
        hasActiveFile: !isNewPatient
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const getCleanImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('data:image') || url.startsWith('http')) return url;
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";
    return `${backendUrl}/uploads/${url.replace(/\\/g, '/').replace('uploads/', '')}`;
  };

  const fetchPatients = async (searchTerm = '') => {
    try {
      const response = searchTerm.trim() !== ''
        ? await patientService.searchPatients(searchTerm)
        : await patientService.getPatients(0, 20);
      const rawData = response?.content || response?.data || response || [];
      setPatients(
        rawData.map((p) => ({
          ...p,
          photoUrl: getCleanImageUrl(p.photoUrl || p.photo),
          displayName: p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Patient',
          displayPhone: p.phoneNumber || p.phone || 'Non renseigné',
          birthPlace: p.birthPlace || '',
          profession: p.profession || '',
          maritalStatus: p.maritalStatus || '',
          religion: p.religion || '',
          city: p.city || '',
          healthArea: p.healthArea || ''
        }))
      );
    } catch (error) {
      console.error(error);
    }
  };

  // ★ CORRIGÉ : Charger médecins + services ensemble
  const loadReferences = async () => {
    try {
      const [docsResp, svcsResp] = await Promise.all([
        admissionService.getDoctorsOnDuty(),
        admissionService.getAvailableServices()
      ]);

      const doctorsList = Array.isArray(docsResp?.data || docsResp)
        ? (docsResp?.data || docsResp)
        : [];
      setDoctors(doctorsList);

      // ★ Auto-sélectionner le premier médecin pour satisfaire le backend
      if (doctorsList.length > 0 && !triageData.doctorId) {
        setTriageData(prev => ({ ...prev, doctorId: doctorsList[0].id?.toString() }));
      }

      setServices(svcsResp || []);
    } catch (e) {
      console.error("Erreur chargement références:", e);
      toast.error("Erreur de chargement des services");
    }
  };

  useEffect(() => {
    if (showModal) loadReferences();
  }, [showModal]);

  useEffect(() => {
    if (!showModal) return;
    const delay = setTimeout(() => {
      fetchPatients(searchPatient);
    }, 300);
    return () => clearTimeout(delay);
  }, [searchPatient, showModal]);

  // ═══════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════
  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setPricingDetails(null);

    const formatDateForInput = (dateInput) => {
      if (!dateInput) return '';
      try {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
      } catch (e) {
        return '';
      }
    };

    setTriageData((prev) => ({
      ...prev,
      address: patient.address || prev.address || '',
      profession: patient.profession || prev.profession || '',
      birthDate: formatDateForInput(patient.birthDate) || prev.birthDate || '',
      birthPlace: patient.birthPlace || prev.birthPlace || '',
      maritalStatus: patient.maritalStatus || prev.maritalStatus || '',
      religion: patient.religion || prev.religion || '',
      city: patient.city || prev.city || '',
      healthArea: patient.healthArea || prev.healthArea || '',
      // ★ Garder le doctorId auto-sélectionné
      doctorId: prev.doctorId || (doctors.length > 0 ? doctors[0].id?.toString() : '')
    }));

    setStep(2);
  };

  const handleServiceSelect = (e) => {
    const serviceId = e.target.value;
    setSelectedService(serviceId);
    if (serviceId) {
      const svc = services.find((s) => s.id?.toString() === serviceId.toString());
      if (svc) setSelectedServicePrice(parseFloat(svc.price || 0) || 0);
    } else {
      setSelectedServicePrice(0);
    }
  };

  // ═══════════════════════════════════════
  // ★ SUBMIT — CORRIGÉ : envoie doctorId pour satisfaire le backend
  // ═══════════════════════════════════════
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canSubmit) {
      toast.error('Remplissez tous les champs obligatoires');
      return;
    }

    setIsLoading(true);

    try {
      // 1️⃣ Mettre à jour les infos du patient
      await patientService.updatePatient(selectedPatient.id, {
        ...selectedPatient,
        address: triageData.address,
        profession: triageData.profession,
        birthDate: triageData.birthDate,
        birthPlace: triageData.birthPlace,
        maritalStatus: triageData.maritalStatus,
        religion: triageData.religion,
        city: triageData.city,
        healthArea: triageData.healthArea
      });

      // 2️⃣ Montants
      const finalFicheAmount = pricingDetails?.ficheAmount || (isNewPatient ? DEFAULT_FICHE_AMOUNT : 0);
      const finalConsulAmount = pricingDetails?.consulAmount || selectedServicePrice;
      const finalTotal = finalFicheAmount + finalConsulAmount;

      // 3️⃣ ★ Déterminer le doctorId
      //    Le backend EXIGE ce champ. On envoie :
      //    - le médecin sélectionné dans le formulaire, OU
      //    - le premier médecin disponible comme défaut
      const doctorIdToSend = triageData.doctorId
        || (doctors.length > 0 ? doctors[0].id?.toString() : null);

      if (!doctorIdToSend) {
        toast.error("Aucun médecin disponible. Veuillez réessayer.");
        setIsLoading(false);
        return;
      }

      // 4️⃣ Créer l'admission
      await admissionService.createAdmission({
        patientId: selectedPatient.id,
        serviceId: selectedService,
        // ★ DoctorId obligatoire pour le backend
        // La caissière pourra le réassigner après paiement
        doctorId: doctorIdToSend,
        // Triage
        taille: triageData.taille,
        poids: triageData.poids,
        temperature: triageData.temperature,
        tension: triageData.tension,
        motif: triageData.motif,
        symptomes: triageData.motif,
        // Infos patient
        birthDate: triageData.birthDate,
        birthPlace: triageData.birthPlace,
        maritalStatus: triageData.maritalStatus,
        religion: triageData.religion,
        city: triageData.city,
        healthArea: triageData.healthArea,
        // Montants DUS (pas encore payés)
        ficheAmountDue: finalFicheAmount,
        consulAmountDue: finalConsulAmount,
        ficheAmountPaid: 0,
        consulAmountPaid: 0,
      });

      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-bold">
            {selectedPatient.displayName} envoyé(e) en caisse
          </span>
          <span className="text-xs opacity-80">
            Montant à payer : {formatCurrency(finalTotal)}
          </span>
        </div>
      );

      setShowModal(false);
      resetForm();
      fetchDashboardData();
    } catch (error) {
      console.error('Erreur admission:', error);
      const errorMsg = error?.message || "Erreur lors de l'admission";
      const errorDetails = error?.data
        ? Object.entries(error.data).map(([k, v]) => `${k}: ${v}`).join(', ')
        : '';
      toast.error(
        <div className="flex flex-col gap-1">
          <span className="font-bold">{errorMsg}</span>
          {errorDetails && <span className="text-xs opacity-80">{errorDetails}</span>}
        </div>
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedPatient(null);
    setSearchPatient('');
    setSelectedService('');
    setSelectedServicePrice(0);
    setPricingDetails(null);
    setTriageData({
      taille: '', poids: '', tension: '', temperature: '', motif: '',
      doctorId: doctors.length > 0 ? doctors[0].id?.toString() : '',
      address: '', profession: '', birthDate: '', birthPlace: '',
      maritalStatus: '', religion: '', city: '', healthArea: ''
    });
  };

  const getStatusDisplay = (status) => {
    return STATUS_CONFIG[status] || {
      label: status || 'En attente',
      color: 'bg-slate-500/10 text-slate-600',
      icon: Clock
    };
  };

  const isWaitingPayment = (status) => ['ARRIVED', 'WAITING_PAYMENT'].includes(status);
  const isWithDoctor = (status) => ['EN_COURS', 'WITH_DOCTOR'].includes(status);
  const isDone = (status) => ['TERMINE', 'COMPLETED', 'PAID'].includes(status);

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════
  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admission & Triage</h1>
          <p className="text-sm text-muted-foreground">Gestion des nouveaux arrivants</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl">
          <Plus className="w-5 h-5 mr-2" /> Nouvelle Admission
        </Button>
      </div>

      {/* Workflow visuel */}
      <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Workflow du patient</p>
        <div className="flex items-center justify-between px-4">
          {[
            { label: 'Triage', sublabel: 'Réception', icon: UserCheck, active: true },
            { label: 'Caisse', sublabel: 'Finance', icon: Banknote, active: false },
            { label: 'Médecin', sublabel: 'Consultation', icon: Stethoscope, active: false },
          ].map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <div className="flex-1 mx-3">
                  <div className="h-0.5 bg-border relative">
                    <ArrowRight className="w-4 h-4 text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card" />
                  </div>
                </div>
              )}
              <div className="flex flex-col items-center gap-1.5">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all", s.active ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25" : "bg-muted text-muted-foreground")}>
                  <s.icon className="w-5 h-5" />
                </div>
                <span className={cn("text-xs font-bold", s.active ? "text-emerald-600" : "text-muted-foreground")}>{s.label}</span>
                <span className="text-[10px] text-muted-foreground">{s.sublabel}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Patients aujourd\'hui', value: admissionsToday.length, icon: UserCheck, color: 'blue' },
          { label: 'En caisse', value: admissionsToday.filter(a => isWaitingPayment(a.status)).length, icon: Banknote, color: 'amber' },
          { label: 'Chez le médecin', value: admissionsToday.filter(a => isWithDoctor(a.status)).length, icon: Stethoscope, color: 'blue' },
          { label: 'Terminés', value: admissionsToday.filter(a => isDone(a.status)).length, icon: CheckCircle2, color: 'emerald' },
        ].map((stat, i) => (
          <div key={i} className="rounded-2xl bg-card border border-border p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-${stat.color}-500/10`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-foreground">File d'attente du jour</h3>
          <span className="text-xs text-muted-foreground font-medium">Mise à jour automatique</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Heure</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Service</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Montant</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Étape</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {admissionsToday.map((adm) => {
                const statusConf = getStatusDisplay(adm.status);
                const displayAmount = adm.totalAmountDue
                  || ((adm.ficheAmountDue || 0) + (adm.consulAmountDue || 0))
                  || adm.consulAmountDue || null;
                return (
                  <tr key={adm.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground font-medium">{adm.arrivalTime || '--:--'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs", isWithDoctor(adm.status) ? "bg-blue-500" : isDone(adm.status) ? "bg-emerald-500" : "bg-amber-500")}>
                          {(adm.patientName || '?').charAt(0)}
                        </div>
                        <p className="font-medium text-foreground text-sm">{adm.patientName || 'Patient'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-600 rounded-md text-xs font-medium">{adm.serviceName || 'Consultation'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-foreground">{displayAmount ? formatCurrency(displayAmount) : '--'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5", statusConf.color)}>
                        {statusConf.icon && <statusConf.icon className="w-3 h-3" />}
                        {statusConf.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {admissionsToday.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center text-muted-foreground">
                    <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Aucun patient dans la file d'attente</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════ MODAL ══════ */}
      <Dialog open={showModal} onOpenChange={(open) => { if (!open) resetForm(); setShowModal(open); }}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <DialogContent className={cn(
            "fixed top-1/2 z-50 w-[calc(100vw-2rem)] max-w-3xl max-h-[90vh]",
            "translate-y-[-50%] overflow-auto bg-background border border-border rounded-2xl p-0 shadow-2xl",
            "left-[calc(50%+40px)] -translate-x-1/2",
            "md:left-[calc(50%+60px)]",
            "lg:left-[calc(50%+80px)]"
          )}>
            <DialogHeader className="p-4 border-b border-border sticky top-0 bg-background z-10">
              <DialogTitle className="text-xl font-bold text-foreground">
                {step === 1 ? 'Sélectionner un patient' : 'Triage & Admission'}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {step === 2 ? 'Complétez le triage. Le patient sera envoyé en caisse pour le paiement.' : 'Recherchez le patient'}
              </DialogDescription>
            </DialogHeader>

            <div className="p-4">
              {step === 1 ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Rechercher par nom..." value={searchPatient} onChange={(e) => setSearchPatient(e.target.value)} className="pl-10 rounded-xl" />
                  </div>
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {patients.map((p) => (
                      <button key={p.id} onClick={() => handlePatientSelect(p)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-emerald-500 hover:bg-emerald-500/5 text-left transition-colors">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold overflow-hidden">
                          {p.photoUrl ? (
                            <img src={p.photoUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                          ) : (
                            <span>{p.firstName?.[0]}{p.lastName?.[0] || 'P'}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{p.displayName}</p>
                          <p className="text-xs text-muted-foreground">{p.displayPhone}</p>
                        </div>
                        <Plus className="w-5 h-5 text-emerald-500" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <form id="admission-form" onSubmit={handleSubmit} className="space-y-4">
                  {/* Patient Info */}
                  <div className="p-3 bg-muted/30 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{selectedPatient?.displayName}</p>
                      <p className="text-sm text-muted-foreground">{selectedPatient?.displayPhone}</p>
                    </div>
                    {pricingDetails?.hasActiveFile === false && (
                      <span className="px-2 py-1 bg-orange-500/10 text-orange-600 rounded-md text-xs font-medium">Nouveau patient</span>
                    )}
                    {pricingDetails?.hasActiveFile === true && (
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-600 rounded-md text-xs font-medium">Ancien patient</span>
                    )}
                  </div>

                  {/* Informations Patient */}
                  <div className="bg-muted/30 p-4 rounded-xl space-y-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Informations patient</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Lieu de naissance</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                          <input list="birthPlaces-list" value={triageData.birthPlace || selectedPatient?.birthPlace || ''} onChange={(e) => setTriageData({ ...triageData, birthPlace: e.target.value })} className="w-full h-10 pl-10 pr-3 rounded-xl border border-border bg-background text-sm outline-none focus:border-emerald-500" placeholder="Ville/Territoire..." />
                          <datalist id="birthPlaces-list">
                            <option value="Kinshasa" /><option value="Lubumbashi" /><option value="Mbuji-Mayi" /><option value="Kananga" /><option value="Kisangani" /><option value="Bukavu" /><option value="Goma" /><option value="Matadi" />
                          </datalist>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Ville</label>
                        <input list="cities-list" value={triageData.city || selectedPatient?.city || ''} onChange={(e) => setTriageData({ ...triageData, city: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm outline-none focus:border-emerald-500" placeholder="Ville..." />
                        <datalist id="cities-list"><option value="Kinshasa" /><option value="Lubumbashi" /><option value="Mbuji-Mayi" /><option value="Kananga" /></datalist>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Adresse</label>
                        <input value={triageData.address || selectedPatient?.address || ''} onChange={(e) => setTriageData({ ...triageData, address: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm outline-none focus:border-emerald-500" placeholder="Quartier/Av..." />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Profession</label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                          <input list="professions-list" value={triageData.profession || selectedPatient?.profession || ''} onChange={(e) => setTriageData({ ...triageData, profession: e.target.value })} className="w-full h-10 pl-10 pr-3 rounded-xl border border-border bg-background text-sm outline-none focus:border-emerald-500" placeholder="Choisir ou saisir..." />
                          <datalist id="professions-list">{SUGGESTED_PROFESSIONS.map((prof, i) => <option key={i} value={prof} />)}</datalist>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">État matrimonial</label>
                        <select value={triageData.maritalStatus || selectedPatient?.maritalStatus || ''} onChange={(e) => setTriageData({ ...triageData, maritalStatus: e.target.value })} className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-emerald-500">
                          <option value="">Sélectionner...</option>
                          <option value="Celibataire">Célibataire</option>
                          <option value="Marie(e)">Marié(e)</option>
                          <option value="Divorce(e)">Divorcé(e)</option>
                          <option value="Veuf(ve)">Veuf(ve)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Confession</label>
                        <div className="relative">
                          <Heart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                          <input list="religions-list" value={triageData.religion || selectedPatient?.religion || ''} onChange={(e) => setTriageData({ ...triageData, religion: e.target.value })} className="w-full h-10 pl-10 pr-3 rounded-xl border border-border bg-background text-sm outline-none focus:border-emerald-500" placeholder="Choisir ou saisir..." />
                          <datalist id="religions-list">{SUGGESTED_RELIGIONS.map((rel, i) => <option key={i} value={rel} />)}</datalist>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Service */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Service *</label>
                    <select value={selectedService} onChange={handleServiceSelect} className="w-full p-2.5 border border-border rounded-xl bg-background text-foreground focus:border-emerald-500 focus:outline-none" required>
                      <option value="">Sélectionner un service...</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} {s.price > 0 ? `- ${s.price} $` : ''}</option>
                      ))}
                    </select>
                  </div>

                  {/* Prix */}
                  {selectedService && (
                    <div className="space-y-2">
                      {isCalculating ? (
                        <div className="p-4 bg-blue-500/10 rounded-xl flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                          <span className="text-sm text-blue-600">Calcul des montants...</span>
                        </div>
                      ) : (
                        <>
                          {isNewPatient && (
                            <div className="p-3 bg-orange-500/10 rounded-xl flex justify-between items-center border border-orange-200">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-orange-600" />
                                <div>
                                  <p className="text-xs text-orange-600">Frais de dossier (Nouveau)</p>
                                  <p className="text-[10px] text-orange-500">Création du dossier patient</p>
                                </div>
                              </div>
                              <p className="text-lg font-bold text-orange-600">{pricingDetails?.ficheAmount || DEFAULT_FICHE_AMOUNT} $</p>
                            </div>
                          )}
                          <div className="p-3 bg-blue-500/10 rounded-xl flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Stethoscope className="w-4 h-4 text-blue-600" />
                              <div>
                                <p className="text-xs text-blue-600">Consultation</p>
                                <p className="font-medium text-foreground">{services.find((s) => s.id?.toString() === selectedService)?.name}</p>
                              </div>
                            </div>
                            <p className="text-2xl font-bold text-blue-600">{selectedServicePrice} $</p>
                          </div>
                          <div className="p-3 bg-emerald-500/10 rounded-xl flex justify-between items-center border border-emerald-200">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-emerald-600" />
                              <div>
                                <p className="font-bold text-foreground">Total à payer en caisse</p>
                                <p className="text-[10px] text-muted-foreground">Le paiement sera effectué par la caissière</p>
                              </div>
                            </div>
                            <p className="text-2xl font-bold text-emerald-600">{pricingDetails?.totalAmount || totalAmount} $</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Signes vitaux */}
                  <div className="bg-muted/30 p-4 rounded-xl space-y-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Signes vitaux (triage)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Taille (cm) *</label>
                        <Input type="number" placeholder="170" value={triageData.taille} onChange={(e) => setTriageData({ ...triageData, taille: e.target.value })} required className="rounded-xl" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Poids (kg) *</label>
                        <Input type="number" placeholder="70" value={triageData.poids} onChange={(e) => setTriageData({ ...triageData, poids: e.target.value })} required className="rounded-xl" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Tension *</label>
                        <Input placeholder="120/80" value={triageData.tension} onChange={(e) => setTriageData({ ...triageData, tension: e.target.value })} required className="rounded-xl" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Température (°C) *</label>
                        <Input type="number" step="0.1" placeholder="37" value={triageData.temperature} onChange={(e) => setTriageData({ ...triageData, temperature: e.target.value })} required className="rounded-xl" />
                      </div>
                    </div>
                    
                  </div>

                  {/* Symptômes */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground">Symptômes / Motif *</label>
                    <textarea value={triageData.motif} onChange={(e) => setTriageData({ ...triageData, motif: e.target.value })} rows={2} className="w-full p-2.5 border border-border rounded-xl bg-background text-foreground focus:border-emerald-500 focus:outline-none resize-none" required />
                  </div>

                  {/* ★ Médecin de garde (pré-assignation) */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Médecin de garde</label>
                    <select
                      value={triageData.doctorId}
                      onChange={(e) => setTriageData({ ...triageData, doctorId: e.target.value })}
                      className="w-full p-2.5 border border-border rounded-xl bg-background text-foreground focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="">Sélectionner...</option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.displayName || d.fullName || `${d.firstName || ''} ${d.lastName || ''}`.trim()}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground">
                      Pré-assignation — la caissière pourra modifier le médecin après paiement
                    </p>
                  </div>

                  {/* Info workflow */}
                  <div className="p-3 bg-blue-500/10 rounded-xl flex items-start gap-3">
                    <Banknote className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-blue-600">Prochaine étape : Caisse Admissions</p>
                      <p className="text-[10px] text-blue-500 mt-0.5">
                        Après le triage, le patient sera dirigé vers la caisse pour le paiement.
                        La caissière confirmera le médecin et enverra la fiche de consultation.
                      </p>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border flex justify-between sticky bottom-0 bg-background">
              <Button variant="ghost" onClick={() => step === 2 ? setStep(1) : setShowModal(false)} disabled={isLoading} className="rounded-xl">
                {step === 2 ? <ChevronLeft className="w-4 h-4 mr-1" /> : null}
                {step === 2 ? 'Retour' : 'Annuler'}
              </Button>
              {step === 2 && (
                <Button form="admission-form" type="submit" disabled={!canSubmit || isLoading || isCalculating}
                  className={canSubmit && !isCalculating ? "bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20" : "bg-muted text-muted-foreground rounded-xl"}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : canSubmit ? <><Send className="w-4 h-4 mr-2" />Terminer & Envoyer en caisse</> : 'Remplissez les champs obligatoires'}
                </Button>
              )}
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
};