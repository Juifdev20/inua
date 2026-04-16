import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Save, Beaker, ClipboardList, 
  Stethoscope, Pill, Activity, CheckCircle2,
  AlertCircle, Plus, X, Loader2, Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { Badge } from '../../components/ui/badge';
import { useHospitalConfig } from '../../hooks/useHospitalConfig';
import { formatCurrencyPDF } from '../../utils/currencyFormat';

// Imports PDF corrigés pour éviter l'erreur "doc.autoTable is not a function"
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Détection automatique de l'environnement
const isLocalhost = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' || 
                   window.location.hostname.includes('local');
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 
                (isLocalhost ? 'http://localhost:8080' : 'https://inuaafia.onrender.com');
const API_URL = `${BACKEND_URL}/api`;

const ExamenClinique = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { config } = useHospitalConfig();
  
  const [loading, setLoading] = useState(false);
  const [consultationData, setConsultationData] = useState(null);
  
  // État synchronisé avec ton DTO Backend (Noms anglais comme dans tes logs Hibernate)
  const [formData, setFormData] = useState({
    diagnosis: '',
    treatment: '',
    tensionArterielle: '',
    temperature: '',
    isHospitalized: false
  });

  const [antecedents, setAntecedents] = useState({
    allergies: ['Pénicilline'],
    pathologies: ['Diabète Type 2'],
    chirurgies: []
  });

  // 1. Chargement des données au démarrage
  useEffect(() => {
    const fetchConsultation = async () => {
      // ✅ VALIDATION: Vérifier que l'ID est valide
      if (!id || id === 'undefined' || id === 'null' || id === '') {
        console.error("❌ ExamenClinique: ID invalide:", id);
        toast.error("ID de consultation invalide");
        return;
      }
      
      console.log("📡 ExamenClinique - Chargement avec ID:", id);
      
      try {
        const response = await axios.get(`${API_URL}/consultations/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = response.data.data || response.data;
        setConsultationData(data);
        
        setFormData({
          diagnosis: data.diagnosis || '',
          treatment: data.treatment || '',
          tensionArterielle: data.tensionArterielle || '',
          temperature: data.temperature || '',
          isHospitalized: data.isHospitalized || false
        });
      } catch (err) {
        toast.error("Impossible de charger la fiche médicale");
        console.error(err);
      }
    };
    if (id && token) fetchConsultation();
  }, [id, token]);

  const addTag = (category) => {
    const value = prompt(`Ajouter ${category}:`);
    if (value) setAntecedents(prev => ({ ...prev, [category]: [...prev[category], value] }));
  };

  const removeTag = (category, index) => {
    const newList = [...antecedents[category]];
    newList.splice(index, 1);
    setAntecedents({ ...antecedents, [category]: newList });
  };

  // 2. Génération PDF avec config hospitalière
  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      const patientName = consultationData?.patientName || "Patient";
      const primaryColor = config.primaryColor ? hexToRgb(config.primaryColor) : [5, 150, 105]; // Emerald default
      
      // Logo et en-tête
      if (config.hospitalLogoUrl) {
        try {
          doc.addImage(config.hospitalLogoUrl, 'PNG', 10, 10, 30, 30);
        } catch (e) {
          // Si l'image ne charge pas, on continue sans
        }
      }
      
      // Nom de l'hôpital
      doc.setFontSize(16);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(config.hospitalName?.toUpperCase() || 'INUA AFIA', 105, 20, { align: "center" });
      
      // Sous-titre
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(config.headerSubtitle || 'Système de Gestion Hospitalière', 105, 27, { align: "center" });
      
      // Titre du document
      doc.setFontSize(22);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("ORDONNANCE MÉDICALE", 105, 40, { align: "center" });
      
      // Ligne séparatrice
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(20, 45, 190, 45);
      
      // Informations patient
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text(`Patient : ${patientName}`, 20, 55);
      doc.text(`Code consultation : ${consultationData?.consultationCode || 'N/A'}`, 20, 62);
      doc.text(`Médecin : ${consultationData?.doctorName || 'Dr. '}`, 20, 69);
      doc.text(`Date : ${new Date().toLocaleDateString()}`, 150, 55);

      // Diagnostic
      doc.setFontSize(12);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("DIAGNOSTIC", 20, 85);
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text(formData.diagnosis || "Non spécifié", 20, 92);

      // Prescription
      autoTable(doc, {
        startY: 105,
        head: [['PRESCRIPTION MÉDICALE']],
        body: [[formData.treatment || "Aucun traitement spécifié"]],
        theme: 'grid',
        headStyles: { 
          fillColor: primaryColor,
          textColor: [255, 255, 255]
        },
        styles: { fontSize: 11, cellPadding: 8 }
      });

      // Pied de page
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(config.footerText || `© ${config.hospitalName || 'INUA AFIA'} - Tous droits réservés`, 105, pageHeight - 15, { align: "center" });
      
      if (config.address) {
        doc.text(config.address, 105, pageHeight - 10, { align: "center" });
      }

      doc.save(`Ordonnance_${patientName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("Erreur PDF:", error);
    }
  };

  // Helper pour convertir hex en RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [5, 150, 105];
  };

  // 3. Action : Envoyer au Laboratoire
  const handleSendToLab = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/consultations/${id}/send-to-lab`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Patient transféré au laboratoire");
      navigate('/doctor/dashboard');
    } catch (err) {
      toast.error("Erreur lors du transfert labo");
    } finally {
      setLoading(false);
    }
  };

  // 4. Sauvegarde Finale (PUT /api/consultations/{id})
  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.put(`${API_URL}/consultations/${id}`, {
        ...consultationData,
        ...formData,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 200 || response.status === 201) {
        toast.success("Fiche enregistrée avec succès !");
        generatePDF();
        setTimeout(() => navigate('/doctor/dashboard'), 1500);
      }
    } catch (err) {
      console.error("Erreur Save:", err);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in duration-700">
      
      {/* HEADER Nav */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate(-1)} className="group flex items-center gap-3 text-muted-foreground hover:text-foreground">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </div>
          <span className="font-black uppercase text-[10px] tracking-widest">Retour</span>
        </button>
        <div className="text-right">
            <h1 className="text-2xl font-black tracking-tighter uppercase italic">Examen Clinique</h1>
            <Badge variant="outline" className="text-[10px] font-bold border-emerald-500/20 text-emerald-600">
                FICHE: {consultationData?.consultationCode || '...'}
            </Badge>
        </div>
      </div>

      {/* BANDEAU PATIENT */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 mb-8 text-white flex items-center gap-8 shadow-2xl overflow-hidden relative">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 z-10">
          <Users className="w-10 h-10 text-white" />
        </div>
        <div className="z-10">
          <p className="text-emerald-500 font-black text-[10px] uppercase tracking-[0.3em] mb-1">Dossier Patient</p>
          <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">
            {consultationData?.patientName || "Chargement..."}
          </h2>
        </div>
        <div className="ml-auto bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-right z-10">
            <p className="text-[9px] font-black uppercase text-white/40">Motif de visite</p>
            <p className="font-bold text-emerald-400">{consultationData?.reasonForVisit || "Consultation"}</p>
        </div>
      </div>

      {/* ANTÉCÉDENTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {['allergies', 'pathologies', 'chirurgies'].map((cat) => (
          <div key={cat} className={cn(
            "rounded-[2.5rem] p-6 border transition-all",
            cat === 'allergies' ? "bg-rose-500/5 border-rose-500/10" : 
            cat === 'pathologies' ? "bg-amber-500/5 border-amber-500/10" : "bg-blue-500/5 border-blue-500/10"
          )}>
            <div className="flex justify-between items-center mb-4">
              <span className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-2", 
                cat === 'allergies' ? "text-rose-600" : cat === 'pathologies' ? "text-amber-600" : "text-blue-600")}>
                {cat === 'allergies' ? <AlertCircle className="w-4 h-4"/> : cat === 'pathologies' ? <Activity className="w-4 h-4"/> : <ClipboardList className="w-4 h-4"/>}
                {cat}
              </span>
              <button onClick={() => addTag(cat)} className="p-1 hover:scale-110"><Plus className="w-4 h-4"/></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {antecedents[cat].map((item, i) => (
                <Badge key={i} className={cn("border-none font-bold text-[9px] text-white", 
                    cat === 'allergies' ? "bg-rose-500" : cat === 'pathologies' ? "bg-amber-500" : "bg-blue-500")}>
                  {item} <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => removeTag(cat, i)} />
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* FORMULAIRE */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Constantes */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card border rounded-[2.5rem] p-6 space-y-6 shadow-sm">
            <h3 className="font-black uppercase text-[10px] tracking-widest border-b pb-4">Constantes</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Tension (12/8)</label>
                <input type="text" value={formData.tensionArterielle} className="w-full bg-muted/30 rounded-2xl p-4 mt-1 font-bold outline-none border-2 border-transparent focus:border-emerald-500/20" 
                       onChange={(e) => setFormData({...formData, tensionArterielle: e.target.value})} />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Température (°C)</label>
                <input type="text" value={formData.temperature} className="w-full bg-muted/30 rounded-2xl p-4 mt-1 font-bold outline-none border-2 border-transparent focus:border-emerald-500/20" 
                       onChange={(e) => setFormData({...formData, temperature: e.target.value})} />
              </div>
            </div>
            
            <div 
              onClick={() => setFormData({...formData, isHospitalized: !formData.isHospitalized})}
              className={cn("p-5 rounded-[2rem] border-2 transition-all cursor-pointer flex items-center justify-between", 
              formData.isHospitalized ? "bg-rose-500/10 border-rose-500 text-rose-600" : "bg-muted/10 border-transparent")}
            >
              <span className="font-black text-[10px] uppercase">Hospitaliser ?</span>
              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center transition-all", formData.isHospitalized ? "bg-rose-500 text-white" : "bg-muted")}>
                {formData.isHospitalized && <CheckCircle2 className="w-4 h-4" />}
              </div>
            </div>
          </div>
        </div>

        {/* Diagnostic & Prescription */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-card border rounded-[3rem] p-8 shadow-sm space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Stethoscope className="w-5 h-5 text-emerald-500" />
                <h3 className="font-black uppercase text-[11px] tracking-widest">Diagnostic Clinique</h3>
              </div>
              <textarea rows="4" value={formData.diagnosis} className="w-full bg-muted/20 rounded-[1.5rem] p-6 outline-none focus:bg-background border-2 border-transparent focus:border-emerald-500/20 transition-all font-medium text-lg" placeholder="Observations..." 
                        onChange={(e) => setFormData({...formData, diagnosis: e.target.value})} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Pill className="w-5 h-5 text-blue-500" />
                <h3 className="font-black uppercase text-[11px] tracking-widest">Prescription Médicale</h3>
              </div>
              <textarea rows="4" value={formData.treatment} className="w-full bg-muted/20 rounded-[1.5rem] p-6 outline-none focus:bg-background border-2 border-transparent focus:border-blue-500/20 transition-all font-medium text-lg italic" placeholder="Posologie..." 
                        onChange={(e) => setFormData({...formData, treatment: e.target.value})} />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button type="button" onClick={handleSendToLab} disabled={loading}
                className="h-16 px-8 rounded-2xl bg-slate-900 text-blue-400 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all disabled:opacity-50">
                <Beaker className="w-5 h-5" /> Analyser au Labo
              </button>
              <button type="submit" disabled={loading} 
                className="flex-1 h-16 bg-emerald-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-3 hover:scale-[1.01] transition-all disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                Enregistrer & Ordonnance PDF
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ExamenClinique;