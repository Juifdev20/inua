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
// ★ IMPORTS POUR LA CRÉATION AUTOMATIQUE DE COMPTES
import accountCreationApi from '../../services/accountCreationApi.js';
import SuccessAccountModal from '../../components/auth/SuccessAccountModal.jsx';

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

/**
 * ★ VERSION INTÉGRÉE AVEC CRÉATION AUTOMATIQUE DE COMPTES
 * Remplacez votre Users.jsx par ce fichier pour activer la génération automatique
 */
const UsersIntegrated = () => {
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
  
  // ★ ÉTAT POUR LA MODALE DE SUCCÈS
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  
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
      console.error('❌ Erreur chargement données initiales:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // ★ FONCTION POUR RÉINITIALISER LE FORMULAIRE
  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      role: 'ROLE_PATIENT',
      department: '',
      status: 'actif'
    });
    setFormErrors({});
    setEditingUser(null);
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.firstName?.trim()) {
      errors.firstName = "Le prénom est requis";
    }
    if (!formData.lastName?.trim()) {
      errors.lastName = "Le nom est requis";
    }
    // Email optionnel - validation seulement si fourni
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Format d'email invalide";
    }
    
    if (formData.role !== 'ROLE_PATIENT' && !formData.department) {
      errors.department = "Veuillez choisir un département";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * ★ FONCTION DE CRÉATION/MODIFICATION AVEC GÉNÉRATION AUTOMATIQUE
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // ★ CRÉATION AVEC GÉNÉRATION AUTOMATIQUE DE COMPTE
    if (!editingUser) {
      try {
        setLoading(true);
        
        // Préparer les données pour la création automatique
        const creationData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email || undefined, // Optionnel
          phoneNumber: formData.phoneNumber,
          role: formData.role.replace('ROLE_', ''), // Enlever le préfixe ROLE_
          departement: formData.department
        };

        console.log('🆕 Création utilisateur avec auto-génération:', creationData);

        // ★ APPEL AU NOUVEAU ENDPOINT
        const response = await accountCreationApi.createStaffAccount(creationData);
        
        console.log('✅ Compte créé avec succès:', response);

        if (response.success) {
          // ★ AFFICHER LA MODALE AVEC LES CREDENTIALS GÉNÉRÉS
          setGeneratedCredentials({
            username: response.username,
            generatedPassword: response.generatedPassword,
            user: response.user
          });
          setShowSuccessModal(true);
          
          toast.success('Utilisateur créé avec succès !');
          fetchUsers(); // Rafraîchir la liste
          setIsDialogOpen(false);
          resetForm();
        }
      } catch (error) {
        console.error('❌ Erreur création compte:', error);
        const message = error.response?.data?.error || error.response?.data?.message || 'Erreur serveur';
        toast.error(message);
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // ★ MODIFICATION (ancien endpoint)
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    
    const dataToSend = {
      ...formData,
      departement: formData.department,
      department: formData.department,
      role: formData.role,
      isActive: formData.status === 'actif',
    };
    
    try {
      console.log('🔧 Modification utilisateur:', { editingUser: editingUser?.id, dataToSend });
      
      const response = await axios.put(`${API_BASE_URL}/api/admin/users/${editingUser.id}`, dataToSend, config);
      console.log('✅ Modification réussie:', response.data);
      toast.success('Utilisateur modifié');
      fetchUsers();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('❌ Erreur modification utilisateur:', error);
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

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API_BASE_URL}/api/admin/users/all`, config);
      
      if (response.data) {
        const payload = response.data;
        const list = Array.isArray(payload) ? payload : (payload.content || []);
        setUsers(list);
      }
    } catch (error) {
      console.error('❌ Erreur chargement utilisateurs:', error);
    }
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        role: user.role?.nom || 'ROLE_PATIENT',
        department: user.department || user.service || '',
        status: user.isActive ? 'actif' : 'inactif'
      });
    } else {
      resetForm();
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

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/admin/users/${userToDelete.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setUsers(users.filter(u => u.id !== userToDelete.id));
      toast.success('Utilisateur supprimé');
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  // ... (le reste du rendu avec la liste des utilisateurs)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Utilisateurs</h1>
          <p className="text-gray-500 mt-1">
            Gestion des comptes avec création automatique d'identifiants
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <UserPlus className="w-4 h-4" /> Nouvel Utilisateur
        </Button>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tous les rôles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                {ALL_ROLES.map(role => (
                  <SelectItem key={role.id} value={role.nom}>{role.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des utilisateurs */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Aucun utilisateur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-sm text-gray-500">@{user.username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role?.nom === 'ROLE_ADMIN' ? 'default' : 'secondary'}>
                        {ALL_ROLES.find(r => r.nom === user.role?.nom)?.label || user.role?.nom}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {user.email && <p>{user.email}</p>}
                        {user.phoneNumber && <p className="text-gray-500">{user.phoneNumber}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'default' : 'destructive'}>
                        {user.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(user)}>
                            <Edit className="w-4 h-4 mr-2" /> Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setUserToReset(user); setIsResetDialogOpen(true); }}>
                            <Key className="w-4 h-4 mr-2" /> Réinit. mot de passe
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => { setUserToDelete(user); setIsDeleteDialogOpen(true); }}
                            className="text-red-600"
                          >
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
        </CardContent>
      </Card>

      {/* Dialogue Création/Modification */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
            </DialogTitle>
            {!editingUser && (
              <DialogDescription>
                Un identifiant et un mot de passe seront générés automatiquement. L'email est optionnel.
              </DialogDescription>
            )}
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prénom *</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Jean"
                />
                {formErrors.firstName && (
                  <p className="text-xs text-red-500">{formErrors.firstName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Dupont"
                />
                {formErrors.lastName && (
                  <p className="text-xs text-red-500">{formErrors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email (optionnel)</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jean.dupont@example.com"
              />
              {!editingUser && (
                <p className="text-xs text-gray-500">
                  Si non fourni, un email par défaut sera généré automatiquement.
                </p>
              )}
              {formErrors.email && (
                <p className="text-xs text-red-500">{formErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="+243..."
              />
            </div>

            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.filter(r => r.nom !== 'ROLE_PATIENT').map(role => (
                    <SelectItem key={role.id} value={role.nom}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.role !== 'ROLE_PATIENT' && (
              <div className="space-y-2">
                <Label>Département *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un département" />
                  </SelectTrigger>
                  <SelectContent>
                    {realDepartments.map(dept => (
                      <SelectItem key={dept.id} value={dept.nom}>
                        {dept.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.department && (
                  <p className="text-xs text-red-500">{formErrors.department}</p>
                )}
              </div>
            )}

            {editingUser && (
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="inactif">Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Traitement...' : (editingUser ? 'Modifier' : 'Créer')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialogue Suppression */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer l'utilisateur {userToDelete?.firstName} {userToDelete?.lastName} ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Annuler</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={confirmDelete}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue Réinitialisation */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
            <DialogDescription>
              Un nouveau mot de passe sera généré pour {userToReset?.firstName} {userToReset?.lastName}.
              L'utilisateur devra le changer lors de sa prochaine connexion.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleResetPassword}>Réinitialiser</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ★ MODALE DE SUCCÈS AVEC IDENTIFIANTS GÉNÉRÉS */}
      <SuccessAccountModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        credentials={generatedCredentials}
        userType="staff"
      />
    </div>
  );
};

export default UsersIntegrated;
