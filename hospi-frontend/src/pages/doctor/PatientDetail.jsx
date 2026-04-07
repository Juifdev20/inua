import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { 
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Droplet,
  AlertTriangle,
  Shield,
  FileText,
  Stethoscope,
  Clock,
  Plus,
  Activity,
  ClipboardList,
  Briefcase,
  Heart,
  Globe,
  Moon,
  Map // Ajouté pour l'aire de santé
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../../components/ui/sheet";

// Utilisation de import.meta.env pour Vite
const API = `${import.meta.env.VITE_BACKEND_URL}/api`;

const PatientDetail = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(true);

  // État pour la consultation sélectionnée (Détails)
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // ✅ FONCTION DE NETTOYAGE D'URL POUR LES PHOTOS
  const getCleanImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('data:image')) return url;
    if (url.startsWith('http')) return url;
    
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";
    let cleanPath = url.replace(/\\/g, '/');
    
    // Si le chemin commence déjà par uploads/, on le nettoie
    if (cleanPath.startsWith('uploads/')) {
      cleanPath = cleanPath.substring(8);
    }
    
    // Essayer différents dossiers dans l'ordre
    const possiblePaths = [
      `${backendUrl}/uploads/patients/${cleanPath}`,
      `${backendUrl}/uploads/profiles/${cleanPath}`,
      `${backendUrl}/uploads/avatars/${cleanPath}`,
      `${backendUrl}/${url}` // Au cas où le chemin est déjà complet
    ];
    
    // Pour déboguer, on peut retourner le premier chemin et ajuster si besoin
    console.log("🖼️ Photo paths for:", url, "→", possiblePaths[0]);
    return possiblePaths[0];
  };

  useEffect(() => {
    // ✅ VALIDATION: Vérifier que l'ID est valide avant l'appel API
    console.log("📡 PatientDetail - ID:", id, "Token:", token ? "présent" : "absent");
    
    if (id && token) {
      if (id === 'undefined' || id === 'null' || !id) {
        console.error("❌ PatientDetail: ID invalide:", id);
        return;
      }
      fetchPatientDetail();
    }
  }, [id, token]);

  const fetchPatientDetail = async () => {
    // ✅ VALIDATION: Vérifier que l'ID est valide
    if (!id || id === 'undefined' || id === 'null' || id === '') {
      console.error("❌ fetchPatientDetail: ID invalide:", id);
      setLoading(false);
      return;
    }
    
    console.log("📡 fetchPatientDetail - Appel API avec ID:", id);
    
    try {
      setLoading(true);
      const response = await axios.get(`${API}/patients/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let data = response.data && response.data.data ? response.data.data : response.data;
      
      if (data) {
        console.log("📡 PatientDetail data received:", data);
        console.log("📸 Photo fields:", {
          photo: data.photo,
          photoUrl: data.photoUrl,
          photo_url: data.photo_url
        });
        console.log("🏥 Consultations:", data.consultations);
        // Debug pour voir les diagnostics
        if (data.consultations) {
          data.consultations.forEach((cons, index) => {
            console.log(`Consultation ${index}:`, {
              id: cons.id,
              date: cons.consultationDate,
              diagnosis: cons.diagnosis,
              reasonForVisit: cons.reasonForVisit
            });
          });
        }
        data.photoUrl = getCleanImageUrl(data.photoUrl || data.photo || data.photo_url);
      }
      
      setPatientData(data);
    } catch (error) {
      console.error('Error fetching patient:', error);
      setPatientData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (consultation) => {
    setSelectedConsultation(consultation);
    setIsSheetOpen(true);
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return "N/A";
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) return "N/A";
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString('fr-FR');
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px] lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!patientData) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 mx-auto text-slate-300 mb-4" />
        <p className="text-muted-foreground font-medium">Dossier patient introuvable</p>
        <Button onClick={() => navigate('/doctor/patients')} className="mt-4" variant="outline">
          Retour à la liste
        </Button>
      </div>
    );
  }

  // ✅ NORMALISATION : On crée un objet 'p' qui accepte camelCase ET snake_case du Backend
  const patient = patientData; 
  const p = {
    ...patient,
    dob: patient.dateOfBirth || patient.date_of_birth || null,
    hArea: patient.healthArea || patient.health_area || '---',
    mStatus: patient.maritalStatus || patient.marital_status || 'N/A',
    bPlace: patient.birthPlace || patient.birth_place || 'Non spécifié',
    religion: patient.religion || '---',
    genderLabel: patient.gender === 'MALE' ? 'Homme' : 'Femme'
  };

  const consultations = (patientData.consultations || []).sort((a, b) => {
    // Trier par date de consultation (plus récent en premier)
    return new Date(b.consultationDate) - new Date(a.consultationDate);
  });
  const medicalRecords = patientData.medicalRecords || [];

  return (
    <div className="space-y-6 p-6 bg-background min-h-screen transition-colors" data-testid="patient-detail">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/doctor/patients')}
          data-testid="back-btn"
          className="rounded-full border-border bg-card text-foreground hover:bg-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground font-space-grotesk uppercase italic tracking-tighter">
            Dossier Patient
          </h1>
          <p className="text-sm font-mono text-primary font-semibold">
            {p.patientCode || `ID: ${id}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Patient Info Card */}
        <div className="space-y-6">
          <Card className="border-border shadow-md bg-card text-card-foreground border-l-4 border-l-secondary">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-background shadow-lg overflow-hidden">
                  <AvatarImage 
                    src={p.photoUrl} 
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      console.log("❌ PatientDetail image failed to load:", p.photoUrl);
                      e.target.style.display = 'none';
                    }}
                  />
                  <AvatarFallback className="text-2xl bg-secondary text-secondary-foreground font-bold">
                    {p.firstName?.[0]}{p.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold text-foreground capitalize font-space-grotesk">
                  {p.firstName} {p.lastName}
                </h2>
                <p className="text-muted-foreground font-medium mt-1 uppercase text-xs tracking-widest">
                  {calculateAge(p.dob)} ans • {p.genderLabel}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
                  <Phone className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{p.phoneNumber || 'Non renseigné'}</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    Né le {formatDate(p.dob)} {p.bPlace !== 'Non spécifié' ? `à ${p.bPlace}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
                  <Map className="w-4 h-4 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-1">Aire de Santé</span>
                    <span className="text-sm font-semibold text-foreground uppercase tracking-tight">{p.hArea}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{p.address || p.city || 'Adresse non saisie'}</span>
                </div>
              </div>

              {/* Section Socio-Professionnelle */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                  <p className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1 mb-1">
                    <Briefcase className="w-3 h-3"/> Profession
                  </p>
                  <p className="text-xs font-bold text-foreground truncate">{p.profession || 'N/A'}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                  <p className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1 mb-1">
                    <Heart className="w-3 h-3"/> État Civil
                  </p>
                  <p className="text-xs font-bold text-foreground">{p.mStatus}</p>
                </div>
                {/* Ajout Confession */}
                <div className="p-3 rounded-xl bg-muted/30 border border-border/50 col-span-2">
                  <p className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1 mb-1">
                    <Moon className="w-3 h-3"/> Confession religieuse
                  </p>
                  <p className="text-xs font-bold text-foreground">{p.religion}</p>
                </div>
              </div>

              <div className="border-t border-border mt-6 pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-muted-foreground uppercase">Groupe sanguin</span>
                  <Badge className="bg-destructive text-destructive-foreground font-bold px-3">
                    <Droplet className="w-3 h-3 mr-1 fill-current" />
                    {p.bloodType || 'N/A'}
                  </Badge>
                </div>
                {p.insuranceProvider && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-muted-foreground uppercase">Assurance</span>
                    <Badge variant="secondary" className="font-bold border border-border shadow-sm">
                      <Shield className="w-3 h-3 mr-1" />
                      {p.insuranceProvider}
                    </Badge>
                  </div>
                )}
              </div>

              {(p.allergies || p.chronicDiseases) && (
                <div className="border-t border-border mt-6 pt-6 space-y-3">
                  {p.allergies && (
                    <div>
                      <h3 className="text-xs font-black text-destructive mb-2 flex items-center gap-2 uppercase tracking-wider">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Allergies
                      </h3>
                      <p className="text-sm font-medium text-foreground bg-destructive/10 p-3 rounded-xl border border-destructive/20 leading-relaxed">
                        {p.allergies}
                      </p>
                    </div>
                  )}
                  {p.chronicDiseases && (
                    <div className="mt-4">
                      <h3 className="text-xs font-black text-foreground mb-1 uppercase tracking-wider">Maladies chroniques</h3>
                      <p className="text-sm font-medium text-muted-foreground">{p.chronicDiseases}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs Content */}
        <Card className="lg:col-span-2 border-border shadow-lg bg-card/50 backdrop-blur-sm border-l-4 border-l-primary overflow-hidden">
          <Tabs defaultValue="consultations" className="w-full">
            <CardHeader className="pb-0 border-b border-border bg-card">
              <TabsList className="bg-transparent h-14 w-full justify-start gap-8 p-0 px-6">
                <TabsTrigger 
                  value="consultations" 
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none h-14 px-2 font-bold text-muted-foreground uppercase text-xs tracking-widest transition-all"
                >
                  Consultations ({consultations.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="records"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none h-14 px-2 font-bold text-muted-foreground uppercase text-xs tracking-widest transition-all"
                >
                  Dossiers Médicaux ({medicalRecords.length})
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="pt-6">
              <TabsContent value="consultations" className="mt-0 outline-none space-y-4">
                {consultations.length > 0 ? (
                  <div className="space-y-4">
                    {consultations.map((cons) => (
                      <div key={cons.id} className="p-5 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all shadow-sm group">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 text-primary rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-inner">
                              <Stethoscope className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="font-black text-foreground block uppercase italic font-space-grotesk tracking-tight text-lg">
                                {cons.reasonForVisit || "Consultation générale"}
                              </span>
                              <span className="text-[11px] text-primary font-bold uppercase tracking-tighter flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3" /> {formatDate(cons.consultationDate)}
                              </span>
                            </div>
                          </div>
                          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-black px-2 py-0.5 uppercase italic">
                            {cons.status || 'CONFIRMED'}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground font-medium bg-muted/30 p-4 rounded-xl border border-border/50 leading-relaxed italic">
                          {cons.diagnosis ? `"${cons.diagnosis}"` : 
                           cons.symptoms ? `"Symptômes: ${cons.symptoms}"` :
                           cons.reasonForVisit ? `"Motif: ${cons.reasonForVisit}"` :
                           "Consultation en cours - Diagnostic à venir"}
                        </p>
                        <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                              <User className="w-3.5 h-3.5 text-primary" /> Dr. {cons.doctorName || 'Non assigné'}
                            </span>
                            <div className="flex gap-2">
                              <Button 
                                onClick={() => navigate(`/doctor/examen-clinique/${cons.id}`)}
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-[11px] text-blue-600 font-black uppercase hover:bg-blue-50 tracking-tighter border-blue-600"
                              >
                                <Stethoscope className="w-3 h-3 mr-1" />
                                Examen
                              </Button>
                              <Button 
                                onClick={() => navigate(`/doctor/medical-report/${cons.id}`)}
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-[11px] text-emerald-600 font-black uppercase hover:bg-emerald-50 tracking-tighter border-emerald-600"
                              >
                                <FileText className="w-3 h-3 mr-1" />
                                Fiche complète
                              </Button>
                              <Button 
                                onClick={() => handleViewDetails(cons)}
                                variant="ghost" 
                                size="sm" 
                                className="h-8 text-[11px] text-primary font-black uppercase hover:bg-primary/5 tracking-tighter"
                              >
                                Détails →
                              </Button>
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-24">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 border border-border shadow-inner">
                      <Stethoscope className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                    <p className="text-foreground font-black uppercase text-sm tracking-widest">Aucune consultation</p>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">L'historique apparaîtra après la première visite.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="records" className="mt-0 outline-none">
                {medicalRecords.length > 0 ? (
                  <div className="space-y-3">
                    {medicalRecords.map((record) => (
                      <div key={record.id} className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card shadow-sm hover:border-primary/30 transition-all">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/5 shadow-inner">
                          <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-foreground font-space-grotesk">Dossier Médical #{record.id}</p>
                          <p className="text-[11px] text-muted-foreground font-medium mt-1 uppercase tracking-tighter">
                            {record.observations ? record.observations.substring(0, 85) + "..." : "Sans observations particulières"}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" className="font-bold border-border text-foreground hover:bg-muted rounded-xl">Ouvrir</Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-24">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                      <FileText className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                    <p className="text-foreground font-black uppercase text-sm tracking-widest">Aucun document</p>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">Les comptes rendus seront listés ici.</p>
                  </div>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {/* --- VOLET LATÉRAL DES DÉTAILS --- */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-md border-l-primary border-l-4 bg-card text-foreground overflow-y-auto">
          <SheetHeader className="mb-8 border-b border-border pb-6">
            <div className="p-3 bg-primary/10 w-fit rounded-2xl mb-4">
              <ClipboardList className="w-8 h-8 text-primary" />
            </div>
            <SheetTitle className="text-2xl font-black font-space-grotesk uppercase italic tracking-tighter">
              Détails Consultation
            </SheetTitle>
            <SheetDescription className="font-bold text-primary font-mono text-xs mt-2 uppercase">
              CONSULTATION REF: {selectedConsultation?.id}
            </SheetDescription>
          </SheetHeader>

          {selectedConsultation && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 p-4 rounded-2xl border border-border">
                  <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Date</p>
                  <p className="font-bold text-sm">{formatDate(selectedConsultation.consultationDate)}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-2xl border border-border">
                  <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Status</p>
                  <Badge className="bg-emerald-500 text-white font-black text-[10px] uppercase">{selectedConsultation.status || 'CONFIRMED'}</Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h5 className="flex items-center gap-2 text-xs font-black uppercase text-primary mb-3">
                    <Activity className="w-4 h-4" /> Motif de la visite
                  </h5>
                  <p className="bg-card p-4 rounded-2xl border border-border shadow-sm font-bold text-foreground">
                    {selectedConsultation.reasonForVisit || "Non spécifié"}
                  </p>
                </div>

                <div>
                  <h5 className="flex items-center gap-2 text-xs font-black uppercase text-primary mb-3">
                    <Stethoscope className="w-4 h-4" /> Diagnostic Détaillé
                  </h5>
                  <div className="bg-card p-4 rounded-2xl border border-border shadow-sm text-foreground font-medium leading-relaxed italic">
                    {selectedConsultation.diagnosis || "Aucun diagnostic détaillé n'a été saisi."}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border flex items-center gap-4">
                <Avatar className="w-12 h-12 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary text-primary-foreground font-black">DR</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase">Médecin traitant</p>
                  <p className="font-black text-foreground">Dr. {selectedConsultation.doctorName || 'Inconnu'}</p>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full rounded-2xl h-12 font-black uppercase tracking-tighter border-border hover:bg-muted"
                onClick={() => setIsSheetOpen(false)}
              >
                Fermer
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

    </div>
  );
};

export default PatientDetail;