-- Ajouter la colonne currency à la table medical_services
ALTER TABLE medical_services ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';

-- Mettre à jour les enregistrements existants
UPDATE medical_services SET currency = 'USD' WHERE currency IS NULL;

-- Vérifier
SELECT id, nom, currency FROM medical_services LIMIT 5;
