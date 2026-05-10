# 🤖 PROMPT FRONTEND - CORRECTION DASHBOARD

## 📋 Contexte
Le dashboard du docteur affiche toujours "1" consultation au lieu du nombre réel. L'historique fonctionne bien mais le dashboard ne se rafraîchit pas correctement.

## 🎯 Objectif
Corriger le rafraîchissement du dashboard pour qu'il affiche le bon nombre de consultations et les nouvelles consultations créées par le réceptionniste.

---

## 🔴 TÂCHE 1 : Corriger le composant Dashboard

Dans votre composant Dashboard.jsx (ou similaire), ajoutez ce code :

```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

const DoctorDashboard = () => {
    const [stats, setStats] = useState({
        total_consultations: 0,
        consultations_today: 0,
        total_patients: 0
    });
    const [consultations, setConsultations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(Date.now());

    // Fonction pour récupérer les données du dashboard
    const fetchDashboard = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/v1/doctor/dashboard', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const data = response.data;
            setStats(data.stats || {});
            setConsultations(data.consultations || []);
            
            console.log('📊 Dashboard mis à jour:', {
                stats: data.stats,
                consultationsCount: data.consultations?.length || 0
            });
            
        } catch (error) {
            console.error('❌ Erreur dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    // Premier chargement
    useEffect(() => {
        console.log('🔄 Initialisation du dashboard...');
        fetchDashboard();
    }, []);

    // Rafraîchissement automatique toutes les 30 secondes
    useEffect(() => {
        console.log('⏰ Démarrage rafraîchissement automatique du dashboard...');
        
        const interval = setInterval(() => {
            console.log('🔄 Rafraîchissement automatique du dashboard...');
            fetchDashboard();
            setLastUpdate(Date.now());
        }, 30000);

        return () => {
            console.log('🛑 Arrêt rafraîchissement automatique du dashboard');
            clearInterval(interval);
        };
    }, []);

    // Rafraîchissement quand la page redevient visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('👁️ Page visible, rafraîchissement du dashboard...');
                fetchDashboard();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Rafraîchissement manuel
    const handleRefresh = () => {
        console.log('🔄 Rafraîchissement manuel du dashboard...');
        fetchDashboard();
        setLastUpdate(Date.now());
    };

    return (
        <div className="dashboard-container">
            {/* Header avec rafraîchissement */}
            <div className="dashboard-header">
                <h2>🏥 Tableau de Bord</h2>
                <div className="header-actions">
                    <button 
                        onClick={handleRefresh}
                        disabled={loading}
                        className="refresh-btn"
                        title="Rafraîchir"
                    >
                        {loading ? '⏳' : '🔄'} Rafraîchir
                    </button>
                    <span className="last-update">
                        Dernière mise à jour: {new Date(lastUpdate).toLocaleTimeString()}
                    </span>
                </div>
            </div>

            {/* Cartes de statistiques */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">📋</div>
                    <div className="stat-content">
                        <h3>{stats.total_consultations || 0}</h3>
                        <p>Total Consultations</p>
                    </div>
                </div>
                
                <div className="stat-card">
                    <div className="stat-icon">📅</div>
                    <div className="stat-content">
                        <h3>{stats.consultations_today || 0}</h3>
                        <p>Consultations Aujourd'hui</p>
                    </div>
                </div>
                
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                        <h3>{stats.total_patients || 0}</h3>
                        <p>Total Patients</p>
                    </div>
                </div>
            </div>

            {/* Liste des consultations récentes */}
            <div className="recent-consultations">
                <h3>📋 Consultations Récentes</h3>
                {loading ? (
                    <div className="loading-indicator">
                        <span>⏳ Chargement...</span>
                    </div>
                ) : (
                    <div className="consultations-list">
                        {consultations.length === 0 ? (
                            <div className="empty-state">
                                <span>📭 Aucune consultation</span>
                            </div>
                        ) : (
                            consultations.map(consultation => (
                                <div key={consultation.id} className="consultation-item">
                                    <div className="consultation-info">
                                        <h4>{consultation.patientName || 'Patient inconnu'}</h4>
                                        <p>{consultation.reasonForVisit || 'Non spécifié'}</p>
                                        <span className={`status ${consultation.status?.toLowerCase()}`}>
                                            {consultation.status || 'Non défini'}
                                        </span>
                                    </div>
                                    <div className="consultation-meta">
                                        <span>📅 {new Date(consultation.consultationDate).toLocaleDateString()}</span>
                                        {consultation.admissionId && (
                                            <span>🏥 Admission: {consultation.admissionId}</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
```

