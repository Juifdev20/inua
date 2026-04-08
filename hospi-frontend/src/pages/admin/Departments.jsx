import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Building2, Plus, Edit, Trash2, Users, Bed, Phone, 
  MapPin, MoreVertical, Loader2, AlertTriangle 
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
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
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';

// ✅ Configuration environnementale centralisée
import { BACKEND_URL } from '../../config/environment.js';
const API_BASE_URL = BACKEND_URL;

const Departments = () => {
  // --- ÉTATS ---
  const [departments, setDepartments] = useState([]); 
  const [users, setUsers] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState(null);

  const initialFormState = {
    nom: '',
    description: '',
    chef: '',
    nombrePersonnel: 0,
    nombreLits: 0,
    etage: '',
    telephone: '',
    actif: true
  };

  const [formData, setFormData] = useState(initialFormState);

  const API_URL = `${API_BASE_URL}/api/admin/departments`;
  const USERS_API_URL = `${API_BASE_URL}/api/admin/users/all`;

  // --- CHARGEMENT DES DONNÉES ---
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const [deptRes, userRes] = await Promise.all([
        axios.get(`${API_URL}/all`, config),
        axios.get(USERS_API_URL, config)
      ]);

      if (deptRes.data && Array.isArray(deptRes.data)) {
        setDepartments(deptRes.data);
      }
      if (userRes.data && Array.isArray(userRes.data)) {
        setUsers(userRes.data);
      }

    } catch (error) {
      console.error("Erreur API:", error);
      toast.error("Erreur de synchronisation");
    } finally {
      setLoading(false);
    }
  };

  // ✅ CORRECTION : Logique robuste pour comparer le nom du département
  const getRealPersonnelCount = (deptNom) => {
    if (!deptNom || !users) return 0;
    
    return users.filter(user => {
      // On récupère la valeur du département (gère le format String ou Objet Hibernate)
      const userDept = user.department || user.departement;
      
      if (!userDept) return false;
      
      // Extraction du nom si c'est un objet, sinon on garde la valeur brute
      const userDeptName = typeof userDept === 'object' ? userDept.nom : userDept;
      
      return String(userDeptName).toLowerCase() === String(deptNom).toLowerCase();
    }).length;
  };

  const fetchDepartments = async () => {
      fetchInitialData();
  };

  // --- LOGIQUE DIALOGUE ---
  const handleOpenDialog = (dept = null) => {
    if (dept) {
      setEditingDept(dept);
      setFormData({
        ...dept,
        nombrePersonnel: Number(dept.nombrePersonnel) || 0,
        nombreLits: Number(dept.nombreLits) || 0
      });
    } else {
      setEditingDept(null);
      setFormData(initialFormState);
    }
    setIsDialogOpen(true);
  };

  // --- ACTIONS CRUD ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    
    const payload = {
      ...formData,
      nombrePersonnel: parseInt(formData.nombrePersonnel, 10) || 0,
      nombreLits: parseInt(formData.nombreLits, 10) || 0
    };

    try {
      if (editingDept) {
        await axios.put(`${API_URL}/update/${editingDept.id}`, payload, config);
        toast.success('Département mis à jour');
      } else {
        await axios.post(`${API_URL}/create`, payload, config);
        toast.success('Département créé');
      }
      fetchDepartments();
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const triggerDeleteConfirm = (dept) => {
    setDeptToDelete(dept);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deptToDelete) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/delete/${deptToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Département supprimé');
      fetchDepartments();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast.error("Erreur suppression");
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-space-grotesk font-bold text-foreground mb-2">
            Gestion des Départements ({departments.length})
          </h1>
          <p className="text-muted-foreground">Données réelles du personnel</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-primary hover:bg-primary/90 gap-2 shadow-lg transition-all">
          <Plus className="w-4 h-4" /> Nouveau Département
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-muted-foreground font-space-grotesk">Calcul du personnel...</p>
        </div>
      ) : (
        <>
          {departments.length === 0 ? (
            <Card className="p-20 text-center border-dashed">
              <Building2 className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun département trouvé.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {departments.map((dept, index) => (
                <Card key={dept.id || index} className="hover:shadow-lg transition-all duration-300 group">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-space-grotesk">{dept.nom}</CardTitle>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" /> {dept.etage || "N/A"}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(dept)}>
                            <Edit className="w-4 h-4 mr-2" /> Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => triggerDeleteConfirm(dept)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">{dept.description}</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Chef:</span>
                        <span className="font-medium">{dept.chef || "Non assigné"}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1"><Users className="w-4 h-4" /> Personnel:</span>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                          {getRealPersonnelCount(dept.nom)} membres
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1"><Bed className="w-4 h-4" /> Lits:</span>
                        <Badge variant="secondary">{dept.nombreLits}</Badge>
                      </div>
                    </div>
                    <div className="pt-3 border-t flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground">{dept.telephone}</span>
                      <Badge variant={dept.actif ? "success" : "destructive"} className={dept.actif ? "bg-green-500/10 text-green-600" : ""}>
                        {dept.actif ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* DIALOG FORMULAIRE */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-space-grotesk">{editingDept ? 'Modifier' : 'Nouveau'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="nom">Nom du département</Label>
                <Input id="nom" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chef">Chef</Label>
                  <Input id="chef" value={formData.chef} onChange={(e) => setFormData({ ...formData, chef: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="etage">Étage</Label>
                  <Input id="etage" value={formData.etage} onChange={(e) => setFormData({ ...formData, etage: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombreLits">Nombre de lits</Label>
                  <Input id="nombreLits" type="number" value={formData.nombreLits} onChange={(e) => setFormData({ ...formData, nombreLits: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input id="telephone" value={formData.telephone} onChange={(e) => setFormData({ ...formData, telephone: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Switch id="actif" checked={formData.actif} onCheckedChange={(checked) => setFormData({ ...formData, actif: checked })} />
                <Label htmlFor="actif">Opérationnel</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
              <Button type="submit">Confirmer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION SUPPRESSION */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive" />
            <DialogHeader>
              <DialogTitle>Supprimer le département ?</DialogTitle>
              <DialogDescription>Cette action est irréversible.</DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 w-full mt-4">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="flex-1">Annuler</Button>
              <Button variant="destructive" onClick={handleConfirmDelete} className="flex-1">Supprimer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Departments;
