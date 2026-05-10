// Mock data for the admin interface

// Users mock data
export const mockUsers = [
  {
    id: '1',
    nom: 'Kabongo',
    prenom: 'Jean',
    email: 'j.kabongo@inuaafia.com',
    telephone: '+243 900 123 456',
    role: 'DOCTEUR',
    departement: 'Cardiologie',
    statut: 'actif',
    dateCreation: '2024-01-15',
    derniereConnexion: '2024-03-20 10:30'
  },
  {
    id: '2',
    nom: 'Mulamba',
    prenom: 'Marie',
    email: 'm.mulamba@inuaafia.com',
    telephone: '+243 900 234 567',
    role: 'RECEPTION',
    departement: 'Accueil',
    statut: 'actif',
    dateCreation: '2024-01-20',
    derniereConnexion: '2024-03-21 08:15'
  },
  {
    id: '3',
    nom: 'Tshombe',
    prenom: 'Patrick',
    email: 'p.tshombe@inuaafia.com',
    telephone: '+243 900 345 678',
    role: 'PHARMACIE',
    departement: 'Pharmacie',
    statut: 'actif',
    dateCreation: '2024-02-01',
    derniereConnexion: '2024-03-21 09:00'
  },
  {
    id: '4',
    nom: 'Kalonji',
    prenom: 'Grace',
    email: 'g.kalonji@inuaafia.com',
    telephone: '+243 900 456 789',
    role: 'LABORATOIRE',
    departement: 'Laboratoire',
    statut: 'actif',
    dateCreation: '2024-02-05',
    derniereConnexion: '2024-03-20 16:45'
  },
  {
    id: '5',
    nom: 'Mbala',
    prenom: 'Joseph',
    email: 'j.mbala@inuaafia.com',
    telephone: '+243 900 567 890',
    role: 'FINANCE',
    departement: 'Finance',
    statut: 'actif',
    dateCreation: '2024-02-10',
    derniereConnexion: '2024-03-21 07:30'
  },
  {
    id: '6',
    nom: 'Nzuzi',
    prenom: 'Sarah',
    email: 's.nzuzi@inuaafia.com',
    telephone: '+243 900 678 901',
    role: 'DOCTEUR',
    departement: 'Pédiatrie',
    statut: 'inactif',
    dateCreation: '2024-02-15',
    derniereConnexion: '2024-03-10 14:20'
  },
  {
    id: '7',
    nom: 'Lukeni',
    prenom: 'David',
    email: 'd.lukeni@inuaafia.com',
    telephone: '+243 900 789 012',
    role: 'PATIENT',
    departement: null,
    statut: 'actif',
    dateCreation: '2024-03-01',
    derniereConnexion: '2024-03-21 11:00'
  },
  {
    id: '8',
    nom: 'Mpiana',
    prenom: 'Claire',
    email: 'c.mpiana@inuaafia.com',
    telephone: '+243 900 890 123',
    role: 'DOCTEUR',
    departement: 'Chirurgie',
    statut: 'actif',
    dateCreation: '2024-03-05',
    derniereConnexion: '2024-03-21 09:45'
  }
];

