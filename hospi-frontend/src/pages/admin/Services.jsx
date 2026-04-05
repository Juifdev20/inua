import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Stethoscope, Plus, Edit, Trash2, Clock, DollarSign, 
  MoreVertical, CheckCircle, XCircle, AlertTriangle, Search, FileDown 
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

// ✅ URL dynamique - fonctionne en local et en production
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

// --- IMPORTS PDF ---
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoHopital from '../../assets/images/logo.png'; 

// --- CONFIGURATION AXIOS ---
const API_URL = `${API_BASE_URL}/api/admin/services`;
const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); 
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceToDelete, setServiceToDelete] = useState(null);

  // État pour les infos admin (Photo & Nom)
  const [adminProfile, setAdminProfile] = useState({
    nom: "Administrateur",
    photo: null 
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [formData, setFormData] = useState({
    nom: '', description: '', prix: 0, duree: 30, departement: '', isActive: true 
  });

  useEffect(() => { 
    fetchServices(); 
    loadAdminData();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const response = await api.get('/all');
      setServices(response.data || []);
    } catch (error) {
      toast.error("Erreur d'accès aux services");
    } finally {
      setLoading(false);
    }
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
      
      // COULEUR THÈME (Bleu Médical Professionnel)
      const bleuMedical = [41, 128, 185]; 

      // 1. EN-TÊTE (LOGO / PHOTO PROFIL)
      try {
        let imageSrc = adminProfile.photo ? await getBase64ImageFromURL(adminProfile.photo) : logoHopital;
        doc.addImage(imageSrc, 'PNG', pageWidth - 40, 10, 25, 25);
      } catch (e) {
        doc.setFillColor(bleuMedical[0], bleuMedical[1], bleuMedical[2]);
        doc.circle(pageWidth - 27.5, 22.5, 12, 'F');
      }

      doc.setTextColor(60, 60, 60);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("CLINIC UCBC", pageWidth - 10, 40, { align: "right" });

      // 2. TITRE
      doc.setTextColor(bleuMedical[0], bleuMedical[1], bleuMedical[2]);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("LISTE DES SERVICES", 14, 25);
      
      doc.setTextColor(100);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Nombre total de services : ${filteredServices.length}`, 14, 35);

      doc.setDrawColor(bleuMedical[0], bleuMedical[1], bleuMedical[2]);
      doc.setLineWidth(0.5);
      doc.line(14, 50, pageWidth - 14, 50);

      // 3. TABLEAU
      const tableRows = filteredServices.map((s, index) => [
        index + 1,
        s.nom ? s.nom.toUpperCase() : 'N/A',
        s.departement ? s.departement.toUpperCase() : 'N/A',
        `${s.prix || 0} USD`,
        `${s.duree || 0} min`,
        s.isActive ? "ACTIF" : "INACTIF"
      ]);

      autoTable(doc, {
        startY: 55,
        head: [['N°', 'SERVICE', 'DÉPARTEMENT', 'TARIF', 'DURÉE', 'STATUT']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: bleuMedical, textColor: [255, 255, 255], halign: 'center' },
        styles: { fontSize: 8.5, cellPadding: 3 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          3: { halign: 'right' },
          4: { halign: 'center' },
          5: { halign: 'center' }
        }
      });

      // 4. BLOC DE SIGNATURE (BAS À DROITE)
      const finalY = doc.lastAutoTable.finalY + 20; // Position après le tableau
      const dateComplete = new Intl.DateTimeFormat('fr-FR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }).format(new Date());

      doc.setTextColor(40);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      // Texte "Fait à..."
      doc.text(`Fait à Beni, le ${dateComplete}`, pageWidth - 15, finalY, { align: "right" });
      
      // Texte "Signé par..."
      doc.setFont("helvetica", "bold");
      doc.text("Signé par l'Administration,", pageWidth - 15, finalY + 7, { align: "right" });
      
      doc.setTextColor(bleuMedical[0], bleuMedical[1], bleuMedical[2]);
      doc.text(adminProfile.nom, pageWidth - 15, finalY + 15, { align: "right" });

      // Ligne pour la signature physique
      doc.setDrawColor(200);
      doc.line(pageWidth - 60, finalY + 18, pageWidth - 15, finalY + 18);

      doc.save(`Rapport_Services_UCBC_${new Date().getTime()}.pdf`);
      toast.success("PDF généré avec succès");

    } catch (error) {
      console.error("Erreur PDF:", error);
      toast.error("Erreur lors de la génération");
    }
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
        await api.put(`/${editingService.id}`, formData);
        toast.success('Service mis à jour');
      } else {
        await api.post('/create', formData);
        toast.success('Service ajouté');
      }
      fetchServices();
      setIsDialogOpen(false);
    } catch (error) { toast.error("Erreur d'enregistrement"); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/${serviceToDelete.id}`);
      toast.success('Service supprimé');
      await fetchServices();
      setIsDeleteDialogOpen(false);
    } catch (error) { toast.error("Erreur suppression"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-space-grotesk">Gestion des Services</h1>
          <p className="text-muted-foreground text-sm">Clinic UCBC - Administration</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={exportToPDF} className="gap-2 border-primary text-primary hover:bg-primary/5">
                <FileDown className="w-4 h-4" /> Exporter PDF
            </Button>
            <Button onClick={() => handleOpenDialog()} className="bg-primary hover:bg-primary/90 gap-2">
                <Plus className="w-4 h-4" /> Nouveau Service
            </Button>
        </div>
      </div>

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
    </div>
  );
};

export default Services;