import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
// import axios from 'axios'; // ✅ CORRECTION: Supprimé - maintenant on utilise l'instance api sécurisée
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api'; // ✅ CORRECTION: Import default (sans accolades)
import { 
  Search, User, Phone, Mail, Droplet, ChevronRight, Loader2
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';

const Patients = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('all');

  const fetchPatients = useCallback(async () => {
    // ✅ CORRECTION: Vérifier que token existe ET est prêt avant d'appeler l'API
    if (!token || token.trim().length === 0) {
      console.log("⏳ Patients - token non prêt, attente...");
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      // ✅ CORRECTION: Utilisation de l'instance api avec interceptor sécurisé
      // Le header Authorization est ajouté automatiquement par l'interceptor
      const response = await api.get(`${API_URL}/api/v1/doctors/patients`);

      if (response.data) {
        setPatients(response.data);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const calculateAge = (dateInput) => {
    if (!dateInput) return '?';
    try {
      const today = new Date();
      const birthDate = new Date(dateInput);
      if (isNaN(birthDate.getTime())) return '?';
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch (e) { return '?'; }
  };

  const getPhotoUrl = (patient) => {
    const photo = patient.photo || patient.photoUrl;
    if (!photo) return null;
    if (photo.startsWith('http') || photo.startsWith('data:')) return photo;
    
    // ✅ Correction du chemin basée sur votre structure de dossiers réelle
    // Si le nom contient 'patient_', on va dans /uploads/patients/, sinon /uploads/profiles/
    const folder = photo.includes('patient_') ? 'patients' : 'profiles';
    return `${API_URL}/uploads/${folder}/${photo}`;
  };

  const filteredPatients = useMemo(() => {
    return (patients || []).filter(patient => {
      const prenom = patient.prenom || patient.firstName || '';
      const nom = patient.nom || patient.lastName || '';
      const nomComplet = `${prenom} ${nom}`.toLowerCase();
      
      const matricule = (patient.numero_patient || '').toLowerCase();
      const search = searchTerm.toLowerCase();

      const matchesSearch = nomComplet.includes(search) || matricule.includes(search);
      const matchesFilter = filterGroup === 'all' || (patient.groupe_sanguin || patient.bloodType) === filterGroup;
      
      return matchesSearch && matchesFilter;
    });
  }, [patients, searchTerm, filterGroup]);

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
        <div className="space-y-1">
          <h1 className="text-6xl font-black tracking-tighter text-foreground uppercase">
            MES <span className="text-blue-600">PATIENTS</span>
          </h1>
          <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest">
            {filteredPatients.length} Profil(s) répertorié(s)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Nom ou UID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-4 rounded-2xl bg-muted/50 border-none outline-none font-bold text-sm text-foreground focus:ring-2 ring-blue-600/20"
            />
          </div>
          
          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger className="w-full sm:w-[180px] h-[52px] bg-blue-600 text-white border-none rounded-2xl font-black text-xs uppercase tracking-widest">
              <SelectValue placeholder="SANG" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border rounded-xl">
              <SelectItem value="all">TOUS LES GROUPES</SelectItem>
              {bloodGroups.map(group => (
                <SelectItem key={group} value={group}>{group}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-2 border-border bg-card shadow-2xl rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 space-y-6">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
            </div>
          ) : filteredPatients.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Patient</TableHead>
                    <TableHead className="hidden md:table-cell text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contact</TableHead>
                    <TableHead className="hidden lg:table-cell text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Infos Vitales</TableHead>
                    <TableHead className="text-right px-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow 
                      key={patient.id} 
                      className="cursor-pointer border-b border-border/50 group transition-all hover:bg-muted/30"
                      onClick={() => navigate(`/doctor/patients/${patient.id}`)}
                    >
                      <TableCell className="py-5 px-8">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-12 h-12 rounded-2xl border-2 border-border group-hover:border-blue-600/50 transition-all shadow-sm">
                            <AvatarImage 
                              src={getPhotoUrl(patient)} 
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-blue-600/10 text-blue-600 font-black">
                              {(patient.prenom || patient.firstName || "P")[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-black text-foreground uppercase group-hover:text-blue-600 transition-colors">
                              {patient.prenom || patient.firstName} {patient.nom || patient.lastName}
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                               {patient.numero_patient || `#${patient.id}`} • {calculateAge(patient.date_naissance || patient.dateOfBirth)} ANS
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs font-black text-foreground/80">
                            <Phone className="w-3 h-3 text-blue-600" />
                            {patient.telephone || patient.phone || 'Non renseigné'}
                          </div>
                          {patient.email && (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground lowercase">
                              <Mail className="w-3 h-3" />
                              {patient.email}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center justify-center gap-2">
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 font-black px-3 py-1">
                            <Droplet className="w-3 h-3 mr-1 fill-current" />
                            {patient.groupe_sanguin || patient.bloodType || 'N/A'}
                          </Badge>
                          {patient.assurance && (
                             <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-black px-3 py-1">
                                {patient.assurance}
                             </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right px-8">
                        <Button 
                          variant="ghost" 
                          className="rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all font-black text-[10px] uppercase"
                          onClick={(e) => {
                            // ✅ IMPORTANT: Empêche le clic de se propager à la ligne du tableau
                            e.stopPropagation(); 
                            navigate(`/doctor/patients/${patient.id}`);
                          }}
                        >
                          Dossier <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-32">
              <User className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
              <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest">Aucun patient trouvé</h3>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Patients;