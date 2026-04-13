import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { FileText, Download, Eye, Search, Loader2, Upload, FilePlus, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';

export default function Documents() {
  useTheme();
  const { token } = useAuth();
  
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Upload states
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [patientName, setPatientName] = useState('');
  const [documentType, setDocumentType] = useState('DOSSIER_PATIENT');
  const fileInputRef = useRef(null);

  // Delete confirmation state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Base API URL for documents
  const API_DOCUMENTS_URL = '/api/v1/documents';

  // Fetch documents from API
  const fetchDocuments = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const response = await fetch(API_DOCUMENTS_URL, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[DOCUMENTS] Réponse API:', data);
        const docs = data?.content || data || [];
        console.log('[DOCUMENTS] Documents extraits:', docs);
        setDocuments(Array.isArray(docs) ? docs : []);
      } else {
        console.error('Error fetching documents:', response.status);
        setDocuments([]);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Filter documents by search term
  const filteredDocuments = documents.filter((doc) => {
    const search = searchTerm.toLowerCase();
    return (
      doc.patientName?.toLowerCase().includes(search) ||
      doc.fileName?.toLowerCase().includes(search) ||
      doc.createdAt?.toLowerCase().includes(search)
    );
  });

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Handle preview and download using the new unified function with Blob support
  const handleFileAction = async (id, fileName, isPreview = true) => {
    if (!token || !id) return;
    
    try {
      const response = await axios.get(`${API_DOCUMENTS_URL}/download/${id}`, {
        responseType: 'blob',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const file = new Blob([response.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);

      if (isPreview) {
        window.open(fileURL, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = fileURL;
        link.setAttribute('download', fileName || `document_${id}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      // Libérer la mémoire
      setTimeout(() => URL.revokeObjectURL(fileURL), 100);
    } catch (error) {
      console.error("Erreur Document:", error);
      // Handle error - could use toast notification here
    }
  };

  // Handle preview (open PDF in new tab)
  const handlePreview = (doc) => {
    handleFileAction(doc.id, doc.fileName, true);
  };

  // Handle download
  const handleDownload = (doc) => {
    handleFileAction(doc.id, doc.fileName, false);
  };

  // Open delete confirmation modal
  const handleDeleteClick = (doc) => {
    setDocumentToDelete(doc);
    setIsDeleteOpen(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!token || !documentToDelete?.id) return;

    setDeleting(true);
    try {
      const response = await fetch(`${API_DOCUMENTS_URL}/${documentToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Refresh documents list
        fetchDocuments();
        setIsDeleteOpen(false);
        setDocumentToDelete(null);
      } else {
        console.error('Delete failed:', response.status);
        alert('Échec de la suppression du document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  // Cancel delete
  const handleCancelDelete = () => {
    setIsDeleteOpen(false);
    setDocumentToDelete(null);
  };

  // Get payment status badge
  const getPaymentBadge = (doc) => {
    const isPaid = doc.paymentStatus === 'SOLDE' || doc.remainingCredit === 0 || doc.remainingCredit === null;
    
    if (isPaid) {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold text-[10px] uppercase tracking-widest">
          <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
          Soldé
        </Badge>
      );
    }
    
    return (
      <Badge className="bg-red-500/10 text-red-600 border-red-500/20 font-bold text-[10px] uppercase tracking-widest">
        <div className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse" />
        Crédit: {doc.remainingCredit?.toLocaleString() || 0} CFA
      </Badge>
    );
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile || !patientName || !token) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('patientName', patientName);
      formData.append('documentType', documentType);

      const response = await fetch(`${API_DOCUMENTS_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[DOCUMENTS] Upload réussi:', result);
        // Reset form and refresh documents
        setSelectedFile(null);
        setPatientName('');
        setDocumentType('DOSSIER_PATIENT');
        setIsUploadOpen(false);
        // Attendre 500ms pour laisser la transaction se propager
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchDocuments();
      } else {
        console.error('Upload failed:', response.status);
        alert('Échec de l\'importation du document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Erreur lors de l\'importation');
    } finally {
      setUploading(false);
    }
  };

  // Cancel upload
  const handleCancelUpload = () => {
    setSelectedFile(null);
    setPatientName('');
    setDocumentType('DOSSIER_PATIENT');
    setIsUploadOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={cn('text-3xl font-black tracking-tight text-foreground')}>
            Documents
          </h1>
          <p className="text-sm mt-2 text-muted-foreground font-medium">
            Consultez et gérez les archives des fiches patients terminées
          </p>
        </div>
        <Button 
          onClick={() => setIsUploadOpen(true)}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
        >
          <FilePlus className="w-4 h-4" />
          Importer un document
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom du patient ou date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button 
          variant="outline" 
          onClick={fetchDocuments}
          className="gap-2"
        >
          <Loader2 className={cn("w-4 h-4", loading && "animate-spin")} />
          Actualiser
        </Button>
      </div>

      <div className={cn('rounded-2xl border border-border overflow-hidden bg-card shadow-sm')}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Chargement des documents...</span>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">
              {searchTerm ? 'Aucun document ne correspond à votre recherche' : 'Aucun document disponible'}
            </p>
            {!searchTerm && (
              <p className="text-sm text-muted-foreground mt-2">
                Les documents apparaîtront automatiquement ici une fois les consultations terminées
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Document
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Patient
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Date de création
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Statut Paiement
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    className={cn(
                      'transition-colors group',
                      'hover:bg-muted/50'
                    )}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <FileText className="w-5 h-5 text-blue-500" />
                        </div>
                        <span className={cn('font-bold text-foreground tracking-tight text-sm max-w-[200px] truncate')}>
                          {doc.fileName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn('font-medium text-foreground')}>
                        {doc.patientName || 'Inconnu'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn('text-sm font-medium text-muted-foreground')}>
                        {formatDate(doc.createdAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPaymentBadge(doc)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-9 w-9 rounded-lg hover:bg-blue-500/10 hover:text-blue-500"
                          onClick={() => handlePreview(doc)}
                          title="Prévisualiser"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-9 w-9 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-500"
                          onClick={() => handleDownload(doc)}
                          title="Télécharger"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-9 w-9 rounded-lg hover:bg-red-500/10 hover:text-red-500"
                          onClick={() => handleDeleteClick(doc)}
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Importer un document</DialogTitle>
            <DialogDescription>
              Téléversez un document patient (PDF, image, etc.)
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* File Input */}
            <div className="grid gap-2">
              <Label htmlFor="file">Fichier</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="flex-1"
                />
              </div>
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  <span>{selectedFile.name}</span>
                  <span className="text-xs">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>
            </div>

            {/* Patient Name */}
            <div className="grid gap-2">
              <Label htmlFor="patientName">Nom du patient</Label>
              <Input
                id="patientName"
                placeholder="Entrez le nom du patient"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
              />
            </div>

            {/* Document Type */}
            <div className="grid gap-2">
              <Label htmlFor="documentType">Type de document</Label>
              <select
                id="documentType"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
              >
                <option value="DOSSIER_PATIENT">Dossier Patient</option>
                <option value="PRESCRIPTION">Ordonnance</option>
                <option value="ANALYSE_LABORATOIRE">Bilan Laboratoire</option>
                <option value="FACTURE">Facture</option>
                <option value="ADMISSION">Admission</option>
              </select>
            </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelUpload}>
              Annuler
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || !patientName || uploading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importation...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription className="pt-2">
              Êtes-vous sûr de vouloir supprimer définitivement ce document ?
              <br />
              <span className="font-semibold text-foreground">{documentToDelete?.fileName}</span>
              <br />
              <span className="text-red-500 font-medium">Cette action est irréversible !</span>
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="gap-2 sm:justify-end">
            <Button 
              variant="outline" 
              onClick={handleCancelDelete}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer définitivement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

