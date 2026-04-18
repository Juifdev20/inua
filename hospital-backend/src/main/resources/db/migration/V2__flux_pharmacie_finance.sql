-- ============================================================================
-- Migration: Flux Pharmacie-Finance
-- Description: Création des tables pour la synchronisation automatique entre
--              la gestion de stock (Pharmacie) et la comptabilité (Finance)
-- Auteur: Système Inua
-- Date: 2024
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: caisses
-- Description: Caisse physique (USD ou CDF) avec solde géré
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS caisses (
    id BIGSERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    devise VARCHAR(3) NOT NULL CHECK (devise IN ('CDF', 'USD')),
    solde DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    solde_initial DECIMAL(19, 2) DEFAULT 0.00,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    managed_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT caisse_nom_unique UNIQUE (nom)
);

COMMENT ON TABLE caisses IS 'Caisses physiques gérant les décaissements (USD/CDF)';
COMMENT ON COLUMN caisses.solde IS 'Solde actuel de la caisse';
COMMENT ON COLUMN caisses.solde_initial IS 'Solde initial lors de la création';

-- Index pour recherche rapide par devise
CREATE INDEX IF NOT EXISTS idx_caisses_devise ON caisses(devise);
CREATE INDEX IF NOT EXISTS idx_caisses_active ON caisses(active);

