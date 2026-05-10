// Mock data for patient interface demonstration

export const mockPatient = {
  id: 'P001',
  firstName: 'Jean',
  lastName: 'Dupont',
  email: 'jean.dupont@email.com',
  phone: '+33 6 12 34 56 78',
  dateOfBirth: '1985-05-15',
  address: '123 Rue de la Santé, 75013 Paris',
  bloodType: 'A+',
  avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80',
};

export const mockNotifications = [
  {
    id: 'N001',
    type: 'appointment',
    title: 'Rendez-vous confirmé',
    message: 'Votre rendez-vous avec Dr. Martin a été confirmé pour le 15 janvier 2026 à 10:00',
    date: '2026-01-10T14:30:00',
    read: false,
    icon: 'calendar',
  },
  {
    id: 'N002',
    type: 'document',
    title: 'Nouveau document disponible',
    message: 'Vos résultats d\'analyses sont maintenant disponibles',
    date: '2026-01-09T09:15:00',
    read: false,
    icon: 'file',
  },
  {
    id: 'N003',
    type: 'billing',
    title: 'Facture payée',
    message: 'Votre paiement de 85.00 € a été reçu avec succès',
    date: '2026-01-08T16:45:00',
    read: true,
    icon: 'credit-card',
  },
  {
    id: 'N004',
    type: 'reminder',
    title: 'Rappel de rendez-vous',
    message: 'N\'oubliez pas votre rendez-vous demain à 10:00',
    date: '2026-01-07T08:00:00',
    read: true,
    icon: 'bell',
  },
];

export const mockAppointments = [
  {
    id: 'A001',
    doctor: 'Dr. Sophie Martin',
    specialty: 'Cardiologie',
    date: '2026-01-15',
    time: '10:00',
    status: 'confirmed',
    location: 'Cabinet Principal - 2ème étage',
    reason: 'Consultation de suivi',
    doctorAvatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'A002',
    doctor: 'Dr. Marc Dubois',
    specialty: 'Médecine Générale',
    date: '2026-01-20',
    time: '14:30',
    status: 'pending',
    location: 'Cabinet Principal - 1er étage',
    reason: 'Bilan de santé annuel',
    doctorAvatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'A003',
    doctor: 'Dr. Claire Lefèvre',
    specialty: 'Dermatologie',
    date: '2026-01-05',
    time: '11:00',
    status: 'completed',
    location: 'Cabinet Principal - 3ème étage',
    reason: 'Consultation dermatologique',
    doctorAvatar: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'A004',
    doctor: 'Dr. Pierre Bernard',
    specialty: 'Orthopédie',
    date: '2025-12-28',
    time: '09:00',
    status: 'cancelled',
    location: 'Cabinet Principal - 2ème étage',
    reason: 'Douleur au genou',
    doctorAvatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80',
  },
];

export const mockDocuments = [
  {
    id: 'D001',
    type: 'Analyses',
    title: 'Résultats d\'analyses sanguines',
    date: '2026-01-08',
    size: '245 KB',
    doctor: 'Dr. Sophie Martin',
    category: 'lab',
    url: '#',
  },
  {
    id: 'D002',
    type: 'Ordonnance',
    title: 'Ordonnance - Traitement cardiaque',
    date: '2026-01-05',
    size: '180 KB',
    doctor: 'Dr. Sophie Martin',
    category: 'prescription',
    url: '#',
  },
  {
    id: 'D003',
    type: 'Imagerie',
    title: 'Radiographie thoracique',
    date: '2025-12-20',
    size: '1.2 MB',
    doctor: 'Dr. Marc Dubois',
    category: 'imaging',
    url: '#',
  },
  {
    id: 'D004',
    type: 'Compte-rendu',
    title: 'Compte-rendu de consultation',
    date: '2025-12-15',
    size: '320 KB',
    doctor: 'Dr. Claire Lefèvre',
    category: 'report',
    url: '#',
  },
];

export const mockBillings = [
  {
    id: 'B001',
    description: 'Consultation Cardiologie',
    date: '2026-01-05',
    amount: 85.0,
    status: 'paid',
    doctor: 'Dr. Sophie Martin',
    paymentMethod: 'Carte bancaire',
    paymentDate: '2026-01-08',
  },
  {
    id: 'B002',
    description: 'Analyses sanguines',
    date: '2026-01-05',
    amount: 45.0,
    status: 'paid',
    doctor: 'Laboratoire Central',
    paymentMethod: 'Carte bancaire',
    paymentDate: '2026-01-08',
  },
  {
    id: 'B003',
    description: 'Consultation Dermatologie',
    date: '2025-12-20',
    amount: 70.0,
    status: 'pending',
    doctor: 'Dr. Claire Lefèvre',
    paymentMethod: null,
    paymentDate: null,
  },
  {
    id: 'B004',
    description: 'Radiographie thoracique',
    date: '2025-12-20',
    amount: 55.0,
    status: 'paid',
    doctor: 'Service Radiologie',
    paymentMethod: 'Carte bancaire',
    paymentDate: '2025-12-22',
  },
];

export const getStatusLabel = (status) => {
  const labels = {
    confirmed: 'Confirmé',
    pending: 'En attente',
    completed: 'Terminé',
    cancelled: 'Annulé',
    paid: 'Payé',
    unpaid: 'Impayé',
  };
  return labels[status] || status;
};

export const getStatusColor = (status) => {
  const colors = {
    confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    pending: 'bg-amber-50 text-amber-700 border-amber-100',
    completed: 'bg-slate-100 text-slate-700 border-slate-200',
    cancelled: 'bg-red-50 text-red-700 border-red-100',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    unpaid: 'bg-amber-50 text-amber-700 border-amber-100',
  };
  return colors[status] || 'bg-slate-100 text-slate-700 border-slate-200';
};