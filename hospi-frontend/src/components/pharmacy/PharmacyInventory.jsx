import React, { useState, useEffect } from 'react';
import { medicationAPI } from '../../api/medication';
import MedicationForm from './MedicationForm';

const PharmacyInventory = () => {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, lowstock, expired, lowmargin

  // ===== ÉTATS POUR LES MODALS =====
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [stockOperation, setStockOperation] = useState('add'); // 'add' or 'remove'
  const [stockQuantity, setStockQuantity] = useState('');

  // ===== SÉCURITÉ DES NOMBRES =====
  // 🔧 Conversion sécurisée pour éviter les erreurs de calcul
  const safeParseNumber = (value) => {
    const num = Number(value || 0);
    // Corriger les erreurs de précision JavaScript
    return Math.round(num * 100) / 100;
  };

  // ===== CALCULS FINANCIERS GLOBAUX =====
  const calculateGlobalMetrics = () => {
    return medications.reduce((acc, med) => {
      const price = safeParseNumber(med.price);
      const unitPrice = safeParseNumber(med.unitPrice);
      const stockQuantity = safeParseNumber(med.stockQuantity);
      
      // 🔧 CORRECTION : Calcul correct du bénéfice réel
      const totalInvestment = price * stockQuantity;
      const totalSaleValue = unitPrice * stockQuantity;
      const beneficeNet = (unitPrice - price) * stockQuantity; // CORRIGÉ !
      
      return {
        totalInvestment: acc.totalInvestment + totalInvestment,
        totalPotentialProfit: acc.totalPotentialProfit + beneficeNet,
        totalSaleValue: acc.totalSaleValue + totalSaleValue,
        lowMarginCount: acc.lowMarginCount + (hasLowMargin(med) ? 1 : 0)
      };
    }, {
      totalInvestment: 0,
      totalPotentialProfit: 0,
      totalSaleValue: 0,
      lowMarginCount: 0
    });
  };

  const hasLowMargin = (medication) => {
    const price = safeParseNumber(medication.price);
    const unitPrice = safeParseNumber(medication.unitPrice);
    if (price === 0 || unitPrice === 0) return false;
    const margin = ((unitPrice - price) / price) * 100;
    return margin <= 5;
  };

  const getMarginPercentage = (medication) => {
    const price = safeParseNumber(medication.price);
    const unitPrice = safeParseNumber(medication.unitPrice);
    if (price === 0 || unitPrice === 0) return 0;
    return ((unitPrice - price) / price) * 100;
  };

  const globalMetrics = calculateGlobalMetrics();

  // ===== HANDLERS POUR LES ACTIONS =====
  
  // 1. Bouton "Modifier" - Utilise le formulaire existant en mode édition
  const handleEdit = (medication) => {
    console.log('📝 Modification du médicament avec formulaire existant:', medication.name);
    // On passe le médicament sélectionné au formulaire pour le mode "Édition"
    setSelectedMedication(medication);
    setShowForm(true); // Utilise le formulaire existant au lieu du modal
    console.log('📝 Formulaire ouvert en mode édition pour:', medication.name);
  };

  // 2. Bouton "Stock" - Ouvre le modal d'ajustement de stock
  const handleStockAdjustment = (medication) => {
    console.log('📦 Ajustement du stock pour:', medication.name);
    console.log('📦 Stock actuel:', medication.stockQuantity);
    console.log('📦 Médicament complet reçu:', medication);
    console.log('📦 Champs du médicament:', {
      id: medication.id,
      name: medication.name,
      medicationCode: medication.medicationCode,
      price: medication.price,
      unitPrice: medication.unitPrice
    });
    setSelectedMedication(medication);
    setStockOperation('add');
    setStockQuantity('');
    setShowStockModal(true);
    console.log('📦 Modal stock ouvert:', showStockModal);
  };

  // 3. Bouton "Vérifier" - Ouvre le modal des détails complets
  const handleCheckDetails = (medication) => {
    console.log('🔍 Vérification des détails pour:', medication.name);
    console.log('🔍 Médicament complet:', medication);
    setSelectedMedication(medication);
    setShowDetailsModal(true);
    console.log('🔍 Modal détails ouvert:', showDetailsModal);
  };

  // Handler pour supprimer un médicament
  const handleDeleteMedication = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce médicament ?')) {
      return;
    }

    try {
      console.log('🗑️ Suppression du médicament ID:', id);
      await medicationAPI.deleteMedication(id);
      await loadMedications(); // Recharger les données
      alert('✅ Médicament supprimé avec succès !');
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      alert('❌ Erreur lors de la suppression du médicament');
    }
  };

  // Handler pour confirmer l'ajustement de stock
  const handleConfirmStockAdjustment = async () => {
    console.log('🚀 handleConfirmStockAdjustment appelé');
    console.log('🚀 selectedMedication:', selectedMedication);
    console.log('🚀 stockQuantity:', stockQuantity);
    console.log('🚀 stockOperation:', stockOperation);
    
    try {
      // Validation de base
      if (!stockQuantity || isNaN(stockQuantity)) {
        alert('❌ Veuillez entrer une quantité valide');
        return;
      }

      const quantity = parseInt(stockQuantity, 10);
      const currentStock = selectedMedication.stockQuantity || 0;
      const newQuantity = stockOperation === 'add' ? currentStock + quantity : currentStock - quantity;

      if (newQuantity < 0) {
        alert('❌ Le stock ne peut pas être négatif');
        return;
      }

      // 1. Nettoyage des données (IMPORTANT) - Version minimaliste
      const payload = {
        id: selectedMedication.id,
        name: selectedMedication.name,
        medicationCode: selectedMedication.medicationCode,
        price: parseFloat(Number(selectedMedication.price || 0).toFixed(2)),
        unitPrice: parseFloat(Number(selectedMedication.unitPrice || 0).toFixed(2)),
        stockQuantity: parseInt(newQuantity, 10),
        minimumStock: selectedMedication.minimumStock || 10,
        supplier: selectedMedication.supplier || '',
        expiryDate: selectedMedication.expiryDate || '',
        purchaseDate: selectedMedication.purchaseDate || ''
      };

      console.log("📦 Données envoyées au Backend:", payload);
      console.log("📦 Données JSON.stringify:", JSON.stringify(payload));

      // 2. Appel API
      const response = await medicationAPI.updateMedication(selectedMedication.id, payload);
      
      if (response.status === 200 || response.status === 204) {
        await loadMedications();
        setShowStockModal(false);
        setSelectedMedication(null);
        setStockQuantity('');
        alert(`✅ Stock mis à jour: ${stockOperation === 'add' ? '+' : '-'}${quantity} unités`);
      }
    } catch (err) {
      console.error('❌ Erreur détaillée:', err.response?.data); // Affiche la raison exacte du Backend
      console.error('❌ Erreur complète:', err);
      alert('❌ Erreur 400: Le format des données est incorrect - ' + (err.response?.data?.message || err.message));
    }
  };

  // Calculs pour le modal de détails
  const calculateROI = (medication) => {
    const price = safeParseNumber(medication.price);
    const unitPrice = safeParseNumber(medication.unitPrice);
    const stockQuantity = safeParseNumber(medication.stockQuantity);
    
    const investment = price * stockQuantity;
    const potentialRevenue = unitPrice * stockQuantity;
    const profit = potentialRevenue - investment;
    
    return {
      investment,
      potentialRevenue,
      profit,
      roiPercentage: investment > 0 ? (profit / investment) * 100 : 0,
      marginPercentage: price > 0 ? ((unitPrice - price) / price) * 100 : 0
    };
  };

  useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
    try {
      setLoading(true);
      console.log('🔄 Début du chargement des médicaments...');
      const response = await medicationAPI.getInventory();
      
      const medications = response.data || [];
      console.log('💊 Médicaments reçus:', medications);
      
      // 🔍 DEBUG - Vérification avec calculs corrigés
      medications.forEach((med, index) => {
        const price = safeParseNumber(med.price);
        const unitPrice = safeParseNumber(med.unitPrice);
        const stockQuantity = safeParseNumber(med.stockQuantity);
        
        // 🔧 CORRECTION : Calculs financiers corrects
        const investissement = price * stockQuantity;
        const beneficeNet = (unitPrice - price) * stockQuantity; // FORMULE CORRIGÉE !
        
        console.log(`💊 [${index}] ${med.name}:`);
        console.log(`  - Prix achat: $${price.toFixed(2)}`);
        console.log(`  - Prix vente: $${unitPrice.toFixed(2)}`);
        console.log(`  - Stock: ${stockQuantity}`);
        console.log(`  - Investissement: $${investissement.toFixed(2)}`);
        console.log(`  - 💰 BÉNÉFICE NET: $${beneficeNet.toFixed(2)}`);
        
        // 📊 Exemple Diclo (40 unités) : Si achat $5, vente $8
        // Ancien calcul faux: $8 × 40 = $320
        // Nouveau calcul correct: ($8 - $5) × 40 = $120 ✅
      });
      
      setMedications(medications);
      setError(null);
      console.log('✅ Médicaments chargés avec succès:', medications.length);
    } catch (err) {
      console.error('❌ Erreur lors du chargement des médicaments:', err);
      setError('Impossible de charger l\'inventaire');
    } finally {
      setLoading(false);
    }
  };

  const handleMedicationAdded = () => {
    loadMedications();
  };

  const handleDeleteMedication = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce médicament ?')) {
      try {
        await medicationAPI.deleteMedication(id);
        loadMedications();
      } catch (err) {
        console.error('Erreur lors de la suppression:', err);
        setError('Impossible de supprimer le médicament');
      }
    }
  };

  const filteredMedications = medications.filter(medication => {
    const matchesSearch = medication.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         medication.medicationCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         medication.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'lowstock') {
      return matchesSearch && medication.stockQuantity <= (medication.minimumStock || 10);
    }
    if (filter === 'expired') {
      return matchesSearch && new Date(medication.expiryDate) < new Date();
    }
    
    return matchesSearch;
  });

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount || 0);
  };

  const getStockStatus = (medication) => {
    const minStock = medication.minimumStock || 10;
    if (medication.stockQuantity <= minStock) {
      return 'text-red-600 bg-red-100';
    }
    if (medication.stockQuantity <= minStock * 1.5) {
      return 'text-yellow-600 bg-yellow-100';
    }
    return 'text-green-600 bg-green-100';
  };

  const isExpired = (expiryDate) => {
    return expiryDate && new Date(expiryDate) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Inventaire Pharmacie</h1>
          <p className="text-gray-600 mt-1">Gérez le stock de médicaments</p>
        </div>
        <button
          onClick={() => {
            console.log('Button clicked, setting showForm to true');
            setShowForm(true);
          }}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          + Nouveau médicament
        </button>
      </div>

      {/* ===== DASHBOARD FINANCIER - CORRECTION 100% ===== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Carte 1: Total Investment */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Investissement Total</p>
              <p className="text-2xl font-bold text-gray-900">${globalMetrics.totalInvestment.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Somme de (prix achat × quantité)</p>
            </div>
          </div>
        </div>

        {/* Carte 2: Total Potential Profit - CORRIGÉ */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${globalMetrics.totalPotentialProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <svg className={`w-6 h-6 ${globalMetrics.totalPotentialProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Bénéfice Potentiel</p>
              <p className={`text-2xl font-bold ${globalMetrics.totalPotentialProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {globalMetrics.totalPotentialProfit >= 0 ? '+' : ''}{globalMetrics.totalPotentialProfit.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">Somme de ((prix vente - prix achat) × quantité)</p>
            </div>
          </div>
        </div>

        {/* Carte 3: Total Sale Value */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Valeur Totale</p>
              <p className="text-2xl font-bold text-gray-900">${globalMetrics.totalSaleValue.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Somme de (prix vente × quantité)</p>
            </div>
          </div>
        </div>

        {/* Carte 4: Low Margin Count */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-full">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Marge Faible</p>
              <p className="text-2xl font-bold text-orange-600">{globalMetrics.lowMarginCount}</p>
              <p className="text-xs text-gray-500">Médicaments avec marge ≤ 5%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Rechercher par nom, code ou fournisseur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilter('lowstock')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'lowstock' 
                  ? 'bg-yellow-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Stock faible
            </button>
            <button
              onClick={() => setFilter('expired')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'expired' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Expirés
            </button>
          </div>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Tableau des médicaments */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Forme
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dosage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix Achat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix Vente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marge
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bénéfice Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rentabilité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fournisseur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMedications.length === 0 ? (
                <tr>
                  <td colSpan="12" className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || filter !== 'all' 
                      ? 'Aucun médicament trouvé pour ces critères' 
                      : 'Aucun médicament dans l\'inventaire'}
                  </td>
                </tr>
              ) : (
                filteredMedications.map((medication) => {
                  // 🔧 CORRECTION 100% - Calculs financiers corrects
                  const price = safeParseNumber(medication.price);
                  const unitPrice = safeParseNumber(medication.unitPrice);
                  const stockQuantity = safeParseNumber(medication.stockQuantity);
                  
                  // 1. Investissement total (prix d'achat × quantité)
                  const investissement = price * stockQuantity;
                  
                  // 2. BÉNÉFICE RÉEL = (prix vente - prix achat) × quantité
                  const beneficeNet = (unitPrice - price) * stockQuantity; // FORMULE CORRIGÉE !
                  
                  // 3. Marge en pourcentage
                  const marge = price > 0 ? ((unitPrice - price) / price) * 100 : 0;
                  
                  console.log(`💊 [CORRIGÉ] ${medication.name}:`);
                  console.log(`  - Investissement: $${investissement.toFixed(2)}`);
                  console.log(`  - 💰 BÉNÉFICE NET: $${beneficeNet.toFixed(2)}`);
                  console.log(`  - Marge: ${marge.toFixed(1)}%`);
                  
                  return (
                    <tr key={medication.id} className={`
                      ${isExpired(medication.expiryDate) ? 'bg-red-50' : ''}
                      ${marge <= 5 ? 'bg-orange-50' : ''}
                      ${beneficeNet < 0 ? 'bg-red-50' : ''}
                    `}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {medication.medicationCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{medication.name}</div>
                          {medication.genericName && (
                            <div className="text-xs text-gray-500">{medication.genericName}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {medication.form || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {medication.strength || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockStatus(medication)}`}>
                          {medication.stockQuantity}
                        </span>
                      </td>

                      {/* Colonne Prix Achat */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${price.toFixed(2)}
                      </td>

                      {/* Colonne Prix Vente */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        ${unitPrice.toFixed(2)}
                      </td>

                      {/* Colonne Marge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          marge <= 5 
                            ? 'bg-orange-100 text-orange-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {marge.toFixed(1)}%
                        </span>
                      </td>

                      {/* COLONNE BÉNÉFICE TOTAL - CORRECTION 100% */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          {/* En petit : L'investissement total */}
                          <span className="text-xs text-gray-500">Investissement:</span>
                          <span className="font-medium text-gray-900">${investissement.toFixed(2)}</span>
                          
                          {/* En gros et en couleur : Le Bénéfice Réel */}
                          <div className="mt-1 pt-1 border-t border-gray-100">
                            <span className="text-xs text-gray-500">Bénéfice Réel:</span>
                            <span className={`block font-bold text-lg ${
                              beneficeNet > 0 
                                ? 'text-green-600' 
                                : beneficeNet < 0 
                                  ? 'text-red-600'
                                  : 'text-gray-600'
                            }`}>
                              {beneficeNet > 0 ? '+' : ''}{beneficeNet.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {medication.supplier || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col gap-2">
                          {/* Bouton Modifier */}
                          <button 
                            onClick={() => handleEdit(medication)}
                            className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
                            title="Modifier le médicament"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Modifier
                          </button>

                          {/* Bouton Stock */}
                          <button 
                            onClick={() => handleStockAdjustment(medication)}
                            className="flex items-center text-green-600 hover:text-green-800 text-sm"
                            title="Ajuster le stock"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            Stock
                          </button>

                          {/* Bouton Vérifier */}
                          <button 
                            onClick={() => handleCheckDetails(medication)}
                            className="flex items-center text-purple-600 hover:text-purple-800 text-sm"
                            title="Vérifier les détails"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Vérifier
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formulaire d'ajout/modification */}
      {showForm && (
        <>
          {console.log('Rendering MedicationForm, showForm:', showForm)}
          {console.log('Mode édition - selectedMedication:', selectedMedication)}
          <MedicationForm
            medication={selectedMedication} // Ajout du médicament pour le mode édition
            onMedicationAdded={handleMedicationAdded}
            onClose={() => {
              console.log('Closing form, setting showForm to false');
              setShowForm(false);
              setSelectedMedication(null); // Réinitialiser le médicament sélectionné
            }}
          />
        </>
      )}

      {/* ===== MODAL D'AJUSTEMENT DE STOCK ===== */}
      {showStockModal && selectedMedication && (
        <>
          {console.log('🎨 Rendu modal stock - showStockModal:', showStockModal, 'selectedMedication:', selectedMedication)}
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">📦 Ajuster le stock</h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>{selectedMedication.name}</strong>
              </p>
              <p className="text-sm text-gray-500">
                Stock actuel: <span className="font-bold">{selectedMedication.stockQuantity}</span> unités
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Type d'opération</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="add"
                    checked={stockOperation === 'add'}
                    onChange={(e) => setStockOperation(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-green-600">➕ Entrée (livraison)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="remove"
                    checked={stockOperation === 'remove'}
                    onChange={(e) => setStockOperation(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-red-600">➖ Sortie (périmé/vendu)</span>
                </label>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantité</label>
              <input
                type="number"
                min="1"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="Entrez la quantité..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowStockModal(false);
                  setSelectedMedication(null);
                  setStockQuantity('');
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmStockAdjustment}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                ✅ Confirmer
              </button>
            </div>
          </div>
        </>
      )}

      {/* ===== MODAL DE DÉTAILS COMPLETS ===== */}
      {showDetailsModal && selectedMedication && (
        <>
          {console.log('🎨 Rendu modal détails - showDetailsModal:', showDetailsModal, 'selectedMedication:', selectedMedication)}
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">🔍 Détails complets - {selectedMedication.name}</h2>
            
            {(() => {
              const roi = calculateROI(selectedMedication);
              return (
                <div className="space-y-6">
                  {/* Informations générales */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-700 mb-2">📋 Informations générales</h3>
                      <div className="space-y-2 text-sm">
                        <p><strong>Code:</strong> {selectedMedication.medicationCode}</p>
                        <p><strong>Nom générique:</strong> {selectedMedication.genericName || 'N/A'}</p>
                        <p><strong>Forme:</strong> {selectedMedication.form || 'N/A'}</p>
                        <p><strong>Dosage:</strong> {selectedMedication.strength || 'N/A'}</p>
                        <p><strong>Fournisseur:</strong> {selectedMedication.supplier || 'N/A'}</p>
                        <p><strong>Expiration:</strong> {selectedMedication.expiryDate || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-700 mb-2">💰 Informations financières</h3>
                      <div className="space-y-2 text-sm">
                        <p><strong>Prix d'achat:</strong> ${roi.investment.toFixed(2)} (${safeParseNumber(selectedMedication.price).toFixed(2)} × {selectedMedication.stockQuantity})</p>
                        <p><strong>Prix de vente:</strong> ${safeParseNumber(selectedMedication.unitPrice).toFixed(2)}</p>
                        <p><strong>Marge:</strong> <span className={roi.marginPercentage > 0 ? 'text-green-600' : 'text-red-600'}>{roi.marginPercentage.toFixed(1)}%</span></p>
                      </div>
                    </div>
                  </div>
                  
                  {/* ROI et Rentabilité */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-3">📈 Analyse de rentabilité (ROI)</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Investissement total</p>
                        <p className="text-xl font-bold text-gray-800">${roi.investment.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Revenu potentiel</p>
                        <p className="text-xl font-bold text-blue-600">${roi.potentialRevenue.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Bénéfice net</p>
                        <p className={`text-xl font-bold ${roi.profit > 0 ? 'text-green-600' : roi.profit < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {roi.profit > 0 ? '+' : ''}{roi.profit.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-600">ROI (Retour sur Investissement)</p>
                      <p className={`text-2xl font-bold ${roi.roiPercentage > 0 ? 'text-green-600' : roi.roiPercentage < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {roi.roiPercentage > 0 ? '+' : ''}{roi.roiPercentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  
                  {/* Alertes */}
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-2">⚠️ Alertes et recommandations</h3>
                    <div className="space-y-2 text-sm">
                      {roi.profit < 0 && (
                        <p className="text-red-600">❌ Vente à perte ! Le prix de vente est inférieur au prix d'achat.</p>
                      )}
                      {roi.marginPercentage <= 5 && roi.profit >= 0 && (
                        <p className="text-orange-600">⚠️ Marge très faible (≤5%). Considérez d'augmenter le prix de vente.</p>
                      )}
                      {selectedMedication.stockQuantity <= (selectedMedication.minimumStock || 10) && (
                        <p className="text-orange-600">📦 Stock bas ! Il faut réapprovisionner ce médicament.</p>
                      )}
                      {selectedMedication.expiryDate && new Date(selectedMedication.expiryDate) < new Date() && (
                        <p className="text-red-600">🚨 Médicament périmé ! Ne peut plus être vendu.</p>
                      )}
                      {roi.profit > 0 && roi.marginPercentage > 5 && (
                        <p className="text-green-600">✅ Bonne rentabilité ! Marge saine et bénéfice positif.</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedMedication(null);
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Fermer
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PharmacyInventory;