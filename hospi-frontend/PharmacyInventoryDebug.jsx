import React, { useState, useEffect } from 'react';
import { medicationAPI } from './api/medication';

const PharmacyInventoryDebug = () => {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🔧 Fonction de conversion sécurisée
  const safeParseFloat = (value) => {
    if (value === null || value === undefined) return 0;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
    try {
      setLoading(true);
      console.log('🔄 DÉBUT DU CHARGEMENT...');
      
      const response = await medicationAPI.getInventory();
      
      console.log('📥 RÉPONSE API COMPLÈTE:', response);
      console.log('📥 response.data:', response.data);
      console.log('📥 typeof response.data:', typeof response.data);
      console.log('📥 Array.isArray(response.data):', Array.isArray(response.data));
      
      // Vérifier si les données sont dans response.data.data
      let medicationsData = response.data;
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        medicationsData = response.data.data;
        console.log('📥 Données trouvées dans response.data.data');
      }
      
      console.log('💊 MÉDICAMENTS FINAUX:', medicationsData);
      console.log('💊 Nombre de médicaments:', medicationsData.length);
      
      if (medicationsData.length > 0) {
        const firstMed = medicationsData[0];
        console.log('💊 PREMIER MÉDICAMENT DÉTAILLÉ:', firstMed);
        
        console.log('🔍 ANALYSE DES CHAMPS:');
        console.log('  - name:', firstMed.name);
        console.log('  - price:', firstMed.price, '(type:', typeof firstMed.price, ')');
        console.log('  - unitPrice:', firstMed.unitPrice, '(type:', typeof firstMed.unitPrice, ')');
        console.log('  - stockQuantity:', firstMed.stockQuantity, '(type:', typeof firstMed.stockQuantity, ')');
        
        // Test de conversion
        const price = safeParseFloat(firstMed.price);
        const unitPrice = safeParseFloat(firstMed.unitPrice);
        const stock = safeParseFloat(firstMed.stockQuantity);
        
        console.log('🔧 RÉSULTAT CONVERSION:');
        console.log('  - price ->', price);
        console.log('  - unitPrice ->', unitPrice);
        console.log('  - stock ->', stock);
        
        // Test des calculs
        if (price > 0 && unitPrice > 0 && stock > 0) {
          const profit = (unitPrice - price) * stock;
          const margin = ((unitPrice - price) / price) * 100;
          
          console.log('💰 CALCULS RÉUSSIS:');
          console.log('  - Bénéfice total:', profit);
          console.log('  - Marge %:', margin);
          console.log('  - Bénéfice formaté:', '$' + profit.toFixed(2));
        } else {
          console.log('❌ CALCULS IMPOSSIBLES - valeurs invalides');
        }
      }
      
      setMedications(medicationsData);
      setError(null);
      console.log('✅ CHARGEMENT TERMINÉ');
      
    } catch (err) {
      console.error('❌ ERREUR DE CHARGEMENT:', err);
      console.error('❌ Détails:', err.response?.data || err.message);
      setError('Impossible de charger l\'inventaire');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (error) {
    return <div>Erreur: {error}</div>;
  }

  return (
    <div>
      <h1>🔍 DEBUG - Inventaire Pharmacie</h1>
      <p>Nombre de médicaments: {medications.length}</p>
      
      {medications.map((med, index) => {
        const price = safeParseFloat(med.price);
        const unitPrice = safeParseFloat(med.unitPrice);
        const stock = safeParseFloat(med.stockQuantity);
        const profit = (unitPrice - price) * stock;
        
        return (
          <div key={med.id} style={{border: '1px solid #ccc', margin: '10px', padding: '10px'}}>
            <h3>{med.name} (ID: {med.id})</h3>
            <p><strong>Code:</strong> {med.medicationCode}</p>
            <p><strong>Price:</strong> {med.price} (type: {typeof med.price}) → {price}</p>
            <p><strong>UnitPrice:</strong> {med.unitPrice} (type: {typeof med.unitPrice}) → {unitPrice}</p>
            <p><strong>Stock:</strong> {med.stockQuantity} (type: {typeof med.stockQuantity}) → {stock}</p>
            <p><strong>Bénéfice:</strong> ${profit.toFixed(2)}</p>
            <p><strong>Marge:</strong> {price > 0 ? ((unitPrice - price) / price * 100).toFixed(1) : 0}%</p>
          </div>
        );
      })}
    </div>
  );
};

export default PharmacyInventoryDebug;
