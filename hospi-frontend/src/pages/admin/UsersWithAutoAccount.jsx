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
import accountCreationApi from '@/services/accountCreationApi';
import SuccessAccountModal from '@/components/auth/SuccessAccountModal';

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
 * ★ EXEMPLE DE PAGE USERS AVEC CRÉATION AUTOMATIQUE DE COMPTES
 * Cette version modifiée utilise accountCreationApi pour créer des comptes
 * avec username et mot de passe auto-générés
 */
const UsersWithAutoAccount = () => {
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

  const validateForm = () => {
    const errors = {};
    
    if (!formData.firstName?.trim()) {
      errors.firstName = "Le prénom est requis";
    }
    if (!formData.lastName?.trim()) {
      errors.lastName = "Le nom est requis";
    }
    // Email optionnel - pas de validation requise
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Format d'email invalide";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * ★ FONCTION DE CRÉATION AVEC GÉNÉRATION AUTOMATIQUE DE COMPTE
   * Utilise accountCreationApi au lieu de l'ancien endpoint
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // ★ POUR LA CRÉATION : Utiliser le nouveau endpoint avec génération automatique
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

    // ★ POUR LA MODIFICATION : Utiliser l'ancien endpoint
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
      const response = await axios.put(
        `${API_BASE_URL}/api/admin/users/${editingUser.id}`, 
        dataToSend, 
        config
      );
      console.log('✅ Modification réussie:', response.data);
      toast.success('Utilisateur modifié');
      fetchUsers();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('❌ Erreur modification:', error);
      toast.error('Erreur lors de la modification');
    }
  };

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

  // ... reste du composant (render, etc.) ...

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Utilisateurs</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gestion des comptes utilisateurs avec création automatique
          </p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvel utilisateur
        </Button>
      </div>

      {/* ... Table et autres éléments ... */}

      {/* ★ MODALE DE SUCCÈS AVEC LES IDENTIFIANTS GÉNÉRÉS */}
      <SuccessAccountModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        credentials={generatedCredentials}
        userType="staff"
      />

      {/* Dialog de création/modification */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur (Auto-génération)'}
            </DialogTitle>
            <DialogDescription>
              {editingUser 
                ? 'Modifiez les informations de l\'utilisateur.'
                : 'Un identifiant et un mot de passe seront générés automatiquement.'
              }
            </DialogDescription>
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
              <p className="text-xs text-gray-500">
                Si non fourni, un email par défaut sera généré
              </p>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Création...' : (editingUser ? 'Modifier' : 'Créer')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersWithAutoAccount;
