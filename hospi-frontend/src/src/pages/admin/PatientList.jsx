import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { 
  Search, 
  Plus, 
  Eye, 
  MoreVertical, 
  Filter,
  FileDown
} from 'lucide-react';
import api from '../../api/axios'; 
import { Button } from '../../components/ui/button';
import { toast } from "sonner";
import { cn } from '../../lib/utils';

// Imports PDF corrigés pour éviter l'erreur TypeError
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const PatientList = () => {
  const navigate = useNavigate(); 
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await api.get('/patients?size=50');
      setPatients(response.data.data.content || []);
    } catch (error) {
      console.error(error);
      toast.error("Erreur 403", { 
        description: "Accès refusé. Vérifiez votre connexion ou vos droits admin." 
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text("LISTE DES PATIENTS", 14, 15);
      
      const tableColumn = ["Code", "Nom & Prénom", "Genre", "Groupe Sanguin", "Statut"];
      const tableRows = patients.map((patient) => [
        patient.patientCode,
        `${patient.firstName} ${patient.lastName}`,
        patient.gender === 'MALE' ? 'Masculin' : 'Féminin',
        patient.bloodType || 'N/A',
        patient.isActive ? 'Actif' : 'Inactif'
      ]);

      // Appel corrigé : autoTable(doc, options)
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 25,
        headStyles: { fillColor: [55, 244, 158] }, // Ton vert #37f49e
        styles: { fontSize: 9 }
      });

      doc.save("liste_patients.pdf");
      toast.success("PDF généré avec succès");
    } catch (error) {
      console.error("Erreur PDF détaillée:", error);
      toast.error("Erreur PDF", { description: "Le moteur PDF a rencontré un problème." });
    }
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 2) {
      try {
        const res = await api.get(`/patients/search?query=${query}`);
        setPatients(res.data.data.content || []);
      } catch (err) { 
        console.error(err); 
      }
    } else if (query.length === 0) {
      fetchPatients();
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestion des Patients</h1>
          <p className="text-muted-foreground">Consultez et gérez les dossiers médicaux de l'hôpital.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="gap-2 border-[#37f49e] text-[#37f49e] hover:bg-[#37f49e]/10"
            onClick={exportToPDF}
          >
            <FileDown className="w-4 h-4" /> Export PDF
          </Button>
          <Button 
            className="gap-2 bg-[#37f49e] hover:bg-[#2bd98b] text-white shadow-lg shadow-[#37f49e]/20"
            onClick={() => navigate('/admin/patients/nouveau')}
          >
            <Plus className="w-4 h-4" /> Nouveau Patient
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par nom, code ou téléphone..."
            className="w-full bg-muted/50 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#37f49e]/50 outline-none transition-all"
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
        <Button variant="ghost" size="icon" className="hover:text-[#37f49e] hover:bg-[#37f49e]/10">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sexe</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan="4" className="p-8 text-center text-muted-foreground">Chargement...</td></tr>
              ) : (
                patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-[#37f49e]/5 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#37f49e]/10 flex items-center justify-center text-[#37f49e] font-bold">
                          {patient.firstName[0]}{patient.lastName[0]}
                        </div>
                        <span className="text-sm font-semibold">{patient.firstName} {patient.lastName}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-mono text-muted-foreground">{patient.patientCode}</td>
                    <td className="p-4 text-sm">{patient.gender}</td>
                    <td className="p-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:bg-[#37f49e]/20 hover:text-[#37f49e]"
                        onClick={() => navigate(`/admin/patients/${patient.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PatientList;