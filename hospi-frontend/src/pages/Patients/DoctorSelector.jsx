import React, { useState, useEffect } from 'react';
import { User, CheckCircle, Stethoscope } from 'lucide-react';
import api from '../../api/axios';

const DoctorSelector = ({ onSelectDoctor }) => {
  const [doctors, setDoctors] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/v1/doctors/all')
      .then(res => {
        setDoctors(res.data.data || res.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erreur chargement docteurs:", err);
        setLoading(false);
      });
  }, []);

  const handleSelect = (doctor) => {
    setSelectedId(doctor.id);
    onSelectDoctor(doctor); // On renvoie l'objet complet au parent (BookingModal)
  };

  // ✅ FONCTION DE RÉCUPÉRATION DE LA SPÉCIALITÉ
  const getSpecialtyLabel = (doctor) => {
    // On vérifie toutes les sources possibles (department, departement, ou specialty)
    const dept = doctor.department || doctor.departement || doctor.specialty;
    
    if (!dept) return "Généraliste";
    
    // Si c'est l'objet département du backend, on prend la propriété .nom
    if (typeof dept === 'object') {
      return dept.nom || "Généraliste";
    }
    
    return dept; // Si c'est déjà une String
  };

  if (loading) return <div className="text-center p-4">Chargement des médecins...</div>;

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Stethoscope size={20} className="text-blue-600" />
        Choisissez votre médecin
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto p-2">
        {doctors.map((doctor) => (
          <div
            key={doctor.id}
            onClick={() => handleSelect(doctor)}
            className={`relative flex items-center p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${
              selectedId === doctor.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-blue-300'
            }`}
          >
            {/* Photo de profil */}
            <div className="relative">
              {doctor.photoUrl ? (
                <img
                  src={doctor.photoUrl}
                  alt={doctor.lastName}
                  className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border-2 border-white shadow-sm">
                  <User size={30} className="text-gray-400" />
                </div>
              )}
              
              {/* Badge de sélection (Petit check vert) */}
              {selectedId === doctor.id && (
                <div className="absolute -top-1 -right-1 bg-white rounded-full">
                  <CheckCircle size={20} className="text-blue-500" fill="currentColor" />
                </div>
              )}
            </div>

            {/* Infos du Docteur */}
            <div className="ml-4">
              <h4 className="font-bold text-gray-800 leading-tight">
                Dr. {doctor.firstName} {doctor.lastName}
              </h4>
              {/* ✅ MODIFICATION ICI : Utilisation de la fonction getSpecialtyLabel */}
              <p className="text-sm text-blue-600 font-medium">
                {getSpecialtyLabel(doctor)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{doctor.email}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DoctorSelector;