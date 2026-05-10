# 🔧 Corrections pour Consultations.jsx

## 1. Correction des URLs d'images (éviter les doubles slashes)

```javascript
// Fonction pour normaliser les URLs d'images
const normalizeImageUrl = (photoUrl) => {
    if (!photoUrl) return null;
    
    // Corriger le double /uploads/
    if (photoUrl.includes('/uploads//uploads/')) {
        return photoUrl.replace('/uploads//uploads/', '/uploads/');
    }
    
    // Corriger le double /profiles/
    if (photoUrl.includes('/profiles//uploads/')) {
        return photoUrl.replace('/profiles//uploads/', '/uploads/');
    }
    
    // S'assurer que l'URL commence par /uploads/
    if (!photoUrl.startsWith('/uploads/')) {
        if (photoUrl.startsWith('uploads/')) {
            return '/' + photoUrl;
        } else if (photoUrl.startsWith('/')) {
            return '/uploads' + photoUrl;
        } else {
            return '/uploads/' + photoUrl;
        }
    }
    
    return photoUrl;
};

// Utilisation dans le composant
const DoctorPhoto = ({ consultation }) => {
    const photoUrl = normalizeImageUrl(consultation.doctorPhoto);
    
    if (!photoUrl) {
        return <div className="default-avatar">👨‍⚕️</div>;
    }
    
    return (
        <img 
            src={`http://localhost:8080${photoUrl}`}
            alt={`Dr ${consultation.doctorName}`}
            className="doctor-photo"
            onError={(e) => {
                console.error('Erreur chargement photo:', photoUrl);
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
            }}
        />
    );
};
```

## 2. Amélioration de la gestion des signes vitaux

```javascript
// Fonction pour récupérer les signes vitaux avec priorité
const getVitalSigns = (consultation) => {
    // Priorité aux données de l'admission
    const admission = consultation.admission;
    
    return {
        poids: admission?.poids || consultation.poids || 'Non renseigné',
        temperature: admission?.temperature || consultation.temperature || 'Non renseigné',
        taille: admission?.taille || consultation.taille || 'Non renseigné',
        tensionArterielle: admission?.tensionArterielle || consultation.tensionArterielle || 'Non renseigné'
    };
};

// Utilisation dans l'affichage
const VitalSignsDisplay = ({ consultation }) => {
    const vitalSigns = getVitalSigns(consultation);
    
    return (
        <div className="vital-signs">
            <h4>Signes Vitaux</h4>
            <div className="vital-grid">
                <div className="vital-item">
                    <span className="vital-label">Poids:</span>
                    <span className="vital-value">{vitalSigns.poids} kg</span>
                </div>
                <div className="vital-item">
                    <span className="vital-label">Température:</span>
                    <span className="vital-value">{vitalSigns.temperature} °C</span>
                </div>
                <div className="vital-item">
                    <span className="vital-label">Taille:</span>
                    <span className="vital-value">{vitalSigns.taille} cm</span>
                </div>
                <div className="vital-item">
                    <span className="vital-label">Tension:</span>
                    <span className="vital-value">{vitalSigns.tensionArterielle}</span>
                </div>
            </div>
        </div>
    );
};
```

## 3. Amélioration de openConsultationDetail

```javascript
const openConsultationDetail = async (consultation) => {
    try {
        setSelectedConsultation(consultation);
        
        let consultationDetails;
        
        if (typeof consultation === 'object' && consultation.id) {
            // Si c'est un objet complet, l'utiliser directement
            consultationDetails = consultation;
            console.log('🔍 openConsultationDetail - Objet complet reçu:', consultationDetails.id);
        } else {
            // Si c'est juste un ID, récupérer les détails complets
            console.log('⚠️ initial est un ID, récupération des détails...', consultation);
            const response = await axios.get(`/api/v1/consultations/${consultation}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            consultationDetails = response.data.data;
            console.log('✅ Détails consultation chargés via ID:', consultationDetails);
        }
        
        // Vérifier l'admissionId
        console.log('🔍 openConsultationDetail - admissionId reçu:', consultationDetails.admissionId);
        console.log('🔍 openConsultationDetail - admission objet:', consultationDetails.admission);
        
        // Si pas d'admissionId, créer une admission automatiquement
        if (!consultationDetails.admissionId) {
            console.log('⚠️ Pas d\'admissionId, création automatique...');
            try {
                const createResponse = await axios.post(`/api/v1/consultations/${consultationDetails.id}/create-admission`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                // Mettre à jour avec les nouvelles données
                consultationDetails = createResponse.data.data;
                console.log('✅ Admission créée, nouvel admissionId:', consultationDetails.admissionId);
            } catch (error) {
                console.error('❌ Erreur création admission:', error);
                // Continuer avec les données existantes même si l'admission n'a pas pu être créée
            }
        }
        
        setSelectedConsultation(consultationDetails);
        setShowDetailModal(true);
        
    } catch (error) {
        console.error('❌ Erreur ouverture consultation:', error);
        setError('Impossible d\'ouvrir les détails de la consultation');
    }
};
```

## 4. CSS pour les signes vitaux

```css
.vital-signs {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
    margin: 15px 0;
}

.vital-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
}

.vital-item {
    display: flex;
    justify-content: space-between;
    padding: 8px;
    background: white;
    border-radius: 4px;
    border: 1px solid #e0e0e0;
}

.vital-label {
    font-weight: 600;
    color: #666;
}

.vital-value {
    font-weight: 500;
    color: #333;
}

.doctor-photo {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
}

.default-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #e0e0e0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
}
```

## 🚀 Instructions d'intégration

1. **Copiez** la fonction `normalizeImageUrl` et `DoctorPhoto` dans votre fichier
2. **Remplacez** votre affichage actuel des photos par `<DoctorPhoto consultation={consultation} />`
3. **Ajoutez** le composant `VitalSignsDisplay` pour afficher les signes vitaux
4. **Mettez à jour** la fonction `openConsultationDetail` avec la version améliorée
5. **Ajoutez** le CSS pour le style

## ✅ Résultats attendus

- ✅ Plus d'erreur 403 sur les images
- ✅ admissionId toujours disponible
- ✅ Signes vitaux affichés correctement
- ✅ Gestion robuste des erreurs
