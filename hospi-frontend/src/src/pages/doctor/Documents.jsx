import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { 
  FileText, Search, Plus, Eye, File, 
  Loader2, UploadCloud, Trash2, CheckCircle,
  ClipboardList, Beaker, FileCheck, FileOutput,
  Calendar, TrendingUp, Activity, BarChart3, Clock
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { toast } from 'react-hot-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';
const API_DOCTORS = `${API_URL}/api/v1/doctors`;
const IMAGE_BASE_URL = `${API_URL}/uploads/profiles/`;

const getPhotoUrl = (patient) => {
  if (!patient) return null;
  const photo = patient.photo || 
                patient.photoUrl || 
                (patient.utilisateur && patient.utilisateur.photo);
  
  if (!photo) return null;
  if (photo.startsWith('http') || photo.startsWith('data:')) return photo;
  return `${IMAGE_BASE_URL}${photo}`;
};

const Documents = () => {
  const { token } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [patients, setPatients] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [patientSearch, setPatientSearch] = useState(''); 
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [errors, setErrors] = useState({});

  const [newDoc, setNewDoc] = useState({
    patient_id: '',
    titre: '',
    type_document: 'ordonnance',
    file: null
  });

  const fetchDocuments = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await axios.get(`${API_DOCTORS}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data?.data || response.data;
      setDocuments(Array.isArray(data) ? data : (data?.content || []));
    } catch (error) {
      console.error('Erreur documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchPatientsList = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingPatients(true);
      const response = await axios.get(`${API_DOCTORS}/patients`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        const formatted = response.data.map(p => ({
          ...p,
          displayFullName: `${p.prenom || p.firstName || ''} ${p.nom || p.lastName || ''}`.trim() || `Patient #${p.id}`,
          displayMatricule: p.numero_patient && p.numero_patient !== "0" ? p.numero_patient : null,
        }));
        setPatients(formatted);
      }
    } catch (error) {
      console.error('Erreur fetching patients list:', error);
      setPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDocuments();
    fetchPatientsList();
  }, [fetchDocuments, fetchPatientsList]);

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return {
      total: documents.length,
      recent: documents.filter(d => d.createdAt && d.createdAt.startsWith(todayStr)).length,
      ordonnances: documents.filter(d => (d.typeDocument || d.type_document) === 'ordonnance').length,
      resultats: documents.filter(d => (d.typeDocument || d.type_document) === 'resultat_examen').length,
      certificats: documents.filter(d => (d.typeDocument || d.type_document) === 'certificat').length,
      rendus: documents.filter(d => (d.typeDocument || d.type_document) === 'compte_rendu').length,
    }
  }, [documents]);

  // FONCTION POUR OUVRIR DANS UN NOUVEL ONGLET
  const handleViewDocument = (doc) => {
    if (!doc) return;
    const fileBase = doc.fileUrl || doc.notes;
    if (!fileBase) {
      return toast.error("Le fichier est introuvable");
    }
    
    const fullUrl = `${API_URL}${fileBase}`;
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  const handleUpload = async (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const newErrors = {};
    if (!newDoc.patient_id) newErrors.patient_id = "Veuillez choisir un patient";
    if (!newDoc.titre || newDoc.titre.trim() === "") newErrors.titre = "Le titre est obligatoire";
    if (!newDoc.file) newErrors.file = "Fichier manquant";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return toast.error("Informations manquantes");
    }

    setErrors({});
    const formData = new FormData();
    formData.append('file', newDoc.file);
    formData.append('patientId', String(newDoc.patient_id));
    formData.append('titre', newDoc.titre);
    formData.append('typeDocument', newDoc.type_document);

    setUploading(true);
    try {
      await axios.post(`${API_DOCTORS}/documents/upload`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data' 
        },
        onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / p.total))
      });
      
      toast.success("Document ajouté avec succès");
      setIsDialogOpen(false);
      setNewDoc({ patient_id: '', titre: '', type_document: 'ordonnance', file: null });
      await fetchDocuments();
    } catch (error) {
      toast.error(error.response?.data?.message || "Erreur lors de l'envoi du fichier");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async () => {
    if (!docToDelete) return;
    setDeleting(true);
    try {
      await axios.delete(`${API_DOCTORS}/documents/${docToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Document supprimé");
      setIsDeleteOpen(false);
      await fetchDocuments();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleting(false);
      setDocToDelete(null);
    }
  };

  const filteredDocuments = (documents || []).filter(doc => {
    const search = searchTerm.toLowerCase();
    const patientName = (doc.patientName || `${doc.prenom || ''} ${doc.nom || ''}`).toLowerCase();
    const title = (doc.titre || "").toLowerCase();
    return title.includes(search) || patientName.includes(search);
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10 font-space-grotesk">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase">
            ARCHIVES <span className="text-emerald-500">MÉDICALES</span>
          </h1>
          <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest mt-2">
            Gestion des documents et dossiers patients
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) setErrors({}); }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl rounded-2xl px-8 h-14 font-black uppercase tracking-widest text-xs transition-all active:scale-95">
              <Plus className="w-5 h-5 mr-2" /> Nouveau document
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-2 border-border text-foreground sm:max-w-md rounded-[2rem] shadow-2xl overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tight">Ajouter un fichier</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 mt-4">
              <div className="space-y-2">
                <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Sélectionner le Patient *</Label>
                <Select 
                  value={newDoc.patient_id} 
                  onValueChange={(val) => {
                    setNewDoc({...newDoc, patient_id: val});
                    setErrors({...errors, patient_id: null});
                  }}
                >
                  <SelectTrigger className={`bg-muted/50 border-none h-14 rounded-xl font-bold ${errors.patient_id ? 'ring-2 ring-rose-500' : 'ring-1 ring-emerald-500/20'}`}>
                    <SelectValue placeholder={loadingPatients ? "Chargement..." : "Rechercher un patient"} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-2 border-border rounded-xl max-h-[300px]">
                    <div className="p-2 sticky top-0 bg-card z-10 border-b border-border mb-1">
                       <div className="relative">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                         <Input 
                           placeholder="Taper un nom..." 
                           className="h-8 pl-8 text-[10px] bg-muted/50 border-none rounded-lg"
                           value={patientSearch}
                           onChange={(e) => setPatientSearch(e.target.value)}
                           onClick={(e) => e.stopPropagation()} 
                         />
                       </div>
                    </div>
                    {patients.filter(p => p.displayFullName.toLowerCase().includes(patientSearch.toLowerCase())).map(p => (
                      <SelectItem key={p.id} value={p.id.toString()} className="p-2">
                        <span className="font-bold text-xs uppercase">{p.displayFullName}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.patient_id && <p className="text-[10px] font-black text-rose-500 ml-2 italic">{errors.patient_id}</p>}
              </div>

              <div className="space-y-2">
                <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Titre du document *</Label>
                <Input 
                  placeholder="Ex: Analyse Sanguine"
                  className={`bg-muted/50 border-none h-12 rounded-xl font-bold ${errors.titre ? 'ring-2 ring-rose-500' : 'ring-1 ring-emerald-500/20'}`}
                  value={newDoc.titre}
                  onChange={(e) => setNewDoc({...newDoc, titre: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Type</Label>
                  <Select value={newDoc.type_document} onValueChange={(v) => setNewDoc({...newDoc, type_document: v})}>
                    <SelectTrigger className="bg-muted/50 border-none h-12 rounded-xl font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border rounded-xl">
                      <SelectItem value="ordonnance">Ordonnance</SelectItem>
                      <SelectItem value="resultat_examen">Résultat</SelectItem>
                      <SelectItem value="certificat">Certificat</SelectItem>
                      <SelectItem value="compte_rendu">Compte Rendu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Fichier *</Label>
                  <input type="file" id="doc-file-input" className="hidden" onChange={(e) => setNewDoc({...newDoc, file: e.target.files[0]})} />
                  <Button variant="outline" className="w-full h-12 border-dashed border-2 rounded-xl" onClick={() => document.getElementById('doc-file-input').click()}>
                    <UploadCloud className="w-4 h-4 mr-2" />
                    <span className="truncate text-[10px] font-black uppercase">{newDoc.file ? newDoc.file.name : "Importer"}</span>
                  </Button>
                </div>
              </div>

              <Button 
                onClick={handleUpload} 
                disabled={uploading} 
                className="w-full bg-emerald-500 text-white rounded-2xl h-14 font-black uppercase tracking-widest"
              >
                {uploading ? <Loader2 className="animate-spin mr-2" /> : "Confirmer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* DASHBOARD ANALYTICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-black text-white rounded-[2.5rem] border-none overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                  <Activity size={120} />
              </div>
              <CardContent className="p-10 relative z-10">
                  <p className="text-[10px] font-black tracking-[0.3em] opacity-50 uppercase">Volume Total d'Archives</p>
                  <h2 className="text-7xl font-black mt-4 tracking-tighter">{stats.total}</h2>
                  <div className="flex items-center gap-2 mt-6 text-emerald-400">
                      <TrendingUp size={16} />
                      <span className="text-xs font-bold uppercase tracking-widest">Base de données active</span>
                  </div>
              </CardContent>
          </Card>

          <Card className="bg-emerald-500 text-white rounded-[2.5rem] border-none overflow-hidden relative group">
               <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform">
                  <Clock size={120} />
              </div>
              <CardContent className="p-10 relative z-10">
                  <p className="text-[10px] font-black tracking-[0.3em] opacity-80 uppercase">Ajouts Aujourd'hui</p>
                  <h2 className="text-7xl font-black mt-4 tracking-tighter">{stats.recent}</h2>
                  <p className="text-xs font-bold mt-6 uppercase tracking-widest opacity-90 italic">Mise à jour automatique</p>
              </CardContent>
          </Card>

          <Card className="bg-muted/50 border-2 border-border rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-8">
                      <h4 className="font-black uppercase tracking-widest text-xs">Répartition par type</h4>
                      <BarChart3 className="text-emerald-500" size={20} />
                  </div>
                  <div className="space-y-4">
                      {[
                          { label: 'Ordonnances', count: stats.ordonnances, color: 'bg-emerald-500' },
                          { label: 'Examens', count: stats.resultats, color: 'bg-blue-500' },
                          { label: 'Certificats', count: stats.certificats, color: 'bg-orange-500' },
                          { label: 'Autres', count: stats.rendus, color: 'bg-purple-500' }
                      ].map((item, idx) => (
                          <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-[10px] font-black uppercase">
                                  <span>{item.label}</span>
                                  <span>{item.count}</span>
                              </div>
                              <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${item.color} transition-all duration-1000`} 
                                    style={{ width: `${stats.total > 0 ? (item.count / stats.total) * 100 : 0}%` }}
                                  />
                              </div>
                          </div>
                      ))}
                  </div>
              </CardContent>
          </Card>
      </div>

      {/* RECHERCHE PRINCIPALE */}
      <Card className="border-2 border-border bg-card/50 rounded-3xl shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-emerald-500/50" />
            <input 
              placeholder="Rechercher par titre ou nom de patient..." 
              className="w-full pl-16 pr-4 py-5 bg-transparent outline-none font-bold text-foreground placeholder:text-muted-foreground/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* LISTE DES DOCUMENTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          [1, 2, 3].map(i => <Skeleton key={i} className="h-44 w-full rounded-[2.5rem]" />)
        ) : filteredDocuments.length > 0 ? (
          filteredDocuments.map((doc) => (
            <Card key={doc.id} className="border-2 border-border bg-card rounded-[2.5rem] overflow-hidden group hover:border-emerald-500 transition-all hover:shadow-2xl hover:-translate-y-2">
              <CardContent className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-600">
                    <FileText size={32} />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-xl bg-muted/50 hover:bg-emerald-500/10 hover:text-emerald-500" 
                      onClick={() => handleViewDocument(doc)}
                    >
                      <Eye size={20} />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-xl bg-muted/50 text-rose-500 hover:bg-rose-500/10" onClick={() => { setDocToDelete(doc); setIsDeleteOpen(true); }}>
                      <Trash2 size={20} />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-black uppercase text-base mb-2 truncate group-hover:text-emerald-500 transition-colors">
                    {doc.titre || "Document sans titre"}
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span className="text-xs font-black text-muted-foreground uppercase tracking-tight">
                      {doc.patientName || `${doc.prenom || ''} ${doc.nom || ''}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-6">
                    <span className="text-[10px] font-bold text-muted-foreground/40 uppercase flex items-center gap-1">
                      <Calendar size={10} />
                      {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date inconnue'}
                    </span>
                    <span className="px-3 py-1 bg-muted rounded-full text-[9px] font-black uppercase text-muted-foreground">
                       {(doc.typeDocument || doc.type_document)?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-24 text-center bg-muted/10 border-2 border-dashed border-border rounded-[3.5rem]">
            <File className="w-20 h-20 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em]">Aucun document archivé</h3>
          </div>
        )}
      </div>

      {/* DIALOG SUPPRESSION */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-card border-2 border-border text-foreground rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="text-rose-500 font-black uppercase tracking-tight text-xl">Supprimer le document ?</DialogTitle>
          </DialogHeader>
          <DialogFooter className="flex gap-4 mt-6">
            <Button variant="ghost" className="flex-1 rounded-2xl h-12 font-black uppercase" onClick={() => setIsDeleteOpen(false)}>Annuler</Button>
            <Button variant="destructive" className="flex-1 rounded-2xl h-12 font-black uppercase" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="animate-spin" /> : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Documents;