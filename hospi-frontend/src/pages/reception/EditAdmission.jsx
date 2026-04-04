import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { admissionService } from '../../services/admissionService';
import { 
  ArrowLeft, 
  Save, 
  Activity, 
  Thermometer, 
  Weight, 
  Ruler, 
  FileText,
  UserCheck,
  CheckCircle2,
  X,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

const EditAdmission = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false); 
  const [doctors, setDoctors] = useState([]);

  const [formData, setFormData] = useState({
    tension: '',
    poids: '',
    temperature: '',
    taille: '',
    motif: '',
    patientId: '',
    doctorId: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [admissionResponse, doctorsResponse] = await Promise.all([
          admissionService.getAdmissionById(id),
          admissionService.getDoctorsOnDuty()
        ]);

        const data = admissionResponse.data || admissionResponse;
        setDoctors(doctorsResponse || []);
        
        setFormData({
          tension: data.tensionArterielle || data.tension || '',
          poids: data.poids || '',
          temperature: data.temperature || '',
          taille: data.taille || '',
          motif: data.reasonForVisit || data.motif || '',
          patientId: data.patient?.id || data.patientId,
          doctorId: data.doctor?.id || data.doctorId || ''
        });
      } catch (err) {
        toast.error("Impossible de charger les données");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleActualSubmit = async () => {
    setShowConfirm(false);
    try {
      setSaving(true);
      
      // MAPPING CRUCIAL : On transforme les noms JS en noms attendus par le Backend Java
      const payload = {
        tensionArterielle: formData.tension,
        poids: formData.poids ? parseFloat(formData.poids) : null,
        temperature: formData.temperature ? parseFloat(formData.temperature) : null,
        taille: formData.taille ? parseInt(formData.taille, 10) : null,
        reasonForVisit: formData.motif,
        doctorId: formData.doctorId ? parseInt(formData.doctorId, 10) : null,
        patientId: formData.patientId ? parseInt(formData.patientId, 10) : null
      };

      await admissionService.updateAdmission(id, payload);
      toast.success("Triage mis à jour avec succès");
      navigate(`/reception/patients/${formData.patientId}`);
    } catch (err) {
      console.error("Détails Erreur Backend:", err);
      // On affiche le message précis renvoyé par le backend si disponible
      const serverMessage = err.response?.data?.message || "Erreur de validation des données";
      toast.error(serverMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen text-emerald-600">
      <Activity className="animate-spin mb-4" size={40} />
      <p className="font-bold text-sm tracking-widest uppercase">Chargement...</p>
    </div>
  );

  return (
    <div className="relative p-4 max-w-xl mx-auto min-h-screen bg-background text-foreground">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-muted-foreground hover:text-emerald-600 font-bold transition-colors mb-4 text-xs"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Annuler
      </button>

      <div className="bg-card border border-border rounded-[2rem] shadow-lg overflow-hidden transition-all">
        <div className="bg-emerald-600 p-5 text-white text-center">
          <h2 className="text-lg font-black flex items-center justify-center gap-2 uppercase tracking-tight">
            <Activity className="w-5 h-5" /> Modifier le Triage
          </h2>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); setShowConfirm(true); }} className="p-6 space-y-5">
          
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black text-emerald-600 flex items-center gap-1.5 ml-1">
              <UserCheck size={12} /> Médecin Consultant *
            </label>
            <select
              name="doctorId"
              required
              value={formData.doctorId}
              onChange={handleChange}
              className="w-full bg-muted/30 border border-border focus:border-emerald-500 rounded-xl p-3 font-bold text-sm outline-none"
            >
              <option value="">-- Sélectionner le médecin --</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  Dr. {doc.firstName || doc.prenom} {doc.lastName || doc.nom}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
            <div className="space-y-1 text-center">
              <label className="text-[10px] uppercase font-black text-rose-500 flex items-center justify-center gap-1.5">
                <Activity size={12} /> Tension
              </label>
              <input type="text" name="tension" value={formData.tension} onChange={handleChange}
                placeholder="120/80" className="w-full bg-muted/20 border border-border focus:border-rose-500 rounded-xl p-3 font-bold text-base outline-none text-center" />
            </div>

            <div className="space-y-1 text-center">
              <label className="text-[10px] uppercase font-black text-amber-500 flex items-center justify-center gap-1.5">
                <Thermometer size={12} /> Temp. (°C)
              </label>
              <input type="number" step="0.1" name="temperature" value={formData.temperature} onChange={handleChange}
                className="w-full bg-muted/20 border border-border focus:border-amber-500 rounded-xl p-3 font-bold text-base outline-none text-center" />
            </div>

            <div className="space-y-1 text-center">
              <label className="text-[10px] uppercase font-black text-blue-500 flex items-center justify-center gap-1.5">
                <Weight size={12} /> Poids (kg)
              </label>
              <input type="number" step="0.1" name="poids" value={formData.poids} onChange={handleChange}
                className="w-full bg-muted/20 border border-border focus:border-blue-500 rounded-xl p-3 font-bold text-base outline-none text-center" />
            </div>

            <div className="space-y-1 text-center">
              <label className="text-[10px] uppercase font-black text-indigo-500 flex items-center justify-center gap-1.5">
                <Ruler size={12} /> Taille (cm)
              </label>
              <input type="number" name="taille" value={formData.taille} onChange={handleChange}
                className="w-full bg-muted/20 border border-border focus:border-indigo-500 rounded-xl p-3 font-bold text-base outline-none text-center" />
            </div>
          </div>

          <div className="space-y-1 pt-2 border-t border-border/40">
            <label className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-1.5 ml-1">
              <FileText size={12} /> Motif de consultation
            </label>
            <textarea name="motif" value={formData.motif} onChange={handleChange} rows="3"
              className="w-full bg-muted/20 border border-border focus:border-emerald-500 rounded-xl p-3 text-sm outline-none resize-none font-medium" />
          </div>

          {/* BLOC AVERTISSEMENT */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-start gap-3">
            <AlertTriangle className="text-amber-600 shrink-0 w-5 h-5 mt-0.5" />
            <div>
              <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest leading-none mb-1">Attention</p>
              <p className="text-[11px] text-amber-700 font-bold leading-tight">
                Cette modification mettra à jour les données vitales du patient. Vérifiez bien les valeurs avant de confirmer.
              </p>
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl shadow-md flex items-center justify-center gap-3 transition-all active:scale-[0.98] text-sm uppercase"
          >
            {saving ? <Activity className="animate-spin" size={18} /> : <><Save size={18} /> Mettre à jour la fiche</>}
          </button>
        </form>
      </div>

      {/* --- MODALE DE CONFIRMATION CENTRÉE --- */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card border border-border rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-black text-foreground uppercase tracking-tighter">Tout est correct ?</h3>
              
              <div className="bg-muted/40 rounded-2xl p-4 grid grid-cols-2 gap-3 text-[11px] font-bold uppercase tracking-tight border border-border/50 text-left">
                <div className="flex flex-col"><span className="text-rose-600 opacity-70">BP</span><span>{formData.tension || '--'}</span></div>
                <div className="flex flex-col text-amber-600"><span className="opacity-70">TEMP</span><span>{formData.temperature || '--'}°C</span></div>
                <div className="flex flex-col text-blue-600"><span className="opacity-70">POIDS</span><span>{formData.poids || '--'} kg</span></div>
                <div className="flex flex-col text-indigo-600"><span className="opacity-70">TAILLE</span><span>{formData.taille || '--'} cm</span></div>
              </div>
            </div>
            
            <div className="flex border-t border-border">
              <button onClick={() => setShowConfirm(false)} className="flex-1 p-5 font-bold text-xs text-muted-foreground hover:bg-muted border-r border-border uppercase">Annuler</button>
              <button onClick={handleActualSubmit} className="flex-1 p-5 font-black text-xs text-emerald-600 hover:bg-emerald-50 uppercase">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditAdmission;