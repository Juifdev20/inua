// Test rapide pour voir ce que le frontend reçoit
const token = localStorage.getItem('token');

if (!token) {
    console.error('❌ Token non trouvé - Connectez-vous d\'abord');
} else {
    console.log('🔍 Test du frontend...');
    
    fetch('http://localhost:8080/api/medications/inventory', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('📊 Structure réponse:', data);
        
        const meds = data.data || [];
        console.log('💊 Médicaments reçus:', meds.length);
        
        meds.forEach((med, index) => {
            const price = parseFloat(med.price);
            const unitPrice = parseFloat(med.unitPrice);
            const stock = parseFloat(med.stockQuantity);
            const profit = (unitPrice - price) * stock;
            
            console.log(`\n💊 [${index}] ${med.name}:`);
            console.log(`  Prix achat: $${price.toFixed(2)}`);
            console.log(`  Prix vente: $${unitPrice.toFixed(2)}`);
            console.log(`  Stock: ${stock}`);
            console.log(`  💰 BÉNÉFICE: $${profit.toFixed(2)}`);
            
            if (profit > 0) {
                console.log(`  ✅ CE MÉDICAMENT GÉNÈRE UN BÉNÉFICE !`);
            } else if (profit === 0) {
                console.log(`  ⚠️ Prix d\'achat = Prix de vente (pas de bénéfice)`);
            } else {
                console.log(`  ❌ VENTE À PERTE !`);
            }
        });
    })
    .catch(error => {
        console.error('❌ Erreur:', error);
    });
}
