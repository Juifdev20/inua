import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button'; 
import { Input } from '../../components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "../../components/ui/dialog"; 
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { patientService } from '../../services/patientService';
import { 
  Plus, Search, Edit, Trash2, Phone, Mail, User, 
  Fingerprint, AlertTriangle, Archive, RotateCcw, Camera, X, Printer
} from 'lucide-react';
import { toast } from 'sonner';

// --- CONFIGURATION URL BACKEND ---
// en dev on passe par le proxy de Vite => pas d'hôte
const BACKEND_URL = import.meta.env.DEV ? '' : 'http://localhost:8080';

// Fonction utilitaire pour résoudre l'URL de l'image
const isBase64String = (str) => {
  return typeof str === 'string' && str.length > 100 && /^[A-Za-z0-9+/]+={0,2}$/.test(str);
};

const resolvePhotoUrl = (photoPath) => {
  if (!photoPath) return null;
  if (photoPath.startsWith('http') || photoPath.startsWith('data:')) return photoPath;
  if (isBase64String(photoPath)) {
    return `data:image/jpeg;base64,${photoPath}`;
  }
  // if backend only returns a filename, form the correct uploads URL
  // use same logic as doctor interface
  let fileName = photoPath;
  // strip leading slash if present
  if (fileName.startsWith('/')) fileName = fileName.slice(1);
  const folder = fileName.includes('patient_') ? 'patients' : 'profiles';
  return `${BACKEND_URL}/uploads/${folder}/${fileName}`;
};

// --- COMPOSANT DE LA FICHE D'IDENTIFICATION POUR L'IMPRESSION ---
const PrintablePatientCard = ({ patient }) => {
  if (!patient) return null;
  const fName = patient.firstName || patient.prenom || '';
  const lName = patient.lastName || patient.nom || '';
  // Utilisation de la photo traitée
  const photoUrl = resolvePhotoUrl(patient.photoUrl || patient.photo);

  return (
    <div className="bg-white text-black p-10 font-serif w-[21cm] h-[29.7cm] mx-auto border border-gray-200 shadow-none print-area">
      <div className="text-center border-b-4 border-black pb-6 mb-8">
        <h1 className="text-2xl font-bold uppercase tracking-tighter">République Démocratique du Congo</h1>
        <h2 className="text-lg font-semibold uppercase italic">Ministère de la Santé Publique</h2>
        <div className="mt-6 inline-block border-4 border-black px-10 py-3 font-black text-2xl uppercase">
          Carte d'Identification Patient
        </div>
      </div>

      <div className="flex gap-10 mb-10 items-start">
        <div className="w-48 h-56 border-2 border-black flex items-center justify-center bg-gray-50 overflow-hidden">
          {photoUrl ? (
            <img src={photoUrl} className="w-full h-full object-cover" alt="Patient" />
          ) : (
            <User className="w-20 h-20 text-gray-300" />
          )}
        </div>
        <div className="flex-1 space-y-4 text-xl">
          <div className="border-b border-black pb-1"><span className="font-black uppercase">Nom :</span> {lName}</div>
          <div className="border-b border-black pb-1"><span className="font-black uppercase">Prénom :</span> {fName}</div>
          <div className="border-b border-black pb-1"><span className="font-black uppercase">Code :</span> {patient.patientCode || patient.code || '---'}</div>
          <div className="border-b border-black pb-1"><span className="font-black uppercase">Genre :</span> {patient.gender || '---'}</div>
          <div className="border-b border-black pb-1"><span className="font-black uppercase">Né(e) le :</span> {patient.dateOfBirth || '---'}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 text-lg">
        <div className="p-4 border border-black bg-gray-50">
          <p className="font-black text-xs uppercase mb-1">Contact</p>
          <p>{patient.phoneNumber || patient.telephone || '---'}</p>
          <p className="text-sm italic">{patient.email || ''}</p>
        </div>
        <div className="p-4 border border-black bg-gray-50">
          <p className="font-black text-xs uppercase mb-1">Groupe Sanguin</p>
          <p className="text-2xl font-black">{patient.bloodType || 'N/A'}</p>
        </div>
      </div>

      <div className="mt-12 p-4 border-2 border-dashed border-black">
        <p className="font-black text-xs uppercase mb-2">Adresse de résidence</p>
        <p className="text-lg">{patient.address || 'Non spécifiée'}</p>
      </div>

      <div className="mt-auto pt-20 flex justify-between items-end italic text-sm">
        <div className="text-center">
          <div className="w-32 h-1 bg-black mb-1 mx-auto"></div>
          <p>Signature Patient</p>
        </div>
        <div className="text-center">
          <p className="font-bold not-italic mb-1">Fait le {new Date().toLocaleDateString()}</p>
          <div className="w-32 h-1 bg-black mb-1 mx-auto"></div>
          <p>Le Chef de Service</p>
        </div>
      </div>
    </div>
  );
};

