import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { 
  Stethoscope, Plus, Edit, Trash2, Clock, DollarSign, 
  MoreVertical, CheckCircle, XCircle, AlertTriangle, Search, FileDown, 
  FlaskConical, Beaker, Loader2, ChevronLeft, ChevronRight, Filter 
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';

// ✅ Configuration environnementale centralisée
import { BACKEND_URL } from '../../config/environment.js';
const API_BASE_URL = BACKEND_URL;

// --- IMPORTS PDF ---
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useHospitalConfig } from '../../hooks/useHospitalConfig';
import { formatCurrencyPDF, getCurrencySymbol } from '../../utils/currencyFormat'; 

// --- CONFIGURATION AXIOS pour Services ---
const SERVICES_API_URL = '/api/admin/services';

const Services = () => {
  // ★ ONGLET ACTIF: 'services' | 'examens'
  const [activeTab, setActiveTab] = useState('services');

  // ═════════════════════════════════════════════════════════════════
  // ÉTATS POUR SERVICES
  // ═════════════════════════════════════════════════════════════════
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const { config } = useHospitalConfig();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [formData, setFormData] = useState({
    nom: '', description: '', prix: 0, duree: 30, departement: '', isActive: true 
  });

  // ═════════════════════════════════════════════════════════════════
  // ÉTATS POUR EXAMENS DE LABORATOIRE
  // ═════════════════════════════════════════════════════════════════
  const [examens, setExamens] = useState([]);
  const [loadingExamens, setLoadingExamens] = useState(false);
  const [isExamenDialogOpen, setIsExamenDialogOpen] = useState(false);
  const [isExamenDeleteDialogOpen, setIsExamenDeleteDialogOpen] = useState(false);
  const [editingExamen, setEditingExamen] = useState(null);
  const [examenToDelete, setExamenToDelete] = useState(null);
  
  const [examenSearchTerm, setExamenSearchTerm] = useState("");
  const [examenCategoryFilter, setExamenCategoryFilter] = useState("ALL");
  
  const [examenFormData, setExamenFormData] = useState({
    code: '', nom: '', description: '', prix: '', unite: '',
    valeurMinReference: '', valeurMaxReference: '', categorie: 'BIOCHIMIE', delaiResultatHeures: 24
  });

  const examenCategories = [
    { value: 'BIOCHIMIE', label: 'Biochimie', color: 'bg-blue-100 text-blue-800' },
    { value: 'HEMATOLOGIE', label: 'Hématologie', color: 'bg-red-100 text-red-800' },
    { value: 'SEROLOGIE', label: 'Sérologie', color: 'bg-green-100 text-green-800' },
    { value: 'MICROBIOLOGIE', label: 'Microbiologie', color: 'bg-purple-100 text-purple-800' },
    { value: 'IMMUNOLOGIE', label: 'Immunologie', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'HORMONOLOGIE', label: 'Hormonologie', color: 'bg-pink-100 text-pink-800' },
    { value: 'URINANALYSE', label: 'Urinanalyse', color: 'bg-cyan-100 text-cyan-800' }
  ];

  // État pour les infos admin (Photo & Nom)
  const [adminProfile, setAdminProfile] = useState({
    nom: "Administrateur",
    photo: null 
  });

  useEffect(() => { 
    fetchServices(); 
    loadAdminData();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const response = await api.get(`${SERVICES_API_URL}/all`);
      setServices(response.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des services', error);
      toast.error('Impossible de charger les services');
    } finally {
      setLoading(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════
  // FONCTIONS POUR EXAMENS DE LABORATOIRE
  // ═════════════════════════════════════════════════════════════════
  
  const fetchExamens = async () => {
    setLoadingExamens(true);
    try {
      const response = await api.get('/api/v1/examens');
      if (response.data.success) {
        setExamens(response.data.data || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des examens', error);
      toast.error('Impossible de charger les examens');
    } finally {
      setLoadingExamens(false);
    }
  };

  // Charger les examens quand on bascule sur l'onglet examens
  useEffect(() => {
    if (activeTab === 'examens') {
      fetchExamens();
    }
  }, [activeTab]);

  const handleSaveExamen = async () => {
    // Validation
    if (!examenFormData.code || !examenFormData.nom || !examenFormData.prix) {
      toast.error('Code, nom et prix sont obligatoires');
      return;
    }

    try {
      const payload = {
        ...examenFormData,
        prix: parseFloat(examenFormData.prix),
        valeurMinReference: examenFormData.valeurMinReference ? parseFloat(examenFormData.valeurMinReference) : null,
        valeurMaxReference: examenFormData.valeurMaxReference ? parseFloat(examenFormData.valeurMaxReference) : null,
        delaiResultatHeures: parseInt(examenFormData.delaiResultatHeures) || 24
      };

      if (editingExamen) {
        // Modification
        const response = await api.put(`/api/v1/examens/${editingExamen.id}`, payload);
        if (response.data.success) {
          toast.success('Examen modifié avec succès');
          setExamens(examens.map(e => e.id === editingExamen.id ? response.data.data : e));
        }
      } else {
        // Création
        const response = await api.post('/api/v1/examens', payload);
        if (response.data.success) {
          toast.success('Examen créé avec succès');
          setExamens([...examens, response.data.data]);
        }
      }
      
      setIsExamenDialogOpen(false);
      resetExamenForm();
    } catch (error) {
      console.error('Erreur sauvegarde examen:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteExamen = async () => {
    if (!examenToDelete) return;
    
    try {
      await api.delete(`/api/v1/examens/${examenToDelete.id}`);
      toast.success('Examen supprimé avec succès');
      setExamens(examens.filter(e => e.id !== examenToDelete.id));
      setIsExamenDeleteDialogOpen(false);
      setExamenToDelete(null);
    } catch (error) {
      console.error('Erreur suppression examen:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const openExamenDialog = (examen = null) => {
    if (examen) {
      setEditingExamen(examen);
      setExamenFormData({
        code: examen.code || '',
        nom: examen.nom || '',
        description: examen.description || '',
        prix: examen.prix || '',
        unite: examen.unite || '',
        valeurMinReference: examen.valeurMinReference || '',
        valeurMaxReference: examen.valeurMaxReference || '',
        categorie: examen.categorie || 'BIOCHIMIE',
        delaiResultatHeures: examen.delaiResultatHeures || 24
      });
    } else {
      setEditingExamen(null);
      resetExamenForm();
    }
    setIsExamenDialogOpen(true);
  };

  const resetExamenForm = () => {
    setExamenFormData({
      code: '', nom: '', description: '', prix: '', unite: '',
      valeurMinReference: '', valeurMaxReference: '', categorie: 'BIOCHIMIE', delaiResultatHeures: 24
    });
  };

  const loadAdminData = () => {
    const userString = localStorage.getItem('user');
    if (userString) {
      const user = JSON.parse(userString);
      setAdminProfile({
        nom: user.nom || user.name || "Administrateur",
        photo: user.photo || null
      });
    }
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = (service.nom || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (service.departement || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" ? true : 
                         statusFilter === "active" ? service.isActive : !service.isActive;
    return matchesSearch && matchesStatus;
  });

  // Filtres pour examens
  const filteredExamens = examens.filter(examen => {
    const matchesSearch = (examen.nom || "").toLowerCase().includes(examenSearchTerm.toLowerCase()) || 
                         (examen.code || "").toLowerCase().includes(examenSearchTerm.toLowerCase());
    const matchesCategory = examenCategoryFilter === "ALL" ? true : examen.categorie === examenCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Utilitaire pour convertir l'image URL en Base64 pour jsPDF
  const getBase64ImageFromURL = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.setAttribute("crossOrigin", "anonymous");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = (error) => reject(error);
      img.src = url;
    });
  };

  // --- LOGIQUE EXPORT PDF ---
  const exportToPDF = async () => {
    try {
      if (filteredServices.length === 0) {
        toast.error("Aucune donnée à exporter");
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Couleur depuis la config
      const primaryColor = config.primaryColor ? hexToRgb(config.primaryColor) : [5, 150, 105];

      // 1. EN-TÊTE (LOGO / PHOTO PROFIL)
      if (config.hospitalLogoUrl) {
        try {
          doc.addImage(config.hospitalLogoUrl, 'PNG', pageWidth - 40, 10, 25, 25);
        } catch (e) {
          // Continuer sans logo
        }
      }

      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(config.hospitalName?.toUpperCase() || 'INUA AFYA', pageWidth - 10, 40, { align: "right" });

      // 2. TITRE
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("LISTE DES SERVICES", 14, 25);
      
      doc.setTextColor(100);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Nombre total de services : ${filteredServices.length}`, 14, 35);

      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(14, 50, pageWidth - 14, 50);

      // 3. TABLEAU
      const tableRows = filteredServices.map((s, index) => [
        index + 1,
        s.nom ? s.nom.toUpperCase() : 'N/A',
        s.departement ? s.departement.toUpperCase() : 'N/A',
        formatCurrencyPDF(s.prix || 0),
        `${s.duree || 0} min`,
        s.isActive ? "ACTIF" : "INACTIF"
      ]);

      autoTable(doc, {
        startY: 55,
        head: [['N°', 'SERVICE', 'DÉPARTEMENT', 'TARIF', 'DURÉE', 'STATUT']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], halign: 'center' },
        styles: { fontSize: 8.5, cellPadding: 3 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          3: { halign: 'right' },
          4: { halign: 'center' },
          5: { halign: 'center' }
        }
      });

      // 4. BLOC DE SIGNATURE (BAS À DROITE)
      const finalY = doc.lastAutoTable.finalY + 20;
      const dateComplete = new Intl.DateTimeFormat('fr-FR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }).format(new Date());

      doc.setTextColor(40);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      // Texte "Fait à..."
      const city = config.city || 'Beni';
      doc.text(`Fait à ${city}, le ${dateComplete}`, pageWidth - 15, finalY, { align: "right" });
      
      // Texte "Signé par..."
      doc.setFont("helvetica", "bold");
      doc.text("Signé par l'Administration,", pageWidth - 15, finalY + 7, { align: "right" });
      
      if (adminProfile.nom) {
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(adminProfile.nom, pageWidth - 15, finalY + 15, { align: "right" });
      }

      // Ligne pour la signature physique
      doc.setDrawColor(200);
      doc.line(pageWidth - 60, finalY + 18, pageWidth - 15, finalY + 18);

      // Pied de page
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(config.footerText || `© ${config.hospitalName || 'INUA AFYA'} - Tous droits réservés`, pageWidth / 2, pageHeight - 15, { align: "center" });

      doc.save(`Rapport_Services_${config.hospitalName || 'INUA'}_${new Date().getTime()}.pdf`);
      toast.success("PDF généré avec succès");

    } catch (error) {
      console.error("Erreur PDF:", error);
      toast.error("Erreur lors de la génération");
    }
  };

  // Helper pour convertir hex en RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [5, 150, 105];
  };

  // --- ACTIONS ---
  const handleOpenDialog = (service = null) => {
    if (service) {
      setEditingService(service);
      setFormData({ ...service });
    } else {
      setEditingService(null);
      setFormData({ nom: '', description: '', prix: 0, duree: 30, departement: '', isActive: true });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingService) {
        await api.put(`${SERVICES_API_URL}/${editingService.id}`, formData);
        toast.success('Service mis à jour');
      } else {
        await api.post(`${SERVICES_API_URL}/create`, formData);
        toast.success('Service ajouté');
      }
      fetchServices();
      setIsDialogOpen(false);
    } catch (error) { toast.error("Erreur d'enregistrement"); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`${SERVICES_API_URL}/${serviceToDelete.id}`);
      toast.success('Service supprimé');
      await fetchServices();
      setIsDeleteDialogOpen(false);
    } catch (error) { toast.error("Erreur suppression"); }
  };

  return (
    <div className="space-y-6">
      {/* ONGLETS SERVICES / EXAMENS */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold font-space-grotesk">Gestion des Services</h1>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* TABS */}
          <div className="flex p-1 bg-muted rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('services')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'services' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Stethoscope className="w-4 h-4 inline mr-2" />
              Services
            </button>
            <button
              onClick={() => setActiveTab('examens')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'examens' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FlaskConical className="w-4 h-4 inline mr-2" />
              Examens Labo
            </button>
          </div>

          {/* ACTION BUTTON */}
          <div className="flex gap-2">
            {activeTab === 'services' ? (
              <>
                <Button variant="outline" onClick={exportToPDF} className="gap-2 border-primary text-primary hover:bg-primary/5">
                    <FileDown className="w-4 h-4" /> Exporter PDF
                </Button>
                <Button onClick={() => handleOpenDialog()} className="bg-primary hover:bg-primary/90 gap-2">
                    <Plus className="w-4 h-4" /> Nouveau Service
                </Button>
              </>
            ) : (
              <Button onClick={() => openExamenDialog()} className="bg-blue-600 hover:bg-blue-700 gap-2">
                  <Plus className="w-4 h-4" /> Nouvel Examen
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* BARRE DE RECHERCHE CONDITIONNELLE */}
      {activeTab === 'services' ? (
        <Card className="border-none shadow-sm bg-card/50">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher un service..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="inactive">Inactifs</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none shadow-sm bg-card/50">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher un examen (nom ou code)..." 
                className="pl-10"
                value={examenSearchTerm}
                onChange={(e) => setExamenSearchTerm(e.target.value)}
              />
            </div>
            <Select value={examenCategoryFilter} onValueChange={setExamenCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes</SelectItem>
                <SelectItem value="BIOCHIMIE">Biochimie</SelectItem>
                <SelectItem value="HEMATOLOGIE">Hématologie</SelectItem>
                <SelectItem value="SEROLOGIE">Sérologie</SelectItem>
                <SelectItem value="MICROBIOLOGIE">Microbiologie</SelectItem>
                <SelectItem value="IMMUNOLOGIE">Immunologie</SelectItem>
                <SelectItem value="HORMONOLOGIE">Hormonologie</SelectItem>
                <SelectItem value="URINANALYSE">Urinanalyse</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* TABLEAU CONDITIONNEL */}
      {activeTab === 'services' ? (
        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <CardTitle className="text-lg font-space-grotesk">Catalogue des Services</CardTitle>
            <Badge variant="secondary">{filteredServices.length} unité(s)</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-bold">Service</TableHead>
                    <TableHead className="font-bold">Département</TableHead>
                    <TableHead className="font-bold">Prix</TableHead>
                    <TableHead className="font-bold">Durée</TableHead>
                    <TableHead className="font-bold">Statut</TableHead>
                    <TableHead className="text-right font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                     <TableRow><TableCell colSpan={6} className="text-center py-10">Chargement...</TableCell></TableRow>
                  ) : (
                    filteredServices.map((service) => (
                      <TableRow key={service.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="py-4">
                          <div className="font-semibold">{service.nom}</div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{service.departement}</Badge></TableCell>
                        <TableCell className="font-bold text-green-600">{service.prix} $</TableCell>
                        <TableCell>{service.duree} min</TableCell>
                        <TableCell>
                          <Badge className={service.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                             {service.isActive ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenDialog(service)}><Edit className="w-4 h-4 mr-2" /> Modifier</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => {setServiceToDelete(service); setIsDeleteDialogOpen(true)}} className="text-destructive">
                                  <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      ) : (
        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <CardTitle className="text-lg font-space-grotesk">Catalogue des Examens de Laboratoire</CardTitle>
            <Badge variant="secondary">{filteredExamens.length} examen(s)</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-bold">Code</TableHead>
                    <TableHead className="font-bold">Nom</TableHead>
                    <TableHead className="font-bold">Catégorie</TableHead>
                    <TableHead className="font-bold">Prix</TableHead>
                    <TableHead className="font-bold">Unité</TableHead>
                    <TableHead className="font-bold">Référence</TableHead>
                    <TableHead className="text-right font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingExamens ? (
                     <TableRow><TableCell colSpan={7} className="text-center py-10">Chargement...</TableCell></TableRow>
                  ) : filteredExamens.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Aucun examen trouvé</TableCell></TableRow>
                  ) : (
                    filteredExamens.map((examen) => (
                      <TableRow key={examen.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="font-mono text-sm">{examen.code}</TableCell>
                        <TableCell className="py-4">
                          <div className="font-semibold">{examen.nom}</div>
                          {examen.description && <div className="text-xs text-muted-foreground">{examen.description}</div>}
                        </TableCell>
                        <TableCell><Badge variant="outline">{examen.categorie}</Badge></TableCell>
                        <TableCell className="font-bold text-green-600">{examen.prix} $</TableCell>
                        <TableCell className="text-sm">{examen.unite || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {examen.valeurMinReference && examen.valeurMaxReference 
                            ? `${examen.valeurMinReference} - ${examen.valeurMaxReference}` 
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openExamenDialog(examen)}><Edit className="w-4 h-4 mr-2" /> Modifier</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => {setExamenToDelete(examen); setIsExamenDeleteDialogOpen(true)}} className="text-destructive">
                                  <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog Formulaire */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Modifier' : 'Ajouter'} un service</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={formData.nom} onChange={(e)=>setFormData({...formData, nom: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e)=>setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prix ($)</Label>
                <Input type="number" value={formData.prix} onChange={(e)=>setFormData({...formData, prix: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Durée (min)</Label>
                <Input type="number" value={formData.duree} onChange={(e)=>setFormData({...formData, duree: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Département</Label>
              <Input value={formData.departement} onChange={(e)=>setFormData({...formData, departement: e.target.value})} />
            </div>
            <div className="flex items-center space-x-2">
              <Switch checked={formData.isActive} onCheckedChange={(val)=>setFormData({...formData, isActive: val})} />
              <Label>Service Actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setIsDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmit}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Suppression */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Confirmer suppression
            </DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setIsDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Examen Formulaire */}
      <Dialog open={isExamenDialogOpen} onOpenChange={setIsExamenDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingExamen ? 'Modifier' : 'Ajouter'} un examen</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input value={examenFormData.code} onChange={(e)=>setExamenFormData({...examenFormData, code: e.target.value})} placeholder="ex: GLY" />
              </div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select value={examenFormData.categorie} onValueChange={(val)=>setExamenFormData({...examenFormData, categorie: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BIOCHIMIE">Biochimie</SelectItem>
                    <SelectItem value="HEMATOLOGIE">Hématologie</SelectItem>
                    <SelectItem value="SEROLOGIE">Sérologie</SelectItem>
                    <SelectItem value="MICROBIOLOGIE">Microbiologie</SelectItem>
                    <SelectItem value="IMMUNOLOGIE">Immunologie</SelectItem>
                    <SelectItem value="HORMONOLOGIE">Hormonologie</SelectItem>
                    <SelectItem value="URINANALYSE">Urinanalyse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input value={examenFormData.nom} onChange={(e)=>setExamenFormData({...examenFormData, nom: e.target.value})} placeholder="Nom de l'examen" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={examenFormData.description} onChange={(e)=>setExamenFormData({...examenFormData, description: e.target.value})} placeholder="Description optionnelle" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Prix ($) *</Label>
                <Input type="number" value={examenFormData.prix} onChange={(e)=>setExamenFormData({...examenFormData, prix: e.target.value})} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Unité</Label>
                <Input value={examenFormData.unite} onChange={(e)=>setExamenFormData({...examenFormData, unite: e.target.value})} placeholder="ex: mmol/L" />
              </div>
              <div className="space-y-2">
                <Label>Délai résultat (h)</Label>
                <Input type="number" value={examenFormData.delaiResultatHeures} onChange={(e)=>setExamenFormData({...examenFormData, delaiResultatHeures: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valeur min référence</Label>
                <Input type="number" value={examenFormData.valeurMinReference} onChange={(e)=>setExamenFormData({...examenFormData, valeurMinReference: e.target.value})} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Valeur max référence</Label>
                <Input type="number" value={examenFormData.valeurMaxReference} onChange={(e)=>setExamenFormData({...examenFormData, valeurMaxReference: e.target.value})} placeholder="0.00" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setIsExamenDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveExamen} className="bg-blue-600 hover:bg-blue-700">Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Suppression Examen */}
      <Dialog open={isExamenDeleteDialogOpen} onOpenChange={setIsExamenDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Confirmer suppression
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer l'examen "{examenToDelete?.nom}" ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setIsExamenDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDeleteExamen}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Services;