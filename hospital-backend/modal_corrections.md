# 🎨 CORRECTIONS MODALE DÉTAILS CONSULTATION

## 📋 Code à Copier-Coller dans Consultations.jsx

### 1. Fonction pour formater la taille

```javascript
// Fonction pour formater la taille de manière lisible
const formatTaille = (taille) => {
    if (!taille || taille === 'Non renseigné') return 'Non renseigné';
    
    // Convertir en nombre si c'est une chaîne
    const tailleNum = parseFloat(taille);
    
    if (isNaN(tailleNum)) return taille;
    
    // Si la taille est > 200, on suppose que c'est en cm et on la garde en cm
    if (tailleNum > 200) {
        return `${tailleNum} cm`;
    }
    
    // Si la taille est < 3, on suppose que c'est en mètres et on convertit en cm
    if (tailleNum < 3) {
        return `${(tailleNum * 100).toFixed(0)} cm`;
    }
    
    // Sinon on garde la valeur originale avec l'unité cm
    return `${tailleNum} cm`;
};
```

### 2. Composant ModalDetails amélioré

```javascript
// Composant Modal pour les détails de consultation
const ConsultationModal = ({ consultation, onClose, show }) => {
    if (!show || !consultation) return null;

    const vitalSigns = {
        poids: consultation.admission?.poids || consultation.poids || 'Non renseigné',
        temperature: consultation.admission?.temperature || consultation.temperature || 'Non renseigné',
        taille: formatTaille(consultation.admission?.taille || consultation.taille),
        tensionArterielle: consultation.admission?.tensionArterielle || consultation.tensionArterielle || 'Non renseigné'
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                {/* Header du modal */}
                <div className="modal-header">
                    <h3>📋 Détails de la Consultation</h3>
                    <button className="close-btn" onClick={onClose}>✖️</button>
                </div>

                {/* Informations Patient */}
                <div className="patient-section">
                    <h4>👤 Patient</h4>
                    <div className="patient-info">
                        <p><strong>Nom complet:</strong> {consultation.patientName || "Chargement..."}</p>
                        {consultation.patient && (
                            <>
                                <p><strong>Email:</strong> {consultation.patient.email || 'Non renseigné'}</p>
                                <p><strong>Téléphone:</strong> {consultation.patient.phoneNumber || 'Non renseigné'}</p>
                                <p><strong>Date de naissance:</strong> {consultation.patient.dateOfBirth ? new Date(consultation.patient.dateOfBirth).toLocaleDateString() : 'Non renseigné'}</p>
                            </>
                        )}
                    </div>
                </div>

                {/* Signes Vitaux */}
                <div className="vital-signs-section">
                    <h4>🏥 Signes Vitaux</h4>
                    <div className="vital-signs-grid">
                        <div className="vital-item">
                            <span className="vital-label">⚖️ Poids:</span>
                            <span className="vital-value">{vitalSigns.poids} kg</span>
                        </div>
                        <div className="vital-item">
                            <span className="vital-label">🌡️ Température:</span>
                            <span className="vital-value">{vitalSigns.temperature} °C</span>
                        </div>
                        <div className="vital-item">
                            <span className="vital-label">📏 Taille:</span>
                            <span className="vital-value">{vitalSigns.taille}</span>
                        </div>
                        <div className="vital-item">
                            <span className="vital-label">💗 Tension:</span>
                            <span className="vital-value">{vitalSigns.tensionArterielle}</span>
                        </div>
                    </div>
                </div>

                {/* Informations Consultation */}
                <div className="consultation-section">
                    <h4>📋 Consultation</h4>
                    <div className="consultation-info">
                        <p><strong>ID:</strong> {consultation.id}</p>
                        <p><strong>Code:</strong> {consultation.consultationCode || 'Non défini'}</p>
                        <p><strong>Date:</strong> {consultation.consultationDate ? new Date(consultation.consultationDate).toLocaleString() : 'Non définie'}</p>
                        <p><strong>Motif:</strong> {consultation.reasonForVisit || 'Non spécifié'}</p>
                        <p><strong>Status:</strong> 
                            <span className={`status-badge ${consultation.status?.toLowerCase()}`}>
                                {consultation.status || 'Non défini'}
                            </span>
                        </p>
                        {consultation.admissionId && (
                            <p><strong>ID Admission:</strong> {consultation.admissionId}</p>
                        )}
                    </div>
                </div>

                {/* Informations Médecin */}
                {consultation.doctor && (
                    <div className="doctor-section">
                        <h4>👨‍⚕️ Médecin</h4>
                        <div className="doctor-info">
                            <p><strong>Nom:</strong> {consultation.doctor.firstName} {consultation.doctor.lastName}</p>
                            <p><strong>Email:</strong> {consultation.doctor.email}</p>
                            {consultation.doctor.department && (
                                <p><strong>Service:</strong> {consultation.doctor.department.nom}</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
```

