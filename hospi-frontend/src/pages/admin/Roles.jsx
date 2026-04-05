import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Plus, Edit, Trash2, Users, MoreVertical, Loader2, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from "../../components/ui/checkbox";
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
import { toast } from 'sonner';

// ✅ URL dynamique - fonctionne en local et en production
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

const ROLE_TEMPLATES = {
  "DOCTEUR": ["patients.read", "patients.write", "consultations.all", "rendez-vous.create"],
  "INFIRMIER": ["patients.read", "patients.write", "soins.execute"],
  "PATIENT": ["profil.read", "rendez-vous.create"],
  "PHARMACIEN": ["pharmacie.manage", "stocks.view"],
  "ADMIN": ["all", "users.manage"],
  "LABORANTIN": ["labo.view", "resultats.write"],
  "CAISSIER": ["facturation.manage"],
  "RH": ["users.manage", "rh.payroll", "rh.attendance"]
};

const AVAILABLE_PERMISSIONS = [
  "patients.read", "patients.write", "consultations.all", 
  "rendez-vous.create", "pharmacie.manage", "labo.view", 
  "users.manage", "profil.read", "soins.execute", "rh.payroll", 
  "rh.attendance", "all"
];

const Roles = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Nouveaux états pour le message d'alerte de suppression au milieu
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    couleur: '#40E070',
    permissions: []
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/admin/roles/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoles(response.data || []);
    } catch (error) {
      console.error("Erreur listing:", error);
      toast.error("Erreur de récupération des rôles");
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (templateName) => {
    const defaultPerms = ROLE_TEMPLATES[templateName] || [];
    setFormData(prev => ({
      ...prev,
      nom: templateName,
      permissions: defaultPerms,
      couleur: templateName === "RH" ? "#f97316" : prev.couleur
    }));
    toast.info(`Modèle ${templateName} appliqué`);
  };

  const handleOpenDialog = (role = null) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        nom: role.nom,
        description: role.description || '', // Correction : évite le null
        couleur: role.couleur || '#40E070',
        permissions: role.permissions || []
      });
    } else {
      setEditingRole(null);
      setFormData({
        nom: '',
        description: '',
        couleur: '#40E070',
        permissions: []
      });
    }
    setIsDialogOpen(true);
  };

  const handlePermissionChange = (perm) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm]
    }));
  };

  const selectAllPermissions = () => {
    setFormData(prev => ({ ...prev, permissions: [...AVAILABLE_PERMISSIONS] }));
    toast.success("Toutes les permissions ont été cochées");
  };

  const deselectAllPermissions = () => {
    setFormData(prev => ({ ...prev, permissions: [] }));
    toast.info("Toutes les permissions ont été retirées");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const finalData = { ...formData, nom: formData.nom.toUpperCase() };

    try {
      if (editingRole) {
        await axios.put(`${API_BASE_URL}/api/admin/roles/${editingRole.id}`, finalData, config);
        toast.success('Rôle mis à jour avec succès');
      } else {
        await axios.post(`${API_BASE_URL}/api/admin/roles/create`, finalData, config);
        toast.success('Nouveau rôle créé');
      }
      fetchRoles();
      setIsDialogOpen(false);
    } catch (error) {
      if (error.response && (error.response.status === 400 || error.response.status === 500)) {
        toast.error(`Erreur : Le rôle ${finalData.nom} existe peut-être déjà.`);
      } else {
        toast.error("Erreur lors de l'enregistrement");
      }
    }
  };

  // Nouvelle fonction pour déclencher l'alerte au milieu
  const triggerDeleteConfirm = (role) => {
    setRoleToDelete(role);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/admin/roles/${roleToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchRoles();
      toast.success(`Rôle ${roleToDelete.nom} supprimé avec succès`);
      setIsDeleteDialogOpen(false);
      setRoleToDelete(null);
    } catch (error) {
      console.error("Erreur suppression:", error);
      
      // Personnalisation du message selon le type d'erreur
      if (error.response && error.response.status === 500) {
        // Dans 99% des cas, l'erreur 500 ici signifie une contrainte d'intégrité (Foreign Key)
        toast.error(
          `Action impossible : Le rôle "${roleToDelete.nom}" est actuellement attribué à des utilisateurs. Changez d'abord leur rôle avant de le supprimer.`,
          { duration: 5000 } // On laisse le message un peu plus longtemps
        );
      } else {
        toast.error("Une erreur technique est survenue lors de la suppression.");
      }
      
      setIsDeleteDialogOpen(false);
      setRoleToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-space-grotesk">Chargement des données réelles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-space-grotesk font-bold text-foreground mb-2">Gestion des Rôles</h1>
          <p className="text-muted-foreground">Gerez les rôles et permissions utilisateurs (Données réelles)</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-primary hover:bg-primary-dark gap-2 shadow-lg hover:shadow-xl transition-all">
          <Plus className="w-4 h-4" /> Nouveau Rôle
        </Button>
      </div>

      {roles.length === 0 ? (
        <Card className="p-10 text-center">
          <Shield className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
          <p className="text-muted-foreground">Aucun rôle trouvé. Cliquez sur "Nouveau Rôle" pour commencer.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role, index) => (
            <Card key={role.id || index} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: `${role.couleur || '#40E070'}20` }}
                    >
                      <Shield className="w-6 h-6" style={{ color: role.couleur || '#40E070' }} />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-space-grotesk">{role.nom}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {role.utilisateursCount || 0} utilisateur{(role.utilisateursCount || 0) > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleOpenDialog(role)}><Edit className="w-4 h-4 mr-2" /> Modifier</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => triggerDeleteConfirm(role)} className="text-destructive focus:text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Supprimer</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{role.description}</p>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Permissions:</p>
                  <div className="flex flex-wrap gap-2">
                    {role.permissions && role.permissions.slice(0, 3).map((perm, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">{perm}</Badge>
                    ))}
                    {role.permissions && role.permissions.length > 3 && (
                      <Badge variant="outline" className="text-[10px]">+{role.permissions.length - 3}</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* FORMULAIRE (MODIFICATION / CRÉATION) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-space-grotesk">{editingRole ? 'Modifier le rôle' : 'Nouveau rôle'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {!editingRole && (
              <div className="space-y-2">
                <Label>Modèle Rapide</Label>
                <Select onValueChange={handleTemplateChange}>
                  <SelectTrigger><SelectValue placeholder="Choisir un modèle..." /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(ROLE_TEMPLATES).map(key => <SelectItem key={key} value={key}>{key}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="nom">Nom du rôle</Label>
              <Input id="nom" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} placeholder="Ex: DOCTEUR" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Description..." required />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold">Permissions</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px]" onClick={selectAllPermissions}><CheckSquare className="w-3 h-3 mr-1" /> Tout cocher</Button>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px]" onClick={deselectAllPermissions}><Square className="w-3 h-3 mr-1" /> Décocher</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 rounded-lg border border-dashed">
                {AVAILABLE_PERMISSIONS.map((perm) => (
                  <div key={perm} className="flex items-center space-x-2">
                    <Checkbox id={`perm-${perm}`} checked={formData.permissions.includes(perm)} onCheckedChange={() => handlePermissionChange(perm)} />
                    <label htmlFor={`perm-${perm}`} className="text-xs font-medium cursor-pointer uppercase">{perm.replace('.', ' ')}</label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="couleur">Couleur d'identification</Label>
              <div className="flex gap-2">
                <Input id="couleur" type="color" value={formData.couleur} onChange={(e) => setFormData({ ...formData, couleur: e.target.value })} className="w-16 h-10 p-1" />
                <Input type="text" value={formData.couleur} onChange={(e) => setFormData({ ...formData, couleur: e.target.value })} className="flex-1 font-mono text-xs" />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
              <Button type="submit" className="bg-primary hover:bg-primary-dark">{editingRole ? 'Mettre à jour' : 'Créer le rôle'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CONFIRMATION DE SUPPRESSION (AU MILIEU) */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] text-center p-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl text-center font-space-grotesk">Supprimer le rôle ?</DialogTitle>
              <DialogDescription className="text-center">
                Êtes-vous sûr de vouloir supprimer le rôle <span className="font-bold text-foreground">"{roleToDelete?.nom}"</span> ? 
                Cette action est irréversible et pourrait affecter les accès des utilisateurs associés.
              </DialogDescription>
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

export default Roles;