import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { admissionService } from '../../services/admissionService';
import { 
  Search, 
  ChevronRight, 
  UserPlus, 
  Loader2, 
  Users,
  Hash,
  Phone
} from 'lucide-react';

// ✅ SOUS-COMPOSANT POUR UNE GESTION ROBUSTE DES IMAGES (FALLBACK)
const PatientAvatar = ({ src, initiales }) => {
  const [hasError, setHasError] = useState(false);

  // Reset l'état d'erreur si la source change
  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError || !src) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-black text-lg">
        <span>{initiales}</span>
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt="avatar" 
      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
      onError={() => {
        console.warn("Échec du chargement de l'image (URL invalide ou fichier manquant):", src);
        setHasError(true);
      }}
    />
  );
};

const PatientList = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // ✅ FONCTION DE NETTOYAGE D'URL OPTIMISÉE (ALIGNÉE SUR LE BACKEND)
  const getCleanImageUrl = (url) => {
    if (!url) return null;
    
    // 1. Gestion des données déjà complètes (Base64 ou URL externe)
    if (url.startsWith('data:image') || url.startsWith('http')) return url;
    
    // 2. Récupération de l'URL Backend via variable d'env ou fallback local
    const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
    
    // 3. Normalisation du chemin (Path)
    // On remplace les \ (Windows) par / et on retire le premier slash s'il existe
    let cleanPath = url.replace(/\\/g, '/');
    if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
    
    // 4. Construction de l'URL finale sans doublons
    // Si le chemin contient déjà "uploads/", on le prend tel quel, sinon on l'ajoute
    const finalPath = cleanPath.startsWith('uploads/') 
      ? `/${cleanPath}` 
      : `/uploads/${cleanPath}`;

    const finalUrl = `${backendUrl}${finalPath}`;
    
    // Log discret pour le debugging en développement
    if (import.meta.env.DEV) {
      console.debug("🖼️ Résolution image:", finalUrl);
    }
    
    return finalUrl;
  };

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const response = await admissionService.searchPatients(searchTerm);
        
        let rawData = [];
        // Gestion de la structure de réponse paginée ou liste simple
        if (response?.data?.content && Array.isArray(response.data.content)) {
          rawData = response.data.content;
        } else if (response?.content && Array.isArray(response.content)) {
          rawData = response.content;
        } else if (response?.data && Array.isArray(response.data)) {
          rawData = response.data;
        } else if (Array.isArray(response)) {
          rawData = response;
        }

        const formattedPatients = rawData.map(p => ({
          ...p,
          id: p.id,
          // Application du correctif d'URL
          photoUrl: getCleanImageUrl(p.photoUrl || p.photo),
          displayName: p.fullName || (p.firstName ? `${p.firstName} ${p.lastName}` : (p.nom || p.name || 'Patient sans nom')),
          displayPhone: p.phoneNumber || p.phone || p.telephone || 'Non renseigné'
        }));
        
        setPatients(formattedPatients);
        setError(null);
      } catch (err) {
        console.error("Erreur API Patients:", err);
        setError("Impossible de charger la liste des patients.");
      } finally {
        setLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchPatients();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const filteredPatients = patients.filter(p => {
    const name = (p.displayName || "").toLowerCase();
    const pCode = (p.patientCode || p.code || p.id?.toString() || "").toLowerCase();
    const term = searchTerm.toLowerCase();
    return name.includes(term) || pCode.includes(term);
  });

  const handlePatientClick = (patientId) => {
    if (!patientId) return;
    navigate(`/reception/patients/${patientId}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* En-tête de page */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Users className="text-emerald-500 w-6 h-6" />
            </div>
            Annuaire des Patients
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Consultez et gérez les dossiers médicaux.</p>
        </div>

        <button 
          onClick={() => navigate('/reception/new-admission')}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg transition-all active:scale-95"
        >
          <UserPlus size={20} />
          Nouveau Patient
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="relative mb-8 group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="text-muted-foreground group-focus-within:text-emerald-500 transition-colors w-5 h-5" />
        </div>
        <input 
          type="text"
          placeholder="Rechercher par nom, prénom ou code patient..."
          className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-2xl focus:border-emerald-500/50 outline-none transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* État de chargement / Erreur / Liste */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
          <p className="text-muted-foreground font-medium">Récupération des dossiers...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-6 rounded-2xl text-center">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.length > 0 ? (
            filteredPatients.map(patient => {
              const displayCode = patient.patientCode || patient.code || `ID-${patient.id}`;
              const initiales = `${(patient.firstName || "?")[0]}${(patient.lastName || "")[0]}`;

              return (
                <div 
                  key={patient.id}
                  onClick={() => handlePatientClick(patient.id)}
                  className="bg-card border border-border p-5 rounded-2xl hover:border-emerald-500/40 hover:shadow-xl cursor-pointer transition-all flex items-start gap-4 group shadow-sm"
                >
                  {/* Conteneur Avatar */}
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-border overflow-hidden flex-shrink-0 bg-muted shadow-inner">
                    <PatientAvatar 
                      src={patient.photoUrl} 
                      initiales={initiales.toUpperCase()} 
                    />
                  </div>

                  {/* Infos Patient */}
                  <div className="flex-1 space-y-1 overflow-hidden">
                    <h3 className="font-bold text-foreground text-lg leading-tight group-hover:text-emerald-500 transition-colors capitalize truncate">
                      {patient.displayName}
                    </h3>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Hash size={12} className="text-emerald-500" />
                        <span className="font-mono">{displayCode}</span>
                      </div>
                      {patient.displayPhone !== 'Non renseigné' && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone size={12} className="text-emerald-500" />
                          <span>{patient.displayPhone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Indicateur d'action */}
                  <div className="self-center">
                    <ChevronRight className="text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-1 transition-all w-5 h-5" />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-20 text-center">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground font-medium">Aucun patient trouvé pour cette recherche.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PatientList;