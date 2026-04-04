import React, { useState, useEffect } from 'react';
import { medicationAPI } from '../../api/medication';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {medication ? '📝 Modifier le médicament' : '➕ Ajouter un médicament en stock'}
              </h2>
              {medication && (
                <p className="text-sm text-gray-600 mt-1">
                  Modification de : <span className="font-semibold">{medication.name || medication.medicationName}</span>
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nom du médicament */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du médicament *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="ex: Diclos"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              {/* Code médicament */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code médicament *
                </label>
                <input
                  type="text"
                  name="medicationCode"
                  value={formData.medicationCode}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.medicationCode ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="ex: MED-001"
                />
                {errors.medicationCode && <p className="text-red-500 text-xs mt-1">{errors.medicationCode}</p>}
              </div>

              {/* Quantité en stock */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantité en stock *
                </label>
                <input
                  type="number"
                  name="stockQuantity"
                  value={formData.stockQuantity}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.stockQuantity ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0"
                  min="1"
                />
                {errors.stockQuantity && <p className="text-red-500 text-xs mt-1">{errors.stockQuantity}</p>}
              </div>

              {/* Stock Minimum (Seuil d'alerte) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Minimum (Alerte) *
                </label>
                <input
                  type="number"
                  name="minimumStock"
                  value={formData.minimumStock}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.minimumStock ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="10"
                  min="0"
                />
                <p className="text-gray-500 text-xs mt-1">Alerte quand stock ≤ cette valeur</p>
                {errors.minimumStock && <p className="text-red-500 text-xs mt-1">{errors.minimumStock}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix d'Achat (Fournisseur) *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  step="0.01"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.price ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="500.00"
                  min="0.01"
                />
                {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
              </div>

              {/* Prix de vente (Patient) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix de Vente (Patient) *
                </label>
                <input
                  type="number"
                  name="unitPrice"
                  value={formData.unitPrice}
                  onChange={handleChange}
                  step="0.01"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.unitPrice ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="800.00"
                  min="0.01"
                />
                {errors.unitPrice && <p className="text-red-500 text-xs mt-1">{errors.unitPrice}</p>}
              </div>

              {/* Forme */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Forme
                </label>
                <select
                  name="form"
                  value={formData.form}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dosage
                </label>
                <input
                  type="text"
                  name="strength"
                  value={formData.strength}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ex: 500mg, 10%"
                />
              </div>

              {/* Date d'achat */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date d'achat *
                </label>
                <input
                  type="date"
                  name="purchaseDate"
                  value={formData.purchaseDate}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.purchaseDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.purchaseDate && <p className="text-red-500 text-xs mt-1">{errors.purchaseDate}</p>}
              </div>

              {/* Maison fournisseur */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maison fournisseur *
                </label>
                <input
                  type="text"
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.supplier ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="ex: Pharma-Plus"
                />
                {errors.supplier && <p className="text-red-500 text-xs mt-1">{errors.supplier}</p>}
              </div>

              {/* Fabricant */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fabricant
                </label>
                <input
                  type="text"
                  name="manufacturer"
                  value={formData.manufacturer}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nom du fabricant"
                />
              </div>

              {/* Catégorie */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catégorie
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ex: Antibiotique, Antalgique"
                />
              </div>

              {/* Nom générique */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom générique
                </label>
                <input
                  type="text"
                  name="genericName"
                  value={formData.genericName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nom générique du médicament"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Description du médicament (facultatif)"
              />
            </div>

            {/* Boutons d'action */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                disabled={isSubmitting}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting 
                  ? (medication ? 'Modification en cours...' : 'Ajout en cours...') 
                  : (medication ? '💾 Sauvegarder les modifications' : '➕ Ajouter au stock')
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MedicationForm;
