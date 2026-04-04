import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  UserPlus, 
  CheckCircle2, 
  Camera, 
  X, 
  UploadCloud
} from 'lucide-react';
import api from '../../api/axios'; 
import { Button } from '../../components/ui/button';
import { toast } from "sonner";

const AddPatient = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [isCameraMode, setIsCameraMode] = useState(false);
  
  // États pour la photo de profil
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: 'MASCULIN', // Correspond à l'Enum Java
    bloodType: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: ''
  });

  // Nettoyage de la caméra si l'utilisateur quitte la page
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // --- LOGIQUE CAMÉRA ---
  const startCamera = async () => {
    try {
      setIsCameraMode(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Erreur caméra:", err);
      toast.error("Accès caméra refusé ou non disponible");
      setIsCameraMode(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraMode(false);
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      
      // Effet miroir pour la capture
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setPhotoPreview(dataUrl);
      
      // Conversion base64 en File réel pour l'envoi multipart
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `patient_${Date.now()}.jpg`, { type: "image/jpeg" });
          setPhotoFile(file);
        });
      
      stopCamera();
    }
  };

  // --- GESTION FICHIER ---
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("L'image est trop volumineuse (max 2MB)");
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (isCameraMode) stopCamera();
  };

  // --- SOUMISSION ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const data = new FormData();
      
      // 1. Ajout de la photo (clé 'photo' attendue par @RequestPart en Java)
      if (photoFile) {
        data.append('photo', photoFile);
      }
      
      // 2. Ajout des données du formulaire
      // On boucle sur formData pour remplir le FormData
      Object.keys(formData).forEach(key => {
        const value = formData[key];
        if (value !== '' && value !== null && value !== undefined) {
          data.append(key, value);
        }
      });

      // 3. Appel API
      // Note: baseURL dans axios.js est déjà http://localhost:8080/api
      // Le chemin final sera http://localhost:8080/api/v1/patients
      await api.post('/v1/patients', data, {
        headers: { 
          'Content-Type': 'multipart/form-data' 
        }
      });
      
      toast.success("Succès", { 
        description: "Le dossier du patient a été créé avec succès.",
        icon: <CheckCircle2 className="h-5 w-5 text-[#37f49e]" />
      });
      
      navigate('/reception/patients');
    } catch (error) {
      console.error("Erreur d'enregistrement:", error);
      const errorMessage = error.response?.data?.message || "Erreur lors de la création du patient.";
      toast.error("Erreur", { 
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = "w-full p-2.5 rounded-md border border-border bg-background focus:ring-2 focus:ring-[#37f49e]/30 focus:border-[#37f49e] outline-none transition-all appearance-none cursor-pointer";

  return (
    <div className="p-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <style dangerouslySetInnerHTML={{ __html: `
        select option:checked, 
        select option:hover {
          box-shadow: 0 0 10px 100px #37f49e inset !important;
          color: white !important;
        }
      `}} />

      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)} 
        className="mb-6 gap-2 hover:text-[#37f49e] hover:bg-[#37f49e]/10"
      >
        <ArrowLeft className="w-4 h-4" /> Retour
      </Button>

      <div className="bg-card border-t-4 border-t-[#37f49e] rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-8 border-b pb-4">
          <div className="p-2 bg-[#37f49e]/20 rounded-lg">
            <UserPlus className="w-6 h-6 text-[#37f49e]" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Enregistrer un nouveau patient</h1>
            <p className="text-sm text-muted-foreground">Remplissez les informations pour créer un dossier médical.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* ZONE PHOTO/CAMERA */}
          <div className="flex flex-col items-center justify-center space-y-4 pb-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-3xl bg-muted border-2 border-dashed border-border overflow-hidden flex items-center justify-center transition-all group-hover:border-[#37f49e]/50">
                {isCameraMode ? (
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                ) : photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <Camera className="w-8 h-8 mx-auto text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground font-medium uppercase mt-2 block">Photo</span>
                  </div>
                )}
              </div>
              
              <div className="absolute -bottom-2 -right-2 flex gap-2">
                {isCameraMode ? (
                  <button type="button" onClick={takePhoto} className="bg-[#37f49e] text-white p-2 rounded-xl shadow-lg hover:scale-110 transition-transform">
                    <CheckCircle2 size={18} />
                  </button>
                ) : photoPreview ? (
                  <button type="button" onClick={removePhoto} className="bg-rose-500 text-white p-2 rounded-xl shadow-lg hover:scale-110 transition-transform">
                    <X size={18} />
                  </button>
                ) : (
                  <>
                    <button type="button" onClick={startCamera} className="bg-[#37f49e] text-white p-2 rounded-xl shadow-lg hover:scale-110 transition-transform">
                      <Camera size={18} />
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-slate-600 text-white p-2 rounded-xl shadow-lg hover:scale-110 transition-transform">
                      <UploadCloud size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" className="hidden" />
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Prénom</label>
              <input required className={inputStyle} value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} placeholder="Ex: Jean" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Nom</label>
              <input required className={inputStyle} value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} placeholder="Ex: Dupont" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Email</label>
              <input type="email" className={inputStyle} value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="patient@exemple.com" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Téléphone</label>
              <input className={inputStyle} value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} placeholder="+243..." />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Date de naissance</label>
              <input type="date" className={inputStyle} value={formData.dateOfBirth} onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Genre</label>
              <select className={inputStyle} onChange={(e) => setFormData({...formData, gender: e.target.value})} value={formData.gender}>
                <option value="MASCULIN">Masculin</option>
                <option value="FEMININ">Féminin</option>
                <option value="AUTRE">Autre</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Groupe Sanguin</label>
              <select className={inputStyle} onChange={(e) => setFormData({...formData, bloodType: e.target.value})} value={formData.bloodType}>
                <option value="">Sélectionner un groupe</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">Adresse Résidentielle</label>
              <textarea className={inputStyle} rows="2" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Numéro, Rue, Quartier, Ville" />
            </div>
          </div>

          <div className="md:col-span-2 pt-6">
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full gap-2 py-6 text-lg bg-[#37f49e] hover:bg-[#2bd98b] text-white shadow-lg shadow-[#37f49e]/20 transition-all border-none font-bold disabled:opacity-50"
            >
              <Save className="w-5 h-5" /> {loading ? "Enregistrement..." : "Enregistrer le dossier patient"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPatient;