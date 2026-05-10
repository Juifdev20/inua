import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  Stethoscope, 
  FlaskConical, 
  Ambulance, 
  Scan, 
  Bed, 
  Pill, 
  Baby,
  Loader2,
  DollarSign,
  RefreshCw,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  Info,
  Calendar,
  Activity,
  Microscope,
  ArrowUpRight,
  Package,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import axios from 'axios';

// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * ═══════════════════════════════════════════════════════════
 * ★ CONFIGURATION DES CATÉGORIES ET LEURS ICÔNES
 * ═══════════════════════════════════════════════════════════
 */
const CATEGORY_CONFIG = {
  URGENCE: {
    label: 'Urgence',
    icon: Ambulance,
    color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    gradient: 'from-rose-500/10 to-rose-600/5'
  },
  LABORATOIRE: {
    label: 'Laboratoire',
    icon: FlaskConical,
    color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    gradient: 'from-emerald-500/10 to-emerald-600/5'
  },
  CONSULTATION: {
    label: 'Consultation',
    icon: Stethoscope,
    color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    gradient: 'from-blue-500/10 to-blue-600/5'
  },
  IMAGERIE: {
    label: 'Imagerie',
    icon: Scan,
    color: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30',
    gradient: 'from-violet-500/10 to-violet-600/5'
  },
  CHIRURGIE: {
    label: 'Chirurgie',
    icon: Stethoscope,
    color: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
    gradient: 'from-red-500/10 to-red-600/5'
  },
  HOSPITALISATION: {
    label: 'Hospitalisation',
    icon: Bed,
    color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    gradient: 'from-amber-500/10 to-amber-600/5'
  },
  PHARMACIE: {
    label: 'Pharmacie',
    icon: Pill,
    color: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
    gradient: 'from-cyan-500/10 to-cyan-600/5'
  },
  MATERNITE: {
    label: 'Maternité',
    icon: Baby,
    color: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30',
    gradient: 'from-pink-500/10 to-pink-600/5'
  },
  AUTRE: {
    label: 'Autre',
    icon: Stethoscope,
    color: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
    gradient: 'from-slate-500/10 to-slate-600/5'
  }
};

/**
 * ═══════════════════════════════════════════════════════════
 * ★ MAPPAGE DES ICÔNES DU BACKEND
 * ═══════════════════════════════════════════════════════════
 */
const ICON_MAP = {
  ambulance: Ambulance,
  flask: FlaskConical,
  stethoscope: Stethoscope,
  scan: Scan,
  procedures: Stethoscope,
  bed: Bed,
  pill: Pill,
  baby: Baby
};

/**
 * ═══════════════════════════════════════════════════════════
 * ★ COMPOSANT: STAT CARD (Inspiré de PharmacyReports)
 * ═══════════════════════════════════════════════════════════
 */
const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <Card className="border-none shadow-sm bg-card overflow-hidden transition-all duration-300 hover:shadow-md">
    <CardContent className="p-4 md:p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
            {title}
          </p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="text-2xl md:text-3xl font-black text-foreground">{value}</h3>
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        <div
          className="p-2.5 md:p-3 rounded-xl transition-transform hover:scale-110 shrink-0 ml-3"
          style={{ backgroundColor: `${color}20`, color: color }}
        >
          <Icon className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
        </div>
      </div>
    </CardContent>
  </Card>
);

/**
 * ═══════════════════════════════════════════════════════════
 * ★ SERVICE CATALOG - Catalogue des prestations
 * ═══════════════════════════════════════════════════════════
 */
