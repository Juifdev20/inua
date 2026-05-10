import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  FlaskConical, 
  Plus, 
  X, 
  Stethoscope,
  FileText,
  ChevronRight,
  Beaker,
  Microscope,
  Activity,
  Droplet,
  Dna,
  HeartPulse,
  Thermometer,
  TestTube
} from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import api from '../../api/axios';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ★ SELECTEUR D'EXAMENS PROFESSIONNEL POUR MÉDECIN
 * 
 * Design moderne, animations fluides, filtres par catégorie
 * Permet d'ajouter des directives/note pour chaque examen
 */

const CATEGORY_ICONS = {
  'BIOCHIMIE': Beaker,
  'HEMATOLOGIE': Droplet,
  'SEROLOGIE': Activity,
  'MICROBIOLOGIE': Microscope,
  'IMMUNOLOGIE': Dna,
  'HORMONOLOGIE': HeartPulse,
  'URINANALYSE': TestTube,
  'DEFAULT': FlaskConical
};

const CATEGORY_COLORS = {
  'BIOCHIMIE': 'from-[#37f49e] to-[#2bd98b]',
  'HEMATOLOGIE': 'from-red-500 to-pink-400',
  'SEROLOGIE': 'from-emerald-500 to-teal-400',
  'MICROBIOLOGIE': 'from-purple-500 to-violet-400',
  'IMMUNOLOGIE': 'from-amber-500 to-orange-400',
  'HORMONOLOGIE': 'from-rose-500 to-red-400',
  'URINANALYSE': 'from-cyan-500 to-blue-400',
  'DEFAULT': 'from-[#37f49e] to-[#2bd98b]'
};

