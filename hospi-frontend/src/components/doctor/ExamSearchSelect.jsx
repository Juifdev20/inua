import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Check, FlaskConical, Loader2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import api from '../../api/axios';
import { toast } from 'sonner';

/**
 * ★ COMPOSANT MULTI-SELECT AVEC RECHERCHE D'EXAMENS
 * 
 * Permet au médecin de:
 * - Rechercher des examens par nom ou code
 * - Sélectionner plusieurs examens
 * - Voir le prix total en temps réel
 * - Ajouter une note pour chaque examen
 */
const ExamSearchSelect = ({ 
  selectedExams = [], 
  onChange, 
  onTotalPriceChange,
  disabled = false 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [availableExams, setAvailableExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedExamNotes, setSelectedExamNotes] = useState({});
  
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // ═══════════════════════════════════════════════════════════════
  // RECHERCHE AVEC DEBOUNCE
  // ═══════════════════════════════════════════════════════════════
  
  const searchExams = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setAvailableExams([]);
      return;
    }
    
    try {
      setLoading(true);
      const response = await api.get(`/api/v1/examens/search?query=${encodeURIComponent(query)}`);
      
      if (response.data.success) {
        // Filtrer les examens déjà sélectionnés
        const selectedIds = selectedExams.map(e => e.id);
        const filtered = response.data.data.filter(exam => !selectedIds.includes(exam.id));
        setAvailableExams(filtered);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Erreur recherche examens:', error);
      toast.error('Erreur lors de la recherche des examens');
    } finally {
      setLoading(false);
    }
  }, [selectedExams]);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      searchExams(searchQuery);
    }, 300); // 300ms debounce
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, searchExams]);

  // ═══════════════════════════════════════════════════════════════
  // GESTION CLIC EXTERNE
  // ═══════════════════════════════════════════════════════════════
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // SÉLECTION D'UN EXAMEN
  // ═══════════════════════════════════════════════════════════════
  
  const handleSelectExam = (exam) => {
    const newSelected = [...selectedExams, { 
      ...exam, 
      quantity: 1,
      note: selectedExamNotes[exam.id] || '' 
    }];
    
    onChange(newSelected);
    setSearchQuery('');
    setAvailableExams([]);
    setShowResults(false);
    
    // Notification
    toast.success(`${exam.nom} ajouté`, { duration: 1500 });
  };

  // ═══════════════════════════════════════════════════════════════
  // SUPPRESSION D'UN EXAMEN
  // ═══════════════════════════════════════════════════════════════
  
  const handleRemoveExam = (examId) => {
    const newSelected = selectedExams.filter(e => e.id !== examId);
    onChange(newSelected);
    
    // Nettoyer la note associée
    const newNotes = { ...selectedExamNotes };
    delete newNotes[examId];
    setSelectedExamNotes(newNotes);
  };

  // ═══════════════════════════════════════════════════════════════
  // MISE À JOUR DE LA NOTE
  // ═══════════════════════════════════════════════════════════════
  
  const handleNoteChange = (examId, note) => {
    const newSelected = selectedExams.map(exam => 
      exam.id === examId ? { ...exam, note } : exam
    );
    onChange(newSelected);
    
    setSelectedExamNotes(prev => ({ ...prev, [examId]: note }));
  };

  // ═══════════════════════════════════════════════════════════════
  // CALCUL PRIX TOTAL
  // ═══════════════════════════════════════════════════════════════
  
  const totalPrice = selectedExams.reduce((sum, exam) => {
    const price = exam.prix || 0;
    const qty = exam.quantity || 1;
    return sum + (price * qty);
  }, 0);

  // Notifier le parent du changement de prix
  useEffect(() => {
    if (onTotalPriceChange) {
      onTotalPriceChange(totalPrice);
    }
  }, [totalPrice, onTotalPriceChange]);

  // ═══════════════════════════════════════════════════════════════
  // RENDU
  // ═══════════════════════════════════════════════════════════════
  
  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR').format(price || 0);
  };

  const getCategoryColor = (categorie) => {
    const colors = {
      'BIOCHIMIE': 'bg-blue-100 text-blue-800',
      'HEMATOLOGIE': 'bg-red-100 text-red-800',
      'SEROLOGIE': 'bg-green-100 text-green-800',
      'MICROBIOLOGIE': 'bg-purple-100 text-purple-800',
      'DEFAULT': 'bg-gray-100 text-gray-800'
    };
    return colors[categorie] || colors.DEFAULT;
  };

  return (
    <div className="space-y-4" ref={searchRef}>
      {/* BARRE DE RECHERCHE */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher un examen (ex: Glycémie, CRP, NFS...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={disabled}
            className="pl-10 pr-10"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
          {searchQuery && !loading && (
            <button
              onClick={() => {
                setSearchQuery('');
                setAvailableExams([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* RÉSULTATS DE RECHERCHE */}
        {showResults && availableExams.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
            {availableExams.map((exam) => (
              <button
                key={exam.id}
                onClick={() => handleSelectExam(exam)}
                className="w-full px-4 py-3 text-left hover:bg-accent flex items-start gap-3 transition-colors"
              >
                <FlaskConical className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{exam.nom}</span>
                    <Badge variant="secondary" className={`text-xs ${getCategoryColor(exam.categorie)}`}>
                      {exam.categorie || 'Labo'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Code: {exam.code}</span>
                    <span>•</span>
                    <span className="font-medium text-green-600">
                      {formatPrice(exam.prix)} FC
                    </span>
                    {exam.unite && (
                      <>
                        <span>•</span>
                        <span>Unité: {exam.unite}</span>
                      </>
                    )}
                  </div>
                  {exam.valeursReference && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Réf: {exam.valeursReference}
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  <div className="w-6 h-6 rounded-full border-2 border-primary/30 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                    <span className="text-lg leading-none">+</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {showResults && searchQuery.length >= 2 && availableExams.length === 0 && !loading && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-4 text-center text-muted-foreground">
            Aucun examen trouvé pour "{searchQuery}"
          </div>
        )}
      </div>

      {/* LISTE DES EXAMENS SÉLECTIONNÉS */}
      {selectedExams.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">
              {selectedExams.length} examen{selectedExams.length > 1 ? 's' : ''} sélectionné{selectedExams.length > 1 ? 's' : ''}
            </h4>
            <div className="text-sm font-bold text-green-600">
              Total: {formatPrice(totalPrice)} FC
            </div>
          </div>

          <div className="space-y-2">
            {selectedExams.map((exam) => (
              <div 
                key={exam.id}
                className="flex items-start gap-3 p-3 bg-accent/50 rounded-lg border"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{exam.nom}</div>
                      <div className="text-xs text-muted-foreground">
                        {exam.code} • {formatPrice(exam.prix)} FC
                        {exam.unite && ` • ${exam.unite}`}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveExam(exam.id)}
                      disabled={disabled}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-100"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* CHAMP NOTE */}
                  <div>
                    <Input
                      type="text"
                      placeholder="Note du médecin (optionnel)"
                      value={exam.note || ''}
                      onChange={(e) => handleNoteChange(exam.id, e.target.value)}
                      disabled={disabled}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* TOTAL FINAL */}
          <div className="flex items-center justify-between pt-3 border-t">
            <span className="text-sm text-muted-foreground">Prix total des examens</span>
            <span className="text-lg font-bold text-green-600">
              {formatPrice(totalPrice)} FC
            </span>
          </div>
        </div>
      )}

      {selectedExams.length === 0 && (
        <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
          <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucun examen sélectionné</p>
          <p className="text-xs mt-1">Tapez le nom d'un examen pour le rechercher</p>
        </div>
      )}
    </div>
  );
};

export default ExamSearchSelect;
