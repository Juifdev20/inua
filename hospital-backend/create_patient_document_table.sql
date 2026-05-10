-- ============================================
-- CRÉATION TABLE PATIENT_DOCUMENT
-- ============================================

-- Créer la table patient_document avec toutes les colonnes nécessaires
CREATE TABLE IF NOT EXISTS patient_document (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT,
    file_url TEXT,
    document_type VARCHAR(50) DEFAULT 'DOSSIER_PATIENT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    consultation_id BIGINT REFERENCES consultations(id) ON DELETE SET NULL,
    patient_id BIGINT,
    patient_name VARCHAR(255),
    total_amount DOUBLE PRECISION DEFAULT 0.0,
    amount_paid DOUBLE PRECISION DEFAULT 0.0,
    remaining_credit DOUBLE PRECISION DEFAULT 0.0,
    payment_status VARCHAR(50) DEFAULT 'NON_PAYE',
    -- Nouvelles colonnes pour stockage binaire
    content bytea,
    file_size BIGINT,
    mime_type VARCHAR(255)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_patient_document_patient_id ON patient_document(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_document_consultation_id ON patient_document(consultation_id);
CREATE INDEX IF NOT EXISTS idx_patient_document_created_at ON patient_document(created_at DESC);

-- Vérifier que la table a été créée
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'patient_document' 
ORDER BY ordinal_position;