const ExamenSelector = ({ 
  selectedExams = [], 
  onChange, 
  disabled = false,
  onExamAdded = null
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allExamens, setAllExamens] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [expandedExam, setExpandedExam] = useState(null);
  const [examNotes, setExamNotes] = useState({});
  
  // Notification inline (au-dessus du dialogue)
  const [notification, setNotification] = useState(null);

  // ═══════════════════════════════════════════════════════════════
  // CHARGEMENT DES EXAMENS ET CATÉGORIES
  // ═══════════════════════════════════════════════════════════════
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/v1/examens');
        
        if (response.data.success) {
          const examens = response.data.data || [];
          setAllExamens(examens);
          
          // Extraire les catégories uniques
          const cats = [...new Set(examens.map(e => e.categorie).filter(Boolean))];
          setCategories(cats);
        }
      } catch (error) {
        console.error('Erreur chargement:', error);
        toast.error('Erreur lors du chargement des examens');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // FILTRAGE
  // ═══════════════════════════════════════════════════════════════
  
  const filteredExams = useCallback(() => {
    return allExamens.filter(examen => {
      const matchesSearch = !searchQuery || 
        (examen.nom || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (examen.code || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'ALL' || 
        examen.categorie === selectedCategory;
      
      // Ne pas montrer les examens déjà sélectionnés
      const notSelected = !selectedExams.find(e => e.id === examen.id);
      
      return matchesSearch && matchesCategory && notSelected;
    });
  }, [allExamens, searchQuery, selectedCategory, selectedExams]);

  // ═══════════════════════════════════════════════════════════════
  // AJOUT D'UN EXAMEN
  // ═══════════════════════════════════════════════════════════════
  
  const handleAddExam = (exam) => {
    const newExam = {
      ...exam,
      doctorNote: examNotes[exam.id] || ''
    };
    
    onChange([...selectedExams, newExam]);
    setExamNotes(prev => ({ ...prev, [exam.id]: '' }));
    setExpandedExam(null);
    
    // Appeler le callback pour afficher notification au niveau parent
    if (onExamAdded) {
      onExamAdded(exam);
    }
    
    // Notification locale aussi
    setNotification({
      type: 'success',
      message: `✓ ${exam.nom} ajouté`,
      subMessage: `${exam.prix?.toLocaleString()} $`
    });
    setTimeout(() => setNotification(null), 2000);
  };

  // ═══════════════════════════════════════════════════════════════
  // SUPPRESSION
  // ═══════════════════════════════════════════════════════════════
  
  const handleRemoveExam = (examId) => {
    onChange(selectedExams.filter(e => e.id !== examId));
  };

  // ═══════════════════════════════════════════════════════════════
  // MISE À JOUR NOTE
  // ═══════════════════════════════════════════════════════════════
  
  const handleUpdateNote = (examId, note) => {
    onChange(selectedExams.map(e => 
      e.id === examId ? { ...e, doctorNote: note } : e
    ));
  };

  const availableExams = filteredExams();
  const totalPrice = selectedExams.reduce((sum, e) => sum + (e.prix || 0), 0);

  return (
    <div className="space-y-3 bg-card rounded-xl p-4 border border-border relative">
      {/* ═══════════════════════════════════════════════════════════════
          NOTIFICATION INLINE (apparaît au-dessus du dialogue)
      ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute -top-2 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-[#37f49e] to-[#2bd98b] text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-2 whitespace-nowrap"
          >
            <div className="bg-white/20 rounded-full p-1">
              <Plus className="w-3 h-3" />
            </div>
            <div>
              <span className="font-semibold text-sm">{notification.message}</span>
              <span className="text-xs text-white/80 ml-1">{notification.subMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════
          EN-TÊTE AVEC TOTAL
      ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedExams.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-r from-[#37f49e] to-[#2bd98b] rounded-xl p-4 text-white shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{selectedExams.length} examen{selectedExams.length > 1 ? 's' : ''} sélectionné{selectedExams.length > 1 ? 's' : ''}</p>
                  <p className="text-xs text-white/80">Total des analyses</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{totalPrice.toLocaleString()} $</p>
                <p className="text-xs text-white/80">Montant total</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════
          LISTE DES EXAMENS SÉLECTIONNÉS (Compact)
      ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="popLayout">
        {selectedExams.map((exam, index) => (
          <motion.div
            key={exam.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            layout
            className="bg-card rounded-lg p-3 shadow-sm border border-border"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge 
                    className={`bg-gradient-to-r ${CATEGORY_COLORS[exam.categorie] || CATEGORY_COLORS.DEFAULT} text-white border-0 text-[10px] px-1.5 py-0`}
                  >
                    {exam.categorie}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">{exam.code}</span>
                </div>
                <h4 className="font-medium text-sm text-foreground mt-1 truncate">{exam.nom}</h4>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-[#37f49e] text-sm">{exam.prix?.toLocaleString()} $</p>
                <button
                  onClick={() => handleRemoveExam(exam.id)}
                  className="text-red-500 hover:text-red-600 text-[10px] flex items-center gap-1 transition-colors mt-0.5"
                >
                  <X className="w-3 h-3" /> Suppr
                </button>
              </div>
            </div>
            
            {/* Zone de directive/note compacte */}
            <div className="mt-2 pt-2 border-t border-border">
              <Textarea
                value={exam.doctorNote || ''}
                onChange={(e) => handleUpdateNote(exam.id, e.target.value)}
                placeholder="Note pour le labo..."
                className="min-h-[40px] text-xs resize-none bg-background"
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════
          BARRE DE RECHERCHE ET FILTRES
      ═══════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher un examen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={disabled}
            className="pl-10 pr-4 h-10 text-sm rounded-lg border-border bg-muted/50 focus:ring-2 focus:ring-[#37f49e]/50"
          />
        </div>

        {/* Filtres par catégorie */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Tous
          </button>
          {categories.map(cat => {
            const Icon = CATEGORY_ICONS[cat] || CATEGORY_ICONS.DEFAULT;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                  selectedCategory === cat
                    ? `bg-gradient-to-r ${CATEGORY_COLORS[cat] || CATEGORY_COLORS.DEFAULT} text-white shadow-sm`
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Icon className="w-3 h-3" />
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          LISTE COMPACTE DES EXAMENS (Style Admin)
      ═══════════════════════════════════════════════════════════════ */}
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#37f49e]"></div>
        </div>
      ) : availableExams.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">
            {searchQuery || selectedCategory !== 'ALL' 
              ? "Aucun examen trouvé"
              : "Tous les examens sélectionnés"
            }
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          {/* En-tête tableau */}
          <div className="bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground grid grid-cols-12 gap-2 border-b border-border">
            <div className="col-span-5">Examen</div>
            <div className="col-span-2">Code</div>
            <div className="col-span-2">Catégorie</div>
            <div className="col-span-2 text-right">Prix</div>
            <div className="col-span-1"></div>
          </div>
          
          {/* Lignes examens */}
          <AnimatePresence>
            {availableExams.map((exam) => {
              const Icon = CATEGORY_ICONS[exam.categorie] || CATEGORY_ICONS.DEFAULT;
              const isExpanded = expandedExam === exam.id;
              
              return (
                <motion.div
                  key={exam.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`border-b border-border last:border-0 ${isExpanded ? 'bg-[#37f49e]/5' : 'hover:bg-muted/30'}`}
                >
                  {/* Ligne principale */}
                  <div 
                    onClick={() => setExpandedExam(isExpanded ? null : exam.id)}
                    className="px-4 py-3 grid grid-cols-12 gap-2 items-center cursor-pointer transition-colors"
                  >
                    <div className="col-span-5 flex items-center gap-2">
                      <div className={`p-1.5 rounded-md bg-gradient-to-br ${CATEGORY_COLORS[exam.categorie] || CATEGORY_COLORS.DEFAULT} text-white shrink-0`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium text-sm text-foreground truncate">{exam.nom}</span>
                    </div>
                    <div className="col-span-2 text-xs font-mono text-muted-foreground">{exam.code}</div>
                    <div className="col-span-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {exam.categorie}
                      </span>
                    </div>
                    <div className="col-span-2 text-right font-semibold text-[#37f49e]">
                      {exam.prix?.toLocaleString()} $
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>

                  {/* Expansion avec note */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border bg-muted/20"
                      >
                        <div className="px-4 py-3 space-y-2">
                          <Textarea
                            value={examNotes[exam.id] || ''}
                            onChange={(e) => setExamNotes(prev => ({ ...prev, [exam.id]: e.target.value }))}
                            placeholder="Directive/note pour le laboratoire..."
                            className="min-h-[50px] text-sm resize-none bg-background"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddExam(exam);
                              }}
                              className="bg-gradient-to-r from-[#37f49e] to-[#2bd98b] hover:from-[#2bd98b] hover:to-[#22c978] text-white"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" />
                              Ajouter
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Compteur */}
      {!loading && availableExams.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {availableExams.length} examen{availableExams.length > 1 ? 's' : ''} disponible{availableExams.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};

export default ExamenSelector;