-- ----------------------------------------------------------------------------
-- Table: finance_transactions
-- Description: Transactions comptables liées à la pharmacie
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS finance_transactions (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(30) NOT NULL CHECK (type IN ('DEPENSE', 'AVOIR', 'RETOUR_FOURNISSEUR')),
    status VARCHAR(30) NOT NULL CHECK (status IN ('EN_ATTENTE_SCAN', 'A_PAYER', 'PAYE', 'CONTRE_PASSEE')),
    paiement_mode VARCHAR(20) CHECK (paiement_mode IN ('IMMEDIAT', 'CREDIT')),
    
    montant DECIMAL(19, 2) NOT NULL,
    devise VARCHAR(3) NOT NULL CHECK (devise IN ('CDF', 'USD')),
    taux_change DECIMAL(19, 6),
    
    categorie VARCHAR(100) NOT NULL,
    reference_fournisseur VARCHAR(100),
    scan_facture_url VARCHAR(500),
    
    commande_pharmacie_id BIGINT REFERENCES pharmacy_orders(id),
    
    date_facture_fournisseur DATE,
    date_echeance_paiement DATE,
    date_decaissement TIMESTAMP,
    
    caisse_id BIGINT REFERENCES caisses(id),
    validated_by BIGINT REFERENCES users(id),
    date_validation TIMESTAMP,
    created_by BIGINT REFERENCES users(id),
    
    transaction_originale_id BIGINT REFERENCES finance_transactions(id),
    transaction_correctrice_id BIGINT REFERENCES finance_transactions(id),
    motif_correction TEXT,
    
    immutable BOOLEAN NOT NULL DEFAULT FALSE,
    
    fournisseur_id BIGINT REFERENCES suppliers(id),
    fournisseur_nom VARCHAR(200),
    numero_livraison VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE finance_transactions IS 'Transactions comptables générées automatiquement depuis la pharmacie';
COMMENT ON COLUMN finance_transactions.type IS 'DEPENSE=achat normal, AVOIR=correction, RETOUR_FOURNISSEUR=retour';
COMMENT ON COLUMN finance_transactions.status IS 'EN_ATTENTE_SCAN=scan manquant, A_PAYER=dette, PAYE=décaissé, CONTRE_PASSEE=annulée';
COMMENT ON COLUMN finance_transactions.paiement_mode IS 'IMMÉDIAT=décaissement cash, CRÉDIT=dette fournisseur';
COMMENT ON COLUMN finance_transactions.immutable IS 'TRUE si transaction validée ou annulée (plus modifiable)';
COMMENT ON COLUMN finance_transactions.montant IS 'Montant négatif pour les avoirs';

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_ft_status ON finance_transactions(status);
CREATE INDEX IF NOT EXISTS idx_ft_type ON finance_transactions(type);
CREATE INDEX IF NOT EXISTS idx_ft_commande ON finance_transactions(commande_pharmacie_id);
CREATE INDEX IF NOT EXISTS idx_ft_fournisseur ON finance_transactions(fournisseur_id);
CREATE INDEX IF NOT EXISTS idx_ft_caisse ON finance_transactions(caisse_id);
CREATE INDEX IF NOT EXISTS idx_ft_date_echeance ON finance_transactions(date_echeance_paiement) WHERE status = 'A_PAYER';
CREATE INDEX IF NOT EXISTS idx_ft_created_at ON finance_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_ft_reference ON finance_transactions(reference_fournisseur);

-- Index pour les liens de correction
CREATE INDEX IF NOT EXISTS idx_ft_originale ON finance_transactions(transaction_originale_id) WHERE transaction_originale_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ft_correctrice ON finance_transactions(transaction_correctrice_id) WHERE transaction_correctrice_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Vue: dettes_fournisseurs
-- Description: Liste des dettes en cours avec jours restants
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW dettes_fournisseurs AS
SELECT 
    ft.id,
    ft.reference_fournisseur AS numero_facture,
    ft.fournisseur_nom AS fournisseur,
    ft.montant,
    ft.devise,
    ft.date_facture_fournisseur,
    ft.date_echeance_paiement,
    ft.date_echeance_paiement - CURRENT_DATE AS jours_restants,
    CASE 
        WHEN ft.date_echeance_paiement < CURRENT_DATE THEN 'EN_RETARD'
        WHEN ft.date_echeance_paiement <= CURRENT_DATE + 7 THEN 'URGENT'
        ELSE 'NORMAL'
    END AS priorite,
    ft.created_at
FROM finance_transactions ft
WHERE ft.status = 'A_PAYER' 
  AND ft.type = 'DEPENSE'
ORDER BY ft.date_echeance_paiement ASC;

COMMENT ON VIEW dettes_fournisseurs IS 'Vue des dettes fournisseurs avec alertes de priorité';

-- ----------------------------------------------------------------------------
-- Vue: transaction_avec_avoir
-- Description: Transactions avec leur avoir associé (si corrigée)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW transaction_avec_avoir AS
SELECT 
    ft.id AS transaction_id,
    ft.montant AS montant_original,
    ft.status AS status_original,
    ft.reference_fournisseur,
    avoir.id AS avoir_id,
    avoir.montant AS montant_avoir,
    avoir.motif_correction,
    avoir.created_at AS date_correction
FROM finance_transactions ft
LEFT JOIN finance_transactions avoir ON avoir.transaction_originale_id = ft.id
WHERE ft.type = 'DEPENSE';

COMMENT ON VIEW transaction_avec_avoir IS 'Vue des transactions et leurs corrections éventuelles';

-- ----------------------------------------------------------------------------
-- Fonction: trigger pour mise à jour automatique de updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger aux tables
DROP TRIGGER IF EXISTS update_caisses_updated_at ON caisses;
CREATE TRIGGER update_caisses_updated_at
    BEFORE UPDATE ON caisses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_finance_transactions_updated_at ON finance_transactions;
CREATE TRIGGER update_finance_transactions_updated_at
    BEFORE UPDATE ON finance_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Données initiales: caisses par défaut
-- ----------------------------------------------------------------------------
INSERT INTO caisses (nom, description, devise, solde, solde_initial, active)
VALUES 
    ('Caisse Principale CDF', 'Caisse principale en Francs Congolais', 'CDF', 0.00, 0.00, TRUE),
    ('Caisse Principale USD', 'Caisse principale en Dollars Américains', 'USD', 0.00, 0.00, TRUE)
ON CONFLICT (nom) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Séquences pour numérotation automatique (optionnel)
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS seq_reference_avoir START 1;
CREATE SEQUENCE IF NOT EXISTS seq_reference_depense START 1;

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
