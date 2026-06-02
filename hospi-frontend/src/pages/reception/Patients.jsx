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
  DialogFooter,
  DialogDescription
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
import { usePatientsOffline } from '../../hooks/offline';
// ★ IMPORTS POUR LA CRÉATION AUTOMATIQUE DE COMPTES
import accountCreationApi from '../../services/accountCreationApi';
import SuccessAccountModal from '../../components/auth/SuccessAccountModal';
import { 
  Plus, Search, Edit, Trash2, Phone, Mail, User, 
  Fingerprint, AlertTriangle, Archive, RotateCcw, Camera, X, Printer,
  Key // ★ Icône pour créer un compte
} from 'lucide-react';
import { toast } from 'sonner';

// --- CONFIGURATION URL BACKEND ---
const BACKEND_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080');

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
  let fileName = photoPath;
  if (fileName.startsWith('/')) fileName = fileName.slice(1);
  const folder = fileName.includes('patient_') ? 'patients' : 'profiles';
  return `${BACKEND_URL}/uploads/${folder}/${fileName}`;
};

/**
 * ★ VERSION INTÉGRÉE AVEC CRÉATION AUTOMATIQUE DE COMPTES PATIENTS
 */
const PatientsIntegrated = () => {
  const { theme } = useTheme();
  const { getPatients, searchPatients, createPatient, updatePatient, isOnline } = usePatientsOffline();
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  
  // États pour les dialogues
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  // ★ ÉTATS POUR LA CRÉATION DE COMPTE
  const [createAccountDialogOpen, setCreateAccountDialogOpen] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  
  // États pour la caméra et photo
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraInitialized, setIsCameraInitialized] = useState(false);
  
  // États pour l'édition
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    idNumber: '',
    dateOfBirth: '',
    address: '',
    emergencyContact: '',
    bloodType: '',
    allergies: '',
    photoUrl: ''
  });

  useEffect(() => {
    fetchPatients();
  }, [showArchived]);

  useEffect(() => {
    filterPatients();
  }, [searchTerm, patients]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const result = await getPatients(0, 500);
      const data = result.data || [];
      const activePatients = data.filter(p => p.isArchived === showArchived);
      setPatients(activePatients);
      
      if (!isOnline) {
        toast.info('Mode hors ligne : données locales chargées');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des patients:', error);
      toast.error('Erreur lors du chargement des patients');
    } finally {
      setLoading(false);
    }
  };

  const filterPatients = async () => {
    if (!searchTerm.trim()) {
      setFilteredPatients(patients);
      return;
    }
    
    try {
      const result = await searchPatients(searchTerm);
      const filtered = result.data || [];
      setFilteredPatients(filtered);
      
      if (!isOnline) {
        toast.info('Recherche locale effectuée');
      }
    } catch (error) {
      console.error('Erreur recherche patients:', error);
      // Fallback sur la recherche locale si l'API échoue
      const term = searchTerm.toLowerCase();
      const filtered = patients.filter(patient => 
        (patient.firstName?.toLowerCase().includes(term)) ||
        (patient.lastName?.toLowerCase().includes(term)) ||
        (patient.email?.toLowerCase().includes(term)) ||
        (patient.phone?.includes(term)) ||
        (patient.idNumber?.includes(term))
      );
      setFilteredPatients(filtered);
    }
  };

  // ★ FONCTION POUR CRÉER UN COMPTE PATIENT
  const handleCreateAccount = async () => {
    if (!selectedPatient) return;
    
    try {
      setCreatingAccount(true);
      
      // Appel à l'API de création de compte patient
      const response = await accountCreationApi.createPatientAccount(selectedPatient.id);
      
      if (response.success) {
        // Afficher la modale avec les credentials
        setGeneratedCredentials({
          username: response.username,
          generatedPassword: response.generatedPassword,
          patient: response.patient
        });
        setCreateAccountDialogOpen(false);
        setShowSuccessModal(true);
        
        toast.success(`Compte créé pour ${selectedPatient.firstName} ${selectedPatient.lastName}`);
        
        // Rafraîchir la liste pour mettre à jour le statut
        fetchPatients();
      }
    } catch (error) {
      console.error('Erreur création compte:', error);
      
      // Gestion des erreurs spécifiques
      if (error.response?.data?.error?.includes('déjà un compte')) {
        toast.warning('Ce patient a déjà un compte utilisateur');
      } else {
        toast.error(error.response?.data?.error || 'Erreur lors de la création du compte');
      }
    } finally {
      setCreatingAccount(false);
      setSelectedPatient(null);
    }
  };

  // ... (toutes les autres fonctions existantes : handleDelete, handleArchive, etc.)

  const handleDelete = async () => {
    if (!selectedPatient) return;
    try {
      await patientService.deletePatient(selectedPatient.id);
      toast.success('Patient supprimé avec succès');
      fetchPatients();
      setDeleteDialogOpen(false);
      setSelectedPatient(null);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression du patient');
    }
  };

  const handleArchive = async () => {
    if (!selectedPatient) return;
    try {
      await patientService.archivePatient(selectedPatient.id);
      toast.success('Patient archivé avec succès');
      fetchPatients();
      setArchiveDialogOpen(false);
      setSelectedPatient(null);
    } catch (error) {
      console.error('Erreur lors de l\'archivage:', error);
      toast.error('Erreur lors de l\'archivage du patient');
    }
  };

  const handleRestore = async () => {
    if (!selectedPatient) return;
    try {
      await patientService.restorePatient(selectedPatient.id);
      toast.success('Patient restauré avec succès');
      fetchPatients();
      setRestoreDialogOpen(false);
      setSelectedPatient(null);
    } catch (error) {
      console.error('Erreur lors de la restauration:', error);
      toast.error('Erreur lors de la restauration du patient');
    }
  };

  const openCreateAccountDialog = (patient, e) => {
    e.stopPropagation();
    setSelectedPatient(patient);
    setCreateAccountDialogOpen(true);
  };

  // Rendu du tableau avec bouton de création de compte
  const renderPatientRow = (patient) => (
    <tr 
      key={patient.id} 
      className={`border-b hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
        patient.isArchived ? 'opacity-60' : ''
      }`}
      onClick={() => window.location.href = `/reception/patients/${patient.id}`}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
            {patient.photoUrl ? (
              <img 
                src={resolvePhotoUrl(patient.photoUrl)} 
                alt={`${patient.firstName} ${patient.lastName}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                <User className="w-5 h-5" />
              </div>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {patient.firstName} {patient.lastName}
            </p>
            {patient.idNumber && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Fingerprint className="w-3 h-3" />
                {patient.idNumber}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
        <div className="space-y-1">
          {patient.email && (
            <div className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {patient.email}
            </div>
          )}
          {patient.phone && (
            <div className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {patient.phone}
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
        {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('fr-FR') : '-'}
      </td>
      <td className="px-4 py-3">
        {/* ★ STATUT DU COMPTE */}
        <span className={`px-2 py-1 text-xs rounded-full ${
          patient.userId 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
        }`}>
          {patient.userId ? 'Compte actif' : 'Sans compte'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          {/* ★ BOUTON CRÉER COMPTE (si pas encore de compte) */}
          {!patient.userId && !patient.isArchived && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => openCreateAccountDialog(patient, e)}
              title="Créer un compte pour ce patient"
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
            >
              <Key className="w-4 h-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = `/reception/patients/${patient.id}`;
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          
          {!patient.isArchived ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPatient(patient);
                  setArchiveDialogOpen(true);
                }}
              >
                <Archive className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPatient(patient);
                  setDeleteDialogOpen(true);
                }}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPatient(patient);
                setRestoreDialogOpen(true);
              }}
              className="text-green-600 hover:text-green-800"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestion des Patients
          </h1>
          <p className="text-gray-500 mt-1">
            {showArchived ? 'Patients archivés' : 'Liste des patients actifs'}
            {filteredPatients.length > 0 && ` (${filteredPatients.length})`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? 'Patients actifs' : 'Archives'}
          </Button>
          <Button onClick={() => window.location.href = '/reception/new-patient'}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau patient
          </Button>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher par nom, email, téléphone ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tableau des patients */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Patient</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Contact</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Né(e) le</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Compte</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                  Chargement...
                </td>
              </tr>
            ) : filteredPatients.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                  {searchTerm ? 'Aucun patient trouvé' : 'Aucun patient'}
                </td>
              </tr>
            ) : (
              filteredPatients.map(renderPatientRow)
            )}
          </tbody>
        </table>
      </div>

      {/* ★ DIALOGUE CONFIRMATION CRÉATION DE COMPTE */}
      <Dialog open={createAccountDialogOpen} onOpenChange={setCreateAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un compte pour ce patient ?</DialogTitle>
            <DialogDescription>
              Un identifiant et un mot de passe temporaire seront générés automatiquement pour{' '}
              <strong>{selectedPatient?.firstName} {selectedPatient?.lastName}</strong>.
              <br /><br />
              Le patient devra changer son mot de passe lors de sa première connexion.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateAccountDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleCreateAccount} 
              disabled={creatingAccount}
              className="gap-2"
            >
              {creatingAccount ? (
                <>Création...</>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Créer le compte
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ★ MODALE DE SUCCÈS AVEC IDENTIFIANTS GÉNÉRÉS */}
      <SuccessAccountModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        credentials={generatedCredentials}
        userType="patient"
      />

      {/* Dialogues existants (delete, archive, restore) */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement le patient{' '}
              <strong>{selectedPatient?.firstName} {selectedPatient?.lastName}</strong> ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'archivage</AlertDialogTitle>
            <AlertDialogDescription>
              Archiver le patient <strong>{selectedPatient?.firstName} {selectedPatient?.lastName}</strong> ?
              Le patient sera désactivé mais pas supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setArchiveDialogOpen(false)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>
              Archiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurer le patient</AlertDialogTitle>
            <AlertDialogDescription>
              Restaurer <strong>{selectedPatient?.firstName} {selectedPatient?.lastName}</strong> ?
              Le patient sera réactivé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRestoreDialogOpen(false)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} className="bg-green-600 hover:bg-green-700">
              Restaurer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PatientsIntegrated;