// Roles mock data
export const mockRoles = [
  {
    id: '1',
    nom: 'ADMIN',
    description: 'Administrateur système avec accès complet',
    permissions: ['all'],
    utilisateursCount: 2,
    couleur: '#3E7BFF'
  },
  {
    id: '2',
    nom: 'DOCTEUR',
    description: 'Médecin avec accès aux dossiers patients',
    permissions: ['patients.read', 'patients.write', 'consultations.all'],
    utilisateursCount: 15,
    couleur: '#40E070'
  },
  {
    id: '3',
    nom: 'PATIENT',
    description: 'Patient avec accès à son dossier médical',
    permissions: ['profil.read', 'rendez-vous.create'],
    utilisateursCount: 230,
    couleur: '#10B981'
  },
  {
    id: '4',
    nom: 'RECEPTION',
    description: 'Réceptionniste gérant les rendez-vous',
    permissions: ['rendez-vous.all', 'patients.read'],
    utilisateursCount: 8,
    couleur: '#F59E0B'
  },
  {
    id: '5',
    nom: 'PHARMACIE',
    description: 'Pharmacien gérant les médicaments',
    permissions: ['medicaments.all', 'ordonnances.read'],
    utilisateursCount: 6,
    couleur: '#8B5CF6'
  },
  {
    id: '6',
    nom: 'LABORATOIRE',
    description: 'Technicien de laboratoire',
    permissions: ['examens.all', 'resultats.write'],
    utilisateursCount: 5,
    couleur: '#EC4899'
  },
  {
    id: '7',
    nom: 'FINANCE',
    description: 'Gestionnaire financier',
    permissions: ['factures.all', 'paiements.all', 'rapports.finance'],
    utilisateursCount: 3,
    couleur: '#14B8A6'
  }
];

// Services mock data
export const mockServices = [
  {
    id: '1',
    nom: 'Consultation Générale',
    description: 'Consultation médicale générale',
    prix: 50,
    duree: 30,
    departement: 'Médecine Générale',
    actif: true
  },
  {
    id: '2',
    nom: 'Consultation Spécialisée',
    description: 'Consultation avec un médecin spécialiste',
    prix: 100,
    duree: 45,
    departement: 'Cardiologie',
    actif: true
  },
  {
    id: '3',
    nom: 'Échographie',
    description: 'Examen échographique',
    prix: 80,
    duree: 30,
    departement: 'Imagerie',
    actif: true
  },
  {
    id: '4',
    nom: 'Analyse Sanguine',
    description: 'Analyse de sang complète',
    prix: 30,
    duree: 15,
    departement: 'Laboratoire',
    actif: true
  },
  {
    id: '5',
    nom: 'Radiographie',
    description: 'Examen radiographique',
    prix: 60,
    duree: 20,
    departement: 'Imagerie',
    actif: true
  },
  {
    id: '6',
    nom: 'Vaccination',
    description: 'Administration de vaccins',
    prix: 25,
    duree: 15,
    departement: 'Pédiatrie',
    actif: false
  }
];

// Departments mock data
export const mockDepartments = [
  {
    id: '1',
    nom: 'Cardiologie',
    description: 'Spécialité médicale traitant les maladies cardiaques',
    chef: 'Dr. Jean Kabongo',
    nombrePersonnel: 12,
    nombreLits: 25,
    etage: '2ème étage',
    telephone: '+243 900 100 001',
    actif: true
  },
  {
    id: '2',
    nom: 'Pédiatrie',
    description: 'Spécialité médicale pour les enfants',
    chef: 'Dr. Sarah Nzuzi',
    nombrePersonnel: 18,
    nombreLits: 30,
    etage: '1er étage',
    telephone: '+243 900 100 002',
    actif: true
  },
  {
    id: '3',
    nom: 'Chirurgie',
    description: 'Département des interventions chirurgicales',
    chef: 'Dr. Claire Mpiana',
    nombrePersonnel: 25,
    nombreLits: 20,
    etage: '3ème étage',
    telephone: '+243 900 100 003',
    actif: true
  },
  {
    id: '4',
    nom: 'Médecine Générale',
    description: 'Consultations médicales générales',
    chef: 'Dr. Paul Mukendi',
    nombrePersonnel: 15,
    nombreLits: 0,
    etage: 'Rez-de-chaussée',
    telephone: '+243 900 100 004',
    actif: true
  },
  {
    id: '5',
    nom: 'Imagerie',
    description: 'Radiologie et échographie',
    chef: 'Dr. Marie Kasongo',
    nombrePersonnel: 8,
    nombreLits: 0,
    etage: 'Sous-sol',
    telephone: '+243 900 100 005',
    actif: true
  },
  {
    id: '6',
    nom: 'Laboratoire',
    description: 'Analyses médicales',
    chef: 'Dr. Grace Kalonji',
    nombrePersonnel: 10,
    nombreLits: 0,
    etage: 'Sous-sol',
    telephone: '+243 900 100 006',
    actif: true
  },
  {
    id: '7',
    nom: 'Pharmacie',
    description: 'Distribution des médicaments',
    chef: 'Patrick Tshombe',
    nombrePersonnel: 6,
    nombreLits: 0,
    etage: 'Rez-de-chaussée',
    telephone: '+243 900 100 007',
    actif: true
  },
  {
    id: '8',
    nom: 'Urgences',
    description: 'Service des urgences médicales',
    chef: 'Dr. Emmanuel Mukendi',
    nombrePersonnel: 20,
    nombreLits: 15,
    etage: 'Rez-de-chaussée',
    telephone: '+243 900 100 008',
    actif: true
  }
];

