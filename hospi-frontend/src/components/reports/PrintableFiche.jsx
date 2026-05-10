import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { admissionService } from '../../services/admissionService';
import { 
  FileText, 
  Calendar, 
  Activity, 
  Thermometer, 
  Weight, 
  ArrowLeft, 
  Plus, 
  User, 
  Clock,
  ClipboardList,
  Phone,
  Printer 
} from 'lucide-react';
import { cn } from '../../lib/utils';

// --- SOUS-COMPOSANT : LA FICHE POUR L'IMPRESSION (ADAPTÉE ZÉRO STYLO) ---
const PrintableFiche = ({ data, patient }) => {
  if (!patient) return null;
  
  return (
    <div className="bg-white text-black p-8 font-serif leading-tight">
      {/* ENTÊTE OFFICIELLE */}
      <div className="text-center space-y-1 border-b-2 border-black pb-4 mb-6">
        <h1 className="text-xl font-bold uppercase">République Démocratique du Congo</h1>
        <h2 className="text-lg font-semibold uppercase">Ministère de la Santé Publique</h2>
        <div className="flex justify-between text-xs font-medium px-4">
          <span>PROVINCE : ...........................................</span>
          <span>ZONE DE SANTÉ : ...........................................</span>
        </div>
        <div className="flex justify-between text-xs font-medium px-4 mt-1">
          <span>AIRE DE SANTÉ : ...........................................</span>
          <span>INSTITUTION : ...........................................</span>
        </div>
        <div className="mt-4 inline-block border-2 border-black px-6 py-1 font-black text-lg">
          FICHE DE CONSULTATION N° {data?.id || '.......'}
        </div>
      </div>

      {/* IDENTITÉ (Données Réception) */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm mb-8">
        <div className="flex gap-2"><span className="font-bold">Nom :</span> <span className="border-b border-black flex-1 uppercase">{patient.lastName} {patient.firstName}</span></div>
        <div className="flex gap-2"><span className="font-bold">Sexe :</span> <span className="border-b border-black flex-1">{patient.gender || '.......'}</span></div>
        <div className="flex gap-2"><span className="font-bold">Né(e) le :</span> <span className="border-b border-black flex-1">{patient.birthDate || '.......'}</span></div>
        <div className="flex gap-2"><span className="font-bold">Adresse :</span> <span className="border-b border-black flex-1">{patient.address || '.......'}</span></div>
      </div>

      {/* SIGNES VITAUX (Données Triage Réception) */}
      <div className="border-2 border-black mb-8">
        <div className="bg-gray-100 border-b border-black p-1 font-bold text-center uppercase text-[10px]">Signes Vitaux / Triage (Réception)</div>
        <div className="grid grid-cols-4 divide-x divide-black text-center text-sm">
          <div className="p-2"><p className="font-bold border-b border-black mb-1 italic">T° (°C)</p><p className="font-bold text-lg">{data?.temperature || '---'}</p></div>
          <div className="p-2"><p className="font-bold border-b border-black mb-1 italic">Poids (kg)</p><p className="font-bold text-lg">{data?.poids || '---'}</p></div>
          <div className="p-2"><p className="font-bold border-b border-black mb-1 italic">T.A (mmHg)</p><p className="font-bold text-lg">{data?.tension || '---'}</p></div>
          <div className="p-2"><p className="font-bold border-b border-black mb-1 italic">F.C / F.R</p><p className="font-bold text-lg">{data?.fc || '---'} / {data?.fr || '---'}</p></div>
        </div>
      </div>

      {/* ZONE MÉDICALE DYNAMIQUE (Plus de lignes vides, le texte s'affiche ici) */}
      <div className="space-y-6">
        <div className="border border-black p-3">
          <h3 className="font-bold text-sm uppercase italic underline mb-2">1. Anamnèse & Observations Cliniques :</h3>
          <p className="text-sm min-h-[80px] leading-relaxed">
            {data?.observations || data?.motif || "Aucune observation saisie."}
          </p>
        </div>

        <div className="border border-black p-3">
          <h3 className="font-bold text-sm uppercase italic underline mb-2">2. Résultats Laboratoire :</h3>
          <div className="text-sm min-h-[80px]">
            {data?.labResults ? (
              <ul className="list-disc pl-5">
                {data.labResults.map((res, i) => <li key={i}><b>{res.examen} :</b> {res.resultat}</li>)}
              </ul>
            ) : <p className="italic text-gray-500">Aucun résultat de laboratoire enregistré.</p>}
          </div>
        </div>

        <div className="border border-black p-3 bg-gray-50">
          <h3 className="font-bold text-sm uppercase italic underline mb-2">3. Diagnostic & Prescription Médicale :</h3>
          <div className="text-sm min-h-[120px]">
            <p className="font-black mb-2 uppercase">DIAGNOSTIC : {data?.diagnostic || 'En attente'}</p>
            <div className="pt-2 border-t border-black/10 whitespace-pre-wrap font-mono">
              {data?.prescriptions || "Aucune prescription enregistrée."}
            </div>
          </div>
        </div>
      </div>

      {/* SIGNATURES NUMÉRIQUES */}
      <div className="grid grid-cols-2 gap-10 mt-12 text-center text-[10px] uppercase">
        <div>
          <p className="italic underline mb-8">Le Laborantin</p>
          <p className="border-t border-black pt-2 font-bold">Validé numériquement</p>
        </div>
        <div>
          <p className="italic underline mb-8">Médecin Traitant</p>
          <p className="border-t border-black pt-2 font-bold">Validé numériquement</p>
        </div>
      </div>
    </div>
  );
};

// --- COMPOSANT PRINCIPAL ---
const PatientFolder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [patientInfo, setPatientInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [hRes, pRes] = await Promise.allSettled([
          admissionService.getPatientHistory(id),
          admissionService.getPatientById(id)
        ]);
        if (hRes.status === 'fulfilled') setHistory(hRes.value);
        if (pRes.status === 'fulfilled') setPatientInfo(pRes.value?.data || pRes.value);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id) loadData();
  }, [id]);

  if (loading) return <div className="h-screen bg-[#12121a] flex items-center justify-center text-emerald-500"><Activity className="animate-spin" /></div>;

  const initiales = `${(patientInfo?.firstName || "?")[0]}${(patientInfo?.lastName || "")[0]}`;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 1. BARRE D'ACTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 print:hidden">
        <button onClick={() => navigate('/reception/patients')} className="flex items-center gap-2 text-muted-foreground hover:text-emerald-500 transition-colors font-medium">
          <ArrowLeft className="w-5 h-5" /> Retour à l'annuaire
        </button>
        
        <div className="flex gap-3">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg transition-all active:scale-95"
          >
            <Printer className="w-5 h-5" /> Imprimer Rapport Final
          </button>
          <button 
            onClick={() => navigate('/reception/new-admission', { state: { patientId: id } })}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" /> Nouvelle Admission
          </button>
        </div>
      </div>

      {/* 2. CONTENU ÉCRAN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
        {/* Colonne Gauche : Identité */}
        <div className="lg:col-span-4">
          <div className="bg-card border border-border rounded-3xl p-6 text-center shadow-sm">
            <div className="w-24 h-24 rounded-3xl bg-emerald-500 flex items-center justify-center text-white font-black text-3xl mx-auto mb-4">{initiales}</div>
            <h2 className="text-2xl font-black capitalize">{patientInfo?.firstName} {patientInfo?.lastName}</h2>
            <div className="mt-8 space-y-4 pt-6 border-t border-border/50 text-left text-sm">
              <div className="flex justify-between"><span>Sexe</span><span className="font-bold">{patientInfo?.gender || 'N/A'}</span></div>
              <div className="flex justify-between"><span>Téléphone</span><span className="font-bold">{patientInfo?.phoneNumber || 'N/A'}</span></div>
              <div className="flex justify-between"><span>Adresse</span><span className="font-bold truncate max-w-[150px] text-right">{patientInfo?.address || 'N/A'}</span></div>
            </div>
          </div>
        </div>

        {/* Colonne Droite : Historique */}
        <div className="lg:col-span-8 space-y-4">
          <h3 className="text-xl font-black flex items-center gap-2"><ClipboardList className="text-emerald-500" /> Chronologie Médicale</h3>
          {history.length > 0 ? history.map((fiche, index) => (
            <div key={index} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-muted/30 px-5 py-4 border-b flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center text-emerald-600 font-black">{history.length - index}</div>
                   <div>
                    <p className="text-sm font-bold">{new Date(fiche.date).toLocaleDateString()}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Consultation Numérique</p>
                   </div>
                </div>
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black border border-emerald-500/20 uppercase">{fiche.status}</span>
              </div>
              
              <div className="p-6">
                {/* Signes Vitaux Écran */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                  <div><p className="text-[10px] font-black text-rose-500 uppercase">Tension</p><p className="text-xl font-black">{fiche.tension || '--'}</p></div>
                  <div><p className="text-[10px] font-black text-amber-500 uppercase">Température</p><p className="text-xl font-black">{fiche.temperature || '--'} °C</p></div>
                  <div><p className="text-[10px] font-black text-blue-500 uppercase">Poids</p><p className="text-xl font-black">{fiche.poids || '--'} kg</p></div>
                  <div><p className="text-[10px] font-black text-emerald-500 uppercase">F.C</p><p className="text-xl font-black">{fiche.fc || '--'}</p></div>
                </div>

                {/* Détails Médicaux Écran */}
                <div className="pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Observation/Diagnostic</p>
                    <p className="text-sm font-semibold italic">{fiche.diagnostic || "En attente du médecin..."}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Prescription</p>
                    <p className="text-sm truncate font-mono text-emerald-600">{fiche.prescriptions || "Aucune ordonnance"}</p>
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center">
              <p className="text-muted-foreground italic">Aucun antécédent médical trouvé pour ce patient.</p>
            </div>
          )}
        </div>
      </div>

      {/* 3. ZONE D'IMPRESSION (Invisible à l'écran) */}
      <div className="hidden print:block print-area">
        <PrintableFiche data={history[0]} patient={patientInfo} />
      </div>

      {/* STYLE CSS POUR FORCER LA MISE EN PAGE PRINT */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; background: white !important; color: black !important; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
          }
          @page { size: A4; margin: 1cm; }
        }
      `}} />
    </div>
  );
};

export default PatientFolder;