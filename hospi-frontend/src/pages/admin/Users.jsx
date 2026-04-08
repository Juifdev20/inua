import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, Search, Filter, MoreVertical, Edit, Trash2, UserPlus,
  Mail, Phone, Calendar, CheckCircle, XCircle, AlertTriangle,
  Key, ShieldCheck, UserCheck, UserMinus
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';

// ✅ Configuration environnementale centralisée
import { BACKEND_URL } from '../../config/environment.js';
const API_BASE_URL = BACKEND_URL;

// ✅ Rôles complets synchronisés avec Spring Security et la BDD
const ALL_ROLES = [
  { id: 1, nom: 'ROLE_ADMIN', label: 'Administrateur', description: 'Accès complet au système' },
  { id: 2, nom: 'ROLE_DOCTEUR', label: 'Médecin', description: 'Consultations et prescriptions' },
  { id: 3, nom: 'ROLE_PATIENT', label: 'Patient', description: 'Prise de rendez-vous' },
  { id: 4, nom: 'ROLE_RECEPTION', label: 'Réception', description: 'Gestion des admissions' },
  { id: 5, nom: 'ROLE_FINANCE', label: 'Finance', description: 'Gestion des factures' },
  { id: 6, nom: 'ROLE_CAISSIER', label: 'Caissier', description: 'Encaissements' },
  { id: 7, nom: 'ROLE_PHARMACIE', label: 'Pharmacie', description: 'Gestion des médicaments' },
  { id: 8, nom: 'ROLE_PHARMACIST', label: 'Pharmacien', description: 'Dispensation médicaments' },
  { id: 9, nom: 'ROLE_LABORATOIRE', label: 'Laboratoire', description: 'Analyses médicales' },
  { id: 10, nom: 'ROLE_INFIRMIER', label: 'Infirmier', description: 'Soins infirmiers' }
];

