import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Droplet, Edit2, Save, X, Camera } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import api from '../../services/patients/Api';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    bloodType: "",
    dateOfBirth: "",
    address: "",
    avatar: null
  });

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
  const IMAGE_BASE_URL = `${BACKEND_URL}/uploads/profiles/`;

  useEffect(() => {
    if (user) {
      // Correction format date : l'input HTML type="date" exige YYYY-MM-DD
      const rawDate = user.dateOfBirth || "";
      const formattedDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;

      setFormData({
        id: user.id || "N/A",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phoneNumber || "", 
        bloodType: user.bloodType || "", 
        dateOfBirth: formattedDate,
        address: user.address || "",
        avatar: user.photoUrl 
          ? (user.photoUrl.startsWith('data:') ? user.photoUrl : `${IMAGE_BASE_URL}${user.photoUrl}?t=${new Date().getTime()}`)
          : `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=10b981&color=fff`
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phone,    // Correspond au PatientDTO Java
        bloodType: formData.bloodType,  // Correspond au PatientDTO Java
        dateOfBirth: formData.dateOfBirth, // Correspond au PatientDTO Java
        address: formData.address,      // Correspond au PatientDTO Java
        photoUrl: formData.avatar?.startsWith('data:') ? formData.avatar : user.photoUrl 
      };

      // --- MODIFICATION CRITIQUE ICI : Utilisation de /me au lieu de /${user.id} ---
      const response = await api.put(`/patients/me`, updateData);
      
      const updatedPatient = response.data.data || response.data;

      if (updatedPatient) {
        // A. Mise à jour du LocalStorage (Pour éviter la perte au Refresh F5)
        const storedUser = JSON.parse(localStorage.getItem('user')) || {};
        const newUserObj = { 
          ...storedUser, 
          ...updatedPatient 
        };
        localStorage.setItem('user', JSON.stringify(newUserObj));

        // B. Mise à jour du Context (Pour l'affichage immédiat)
        if (updateUser) {
          updateUser(newUserObj);
        }
      }

      alert("✅ Profil mis à jour et synchronisé !");
      setIsEditing(false);
    } catch (error) {
      console.error("Erreur détaillée:", error.response?.data || error.message);
      const errorMsg = error.response?.data?.message || "Erreur lors de la sauvegarde.";
      alert(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      const rawDate = user.dateOfBirth || "";
      const formattedDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;

      setFormData({
        ...formData,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phoneNumber,
        bloodType: user.bloodType,
        address: user.address,
        dateOfBirth: formattedDate,
        avatar: user.photoUrl 
          ? (user.photoUrl.startsWith('data:') ? user.photoUrl : `${IMAGE_BASE_URL}${user.photoUrl}`)
          : `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=10b981&color=fff`
      });
    }
    setIsEditing(false);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-2">
          Mon Profil
        </h1>
        <p className="text-muted-foreground font-medium">Gérez vos informations personnelles et médicales</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-3xl p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
            
            <div className="text-center mb-8">
              <div className="relative inline-block">
                <img
                  src={formData.avatar}
                  alt="Profile"
                  className="w-36 h-36 rounded-full object-cover mx-auto border-4 border-card shadow-md transition-transform hover:scale-105"
                />
                
                {isEditing && (
                  <label 
                    htmlFor="avatar-upload"
                    className="absolute bottom-1 right-1 bg-emerald-500 text-white p-3 rounded-full shadow-lg hover:bg-emerald-600 transition-all cursor-pointer border-2 border-card"
                  >
                    <Camera className="w-5 h-5" />
                    <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={handleImageChange} />
                  </label>
                )}
              </div>
              <h2 className="text-2xl font-bold text-foreground mt-5">
                {formData.firstName} {formData.lastName}
              </h2>
              <p className="text-emerald-500 font-bold text-sm uppercase tracking-widest mt-1">
                {user.role?.nom || user.role || 'UTILISATEUR'} #{formData.id}
              </p>
            </div>

            <div className="space-y-4 pt-6 border-t border-border">
              <div className="flex items-center gap-4 text-sm group">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-emerald-500" />
                </div>
                <span className="text-muted-foreground font-medium truncate">{formData.email}</span>
              </div>
              <div className="flex items-center gap-4 text-sm group">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                  <Phone className="w-5 h-5 text-emerald-500" />
                </div>
                <span className="text-muted-foreground font-medium truncate">{formData.phone || "Non renseigné"}</span>
              </div>
              <div className="flex items-center gap-4 text-sm group">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                  <Droplet className="w-5 h-5 text-emerald-500" />
                </div>
                <span className="text-muted-foreground font-medium truncate">
                  Groupe : <span className="text-emerald-500 font-bold">{formData.bloodType || "N/A"}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-500" />
                Informations personnelles
              </h3>
              
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-foreground text-background rounded-xl hover:opacity-90 font-bold text-sm transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                  Modifier le profil
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-bold text-sm disabled:opacity-50 transition-all"
                  >
                    {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div> : <Save className="w-4 h-4" />}
                    {loading ? "Enregistrement..." : "Enregistrer"}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-muted text-muted-foreground rounded-xl hover:bg-muted/80 font-bold text-sm transition-all"
                  >
                    <X className="w-4 h-4" />
                    Annuler
                  </button>
                </div>
              )}
            </div>

            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground ml-1">Prénom</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    disabled={!isEditing || loading}
                    className="w-full px-4 py-3 bg-muted/30 border border-border rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground ml-1">Nom</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    disabled={!isEditing || loading}
                    className="w-full px-4 py-3 bg-muted/30 border border-border rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground ml-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    disabled={true}
                    className="w-full px-4 py-3 bg-muted/30 border border-border rounded-2xl opacity-60 cursor-not-allowed font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground ml-1">Téléphone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={!isEditing || loading}
                    className="w-full px-4 py-3 bg-muted/30 border border-border rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground ml-1">Date de naissance</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    disabled={!isEditing || loading}
                    className="w-full px-4 py-3 bg-muted/30 border border-border rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground ml-1">Groupe sanguin</label>
                  <input
                    type="text"
                    name="bloodType"
                    value={formData.bloodType}
                    onChange={handleChange}
                    disabled={!isEditing || loading}
                    className="w-full px-4 py-3 bg-muted/30 border border-border rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground ml-1">Adresse de résidence</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={!isEditing || loading}
                  rows={3}
                  className="w-full px-4 py-3 bg-muted/30 border border-border rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all resize-none font-medium"
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;