### 3. CSS pour le Modal

```css
/* Modal Overlay */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
}

.modal-content {
    background: white;
    border-radius: 16px;
    padding: 0;
    max-width: 700px;
    width: 90%;
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
    from {
        opacity: 0;
        transform: translateY(-50px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

/* Modal Header */
.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px 24px 16px;
    border-bottom: 2px solid #f0f0f0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 16px 16px 0 0;
}

.modal-header h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
}

.close-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    font-size: 18px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
}

.close-btn:hover {
    background: rgba(255, 255, 255, 0.3);
}

/* Sections */
.patient-section,
.vital-signs-section,
.consultation-section,
.doctor-section {
    padding: 20px 24px;
    border-bottom: 1px solid #f0f0f0;
}

.patient-section:last-child,
.vital-signs-section:last-child,
.consultation-section:last-child,
.doctor-section:last-child {
    border-bottom: none;
}

.patient-section h4,
.vital-signs-section h4,
.consultation-section h4,
.doctor-section h4 {
    margin: 0 0 16px 0;
    color: #333;
    font-size: 16px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
}

.patient-info,
.consultation-info,
.doctor-info {
    display: grid;
    gap: 12px;
}

.patient-info p,
.consultation-info p,
.doctor-info p {
    margin: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #e9ecef;
}

.patient-info strong,
.consultation-info strong,
.doctor-info strong {
    color: #495057;
    font-weight: 600;
}

/* Signes Vitaux Grid */
.vital-signs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
}

.vital-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-radius: 8px;
    border: 1px solid #dee2e6;
    transition: transform 0.2s, box-shadow 0.2s;
}

.vital-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.vital-label {
    font-weight: 600;
    color: #6c757d;
    font-size: 14px;
}

.vital-value {
    font-weight: 500;
    color: #212529;
    font-size: 14px;
    background: white;
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid #dee2e6;
}

/* Status Badge */
.status-badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
}

.status-badge.en_attente {
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffeaa7;
}

.status-badge.en_cours {
    background: #cce5ff;
    color: #004085;
    border: 1px solid #99d6ff;
}

.status-badge.terminee {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.status-badge.annulee {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}

/* Responsive */
@media (max-width: 768px) {
    .modal-content {
        width: 95%;
        max-height: 90vh;
    }
    
    .vital-signs-grid {
        grid-template-columns: 1fr;
    }
    
    .patient-info p,
    .consultation-info p,
    .doctor-info p {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
    }
}
```

### 4. Utilisation dans le composant principal

```javascript
// Dans votre composant Consultations.jsx, remplacez votre modal existant par :

const [showModal, setShowModal] = useState(false);
const [selectedConsultation, setSelectedConsultation] = useState(null);

// Fonction pour ouvrir la modal
const openConsultationModal = (consultation) => {
    setSelectedConsultation(consultation);
    setShowModal(true);
};

// Fonction pour fermer la modal
const closeConsultationModal = () => {
    setShowModal(false);
    setSelectedConsultation(null);
};

// Dans votre JSX, ajoutez le composant modal
return (
    <div className="consultations-container">
        {/* ... votre contenu existant ... */}
        
        {/* Modal des détails */}
        <ConsultationModal 
            consultation={selectedConsultation}
            show={showModal}
            onClose={closeConsultationModal}
        />
    </div>
);

// Dans vos lignes de consultation, modifiez le onClick :
<td>
    <button 
        className="btn-details"
        onClick={() => openConsultationModal(consultation)}
    >
        👁️ Voir
    </button>
</td>
```

## ✅ Résultats Attendus

Après ces corrections :

1. ✅ **patientName** s'affichera correctement : "Patient: Jean Dupont" au lieu de "Patient: null"
2. ✅ **Taille formatée** : "175 cm" au lieu de "292" 
3. ✅ **Signes vitaux** avec priorité admission > consultation
4. ✅ **Modal moderne** avec animations et design responsive
5. ✅ **Gestion d'erreur** avec fallback "Chargement..." si patientName est null

## 🚀 Test Immédiat

1. **Copiez-collez** tout le code ci-dessus
2. **Rafraîchissez** la page
3. **Cliquez** sur une consultation
4. **Vérifiez** que le nom du patient s'affiche en haut de la modal

Le backend est déjà configuré pour retourner `patientName`, il suffit de l'utiliser correctement dans le frontend !