const Users = () => {
  const [users, setUsers] = useState([]);
  const [realDepartments, setRealDepartments] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [userToReset, setUserToReset] = useState(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  
  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    role: 'ROLE_PATIENT',
    department: '',
    status: 'actif'
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const [userRes, deptRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/users/all`, config),
        axios.get(`${API_BASE_URL}/api/admin/departments/all`, config)
      ]);
      
      console.log('📊 Users response:', userRes.status, userRes.data);
      console.log('📊 Departments response:', deptRes.status, deptRes.data);

      if (userRes.data) {
        const payload = userRes.data;
        const list = Array.isArray(payload) ? payload : (payload.content || []);
        setUsers(list);
      }
      if (deptRes.data) {
        const payload = deptRes.data;
        const list = Array.isArray(payload) ? payload : (payload.content || []);
        setRealDepartments(list);
      }
    } catch (error) {
      console.error('❌ Erreur fetchInitialData:', error);
      console.error('❌ Status:', error.response?.status);
      console.error('❌ Data:', error.response?.data);
      console.error('❌ URL appelée:', `${API_BASE_URL}/api/admin/users/all`);
      
      if (error.response?.status === 500) {
        toast.error("Erreur serveur 500 - Vérifiez les logs du backend");
      } else if (error.response?.status === 401) {
        toast.error("Non autorisé - Reconnectez-vous");
      } else if (error.response?.status === 403) {
        toast.error("Accès refusé - Permissions insuffisantes");
      } else {
        toast.error(`Erreur de chargement: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const response = await axios.get(`${API_BASE_URL}/api/admin/users/all`, config);
    const payload = response.data;
    const list = Array.isArray(payload) ? payload : (payload.content || []);
    setUsers(list);
  };

  const filteredUsers = (users || []).filter(user => {
    const matchesSearch = 
      (user.lastName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const userRoleName = typeof user.role === 'object' ? user.role?.nom : user.role;
    const matchesRole = roleFilter === 'all' || userRoleName === roleFilter;
    const matchesStatus = statusFilter === 'all' || (user.isActive ? 'actif' : 'inactif') === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleOpenDialog = (user = null) => {
    setFormErrors({}); 
    if (user) {
      setEditingUser(user);
      
      const roleVal = typeof user.role === 'object' ? user.role?.nom : user.role;
      const deptData = user.departement || user.department;
      const deptVal = typeof deptData === 'object' ? deptData?.nom : (deptData || '');

      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        role: roleVal || 'ROLE_PATIENT',
        department: deptVal,
        status: user.isActive ? 'actif' : 'inactif'
      });
    } else {
      setEditingUser(null);
      setFormData({
        firstName: '', lastName: '', email: '', phoneNumber: '',
        role: 'ROLE_PATIENT', department: '', status: 'actif'
      });
    }
    setIsDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!userToReset) return;
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_BASE_URL}/api/admin/users/${userToReset.id}/reset-password`, {}, config);
      toast.success(`Mot de passe de ${userToReset.firstName} réinitialisé avec succès`);
      setIsResetDialogOpen(false);
    } catch (error) {
      toast.error("Erreur lors de la réinitialisation");
    }
  };

  const validateForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.firstName.trim()) errors.firstName = "Le prénom est requis";
    if (!formData.lastName.trim()) errors.lastName = "Le nom est requis";
    if (!emailRegex.test(formData.email)) errors.email = "Format d'email invalide";
    
    if (formData.role !== 'ROLE_PATIENT' && !formData.department) {
      errors.department = "Veuillez choisir un département";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    
    const dataToSend = {
      ...formData,
      departement: formData.department,
      department: formData.department,
      role: formData.role, // Déjà en Majuscules via ALL_ROLES
      isActive: formData.status === 'actif',
      username: formData.email
    };
    
    try {
      console.log('🔧 Création/Modification utilisateur:', { editingUser: editingUser?.id, dataToSend });
      console.log('🔧 URL:', editingUser ? `${API_BASE_URL}/api/admin/users/${editingUser.id}` : `${API_BASE_URL}/api/admin/users/create`);
      
      if (editingUser) {
        const response = await axios.put(`${API_BASE_URL}/api/admin/users/${editingUser.id}`, dataToSend, config);
        console.log('✅ Modification réussie:', response.data);
        toast.success('Utilisateur modifié');
      } else {
        const response = await axios.post(`${API_BASE_URL}/api/admin/users/create`, { ...dataToSend, password: "DefaultPassword123!" }, config);
        console.log('✅ Création réussie:', response.data);
        toast.success('Utilisateur créé avec succès');
      }
      fetchUsers();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('❌ Erreur création/modification utilisateur:', error);
      console.error('❌ Status:', error.response?.status);
      console.error('❌ Data:', error.response?.data);
      
      if (error.response?.status === 409) {
        setFormErrors({ email: "Cet email est déjà utilisé" });
      } else if (error.response?.status === 500) {
        toast.error("Erreur serveur - Vérifiez les logs du backend");
      } else if (error.response?.status === 403) {
        toast.error("Accès refusé - Permissions insuffisantes");
      } else {
        toast.error(`Erreur: ${error.message}`);
      }
    }
  };

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/admin/users/${userToDelete.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setUsers(users.filter(u => u.id !== userToDelete.id));
      toast.success('Utilisateur supprimé');
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  // ✅ CORRECTION : Couleurs adaptées aux nouveaux noms ROLE_
  const getRoleBadgeColor = (role) => {
    const roleName = typeof role === 'object' ? role?.nom : role;
    const colors = {
      'ROLE_ADMIN': 'bg-secondary/10 text-secondary border-secondary/20',
      'ROLE_DOCTEUR': 'bg-primary/10 text-primary border-primary/20',
      'ROLE_RH': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      'ROLE_PATIENT': 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    };
    return colors[roleName] || 'bg-muted text-muted-foreground';
  };

  if (loading) return <div className="p-10 text-center font-space-grotesk">Chargement des données...</div>;

  return (
    <div className="space-y-6 font-space-grotesk">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestion des Utilisateurs</h1>
          <p className="text-muted-foreground">Administrez les accès et la sécurité du système</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-primary gap-2 shadow-lg">
          <UserPlus className="w-4 h-4" /> Nouvel Utilisateur
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger><SelectValue placeholder="Rôle" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                {ALL_ROLES.map(r => <SelectItem key={r.id} value={r.nom}>{r.nom}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="actif">Actif</SelectItem>
                <SelectItem value="inactif">Inactif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Liste des Utilisateurs</span>
            <Badge variant="secondary">{filteredUsers.length} membres</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom Complet</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Département</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1"><Mail className="w-3 h-3"/> {user.email}</div>
                        <div className="flex items-center gap-1"><Phone className="w-3 h-3"/> {user.phoneNumber || '-'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {typeof (user.departement || user.department) === 'object' 
                          ? (user.departement || user.department)?.nom 
                          : (user.departement || user.department || "Aucun")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                        {typeof user.role === 'object' ? user.role?.nom : user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={user.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}>
                        {user.isActive ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                        {user.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuLabel>Options de gestion</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleOpenDialog(user)}>
                            <Edit className="w-4 h-4 mr-2" /> Modifier profil / Statut
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem 
                            onClick={() => { setUserToReset(user); setIsResetDialogOpen(true); }}
                            className="text-amber-600 focus:text-amber-700"
                          >
                            <Key className="w-4 h-4 mr-2" /> Réinitialiser MDP
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => { setUserToDelete(user); setIsDeleteDialogOpen(true); }}
                            className="text-red-600 focus:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Modifier l’utilisateur' : 'Nouvel utilisateur'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prénom</Label>
                <Input value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className={formErrors.firstName ? "border-red-500" : ""} />
              </div>
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className={formErrors.lastName ? "border-red-500" : ""} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className={formErrors.email ? "border-red-500" : ""} />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label>Statut du compte</Label>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Autoriser l'accès</p>
              </div>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData({...formData, status: v})}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="actif" className="text-green-600">Actif</SelectItem>
                  <SelectItem value="inactif" className="text-red-600">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ALL_ROLES.map(r => <SelectItem key={r.id} value={r.nom}>{r.nom}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Département</Label>
                <Select value={formData.department} onValueChange={(v) => setFormData({...formData, department: v})}>
                  <SelectTrigger className={formErrors.department ? "border-red-500" : ""}>
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    {realDepartments.length > 0 ? (
                      realDepartments.map(d => (
                        <SelectItem key={d.id} value={d.nom}>{d.nom}</SelectItem>
                      ))
                    ) : (
                      <SelectItem disabled>Aucun département en SQL</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
              <Button type="submit">Enregistrer les modifications</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <ShieldCheck className="w-5 h-5" /> Sécurité Compte
            </DialogTitle>
            <DialogDescription className="py-3">
              Réinitialiser le mot de passe pour <strong>{userToReset?.firstName}</strong> ? 
              L'admin va générer un nouveau mot de passe sécurisé pour l'utilisateur.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetDialogOpen(false)}>Annuler</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleResetPassword}>Confirmer la réinitialisation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> Attention</DialogTitle>
            <DialogDescription className="py-3">Action irréversible pour le compte de {userToDelete?.lastName}.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Annuler</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={confirmDelete}>Supprimer définitivement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;