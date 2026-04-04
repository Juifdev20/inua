import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Eye, Search, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8080/api/v1/patients/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.data.documents) {
        setDocuments(response.data.data.documents);
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error("Erreur chargement documents:", error);
      toast.error("Impossible de charger vos documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleView = (doc) => {
    if (doc.fileUrl) {
      window.open(doc.fileUrl, '_blank');
    } else {
      toast.info("L'aperçu n'est pas disponible.");
    }
  };

  const handleDownload = async (doc) => {
    setDownloadingId(doc.id);
    try {
      const response = await axios({
        url: doc.fileUrl,
        method: 'GET',
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.title || 'document.pdf');
      document.body.appendChild(link);
      link.click();
      toast.success("Téléchargement terminé");
    } catch (error) {
      toast.error("Erreur de téléchargement");
    } finally {
      setDownloadingId(null);
    }
  };

  const getCategoryStyles = (category) => {
    const styles = {
      lab: 'bg-blue-500/10 text-blue-500',
      prescription: 'bg-emerald-500/10 text-emerald-500',
      imaging: 'bg-purple-500/10 text-purple-500',
    };
    return styles[category?.toLowerCase()] || 'bg-muted text-muted-foreground';
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesFilter = filter === 'all' || doc.category?.toLowerCase() === filter.toLowerCase();
    const matchesSearch = doc.title?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-muted-foreground font-medium animate-pulse">Synchronisation de vos documents...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in duration-700">
      {/* Header adapté au Profile */}
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-2">
          Mes Documents
        </h1>
        <p className="text-muted-foreground font-medium">Consultez vos résultats et ordonnances officiels</p>
      </div>

      {/* Barre de recherche et filtres - Adapté Dark Mode */}
      <div className="flex flex-col md:flex-row gap-6 mb-10">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
          <input
            type="text"
            placeholder="Rechercher un document..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-card border border-border rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-foreground shadow-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['all', 'lab', 'prescription', 'imaging'].map((catId) => (
            <button
              key={catId}
              onClick={() => setFilter(catId)}
              className={cn(
                "px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap border",
                filter === catId
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                  : 'bg-card text-muted-foreground border-border hover:border-emerald-500/50 hover:text-emerald-500'
              )}
            >
              {catId === 'all' ? 'Tous les fichiers' : catId === 'lab' ? 'Analyses' : catId === 'prescription' ? 'Ordonnances' : 'Imagerie'}
            </button>
          ))}
        </div>
      </div>

      {filteredDocuments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className="bg-card border border-border rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:border-emerald-500/20 transition-all group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/0 group-hover:bg-emerald-500 transition-colors" />
              
              <div className="flex items-start justify-between mb-6">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", getCategoryStyles(doc.category))}>
                  <FileText className="w-7 h-7" />
                </div>
                <span className="text-[10px] font-black text-muted-foreground bg-muted px-3 py-1.5 rounded-full uppercase tracking-widest border border-border">
                  {doc.type || 'PDF'}
                </span>
              </div>

              <h3 className="font-bold text-foreground mb-3 line-clamp-2 min-h-[3rem] text-lg leading-tight group-hover:text-emerald-500 transition-colors">
                {doc.title}
              </h3>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <span className="opacity-60 uppercase tracking-tighter">Date:</span>
                    <span className="text-foreground">{new Date(doc.createdAt || doc.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <span className="opacity-60 uppercase tracking-tighter">Émis par:</span>
                    <span className="text-foreground truncate">{doc.doctorName || doc.doctor || "Inua Afia Medical"}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <button 
                  onClick={() => handleView(doc)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-muted text-muted-foreground rounded-xl hover:bg-muted/80 transition-all text-xs font-black uppercase tracking-widest"
                >
                  <Eye className="w-4 h-4" /> Voir
                </button>
                <button 
                  disabled={downloadingId === doc.id}
                  onClick={() => handleDownload(doc)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/10 disabled:opacity-50"
                >
                  {downloadingId === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Doc
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-muted/20 rounded-[3rem] border-2 border-dashed border-border">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-muted-foreground/40" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Aucun document disponible</h3>
          <p className="text-muted-foreground max-w-xs mx-auto mt-2">Vos résultats d'analyses et ordonnances apparaîtront ici après validation médicale.</p>
        </div>
      )}
    </div>
  );
};

export default Documents;