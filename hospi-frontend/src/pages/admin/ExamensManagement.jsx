import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Beaker,
  X
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import axios from '../../api/axios';

/**
 * ★ SOUS-COMPONENT POUR LA GESTION DES EXAMENS DE LABORATOIRE
 * Intégré dans la page Services comme sous-option
 */
const ExamensManagement = () => {
  const [examens, setExamens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  
  // Modal
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingExamen, setEditingExamen] = useState(null);
  const [examenToDelete, setExamenToDelete] = useState(null);
  
  // Formulaire
  const [formData, setFormData] = useState({
    code: '', nom: '', description: '', prix: '', unite: '',
    valeurMinReference: '', valeurMaxReference: '', categorie: 'BIOCHIMIE', delaiResultatHeures: 24
  });

  const categories = [
    { value: 'BIOCHIMIE', label: 'Biochimie', color: 'bg-blue-100 text-blue-800' },
    { value: 'HEMATOLOGIE', label: 'Hématologie', color: 'bg-red-100 text-red-800' },
    { value: 'SEROLOGIE', label: 'Sérologie', color: 'bg-green-100 text-green-800' },
    { value: 'MICROBIOLOGIE', label: 'Microbiologie', color: 'bg-purple-100 text-purple-800' },
    { value: 'IMMUNOLOGIE', label: 'Immunologie', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'HORMONOLOGIE', label: 'Hormonologie', color: 'bg-pink-100 text-pink-800' },
    { value: 'URINANALYSE', label: 'Urinanalyse', color: 'bg-cyan-100 text-cyan-800' }
  ];

  // Chargement des examens
  const fetchExamens = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/v1/examens');
      if (response.data.success) {
        setExamens(response.data.data || []);
      }
    } catch (error) {
      console.error('Erreur chargement examens:', error);
      toast.error('Erreur lors du chargement des examens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamens();
  }, []);

  // Filtrage
  const filteredExamens = examens.filter(examen => {
    const matchesSearch = 
      examen.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      examen.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      examen.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'ALL' || examen.categorie === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // CRUD
  const handleSave = async () => {
    if (!formData.code || !formData.nom || !formData.prix) {
      toast.error('Code, nom et prix sont obligatoires');
      return;
    }

    try {
      const payload = {
        ...formData,
        prix: parseFloat(formData.prix),
        valeurMinReference: formData.valeurMinReference ? parseFloat(formData.valeurMinReference) : null,
        valeurMaxReference: formData.valeurMaxReference ? parseFloat(formData.valeurMaxReference) : null,
        delaiResultatHeures: parseInt(formData.delaiResultatHeures) || 24
      };

      if (editingExamen) {
        const response = await axios.put(`/api/v1/examens/${editingExamen.id}`, payload);
        if (response.data.success) {
          toast.success('Examen modifié avec succès');
          setExamens(examens.map(e => e.id === editingExamen.id ? response.data.data : e));
        }
      } else {
        const response = await axios.post('/api/v1/examens', payload);
        if (response.data.success) {
          toast.success('Examen créé avec succès');
          setExamens([...examens, response.data.data]);
        }
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async () => {
    if (!examenToDelete) return;
    
    try {
      await axios.delete(`/api/v1/examens/${examenToDelete.id}`);
      toast.success('Examen supprimé avec succès');
      setExamens(examens.filter(e => e.id !== examenToDelete.id));
      setIsDeleteDialogOpen(false);
      setExamenToDelete(null);
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const openDialog = (examen = null) => {
    if (examen) {
      setEditingExamen(examen);
      setFormData({
        code: examen.code || '',
        nom: examen.nom || '',
        description: examen.description || '',
        prix: examen.prix || '',
        unite: examen.unite || '',
        valeurMinReference: examen.valeurMinReference || '',
        valeurMaxReference: examen.valeurMaxReference || '',
        categorie: examen.categorie || 'BIOCHIMIE',
        delaiResultatHeures: examen.delaiResultatHeures || 24
      });
    } else {
      setEditingExamen(null);
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      code: '', nom: '', description: '', prix: '', unite: '',
      valeurMinReference: '', valeurMaxReference: '', categorie: 'BIOCHIMIE', delaiResultatHeures: 24
    });
  };

  // Helpers
  const getCategoryColor = (categorie) => {
    const cat = categories.find(c => c.value === categorie);
    return cat?.color || 'bg-gray-100 text-gray-800';
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR').format(price || 0);
  };

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <Card className="border-none shadow-sm bg-card/50">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher un examen (nom ou code)..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Toutes les catégories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes les catégories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tableau */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Liste des examens ({filteredExamens.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredExamens.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Beaker className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucun examen trouvé</p>
              {searchTerm && <p className="text-sm mt-1">Essayez avec d'autres termes</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Code</th>
                    <th className="text-left py-3 px-4 font-medium">Nom</th>
                    <th className="text-left py-3 px-4 font-medium">Catégorie</th>
                    <th className="text-left py-3 px-4 font-medium">Prix</th>
                    <th className="text-left py-3 px-4 font-medium">Référence</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExamens.map((examen) => (
                    <tr key={examen.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <code className="bg-muted px-2 py-1 rounded text-sm">{examen.code}</code>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{examen.nom}</div>
                        {examen.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {examen.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getCategoryColor(examen.categorie)}>
                          {examen.categorie}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-green-600">
                          {formatPrice(examen.prix)} FC
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {examen.valeurMinReference && examen.valeurMaxReference ? (
                          <span>
                            {examen.valeurMinReference} - {examen.valeurMaxReference}
                            {examen.unite && ` ${examen.unite}`}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openDialog(examen)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { setExamenToDelete(examen); setIsDeleteDialogOpen(true); }}
                            className="text-red-500 hover:text-red-600 hover:bg-red-100"
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
        </CardContent>
      </Card>

      {/* Dialog Examen */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-blue-600" />
              {editingExamen ? 'Modifier un examen' : 'Nouvel examen'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input 
                  value={formData.code} 
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  placeholder="Ex: GLY, CRP, NFS"
                />
              </div>
              <div className="space-y-2">
                <Label>Catégorie *</Label>
                <Select 
                  value={formData.categorie} 
                  onValueChange={(val) => setFormData({...formData, categorie: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nom de l'examen *</Label>
              <Input 
                value={formData.nom} 
                onChange={(e) => setFormData({...formData, nom: e.target.value})}
                placeholder="Ex: Glycémie, CRP, NFS..."
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                value={formData.description} 
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Description optionnelle"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Prix (FC) *</Label>
                <Input 
                  type="number" 
                  value={formData.prix} 
                  onChange={(e) => setFormData({...formData, prix: e.target.value})}
                  placeholder="15000"
                />
              </div>
              <div className="space-y-2">
                <Label>Unité</Label>
                <Input 
                  value={formData.unite} 
                  onChange={(e) => setFormData({...formData, unite: e.target.value})}
                  placeholder="g/L, mmol/L..."
                />
              </div>
              <div className="space-y-2">
                <Label>Délai résultat (h)</Label>
                <Input 
                  type="number" 
                  value={formData.delaiResultatHeures} 
                  onChange={(e) => setFormData({...formData, delaiResultatHeures: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valeur min référence</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={formData.valeurMinReference} 
                  onChange={(e) => setFormData({...formData, valeurMinReference: e.target.value})}
                  placeholder="0.70"
                />
              </div>
              <div className="space-y-2">
                <Label>Valeur max référence</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={formData.valeurMaxReference} 
                  onChange={(e) => setFormData({...formData, valeurMaxReference: e.target.value})}
                  placeholder="1.10"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              {editingExamen ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Suppression */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Confirmer suppression
            </DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Êtes-vous sûr de vouloir supprimer l'examen <strong>{examenToDelete?.nom}</strong> ?
            <br />Cette action est irréversible.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExamensManagement;
