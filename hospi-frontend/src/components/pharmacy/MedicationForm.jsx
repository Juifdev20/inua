import React, { useState, useEffect } from 'react';
import { medicationAPI } from '../../api/medication';
import { 
  Pill, 
  Tag, 
  Package, 
  AlertTriangle, 
  DollarSign, 
  TrendingUp, 
  Beaker, 
  Calendar, 
  Building2, 
  Factory, 
  FolderOpen,
  FileText,
  Save,
  X
} from 'lucide-react';

const MedicationForm = ({ onMedicationAdded, onClose, medication }) => {
  const [formData, setFormData] = useState({
    name: '',
    medicationCode: '',
    stockQuantity: '',
    minimumStock: '10', // Seuil d'alerte par défaut
    price: '', // Prix d'achat (fournisseur)
    unitPrice: '', // Prix de vente (patient)
    form: '',
    strength: '',
    purchaseDate: '',
    supplier: '',
    manufacturer: '',
    category: '',
    description: '',
    genericName: ''
  });

  // Effet pour pré-remplir le formulaire en mode édition
  useEffect(() => {
    if (medication) {
      console.log('📝 Mode édition - Pré-remplissage avec:', medication);
      console.log('📝 Champs disponibles:', Object.keys(medication));
      
      // Afficher chaque champ avec sa valeur pour le debug
      Object.keys(medication).forEach(key => {
        console.log(`  - ${key}: "${medication[key]}"`);
      });
      
      // Mapping flexible des champs pour gérer différents formats de données
      const mappedData = {
        name: medication.name || medication.medicationName || medication.medication_name || '',
        medicationCode: medication.medicationCode || medication.medication_code || '',
        stockQuantity: medication.stockQuantity || medication.currentStock || medication.stock_quantity || '',
        minimumStock: medication.minimumStock || medication.minimum_stock || medication.stockAlert || '10',
        price: medication.price || '',
        unitPrice: medication.unitPrice || medication.unit_price || '',
        // Recherche étendue pour le formulaire (forme du médicament)
        form: medication.form || medication.medicationForm || medication.medication_form || medication.dosage_form || '',
        // Recherche étendue pour la force (dosage)
        strength: medication.strength || medication.dosage || medication.concentration || medication.strength_dosage || '',
        // Recherche étendue pour la date d'achat
        purchaseDate: medication.purchaseDate || medication.purchase_date || medication.date_added || '',
        // Recherche étendue pour le fournisseur
        supplier: medication.supplier || medication.supplier_name || medication.vendor || medication.provider || '',
        // Recherche étendue pour le fabricant
        manufacturer: medication.manufacturer || medication.manufacturer_name || medication.brand || medication.producer || '',
        // Recherche étendue pour la catégorie
        category: medication.category || medication.drug_category || medication.medicine_category || medication.type || '',
        // Recherche étendue pour la description
        description: medication.description || medication.details || medication.notes || medication.indications || '',
        // Recherche étendue pour le nom générique
        genericName: medication.genericName || medication.generic_name || medication.active_ingredient || ''
      };
      
      console.log('📝 Données mappées pour le formulaire:', mappedData);
      
      // Afficher chaque champ mappé pour vérification
      Object.keys(mappedData).forEach(key => {
        console.log(`  ✅ ${key}: "${mappedData[key]}"`);
      });
      
      setFormData(mappedData);
      console.log('📝 Formulaire pré-rempli avec succès');
    } else {
      console.log('➕ Mode création - Formulaire vide');
      // Réinitialiser le formulaire pour le mode création
      setFormData({
        name: '',
        medicationCode: '',
        stockQuantity: '',
        minimumStock: '10',
        price: '',
        unitPrice: '',
        form: '',
        strength: '',
        purchaseDate: '',
        supplier: '',
        manufacturer: '',
        category: '',
        description: '',
        genericName: ''
      });
    }
  }, [medication]);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Options pour le champ "forme"
  const medicationForms = [
    { value: 'COMPRISE', label: 'Comprimé' },
    { value: 'SOLUTION', label: 'Solution' },
    { value: 'OVULE', label: 'Ovule' },
    { value: 'SIROP', label: 'Sirop' },
    { value: 'INJECTABLE', label: 'Injectable' },
    { value: 'GELULE', label: 'Gélule' },
    { value: 'CREME', label: 'Crème' },
    { value: 'POMMADE', label: 'Pommade' },
    { value: 'GOUTTES', label: 'Gouttes' },
    { value: 'INHALATEUR', label: 'Inhalateur' },
    { value: 'PATCH', label: 'Patch' },
    { value: 'SUPPOSITOIRE', label: 'Suppositoire' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Effacer l'erreur quand l'utilisateur commence à taper
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom du médicament est obligatoire';
    }
    
    if (!formData.medicationCode.trim()) {
      newErrors.medicationCode = 'Le code du médicament est obligatoire';
    }
    
    if (!formData.stockQuantity || formData.stockQuantity <= 0) {
      newErrors.stockQuantity = 'La quantité doit être supérieure à 0';
    }
    
    if (formData.minimumStock === '' || formData.minimumStock === null || formData.minimumStock === undefined || parseInt(formData.minimumStock) < 0) {
      newErrors.minimumStock = 'Le stock minimum doit être supérieur ou égal à 0';
    }
    
    if (!formData.price || formData.price <= 0) {
      newErrors.price = 'Le prix d\'achat doit être supérieur à 0';
    }
    
    if (!formData.unitPrice || formData.unitPrice <= 0) {
      newErrors.unitPrice = 'Le prix de vente doit être supérieur à 0';
    }
    
    if (!formData.purchaseDate) {
      newErrors.purchaseDate = 'La date d\'achat est obligatoire';
    }
    
    if (!formData.supplier.trim()) {
      newErrors.supplier = 'Le fournisseur est obligatoire';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Convertir les données pour l'API avec précision
      const medicationData = {
        ...formData,
        stockQuantity: parseInt(formData.stockQuantity),
        minimumStock: parseInt(formData.minimumStock) || 10,
        price: Math.round(parseFloat(formData.price) * 100) / 100,
        unitPrice: Math.round(parseFloat(formData.unitPrice) * 100) / 100,
        purchaseDate: formData.purchaseDate
      };
      
      console.log('📝 Soumission des données:', medicationData);
      console.log('📝 Mode édition:', !!medication);
      
      if (medication) {
        // Mode édition : mettre à jour le médicament existant
        console.log('📝 Mise à jour du médicament ID:', medication.id);
        await medicationAPI.updateMedication(medication.id, medicationData);
        console.log('✅ Médicament mis à jour avec succès');
      } else {
        // Mode création : ajouter un nouveau médicament
        console.log('➕ Ajout d\'un nouveau médicament');
        await medicationAPI.addMedication(medicationData);
        console.log('✅ Médicament ajouté avec succès');
      }
      
      // Afficher le message de succès
      setShowSuccess(true);
      
      // Réinitialiser le formulaire seulement en mode création
      if (!medication) {
        setFormData({
          name: '',
          medicationCode: '',
          stockQuantity: '',
          minimumStock: '10',
          price: '',
          unitPrice: '',
          form: '',
          strength: '',
          purchaseDate: '',
          supplier: '',
          manufacturer: '',
          category: '',
          description: '',
          genericName: ''
        });
      }
      
      // Notifier le composant parent
      if (onMedicationAdded) {
        onMedicationAdded();
      }
      
      // Masquer le message de succès après 3 secondes
      setTimeout(() => {
        setShowSuccess(false);
        if (onClose) {
          onClose();
        }
      }, 3000);
      
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      setErrors({
        submit: error.response?.data?.message || `Erreur lors de la ${medication ? 'modification' : 'l\'ajout'} du médicament`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {medication ? '📝 Modifier le médicament' : '➕ Ajouter un médicament en stock'}
              </h2>
              {medication && (
                <p className="text-sm text-muted-foreground mt-1">
                  Modification de : <span className="font-semibold">{medication.name || medication.medicationName}</span>
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Message de succès */}
          {showSuccess && (
            <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {medication ? 'Médicament modifié avec succès !' : 'Médicament ajouté à l\'inventaire avec succès !'}
              </div>
            </div>
          )}

          {/* Message d'erreur */}
          {errors.submit && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* ═══ SECTION 1: IDENTITÉ ═══ */}
            <div className="bg-muted/30 rounded-xl p-4 space-y-3 animate-in slide-in-from-left-2 duration-300">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Pill className="w-5 h-5" />
                <h3 className="font-bold text-sm uppercase tracking-wide">Identité du médicament</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nom du médicament */}
                <div className="relative">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Pill className="w-3.5 h-3.5 text-muted-foreground" />
                    Nom du médicament *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-3 py-2.5 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
                      errors.name ? 'border-red-500' : 'border-input'
                    }`}
                    placeholder="ex: Diclos"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                {/* Code médicament */}
                <div className="relative">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                    Code médicament *
                  </label>
                  <input
                    type="text"
                    name="medicationCode"
                    value={formData.medicationCode}
                    onChange={handleChange}
                    className={`w-full px-3 py-2.5 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
                      errors.medicationCode ? 'border-red-500' : 'border-input'
                    }`}
                    placeholder="ex: MED-001"
                  />
                  {errors.medicationCode && <p className="text-red-500 text-xs mt-1">{errors.medicationCode}</p>}
                </div>
              </div>
            </div>

            {/* ═══ SECTION 2: STOCK ═══ */}
            <div className="bg-muted/30 rounded-xl p-4 space-y-3 animate-in slide-in-from-right-2 duration-300 delay-75">
              <div className="flex items-center gap-2 text-warning mb-2">
                <Package className="w-5 h-5" />
                <h3 className="font-bold text-sm uppercase tracking-wide">Gestion du stock</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Quantité en stock */}
                <div className="relative">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Package className="w-3.5 h-3.5 text-muted-foreground" />
                    Quantité *
                  </label>
                  <input
                    type="number"
                    name="stockQuantity"
                    value={formData.stockQuantity}
                    onChange={handleChange}
                    className={`w-full px-3 py-2.5 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
                      errors.stockQuantity ? 'border-red-500' : 'border-input'
                    }`}
                    placeholder="0"
                    min="1"
                  />
                  {errors.stockQuantity && <p className="text-red-500 text-xs mt-1">{errors.stockQuantity}</p>}
                </div>

                {/* Stock Minimum */}
                <div className="relative">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
                    Seuil alerte *
                  </label>
                  <input
                    type="number"
                    name="minimumStock"
                    value={formData.minimumStock}
                    onChange={handleChange}
                    className={`w-full px-3 py-2.5 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
                      errors.minimumStock ? 'border-red-500' : 'border-input'
                    }`}
                    placeholder="10"
                    min="0"
                  />
                </div>

                {/* Info alerte */}
                <div className="flex items-center">
                  <p className="text-xs text-muted-foreground bg-background/50 p-2 rounded-lg">
                    Alerte activée quand le stock atteint ou passe sous cette valeur
                  </p>
                </div>
              </div>
            </div>

            {/* ═══ SECTION 3: PRIX & MARGE ═══ */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-xl p-4 space-y-3 animate-in slide-in-from-bottom-2 duration-300 delay-150">
              <div className="flex items-center gap-2 text-emerald-600 mb-2">
                <DollarSign className="w-5 h-5" />
                <h3 className="font-bold text-sm uppercase tracking-wide">Prix & Rentabilité</h3>
                <TrendingUp className="w-4 h-4 ml-auto" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Prix d'achat */}
                <div className="relative">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                    Prix d'achat *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      step="0.01"
                      className={`w-full px-3 py-2.5 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
                        errors.price ? 'border-red-500' : 'border-input'
                      }`}
                      placeholder="500.00"
                      min="0.01"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">$</span>
                  </div>
                  {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                </div>

                {/* Prix de vente */}
                <div className="relative">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                    Prix de vente *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="unitPrice"
                      value={formData.unitPrice}
                      onChange={handleChange}
                      step="0.01"
                      className={`w-full px-3 py-2.5 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
                        errors.unitPrice ? 'border-red-500' : 'border-input'
                      }`}
                      placeholder="800.00"
                      min="0.01"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">$</span>
                  </div>
                  {errors.unitPrice && <p className="text-red-500 text-xs mt-1">{errors.unitPrice}</p>}
                </div>

                {/* Calcul de marge */}
                <div className="relative">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                    Marge estimée
                  </label>
                  <div className={`p-3 rounded-xl border ${
                    formData.price && formData.unitPrice && parseFloat(formData.unitPrice) > parseFloat(formData.price)
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-muted border-border'
                  }`}>
                    {formData.price && formData.unitPrice ? (
                      <div className="text-center">
                        <p className={`text-xl font-black ${
                          parseFloat(formData.unitPrice) > parseFloat(formData.price) 
                            ? 'text-emerald-600' 
                            : 'text-red-500'
                        }`}>
                          {((parseFloat(formData.unitPrice) - parseFloat(formData.price)) / parseFloat(formData.price) * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          +${(parseFloat(formData.unitPrice) - parseFloat(formData.price)).toFixed(2)} par unité
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center">Renseignez les prix</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ SECTION 4: DÉTAILS PHARMACEUTIQUES ═══ */}
            <div className="bg-muted/30 rounded-xl p-4 space-y-3 animate-in slide-in-from-left-2 duration-300 delay-200">
              <div className="flex items-center gap-2 text-secondary mb-2">
                <Beaker className="w-5 h-5" />
                <h3 className="font-bold text-sm uppercase tracking-wide">Détails pharmaceutiques</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Forme */}
                <div className="relative">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Beaker className="w-3.5 h-3.5 text-muted-foreground" />
                    Forme galénique
                  </label>
                  <select
                    name="form"
                    value={formData.form}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  >
                    <option value="">Sélectionner une forme</option>
                    {medicationForms.map(form => (
                      <option key={form.value} value={form.value}>
                        {form.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dosage */}
                <div className="relative">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                    Dosage / Force
                  </label>
                  <input
                    type="text"
                    name="strength"
                    value={formData.strength}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="ex: 500mg, 10%"
                  />
                </div>
              </div>
            </div>

            {/* ═══ SECTION 5: FOURNISSEUR ═══ */}
            <div className="bg-muted/30 rounded-xl p-4 space-y-3 animate-in slide-in-from-right-2 duration-300 delay-300">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Building2 className="w-5 h-5" />
                <h3 className="font-bold text-sm uppercase tracking-wide">Information fournisseur</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date d'achat */}
                <div className="relative">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    Date d'achat *
                  </label>
                  <input
                    type="date"
                    name="purchaseDate"
                    value={formData.purchaseDate}
                    onChange={handleChange}
                    className={`w-full px-3 py-2.5 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
                      errors.purchaseDate ? 'border-red-500' : 'border-input'
                    }`}
                  />
                  {errors.purchaseDate && <p className="text-red-500 text-xs mt-1">{errors.purchaseDate}</p>}
                </div>

                {/* Maison fournisseur */}
                <div className="relative">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    Maison fournisseur *
                  </label>
                  <input
                    type="text"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleChange}
                    className={`w-full px-3 py-2.5 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
                      errors.supplier ? 'border-red-500' : 'border-input'
                    }`}
                    placeholder="ex: Pharma-Plus"
                  />
                  {errors.supplier && <p className="text-red-500 text-xs mt-1">{errors.supplier}</p>}
                </div>

                {/* Fabricant */}
                <div className="relative">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Factory className="w-3.5 h-3.5 text-muted-foreground" />
                    Fabricant
                  </label>
                  <input
                    type="text"
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="Nom du fabricant"
                  />
                </div>

                {/* Catégorie */}
                <div className="relative">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
                    Catégorie thérapeutique
                  </label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="ex: Antibiotique, Antalgique"
                  />
                </div>
              </div>
            </div>

            {/* ═══ SECTION 6: INFORMATIONS COMPLÉMENTAIRES ═══ */}
            <div className="bg-muted/30 rounded-xl p-4 space-y-3 animate-in slide-in-from-bottom-2 duration-300 delay-[400ms]">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <FileText className="w-5 h-5" />
                <h3 className="font-bold text-sm uppercase tracking-wide">Informations complémentaires</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nom générique */}
                <div className="relative">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                    Nom générique (DCI)
                  </label>
                  <input
                    type="text"
                    name="genericName"
                    value={formData.genericName}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="ex: Diclofénac"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    Description & Notes
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-3 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                    placeholder="Description, indications, posologie, ou notes importantes..."
                  />
                </div>
              </div>
            </div>

            {/* ═══ BOUTONS D'ACTION ═══ */}
            <div className="flex justify-end gap-3 pt-6 border-t animate-in slide-in-from-bottom-4 duration-300 delay-500">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 flex items-center gap-2 font-medium text-foreground bg-muted rounded-xl hover:bg-muted/80 transition-all"
                disabled={isSubmitting}
              >
                <X className="w-4 h-4" />
                Annuler
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 flex items-center gap-2 font-bold text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    {medication ? 'Sauvegarde...' : 'Ajout...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {medication ? 'Sauvegarder' : 'Ajouter au stock'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MedicationForm;