---

## 🔴 TÂCHE 2 : CSS pour le Dashboard

Ajoutez ce CSS pour le style moderne du dashboard :

```css
/* Dashboard Container */
.dashboard-container {
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
}

/* Header */
.dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.dashboard-header h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 16px;
}

.refresh-btn {
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    padding: 10px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
}

.refresh-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
}

.refresh-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.last-update {
    font-size: 12px;
    opacity: 0.8;
    font-style: italic;
}

/* Stats Grid */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.stat-card {
    background: white;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    border: 1px solid #e9ecef;
    display: flex;
    align-items: center;
    gap: 16px;
    transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.stat-icon {
    font-size: 32px;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    color: white;
}

.stat-content h3 {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    color: #212529;
}

.stat-content p {
    margin: 4px 0 0 0;
    font-size: 14px;
    color: #6c757d;
    font-weight: 500;
}

/* Recent Consultations */
.recent-consultations {
    background: white;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    border: 1px solid #e9ecef;
}

.recent-consultations h3 {
    margin: 0 0 20px 0;
    font-size: 18px;
    font-weight: 600;
    color: #212529;
    border-bottom: 2px solid #e9ecef;
    padding-bottom: 10px;
}

.loading-indicator {
    text-align: center;
    padding: 40px;
    color: #6c757d;
    font-size: 16px;
}

.empty-state {
    text-align: center;
    padding: 40px;
    color: #6c757d;
    font-size: 16px;
}

.consultations-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.consultation-item {
    padding: 16px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e9ecef;
    transition: transform 0.2s, box-shadow 0.2s;
}

.consultation-item:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.consultation-info h4 {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
    color: #212529;
}

.consultation-info p {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #6c757d;
}

.status {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
}

.status.en_attente {
    background: #fff3cd;
    color: #856404;
}

.status.arrived {
    background: #d1ecf1;
    color: #0c5460;
}

.status.confirmed {
    background: #d4edda;
    color: #155724;
}

.status.cancelled {
    background: #f8d7da;
    color: #721c24;
}

.consultation-meta {
    display: flex;
    gap: 16px;
    margin-top: 8px;
    font-size: 12px;
    color: #6c757d;
}

/* Responsive */
@media (max-width: 768px) {
    .dashboard-header {
        flex-direction: column;
        gap: 16px;
        text-align: center;
    }
    
    .stats-grid {
        grid-template-columns: 1fr;
    }
    
    .consultation-meta {
        flex-direction: column;
        gap: 4px;
    }
}
```

---

## ✅ Instructions de Travail

1. **Analysez le composant Dashboard** existant
2. **Remplacez-le par le code fourni** avec rafraîchissement automatique
3. **Ajoutez le CSS** pour le style moderne
4. **Testez le rafraîchissement** en créant une nouvelle consultation
5. **Vérifiez les logs** du backend avec les messages [DASHBOARD]

---

## 🎯 Résultats Attendus

Après ces corrections :
- ✅ **Nombre correct de consultations** dans les statistiques
- ✅ **Rafraîchissement automatique** toutes les 30 secondes
- ✅ **Nouvelles consultations** apparaissent immédiatement
- ✅ **Interface moderne** avec animations et indicateurs
- ✅ **Logs détaillés** pour le débogage

---

## 🚀 Test Immédiat

1. **Redémarrez le backend** (pour prendre les logs [DASHBOARD])
2. **Le réceptionniste crée une consultation**
3. **Le dashboard du docteur devrait se rafraîchir automatiquement**
4. **Le nombre de consultations devrait s'actualiser**

Le problème est que le dashboard n'avait pas les logs de débogage et ne forçait pas le chargement des relations. Maintenant il est aligné avec l'endpoint /consultations !