export const Patients = () => {
  useTheme();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  
  const [errors, setErrors] = useState({});
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);

  const [activeTab, setActiveTab] = useState('active');
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [patientToPrint, setPatientToPrint] = useState(null);

  const [currentPage, setCurrentPage] = useState(0);

  const initialFormState = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '', 
    address: '',
    bloodType: '',
    photoUrl: '',
    isActive: true
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchPatients();
  }, [currentPage, activeTab]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      let response;
      if (activeTab === 'archived') {
        response = await patientService.getArchivedPatients(currentPage, 50);
      } else {
        response = await patientService.getPatients(currentPage, 50);
      }
      const rawData = response.data || response;
      const content = rawData.content || (Array.isArray(rawData) ? rawData : []);
      setPatients(content);
    } catch (error) {
      console.error('Erreur lors du chargement des patients:', error);
      toast.error('Impossible de récupérer la liste des patients');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (patient) => {
    setPatientToPrint(patient);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const validateForm = () => {
    let newErrors = {};
    if (!formData.firstName?.trim()) newErrors.firstName = true;
    if (!formData.lastName?.trim()) newErrors.lastName = true;
    if (!formData.gender) newErrors.gender = true;
    if (!formData.dateOfBirth) newErrors.dateOfBirth = true;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 300, height: 300 } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      toast.error("Impossible d'accéder à la caméra");
      setShowCamera(false);
    }
  };

  const takePhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const photo = canvas.toDataURL('image/jpeg');
    setFormData({ ...formData, photoUrl: photo });
    stopCamera();
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const displayedPatients = patients.filter(patient => {
    const fName = (patient.firstName || patient.prenom || '').toLowerCase();
    const lName = (patient.lastName || patient.nom || '').toLowerCase();
    const fullName = `${fName} ${lName}`;
    const code = (patient.patientCode || patient.code || '').toLowerCase();
    const phone = (patient.phoneNumber || patient.telephone || '');
    const search = searchQuery.toLowerCase();
    return fullName.includes(search) || code.includes(search) || phone.includes(search);
  });

  const openCreateModal = () => {
    setIsEditing(false);
    setFormData(initialFormState);
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (patient) => {
    setIsEditing(true);
    setSelectedPatientId(patient.id);
    setFormData({
      firstName: patient.firstName || patient.prenom || '',
      lastName: patient.lastName || patient.nom || '',
      email: patient.email || '',
      phoneNumber: patient.phoneNumber || patient.telephone || '',
      dateOfBirth: patient.dateOfBirth || '',
      gender: patient.gender || '',
      address: patient.address || '',
      bloodType: patient.bloodType || '',
      photoUrl: patient.photoUrl || patient.photo || '',
      isActive: patient.isActive
    });
    setErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) {
      toast.error("Veuillez remplir les champs obligatoires.");
      return;
    }
    try {
      if (isEditing) {
        await patientService.updatePatient(selectedPatientId, formData);
        toast.success('Dossier mis à jour');
      } else {
        await patientService.createPatient(formData);
        toast.success('Nouveau patient enregistré');
      }
      setShowModal(false);
      fetchPatients();
    } catch (error) {
      const errorMsg = error.response?.data?.message || "";
      if (errorMsg.includes("existe déjà") || error.response?.status === 409) {
          toast.error("Un dossier existe déjà avec ces informations.");
          setShowModal(false);
          setActiveTab('active');
          setSearchQuery(formData.phoneNumber || formData.lastName);
      } else {
          toast.error('Erreur lors de l’enregistrement');
      }
    }
  };

  const handleRestore = async (patient) => {
    try {
      await patientService.activatePatient(patient.id);
      toast.success(`${patient.firstName || patient.prenom} a été restauré.`);
      fetchPatients();
    } catch (error) {
      toast.error("Échec de la restauration");
    }
  };

  const confirmDelete = (patient) => {
    setPatientToDelete(patient);
    setShowDeleteAlert(true);
  };

  const handleDelete = async () => {
    if (!patientToDelete) return;
    try {
      await patientService.deactivatePatient(patientToDelete.id);
      toast.success("Dossier archivé avec succès.");
      fetchPatients();
    } catch (error) {
      toast.error("Action refusée : droits insuffisants.");
    } finally {
      setShowDeleteAlert(false);
      setPatientToDelete(null);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      {/* ZONE IMPRESSION CACHÉE */}
      <div className="hidden print:block fixed inset-0 z-[9999] bg-white">
        <PrintablePatientCard patient={patientToPrint} />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Gestion des Patients</h1>
          <p className="text-muted-foreground mt-1">Gérez les admissions et les dossiers archivés.</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex bg-muted p-1 rounded-xl border border-border mr-2">
                <button 
                    onClick={() => setActiveTab('active')}
                    className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'active' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                    Actifs
                </button>
                <button 
                    onClick={() => setActiveTab('archived')}
                    className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'archived' ? "bg-background text-rose-600 shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                    Archives
                </button>
            </div>
            <Button 
                onClick={openCreateModal}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-6 h-12 shadow-lg shadow-emerald-500/20"
            >
                <Plus className="w-5 h-5 mr-2" /> Nouveau Patient
            </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm print:hidden">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            placeholder={`Rechercher un patient ${activeTab === 'active' ? 'actif' : 'archivé'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex w-full pl-12 h-12 bg-muted/50 border-none rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-500 outline-none px-3 text-sm transition-all font-medium"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden print:hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground">Chargement des données...</p>
          </div>
        ) : displayedPatients.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Archive className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">Aucun patient trouvé dans cette section.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-muted-foreground">Patient</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-muted-foreground">Identifiant</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-muted-foreground">Contact</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-widest text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayedPatients.map((patient) => {
                  const fName = patient.firstName || patient.prenom || '';
                  const lName = patient.lastName || patient.nom || '';
                  const photoUrl = resolvePhotoUrl(patient.photoUrl || patient.photo);
                  
                  return (
                    <tr key={patient.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                              "w-11 h-11 rounded-xl flex items-center justify-center text-white font-black uppercase border border-border transition-transform group-hover:scale-105 overflow-hidden",
                              activeTab === 'archived' ? "bg-slate-400" : "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-sm"
                          )}>
                             {photoUrl ? (
                               <img src={photoUrl} className="w-full h-full object-cover" alt="avatar" />
                             ) : (
                               <User className="w-6 h-6 text-gray-200" />
                             )}
                          </div>
                          <div>
                            <p className="font-bold text-foreground leading-none mb-1">{fName} {lName}</p>
                            <p className="text-xs text-muted-foreground">{patient.gender} • {patient.bloodType || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                          <div className="flex items-center gap-2 font-mono text-sm text-emerald-600 bg-emerald-500/10 w-fit px-3 py-1 rounded-lg">
                              <Fingerprint className="w-3 h-3" />
                              {patient.patientCode || patient.code || 'ID-'+patient.id}
                          </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-3.5 h-3.5 text-emerald-500" />
                            {patient.phoneNumber || patient.telephone || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {activeTab === 'active' ? (
                              <>
                                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg hover:bg-slate-500/10 hover:text-slate-700" title="Imprimer la carte" onClick={() => handlePrint(patient)}>
                                      <Printer className="w-4 h-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-500" onClick={() => openEditModal(patient)}>
                                      <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg hover:bg-rose-500/10 hover:text-rose-500" onClick={() => confirmDelete(patient)}>
                                      <Trash2 className="w-4 h-4" />
                                  </Button>
                              </>
                          ) : (
                              <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-bold rounded-lg h-9"
                                  onClick={() => handleRestore(patient)}
                              >
                                  <RotateCcw className="w-4 h-4 mr-2" /> Restaurer
                              </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DIALOGS ET ALERTES */}
      <Dialog open={showModal} onOpenChange={(open) => { if(!open) stopCamera(); setShowModal(open); }}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] p-0 overflow-hidden border-none shadow-2xl rounded-2xl flex flex-col bg-background print:hidden">
          <div className="px-8 py-6 border-b border-border bg-card/50">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-foreground">
                {isEditing ? "Mise à jour du dossier" : "Nouvelle Admission Patient"}
              </DialogTitle>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-muted rounded-2xl bg-muted/20">
              {showCamera ? (
                <div className="relative w-full max-w-[300px] aspect-square rounded-xl overflow-hidden bg-black">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <Button type="button" onClick={takePhoto} className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-emerald-500 hover:bg-emerald-600 rounded-full w-12 h-12 p-0 shadow-lg">
                    <Camera className="w-6 h-6" />
                  </Button>
                  <Button type="button" onClick={stopCamera} variant="ghost" className="absolute top-2 right-2 text-white hover:bg-white/20 rounded-full w-8 h-8 p-0">
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  {formData.photoUrl ? (
                    <div className="relative w-24 h-24 rounded-full border-4 border-emerald-500 overflow-hidden shadow-xl">
                      <img src={resolvePhotoUrl(formData.photoUrl)} className="w-full h-full object-cover" alt="Captured" />
                      <button type="button" onClick={() => setFormData({...formData, photoUrl: ''})} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Trash2 className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                      <User className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={startCamera} className="rounded-xl font-bold">
                    <Camera className="w-4 h-4 mr-2" /> Prendre une photo
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[12px] font-black uppercase tracking-wider text-muted-foreground ml-1">Prénom *</label>
                <Input value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className={cn("rounded-xl border-2 h-12 transition-all focus:border-emerald-500", errors.firstName && "border-rose-500 bg-rose-50")} />
              </div>
              <div className="space-y-2">
                <label className="text-[12px] font-black uppercase tracking-wider text-muted-foreground ml-1">Nom *</label>
                <Input value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className={cn("rounded-xl border-2 h-12 transition-all focus:border-emerald-500", errors.lastName && "border-rose-500 bg-rose-50")} />
              </div>
              <div className="space-y-2">
                <label className="text-[12px] font-black uppercase tracking-wider text-muted-foreground ml-1">Genre *</label>
                <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className={cn("w-full h-12 rounded-xl border-2 px-3 bg-background outline-none font-medium transition-all focus:border-emerald-500", errors.gender && "border-rose-500 bg-rose-50")}>
                  <option value="">Sélectionnez...</option>
                  <option value="MASCULIN">Homme</option>
                  <option value="FEMININ">Femme</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[12px] font-black uppercase tracking-wider text-muted-foreground ml-1">Date de naissance *</label>
                <Input type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} className={cn("rounded-xl border-2 h-12 block w-full transition-all focus:border-emerald-500", errors.dateOfBirth && "border-rose-500 bg-rose-50")} />
              </div>
              <div className="space-y-2">
                <label className="text-[12px] font-black uppercase tracking-wider text-muted-foreground ml-1">Téléphone</label>
                <Input type="tel" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} className="rounded-xl border-2 h-12 focus:border-emerald-500" />
              </div>
              <div className="space-y-2">
                <label className="text-[12px] font-black uppercase tracking-wider text-muted-foreground ml-1">Groupe Sanguin</label>
                <select value={formData.bloodType} onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })} className="w-full h-12 rounded-xl border-2 px-3 bg-background outline-none font-medium focus:border-emerald-500">
                  <option value="">Non spécifié</option>
                  <option value="A+">A+</option><option value="A-">A-</option>
                  <option value="B+">B+</option><option value="B-">B-</option>
                  <option value="AB+">AB+</option><option value="AB-">AB-</option>
                  <option value="O+">O+</option><option value="O-">O-</option>
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[12px] font-black uppercase tracking-wider text-muted-foreground ml-1">Adresse</label>
                <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="rounded-xl border-2 h-12 focus:border-emerald-500" />
              </div>
            </div>
          </form>

          <div className="px-8 py-5 border-t border-border bg-muted/10 print:hidden">
            <DialogFooter className="flex flex-row gap-3 w-full">
                <Button type="button" variant="outline" onClick={() => { stopCamera(); setShowModal(false); }} className="rounded-xl flex-1 h-11 font-bold">Annuler</Button>
                <Button type="button" onClick={handleSubmit} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex-[2] h-11 font-black shadow-lg">
                  {isEditing ? "Enregistrer" : "Confirmer l'inscription"}
                </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl max-w-[420px] print:hidden">
          <AlertDialogHeader className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/30 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <AlertDialogTitle className="text-xl font-black text-foreground">Archiver ce dossier ?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Le patient sera déplacé dans la section <b>Archives</b>. Il ne pourra plus être sélectionné pour de nouvelles consultations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <AlertDialogCancel className="rounded-xl border-2 h-11 font-bold flex-1 mt-0">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-11 font-black flex-1">
              Archiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* STYLE CSS POUR L'IMPRESSION */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: white; z-index: 10000; }
          @page { size: A4; margin: 0; }
        }
      `}} />
    </div>
  );
};