// Audit logs mock data
export const mockAuditLogs = [
  {
    id: '1',
    action: 'Création utilisateur',
    utilisateur: 'Admin Système',
    cible: 'Claire Mpiana',
    details: 'Nouveau docteur ajouté au département Chirurgie',
    date: '2024-03-21 09:45:23',
    type: 'success',
    ip: '192.168.1.10'
  },
  {
    id: '2',
    action: 'Modification rôle',
    utilisateur: 'Admin Système',
    cible: 'Jean Kabongo',
    details: 'Permissions mises à jour pour DOCTEUR',
    date: '2024-03-21 08:30:15',
    type: 'info',
    ip: '192.168.1.10'
  },
  {
    id: '3',
    action: 'Suppression service',
    utilisateur: 'Admin Système',
    cible: 'Consultation domicile',
    details: 'Service temporairement désactivé',
    date: '2024-03-20 16:20:45',
    type: 'warning',
    ip: '192.168.1.10'
  },
  {
    id: '4',
    action: 'Tentative connexion échouée',
    utilisateur: 'Inconnu',
    cible: 'admin@inuaafia.com',
    details: 'Mot de passe incorrect - 3 tentatives',
    date: '2024-03-20 14:15:32',
    type: 'error',
    ip: '45.123.67.89'
  },
  {
    id: '5',
    action: 'Modification département',
    utilisateur: 'Admin Système',
    cible: 'Cardiologie',
    details: 'Chef de département modifié',
    date: '2024-03-20 10:05:12',
    type: 'info',
    ip: '192.168.1.10'
  }
];

// Dashboard stats
export const dashboardStats = {
  utilisateursTotal: 269,
  docteurs: 15,
  patients: 230,
  departements: 8,
  servicesActifs: 24,
  consultationsAujourdhui: 47,
  nouveauxPatients: 12,
  tauxOccupation: 78
};

// Chart data for dashboard
export const chartData = {
  consultationsParMois: [
    { mois: 'Jan', consultations: 245 },
    { mois: 'Fév', consultations: 312 },
    { mois: 'Mar', consultations: 289 },
    { mois: 'Avr', consultations: 356 },
    { mois: 'Mai', consultations: 423 },
    { mois: 'Juin', consultations: 398 }
  ],
  patientsParDepartement: [
    { nom: 'Cardiologie', valeur: 45 },
    { nom: 'Pédiatrie', valeur: 62 },
    { nom: 'Chirurgie', valeur: 38 },
    { nom: 'Médecine Générale', valeur: 78 },
    { nom: 'Urgences', valeur: 52 }
  ],
  revenuMensuel: [
    { mois: 'Jan', revenu: 125000 },
    { mois: 'Fév', revenu: 145000 },
    { mois: 'Mar', revenu: 138000 },
    { mois: 'Avr', revenu: 162000 },
    { mois: 'Mai', revenu: 178000 },
    { mois: 'Juin', revenu: 165000 }
  ]
};
