-- Migration SQL pour synchroniser la base de données avec les entités JPA
-- Exécuter ce script sur PostgreSQL en production

-- ============================================
-- Ajouter les colonnes manquantes dans medications
-- ============================================

-- Colonne categorie_abc (A, B, C pour classification ABC)
ALTER TABLE medications ADD COLUMN IF NOT EXISTS categorie_abc VARCHAR(1) DEFAULT 'C';

-- Colonne jours_avant_alerte (jours avant expiration pour alerte)
ALTER TABLE medications ADD COLUMN IF NOT EXISTS jours_avant_alerte INTEGER DEFAULT 30;

-- ============================================
-- Ajouter les colonnes manquantes dans stock_movements
-- ============================================

-- Colonne status (EN_ATTENTE_VALIDATION, VALIDE, ANNULE, REJETE)
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'VALIDE';

-- Colonne finance_transaction_id (lien vers transaction finance)
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS finance_transaction_id BIGINT;

-- ============================================
-- Ajouter les colonnes manquantes dans admissions (abonnés)
-- ============================================

ALTER TABLE admissions ADD COLUMN IF NOT EXISTS is_abonne BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS company_id BIGINT;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS matricule VARCHAR(80);
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS coverage_rate DECIMAL(5,2);
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS company_coverage DECIMAL(19,2) NOT NULL DEFAULT 0.00;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS patient_surplus DECIMAL(19,2) NOT NULL DEFAULT 0.00;

-- Ajouter la contrainte de clé étrangère pour company_id
ALTER TABLE admissions ADD CONSTRAINT fk_admission_company 
    FOREIGN KEY (company_id) REFERENCES companies(id);

-- ============================================
-- Créer la table companies (entreprises abonnées)
-- ============================================

CREATE TABLE IF NOT EXISTS companies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(150),
    contact_person VARCHAR(150),
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    subscription_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    coverage_rate DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    surplus_rate DECIMAL(5,2) NOT NULL DEFAULT 35.00,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- ============================================
-- Créer la table company_employees
-- ============================================

CREATE TABLE IF NOT EXISTS company_employees (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    matricule VARCHAR(80),
    dependant_of_id BIGINT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_company_patient UNIQUE (company_id, patient_id),
    CONSTRAINT fk_employee_company FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT fk_employee_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_employee_dependant FOREIGN KEY (dependant_of_id) REFERENCES company_employees(id)
);

-- ============================================
-- Créer la table company_consumption_records
-- ============================================

CREATE TABLE IF NOT EXISTS company_consumption_records (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    admission_id BIGINT,
    matricule VARCHAR(80),
    flux_type VARCHAR(30) NOT NULL,
    description VARCHAR(255),
    total_amount DECIMAL(19,2) NOT NULL DEFAULT 0.00,
    company_coverage DECIMAL(19,2) NOT NULL DEFAULT 0.00,
    patient_surplus DECIMAL(19,2) NOT NULL DEFAULT 0.00,
    coverage_rate DECIMAL(5,2),
    consumed_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_ccr_company FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT fk_ccr_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_ccr_admission FOREIGN KEY (admission_id) REFERENCES admissions(id)
);

-- ============================================
-- Créer la table inventaires_pharmacie
-- ============================================

CREATE TABLE IF NOT EXISTS inventaires_pharmacie (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    type VARCHAR(20) NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'EN_COURS',
    id_agent BIGINT NOT NULL,
    id_pharmacien_chef BIGINT,
    observations TEXT,
    date_approbation TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_inventaire_agent FOREIGN KEY (id_agent) REFERENCES users(id),
    CONSTRAINT fk_inventaire_pharmacien FOREIGN KEY (id_pharmacien_chef) REFERENCES users(id)
);

-- ============================================
-- Créer la table lignes_inventaire_pharmacie
-- ============================================

CREATE TABLE IF NOT EXISTS lignes_inventaire_pharmacie (
    id BIGSERIAL PRIMARY KEY,
    id_inventaire BIGINT NOT NULL,
    id_medicament BIGINT NOT NULL,
    stock_theorique DECIMAL(15,3) NOT NULL DEFAULT 0,
    stock_physique DECIMAL(15,3) NOT NULL DEFAULT 0,
    ecart DECIMAL(15,3) NOT NULL DEFAULT 0,
    valeur_ecart DECIMAL(15,2) NOT NULL DEFAULT 0,
    observation TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_ligne_inventaire FOREIGN KEY (id_inventaire) REFERENCES inventaires_pharmacie(id) ON DELETE CASCADE,
    CONSTRAINT fk_ligne_medication FOREIGN KEY (id_medicament) REFERENCES medications(id)
);

-- ============================================
-- Créer les index pour optimiser les performances
-- ============================================

CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(subscription_status);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_employee_company ON company_employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_patient ON company_employees(patient_id);
CREATE INDEX IF NOT EXISTS idx_employee_matricule ON company_employees(matricule);
CREATE INDEX IF NOT EXISTS idx_ccr_company_date ON company_consumption_records(company_id, consumed_at);
CREATE INDEX IF NOT EXISTS idx_ccr_patient ON company_consumption_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_ccr_admission ON company_consumption_records(admission_id);
CREATE INDEX IF NOT EXISTS idx_inventaires_date ON inventaires_pharmacie(date DESC);
CREATE INDEX IF NOT EXISTS idx_inventaires_statut ON inventaires_pharmacie(statut);
CREATE INDEX IF NOT EXISTS idx_lignes_inventaire_medication ON lignes_inventaire_pharmacie(id_medicament);
CREATE INDEX IF NOT EXISTS idx_medications_categorie_abc ON medications(categorie_abc);
CREATE INDEX IF NOT EXISTS idx_medications_jours_alerte ON medications(jours_avant_alerte);

-- ============================================
-- Mettre à jour les données existantes (valeurs par défaut)
-- ============================================

-- S'assurer que tous les médicaments ont une valeur pour categorie_abc
UPDATE medications SET categorie_abc = 'C' WHERE categorie_abc IS NULL;

-- S'assurer que tous les médicaments ont une valeur pour jours_avant_alerte
UPDATE medications SET jours_avant_alerte = 30 WHERE jours_avant_alerte IS NULL;
