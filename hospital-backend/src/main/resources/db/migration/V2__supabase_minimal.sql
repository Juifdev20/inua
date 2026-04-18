-- ============================================================================
-- Migration Supabase Minimal - Flux Pharmacie-Finance
-- Version sans FK externes (compatible tous schémas)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: caisses
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.caisses (
    id BIGSERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    devise VARCHAR(3) NOT NULL CHECK (devise IN ('CDF', 'USD')),
    solde DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    solde_initial DECIMAL(19, 2) DEFAULT 0.00,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    managed_by BIGINT,  -- Optionnel: REFERENCES users(id)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.caisses IS 'Caisses physiques USD/CDF';

CREATE INDEX idx_caisses_devise ON public.caisses(devise);
CREATE INDEX idx_caisses_active ON public.caisses(active);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_caisses_updated_at ON public.caisses;
CREATE TRIGGER trg_caisses_updated_at
    BEFORE UPDATE ON public.caisses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Table: finance_transactions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.finance_transactions (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(30) NOT NULL CHECK (type IN ('DEPENSE', 'AVOIR', 'RETOUR_FOURNISSEUR')),
    status VARCHAR(30) NOT NULL CHECK (status IN ('EN_ATTENTE_SCAN', 'A_PAYER', 'PAYE', 'CONTRE_PASSEE')),
    paiement_mode VARCHAR(20) CHECK (paiement_mode IN ('IMMEDIAT', 'CREDIT')),
    
    montant DECIMAL(19, 2) NOT NULL,
    devise VARCHAR(3) NOT NULL CHECK (devise IN ('CDF', 'USD')),
    taux_change DECIMAL(19, 6),
    
    categorie VARCHAR(100) NOT NULL DEFAULT 'Achat Médicaments',
    reference_fournisseur VARCHAR(100),
    scan_facture_url TEXT,
    
    -- FK optionnelles - à activer si les tables existent
    commande_pharmacie_id BIGINT,  -- REFERENCES pharmacy_orders(id)
    
    date_facture_fournisseur DATE,
    date_echeance_paiement DATE,
    date_decaissement TIMESTAMP WITH TIME ZONE,
    
    caisse_id BIGINT REFERENCES public.caisses(id) ON DELETE SET NULL,
    validated_by BIGINT,  -- REFERENCES users(id)
    date_validation TIMESTAMP WITH TIME ZONE,
    created_by BIGINT,  -- REFERENCES users(id)
    
    transaction_originale_id BIGINT REFERENCES public.finance_transactions(id) ON DELETE SET NULL,
    transaction_correctrice_id BIGINT REFERENCES public.finance_transactions(id) ON DELETE SET NULL,
    motif_correction TEXT,
    
    immutable BOOLEAN NOT NULL DEFAULT FALSE,
    
    fournisseur_id BIGINT,  -- REFERENCES suppliers(id)
    fournisseur_nom VARCHAR(200),
    numero_livraison VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.finance_transactions IS 'Transactions Pharmacie-Finance';

-- Index
CREATE INDEX idx_ft_status ON public.finance_transactions(status);
CREATE INDEX idx_ft_type ON public.finance_transactions(type);
CREATE INDEX idx_ft_commande ON public.finance_transactions(commande_pharmacie_id);
CREATE INDEX idx_ft_caisse ON public.finance_transactions(caisse_id);
CREATE INDEX idx_ft_date_echeance ON public.finance_transactions(date_echeance_paiement) WHERE status = 'A_PAYER';
CREATE INDEX idx_ft_created_at ON public.finance_transactions(created_at DESC);

-- Trigger
DROP TRIGGER IF EXISTS trg_ft_updated_at ON public.finance_transactions;
CREATE TRIGGER trg_ft_updated_at
    BEFORE UPDATE ON public.finance_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Vue: dettes_fournisseurs
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.dettes_fournisseurs AS
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
        WHEN ft.date_echeance_paiement <= CURRENT_DATE + INTERVAL '7 days' THEN 'URGENT'
        ELSE 'NORMAL'
    END AS priorite,
    ft.created_at
FROM public.finance_transactions ft
WHERE ft.status = 'A_PAYER' AND ft.type = 'DEPENSE'
ORDER BY ft.date_echeance_paiement ASC NULLS LAST;

-- ----------------------------------------------------------------------------
-- Vue: transactions_avec_avoir
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.transactions_avec_avoir AS
SELECT 
    ft.id AS transaction_id,
    ft.montant AS montant_original,
    ft.status AS status_original,
    ft.reference_fournisseur,
    ft.fournisseur_nom,
    ft.devise,
    avoir.id AS avoir_id,
    avoir.montant AS montant_avoir,
    avoir.motif_correction,
    avoir.created_at AS date_correction
FROM public.finance_transactions ft
LEFT JOIN public.finance_transactions avoir ON avoir.transaction_originale_id = ft.id
WHERE ft.type = 'DEPENSE';

-- ----------------------------------------------------------------------------
-- Caisses par défaut
-- ----------------------------------------------------------------------------
INSERT INTO public.caisses (nom, description, devise, solde, solde_initial, active)
VALUES 
    ('Caisse Principale CDF', 'Caisse CDF', 'CDF', 0.00, 0.00, TRUE),
    ('Caisse Principale USD', 'Caisse USD', 'USD', 0.00, 0.00, TRUE)
ON CONFLICT (nom) DO NOTHING;

-- ============================================================================
-- FIN
-- ============================================================================
