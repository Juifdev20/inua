-- Migration: Création de la table des entrées de caisse (Revenues)
-- Date: 2026-04-16
-- Description: Gestion des encaissements hospitaliers par catégorie

-- Table des revenus/entrées de caisse
CREATE TABLE IF NOT EXISTS revenues (
    id BIGSERIAL PRIMARY KEY,
    date TIMESTAMP NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    source VARCHAR(50) NOT NULL,
    payment_method VARCHAR(50),
    reference_invoice_id BIGINT,
    receipt_number VARCHAR(100) UNIQUE,
    description TEXT,
    created_by_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT fk_revenue_user FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_revenue_invoice FOREIGN KEY (reference_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
    CONSTRAINT chk_revenue_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_revenue_source CHECK (source IN ('ADMISSION', 'LABORATOIRE', 'PHARMACIE', 'CONSULTATION', 'HOSPITALISATION', 'AUTRE'))
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_revenues_date ON revenues(date DESC);
CREATE INDEX IF NOT EXISTS idx_revenues_source ON revenues(source);
CREATE INDEX IF NOT EXISTS idx_revenues_created_at ON revenues(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenues_payment_method ON revenues(payment_method);

-- Commentaires sur les colonnes
COMMENT ON TABLE revenues IS 'Table des encaissements/entrées de caisse hospitalière';
COMMENT ON COLUMN revenues.id IS 'Identifiant unique de l entrée';
COMMENT ON COLUMN revenues.date IS 'Date et heure de l encaissement';
COMMENT ON COLUMN revenues.amount IS 'Montant encaissé (toujours positif)';
COMMENT ON COLUMN revenues.source IS 'Source du revenu: ADMISSION, LABORATOIRE, PHARMACIE, CONSULTATION, HOSPITALISATION, AUTRE';
COMMENT ON COLUMN revenues.payment_method IS 'Méthode de paiement: ESPECES, CARTE_BANCAIRE, VIREMENT, MOBILE_MONEY, CHEQUE, ASSURANCE';
COMMENT ON COLUMN revenues.reference_invoice_id IS 'Référence vers la facture associée (NULL si entrée manuelle)';
COMMENT ON COLUMN revenues.receipt_number IS 'Numéro de reçu de caisse unique';
COMMENT ON COLUMN revenues.description IS 'Description ou détails de l encaissement';
COMMENT ON COLUMN revenues.created_by_id IS 'Utilisateur qui a créé l entrée';
