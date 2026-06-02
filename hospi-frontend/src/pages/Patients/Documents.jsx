import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, AlertCircle, FileCheck, FileTextIcon, Shield } from 'lucide-react';
import api from '../../services/patients/Api';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

/**
 * 🛡️ MES DOCUMENTS - ESPACE PATIENT (SÉCURISÉ)
 * 
 * Fonctionnalités :
 * - Liste des fiches médicales individuelles (générées auto après consultation + paiement complet)
 * - Vérification du mot de passe obligatoire avant chaque accès (sécurité renforcée)
 * - Session temporaire de 5 minutes
 * - Visualisation et téléchargement PDF depuis la fiche médicale uniquement
 */
const Documents = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  // 📄 Navigation vers la fiche médicale (mot de passe demandé dans MedicalReportPatientView)

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/patient/documents');
      
      if (response.data && response.data.content) {
        setDocuments(response.data.content);
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error("Erreur chargement documents:", error);
      if (error.response?.status !== 401) {
        toast.error("Impossible de charger vos documents");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // 🎨 Icônes et styles par type
  const getDocumentIcon = () => <FileCheck className="w-7 h-7" />;
  
  const getCategoryStyles = () => 'bg-emerald-500/10 text-emerald-500';

  // 🔍 Filtre des documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = (doc.fileName || doc.patientName || '')
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-muted-foreground font-medium animate-pulse">Chargement de vos documents médicaux...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            Mes Documents
          </h1>
          <div className="flex items-center gap-1 px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full text-xs font-bold border border-amber-500/20">
            <Shield className="w-3 h-3" />
            SÉCURISÉ
          </div>
        </div>
        <p className="text-muted-foreground font-medium">
          Consultez vos fiches médicales individuelles (accès protégé par mot de passe)
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          💡 Les fiches sont générées automatiquement après consultation terminée et paiement complet
        </p>
      </div>

      {/* Barre de recherche */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
          <input
            type="text"
            placeholder="Rechercher une fiche..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-card border border-border rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-foreground shadow-sm"
          />
        </div>
      </div>

      {/* Liste des documents */}
      {filteredDocuments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-emerald-500/30 transition-all group relative overflow-hidden">
              <div className="flex items-start justify-between mb-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", getCategoryStyles())}>
                  {getDocumentIcon()}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-black text-muted-foreground bg-muted px-2 py-1 rounded-full uppercase tracking-wider border border-border">
                    FICHE MÉDICALE
                  </span>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                    doc.paymentStatus === 'SOLDE' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                  )}>
                    {doc.paymentStatus === 'SOLDE' ? '✓ Couvert' : 'Crédit'}
                  </span>
                </div>
              </div>

              <h3 className="font-bold text-foreground mb-1 line-clamp-2 text-base leading-tight">
                Fiche Médicale Individuelle
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                N° {doc.fileName?.match(/(\d{4}\/\d{4})/)?.[0] || `FICHE-${doc.id}`}
              </p>

              <div className="space-y-2 mb-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium text-foreground">
                    {new Date(doc.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Patient:</span>
                  <span className="font-medium text-foreground truncate max-w-[150px]">{doc.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Couverture:</span>
                  {doc.paymentStatus === 'SOLDE' ? (
                    <span className="font-bold text-emerald-600 text-xs">✓ 100% Couvert</span>
                  ) : (
                    <span className="font-medium text-amber-600 text-xs">
                      Reste: {doc.remainingCredit?.toLocaleString() || doc.totalAmount?.toLocaleString() || '0'} $
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <button 
                  onClick={() => navigate(`/patient/medical-report/${doc.consultationId}`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all text-xs font-bold uppercase"
                >
                  <FileTextIcon className="w-4 h-4" /> Voir Fiche
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-border">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-muted-foreground/40" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Aucune fiche médicale disponible</h3>
          <p className="text-muted-foreground max-w-md mx-auto text-sm">
            Les fiches médicales individuelles sont générées automatiquement lorsque :
          </p>
          <ul className="text-sm text-muted-foreground mt-4 space-y-1 text-left max-w-md mx-auto">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              Votre consultation est terminée par le médecin
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              Tous les frais (fiche + consultation + examens) sont payés
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default Documents;