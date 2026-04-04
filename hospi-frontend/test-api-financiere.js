// Test API avec Token JWT - Copiez-collez dans la console F12
const token = localStorage.getItem('token');

if (!token) {
    console.error('❌ Token non trouvé - Connectez-vous d\'abord');
} else {
    console.log('✅ Token trouvé:', token.substring(0, 20) + '...');
    
    fetch('http://localhost:8080/api/medications/inventory', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    })
    .then(response => {
        console.log('📡 Status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('📊 Structure de la réponse:', data);
        console.log('📊 Type de data.data:', typeof data.data);
        console.log('📊 data.data est un tableau?', Array.isArray(data.data));
        
        if (data.data && data.data.length > 0) {
            console.log('📊 Nombre de médicaments:', data.data.length);
            
            data.data.forEach((med, index) => {
                console.log(`\n💊 Médicament [${index}]: ${med.name}`);
                console.log('  📋 ID:', med.id);
                console.log('  💰 Prix achat (price):', med.price, '(type:', typeof med.price, ')');
                console.log('  💵 Prix vente (unitPrice):', med.unitPrice, '(type:', typeof med.unitPrice, ')');
                console.log('  📦 Quantité (stockQuantity):', med.stockQuantity, '(type:', typeof med.stockQuantity, ')');
                
                // Test des calculs avec conversion
                const price = parseFloat(med.price);
                const unitPrice = parseFloat(med.unitPrice);
                const stockQuantity = parseFloat(med.stockQuantity);
                
                console.log('  🔧 Conversion parseFloat:');
                console.log('    price ->', price, '(isNaN?:', isNaN(price), ')');
                console.log('    unitPrice ->', unitPrice, '(isNaN?:', isNaN(unitPrice), ')');
                console.log('    stockQuantity ->', stockQuantity, '(isNaN?:', isNaN(stockQuantity), ')');
                
                if (!isNaN(price) && !isNaN(unitPrice) && !isNaN(stockQuantity)) {
                    const purchaseValue = price * stockQuantity;
                    const saleValue = unitPrice * stockQuantity;
                    const profit = saleValue - purchaseValue;
                    
                    console.log('  📈 Calculs financiers:');
                    console.log('    Investissement: $' + purchaseValue.toFixed(2));
                    console.log('    Valeur vente: $' + saleValue.toFixed(2));
                    console.log('    💚 BÉNÉFICE: $' + profit.toFixed(2));
                } else {
                    console.log('  ❌ Erreur de conversion - calculs impossibles');
                }
            });
        } else {
            console.log('📭 Aucun médicament trouvé');
        }
    })
    .catch(error => {
        console.error('❌ Erreur:', error);
    });
}