export default function ServiceCatalog() {
  // ═══════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL', 'SERVICES', 'EXAMENS'

  // ═══════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════
  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory && selectedCategory !== 'ALL') params.append('category', selectedCategory);
      params.append('currency', selectedCurrency);
      
      const response = await axios.get(`${API_URL}/api/v1/patient/services-catalog?${params.toString()}`);
      setServices(response.data || []);
    } catch (err) {
      console.error('Error fetching services:', err);
      setError('Impossible de charger le catalogue des services');
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedCurrency]);

  // ═══════════════════════════════════════════════════════════
  // FILTERED DATA BY TYPE (Services vs Examens)
  // ═══════════════════════════════════════════════════════════
  const filteredServices = useMemo(() => {
    if (activeTab === 'ALL') return services;
    return services.filter(s => s.type === activeTab);
  }, [services, activeTab]);

  const stats = useMemo(() => {
    const total = services.length;
    const servicesCount = services.filter(s => s.type === 'SERVICE').length;
    const examensCount = services.filter(s => s.type === 'EXAMEN').length;
    return { total, servicesCount, examensCount };
  }, [services]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/patient/services-catalog/categories`);
      setCategories(response.data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchServices();
    }, 300); // Debounce de 300ms
    
    return () => clearTimeout(timeoutId);
  }, [fetchServices]);

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════
  const getCategoryConfig = (category) => {
    const key = Object.keys(CATEGORY_CONFIG).find(k => 
      category?.toUpperCase().includes(k)
    ) || 'AUTRE';
    return CATEGORY_CONFIG[key] || CATEGORY_CONFIG.AUTRE;
  };

  const getIconComponent = (iconName) => {
    return ICON_MAP[iconName] || Stethoscope;
  };

  const formatPrice = (price, currency) => {
    if (price === null || price === undefined) return '-';
    
    const symbol = currency === 'FC' ? 'FC' : '$';
    const formatted = Number(price).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return `${symbol} ${formatted}`;
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════
  const renderCategoryChips = () => {
    const allCategories = ['ALL', ...categories];
    
    return (
      <div className="flex flex-wrap gap-2 mb-6">
        {allCategories.map((category) => {
          const isActive = selectedCategory === category;
          const config = category === 'ALL' ? null : getCategoryConfig(category);
          
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-bold transition-all duration-200",
                isActive 
                  ? 'bg-primary text-primary-foreground shadow-md scale-105' 
                  : 'bg-background text-muted-foreground border border-border hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {category === 'ALL' ? 'Toutes catégories' : (config?.label || category)}
            </button>
          );
        })}
      </div>
    );
  };

  const renderTabButtons = () => (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => setActiveTab('ALL')}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200",
          activeTab === 'ALL'
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'bg-background text-muted-foreground border border-border hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <Package className="w-4 h-4" />
        Tous ({stats.total})
      </button>
      <button
        onClick={() => setActiveTab('SERVICE')}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200",
          activeTab === 'SERVICE'
            ? 'bg-blue-600 text-white shadow-md'
            : 'bg-background text-muted-foreground border border-border hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <Stethoscope className="w-4 h-4" />
        Services ({stats.servicesCount})
      </button>
      <button
        onClick={() => setActiveTab('EXAMEN')}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200",
          activeTab === 'EXAMEN'
            ? 'bg-emerald-600 text-white shadow-md'
            : 'bg-background text-muted-foreground border border-border hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <Microscope className="w-4 h-4" />
        Examens ({stats.examensCount})
      </button>
    </div>
  );

  const renderServiceCard = (service) => {
    const config = getCategoryConfig(service.category);
    const IconComponent = getIconComponent(service.icon);
    const isService = service.type === 'SERVICE';
    
    return (
      <Card 
        key={`${service.type}-${service.id}`}
        className={cn(
          "group overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1",
          "bg-gradient-to-br",
          config.gradient,
          "dark:from-transparent dark:to-transparent dark:bg-card"
        )}
      >
        <CardContent className="p-5 md:p-6">
          {/* Header avec icône et badge */}
          <div className="flex items-start justify-between mb-4">
            <div className={cn(
              "p-3 rounded-2xl transition-transform group-hover:scale-110",
              config.color
            )}>
              <IconComponent className="w-6 h-6" />
            </div>
            <Badge 
              variant={isService ? "default" : "secondary"}
              className={cn(
                "text-xs font-bold",
                isService 
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" 
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              )}
            >
              {isService ? 'Service' : 'Examen'}
            </Badge>
          </div>
          
          {/* Nom du service */}
          <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {service.name}
          </h3>
          
          {/* Code */}
          {service.code && (
            <p className="text-xs text-muted-foreground mb-3 font-medium">
              Code: {service.code}
            </p>
          )}
          
          {/* Description */}
          {service.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {service.description}
            </p>
          )}
          
          {/* Prix */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tarif</p>
              <p className={cn(
                "text-2xl font-black",
                isService 
                  ? "text-blue-600 dark:text-blue-400" 
                  : "text-emerald-600 dark:text-emerald-400"
              )}>
                {formatPrice(service.price, service.currency)}
              </p>
            </div>
            
            {/* Délai ou durée */}
            {(service.durationMinutes || service.resultDelay) && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                {service.durationMinutes 
                  ? `${service.durationMinutes} min` 
                  : service.resultDelay}
              </div>
            )}
          </div>
          
          {/* Informations additionnelles */}
          <div className="mt-3 flex flex-wrap gap-2">
            {service.category && (
              <Badge variant="outline" className="text-xs">
                {config.label || service.category}
              </Badge>
            )}
            {service.unit && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Unité: {service.unit}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-foreground">
                  Catalogue des Services
                </h1>
              </div>
              <p className="text-muted-foreground mt-2 ml-14">
                Découvrez nos prestations et leurs tarifs
              </p>
            </div>
            
            {/* Sélecteur de devise */}
            <div className="flex items-center gap-2 bg-muted rounded-xl p-1">
              <button
                onClick={() => setSelectedCurrency('USD')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5",
                  selectedCurrency === 'USD'
                    ? 'bg-card text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <DollarSign className="w-4 h-4" />
                USD
              </button>
              <button
                onClick={() => setSelectedCurrency('FC')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  selectedCurrency === 'FC'
                    ? 'bg-card text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                FC
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Stats Cards - Inspiré de PharmacyReports */}
        {!loading && !error && stats.total > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard 
              title="Total Prestations" 
              value={stats.total} 
              icon={Package} 
              color="#3B82F6"
              subtitle="Services & Examens"
            />
            <StatCard 
              title="Services Médicaux" 
              value={stats.servicesCount} 
              icon={Stethoscope} 
              color="#10B981"
              subtitle="Consultations & Actes"
            />
            <StatCard 
              title="Examens Labo" 
              value={stats.examensCount} 
              icon={Microscope} 
              color="#8B5CF6"
              subtitle="Biologie & Analyses"
            />
          </div>
        )}

        {/* Search & Filters Card */}
        <Card className="mb-8 border shadow-sm bg-card">
          <CardContent className="p-6">
            {/* Barre de recherche */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher un service, un examen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg rounded-xl border-input 
                         bg-background focus:bg-card transition-all"
              />
            </div>

            {/* Onglets Services/Examens */}
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Filtrer par type
              </p>
              {renderTabButtons()}
            </div>
            
            {/* Bouton filtres avancés */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm font-bold text-muted-foreground 
                       hover:text-foreground transition-colors mb-2"
            >
              <Filter className="w-4 h-4" />
              Filtres par catégorie
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {/* Filtres par catégorie */}
            {showFilters && renderCategoryChips()}
          </CardContent>
        </Card>

        {/* Results count */}
        {!loading && !error && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-muted-foreground">
              <span className="font-bold text-foreground">{filteredServices.length}</span> prestation(s) trouvée(s)
              {activeTab !== 'ALL' && (
                <span className="text-sm ml-2">
                  ({activeTab === 'SERVICE' ? 'Services uniquement' : 'Examens uniquement'})
                </span>
              )}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchServices}
              className="rounded-lg gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="border shadow-sm bg-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <Skeleton className="w-12 h-12 rounded-2xl" />
                    <Skeleton className="w-20 h-6 rounded-full" />
                  </div>
                  <Skeleton className="w-3/4 h-6 mb-2" />
                  <Skeleton className="w-1/2 h-4 mb-4" />
                  <Skeleton className="w-full h-4 mb-2" />
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <Skeleton className="w-24 h-8" />
                    <Skeleton className="w-16 h-4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <Card className="border shadow-sm bg-destructive/5">
            <CardContent className="p-8 text-center">
              <Info className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-bold text-destructive mb-2">
                Une erreur est survenue
              </h3>
              <p className="text-destructive/80 mb-4">
                {error}
              </p>
              <Button onClick={fetchServices} variant="destructive">
                <RefreshCw className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Services Grid - using filteredServices */}
        {!loading && !error && filteredServices.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map(renderServiceCard)}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredServices.length === 0 && (
          <Card className="border shadow-sm bg-muted/30">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                Aucune prestation trouvée
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Essayez de modifier vos critères de recherche, de sélectionner une autre catégorie ou de changer d'onglet (Services/Examens).
              </p>
            </CardContent>
          </Card>
        )}

        {/* Info Footer */}
        <div className="mt-12 p-6 bg-primary/5 border border-primary/10 rounded-2xl">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-xl bg-primary/10 shrink-0">
              <Info className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-bold text-foreground mb-2">
                Informations importantes
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Les tarifs affichés sont indicatifs et peuvent varier selon la complexité de la prestation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Pour les examens de laboratoire, les délais de résultats sont estimatifs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Certaines prestations nécessitent un rendez-vous préalable</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Les tarifs en FC sont calculés selon le taux du jour (1 USD = 2800 FC)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
