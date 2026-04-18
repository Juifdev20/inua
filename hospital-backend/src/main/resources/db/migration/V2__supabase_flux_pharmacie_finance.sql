-- ============================================================================
-- Migration Supabase: Flux Pharmacie-Finance
-- Description: Création des tables pour PostgreSQL/Supabase
-- Compatible: PostgreSQL 14+
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Activer l'extension UUID si pas déjà fait (optionnel, ici on utilise BIGSERIAL)
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- Table: caisses
-- Description: Caisse physique (USD ou CDF) avec solde géré
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.caisses (
    id BIGSERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    devise VARCHAR(3) NOT NULL CHECK (devise IN ('CDF', 'USD')),
    solde DECIMAL(19, 2) NOT NULL DEFAULT 0.00,
    solde_initial DECIMAL(19, 2) DEFAULT 0.00,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    managed_by BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.caisses IS 'Caisses physiques gérant les décaissements (USD/CDF)';
COMMENT ON COLUMN public.caisses.solde IS 'Solde actuel de la caisse';

-- Index
CREATE INDEX IF NOT EXISTS idx_caisses_devise ON public.caisses(devise);
CREATE INDEX IF NOT EXISTS idx_caisses_active ON public.caisses(active);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_caisses_updated_at ON public.caisses;
CREATE TRIGGER update_caisses_updated_at
    BEFORE UPDATE ON public.caisses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Table: finance_transactions
-- Description: Transactions comptables liées à la pharmacie
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.finance_transactions (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(30) NOT NULL CHECK (type IN ('DEPENSE', 'AVOIR', 'RETOUR_FOURNISSEUR')),
    status VARCHAR(30) NOT NULL CHECK (status IN ('EN_ATTENTE_SCAN', 'A_PAYER', 'PAYE', 'CONTRE_PASSEE')),
    paiement_mode VARCHAR(20) CHECK (paiement_mode IN ('IMMEDIAT', 'CREDIT')),
    
    montant DECIMAL(19, 2) NOT NULL,
    devise VARCHAR(3) NOT NULL CHECK (devise IN ('CDF', 'USD')),
    taux_change DECIMAL(19, 6),
    
    categorie VARCHAR(100) NOT NULL,
    reference_fournisseur VARCHAR(100),
    scan_facture_url TEXT,
    
    commande_pharmacie_id BIGINT REFERENCES public.pharmacy_orders(id) ON DELETE SET NULL,
    
    date_facture_fournisseur DATE,
    date_echeance_paiement DATE,
    date_decaissement TIMESTAMP WITH TIME ZONE,
    
    caisse_id BIGINT REFERENCES public.caisses(id) ON DELETE SET NULL,
    validated_by BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    date_validation TIMESTAMP WITH TIME ZONE,
    created_by BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    
    transaction_originale_id BIGINT REFERENCES public.finance_transactions(id) ON DELETE SET NULL,
    transaction_correctrice_id BIGINT REFERENCES public.finance_transactions(id) ON DELETE SET NULL,
    motif_correction TEXT,
    
    immutable BOOLEAN NOT NULL DEFAULT FALSE,
    
    fournisseur_id BIGINT REFERENCES public.suppliers(id) ON DELETE SET NULL,
    fournisseur_nom VARCHAR(200),
    numero_livraison VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.finance_transactions IS 'Transactions comptables générées depuis la pharmacie';

-- Index
CREATE INDEX IF NOT EXISTS idx_ft_status ON public.finance_transactions(status);
CREATE INDEX IF NOT EXISTS idx_ft_type ON public.finance_transactions(type);
CREATE INDEX IF NOT EXISTS idx_ft_commande ON public.finance_transactions(commande_pharmacie_id);
CREATE INDEX IF NOT EXISTS idx_ft_fournisseur ON public.finance_transactions(fournisseur_id);
CREATE INDEX IF NOT EXISTS idx_ft_caisse ON public.finance_transactions(caisse_id);
CREATE INDEX IF NOT EXISTS idx_ft_date_echeance ON public.finance_transactions(date_echeance_paiement) 
    WHERE status = 'A_PAYER';
CREATE INDEX IF NOT EXISTS idx_ft_created_at ON public.finance_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ft_reference ON public.finance_transactions(reference_fournisseur);
CREATE INDEX IF NOT EXISTS idx_ft_originale ON public.finance_transactions(transaction_originale_id) 
    WHERE transaction_originale_id IS NOT NULL;

-- Trigger
DROP TRIGGER IF EXISTS update_finance_transactions_updated_at ON public.finance_transactions;
CREATE TRIGGER update_finance_transactions_updated_at
    BEFORE UPDATE ON public.finance_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Vue: dettes_fournisseurs
-- Description: Liste des dettes en cours avec jours restants et priorité
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
WHERE ft.status = 'A_PAYER' 
  AND ft.type = 'DEPENSE'
ORDER BY ft.date_echeance_paiement ASC NULLS LAST;

COMMENT ON VIEW public.dettes_fournisseurs IS 'Vue des dettes fournisseurs avec alertes de priorité';

-- ----------------------------------------------------------------------------
-- Vue: transactions_avec_avoir
-- Description: Transactions avec leur avoir associé (si corrigée)
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
    avoir.created_at AS date_correction,
    CASE WHEN avoir.id IS NOT NULL THEN TRUE ELSE FALSE END AS a_ete_corrigee
FROM public.finance_transactions ft
LEFT JOIN public.finance_transactions avoir ON avoir.transaction_originale_id = ft.id
WHERE ft.type = 'DEPENSE';

COMMENT ON VIEW public.transactions_avec_avoir IS 'Vue des transactions et leurs corrections éventuelles';

-- ----------------------------------------------------------------------------
-- Vue: solde_caisses
-- Description: Solde actuel de chaque caisse avec total par devise
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.solde_caisses AS
SELECT 
    c.id,
    c.nom,
    c.devise,
    c.solde,
    c.active,
    SUM(CASE 
        WHEN ft.status = 'PAYE' AND ft.type = 'DEPENSE' THEN ft.montant 
        ELSE 0 
    END) AS total_depenses_payees,
    SUM(CASE 
        WHEN ft.status = 'A_PAYER' AND ft.type = 'DEPENSE' THEN ft.montant 
        ELSE 0 
    END) AS total_dettes_en_cours
FROM public.caisses c
LEFT JOIN public.finance_transactions ft ON ft.caisse_id = c.id
GROUP BY c.id, c.nom, c.devise, c.solde, c.active;

COMMENT ON VIEW public.solde_caisses IS 'Vue consolidée des soldes et mouvements par caisse';

-- ----------------------------------------------------------------------------
-- Données initiales: caisses par défaut
-- ----------------------------------------------------------------------------
INSERT INTO public.caisses (nom, description, devise, solde, solde_initial, active)
VALUES 
    ('Caisse Principale CDF', 'Caisse principale en Francs Congolais', 'CDF', 0.00, 0.00, TRUE),
    ('Caisse Principale USD', 'Caisse principale en Dollars Américains', 'USD', 0.00, 0.00, TRUE)
ON CONFLICT (nom) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Politiques RLS (Row Level Security) pour Supabase - Optionnel
-- À activer si vous utilisez l'authentification Supabase
-- ----------------------------------------------------------------------------

-- Activer RLS sur les tables
ALTER TABLE public.caisses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;

-- Politique: tout le monde peut voir les caisses actives
CREATE POLICY "Caisses visibles par tous" 
    ON public.caisses 
    FOR SELECT 
    USING (active = TRUE);

-- Politique: seuls les admins/finance peuvent modifier les caisses
CREATE POLICY "Caisses modifiables par finance" 
    ON public.caisses 
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            JOIN public.user_roles ur ON ur.user_id = u.id
            JOIN public.roles r ON r.id = ur.role_id
            WHERE u.id = auth.uid() 
            AND r.name IN ('ADMIN', 'FINANCE', 'CAISSIER')
        )
    );

-- Politique: transactions visibles par finance
CREATE POLICY "Transactions visibles par finance" 
    ON public.finance_transactions 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            JOIN public.user_roles ur ON ur.user_id = u.id
            JOIN public.roles r ON r.id = ur.role_id
            WHERE u.id = auth.uid() 
            AND r.name IN ('ADMIN', 'FINANCE', 'CAISSIER', 'PHARMACIE', 'PHARMACY')
        )
    );

-- ============================================================================
-- FIN DE LA MIGRATION SUPABASE
-- ============================================================================
