-- ========================================================
-- V1__init_schema.sql
-- Migration initiale - Création du schéma complet INUA AFYA
-- ========================================================
-- Ce script représente l'état actuel de la base de données.
-- Il permet de reconstruire une nouvelle instance à l'identique.
-- ========================================================

-- ========================================================
-- 1. TABLES DE CONFIGURATION (sans dépendances)
-- ========================================================

-- Table des rôles utilisateurs
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL UNIQUE,
    description VARCHAR(500),
    couleur VARCHAR(7)
);

-- Table des permissions par rôle
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission VARCHAR(255) NOT NULL,
    PRIMARY KEY (role_id, permission)
);

-- Table des départements
CREATE TABLE IF NOT EXISTS departments (
    id BIGSERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    chef VARCHAR(255),
    nombre_personnel INTEGER,
    nombre_lits INTEGER,
    etage VARCHAR(50),
    telephone VARCHAR(50),
    actif BOOLEAN DEFAULT TRUE
);

-- Table des types de statut de consultation
CREATE TABLE IF NOT EXISTS consultation_status (
    status VARCHAR(50) PRIMARY KEY
);

-- Insertion des statuts de consultation
INSERT INTO consultation_status (status) VALUES
    ('EN_ATTENTE'),
    ('EN_COURS'),
    ('TERMINE'),
    ('ANNULE')
ON CONFLICT DO NOTHING;

-- Table des types de statut de test labo
CREATE TABLE IF NOT EXISTS lab_test_status (
    status VARCHAR(50) PRIMARY KEY
);

INSERT INTO lab_test_status (status) VALUES
    ('EN_ATTENTE'),
    ('EN_COURS'),
    ('TERMINE'),
    ('ANNULE')
ON CONFLICT DO NOTHING;

-- Table des devises
CREATE TABLE IF NOT EXISTS currency (
    code VARCHAR(3) PRIMARY KEY
);

INSERT INTO currency (code) VALUES
    ('CDF'),
    ('USD')
ON CONFLICT DO NOTHING;

-- Table des méthodes de paiement
CREATE TABLE IF NOT EXISTS payment_method (
    method VARCHAR(50) PRIMARY KEY
);

INSERT INTO payment_method (method) VALUES
    ('CASH'),
    ('CARD'),
    ('MOBILE_MONEY'),
    ('BANK_TRANSFER'),
    ('INSURANCE')
ON CONFLICT DO NOTHING;

-- Table des statuts de facture
CREATE TABLE IF NOT EXISTS invoice_status (
    status VARCHAR(50) PRIMARY KEY
);

INSERT INTO invoice_status (status) VALUES
    ('EN_ATTENTE'),
    ('PAYEE'),
    ('PARTIELLEMENT_PAYEE'),
    ('ANNULEE'),
    ('REMBOURSEE')
ON CONFLICT DO NOTHING;

-- Table des statuts de prescription
CREATE TABLE IF NOT EXISTS prescription_status (
    status VARCHAR(50) PRIMARY KEY
);

INSERT INTO prescription_status (status) VALUES
    ('EN_ATTENTE'),
    ('PAYEE'),
    ('EN_COURS'),
    ('TERMINE'),
    ('ANNULEE')
ON CONFLICT DO NOTHING;

-- Table des statuts d'examen prescrit
CREATE TABLE IF NOT EXISTS prescribed_exam_status (
    status VARCHAR(50) PRIMARY KEY
);

INSERT INTO prescribed_exam_status (status) VALUES
    ('PRESCRIBED'),
    ('VALIDATED'),
    ('PAID'),
    ('IN_PROGRESS'),
    ('COMPLETED'),
    ('CANCELLED')
ON CONFLICT DO NOTHING;

-- Table des types d'éléments de facture
CREATE TABLE IF NOT EXISTS invoice_item_type (
    type VARCHAR(50) PRIMARY KEY
);

INSERT INTO invoice_item_type (type) VALUES
    ('CONSULTATION'),
    ('EXAMEN'),
    ('MEDICAMENT'),
    ('HOSPITALISATION'),
    ('AUTRE')
ON CONFLICT DO NOTHING;

-- Table des formes de médicaments
CREATE TABLE IF NOT EXISTS medication_form (
    form VARCHAR(50) PRIMARY KEY
);

INSERT INTO medication_form (form) VALUES
    ('COMPRIME'),
    ('GELULE'),
    ('SIROP'),
    ('INJECTION'),
    ('POMADE'),
    ('CREME'),
    ('SOLUTION'),
    ('SUSPENSION'),
    ('SUPPOSITOIRE'),
    ('AUTRE')
ON CONFLICT DO NOTHING;

-- Table des genres
CREATE TABLE IF NOT EXISTS gender (
    gender VARCHAR(10) PRIMARY KEY
);

INSERT INTO gender (gender) VALUES
    ('MALE'),
    ('FEMALE'),
    ('OTHER')
ON CONFLICT DO NOTHING;

-- Table des sources de département
CREATE TABLE IF NOT EXISTS department_source (
    source VARCHAR(50) PRIMARY KEY
);

INSERT INTO department_source (source) VALUES
    ('RECEPTION'),
    ('CONSULTATION'),
    ('LABORATOIRE'),
    ('PHARMACIE'),
    ('FINANCE')
ON CONFLICT DO NOTHING;

-- Table des priorités
CREATE TABLE IF NOT EXISTS priority (
    priority VARCHAR(20) PRIMARY KEY
);

INSERT INTO priority (priority) VALUES
    ('BASSE'),
    ('NORMALE'),
    ('HAUTE'),
    ('URGENTE')
ON CONFLICT DO NOTHING;

-- ========================================================
-- 2. TABLES UTILISATEURS ET PATIENTS
-- ========================================================

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    photo_url TEXT,
    blood_type VARCHAR(10),
    address TEXT,
    date_of_birth VARCHAR(20),
    department_id BIGINT REFERENCES departments(id),
    role_id BIGINT NOT NULL REFERENCES roles(id),
    is_active BOOLEAN,
    notification_enabled BOOLEAN DEFAULT TRUE,
    sound_enabled BOOLEAN DEFAULT TRUE,
    preferred_language VARCHAR(10) DEFAULT 'fr',
    is_online BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Table des patients
CREATE TABLE IF NOT EXISTS patients (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE REFERENCES users(id),
    patient_code VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    birth_place VARCHAR(255),
    gender VARCHAR(10) REFERENCES gender(gender),
    phone_number VARCHAR(50),
    email VARCHAR(255) UNIQUE,
    profession VARCHAR(255),
    marital_status VARCHAR(50),
    religion VARCHAR(100),
    nationality VARCHAR(100),
    health_area VARCHAR(255),
    address TEXT,
    city VARCHAR(255),
    blood_type VARCHAR(10),
    emergency_contact VARCHAR(255),
    emergency_phone VARCHAR(50),
    photo_url TEXT,
    allergies TEXT,
    chronic_diseases TEXT,
    weight DOUBLE PRECISION,
    height INTEGER,
    blood_pressure VARCHAR(20),
    temperature DOUBLE PRECISION,
    heart_rate INTEGER,
    symptoms TEXT,
    insurance_number VARCHAR(100),
    insurance_provider VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- ========================================================
-- 3. TABLES MÉDICALES
-- ========================================================

-- Table des services médicaux
CREATE TABLE IF NOT EXISTS medical_services (
    id BIGSERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    departement VARCHAR(255) NOT NULL,
    prix DOUBLE PRECISION NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD' REFERENCES currency(code),
    duree INTEGER,
    is_active BOOLEAN DEFAULT TRUE
);

-- Table des médicaments
CREATE TABLE IF NOT EXISTS medications (
    id BIGSERIAL PRIMARY KEY,
    medication_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    description TEXT,
    manufacturer VARCHAR(255),
    supplier VARCHAR(255),
    category VARCHAR(255),
    form VARCHAR(50) REFERENCES medication_form(form),
    strength VARCHAR(100),
    price DECIMAL(10,2),
    purchase_currency VARCHAR(3) REFERENCES currency(code),
    unit_price DECIMAL(10,2),
    sale_currency VARCHAR(3) REFERENCES currency(code),
    stock_quantity INTEGER,
    minimum_stock INTEGER,
    expiry_date TIMESTAMP,
    purchase_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    requires_prescription BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Table des admissions
CREATE TABLE IF NOT EXISTS admissions (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    doctor_id BIGINT NOT NULL REFERENCES users(id),
    admission_date TIMESTAMP,
    poids VARCHAR(20),
    temperature VARCHAR(20),
    taille VARCHAR(20),
    tension_arterielle VARCHAR(20),
    reason_for_visit TEXT,
    symptoms TEXT,
    notes TEXT,
    total_amount DECIMAL(19,2) DEFAULT 0.00,
    status VARCHAR(50),
    amount_paid DECIMAL(19,2) DEFAULT 0.00,
    payment_method VARCHAR(50),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Table des consultations
CREATE TABLE IF NOT EXISTS consultations (
    id BIGSERIAL PRIMARY KEY,
    consultation_code VARCHAR(50) UNIQUE,
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    doctor_id BIGINT NOT NULL REFERENCES users(id),
    admission_id BIGINT REFERENCES admissions(id),
    consultation_date TIMESTAMP,
    decision_note TEXT,
    proposed_new_date TIMESTAMP,
    poids VARCHAR(20),
    temperature VARCHAR(20),
    taille VARCHAR(20),
    tension_arterielle VARCHAR(20),
    frais_fiche DOUBLE PRECISION,
    service_id BIGINT REFERENCES medical_services(id),
    fiche_amount_due DOUBLE PRECISION DEFAULT 0.0,
    fiche_amount_paid DOUBLE PRECISION DEFAULT 0.0,
    consul_amount_due DOUBLE PRECISION DEFAULT 0.0,
    consul_amount_paid DOUBLE PRECISION DEFAULT 0.0,
    reason_for_visit TEXT,
    symptoms TEXT,
    diagnosis TEXT,
    treatment TEXT,
    notes TEXT,
    is_hospitalized BOOLEAN DEFAULT FALSE,
    date_entree TIMESTAMP,
    date_sortie TIMESTAMP,
    status VARCHAR(50) REFERENCES consultation_status(status),
    date_cloture TIMESTAMP,
    statut VARCHAR(50),
    requires_lab_test BOOLEAN DEFAULT FALSE,
    requires_prescription BOOLEAN DEFAULT FALSE,
    exam_amount_paid DECIMAL(19,2) DEFAULT 0.00,
    exam_total_amount DECIMAL(19,2) DEFAULT 0.00,
    invoice_id BIGINT,
    numero_fiche VARCHAR(20) UNIQUE,
    date_validation TIMESTAMP,
    signataire_id BIGINT,
    signature_image TEXT,
    is_validated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Table de liaison consultation-services (Many-to-Many)
CREATE TABLE IF NOT EXISTS consultation_services (
    consultation_id BIGINT NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    service_id BIGINT NOT NULL REFERENCES medical_services(id) ON DELETE CASCADE,
    PRIMARY KEY (consultation_id, service_id)
);

-- Table des éléments d'examens (Collection)
CREATE TABLE IF NOT EXISTS consultation_exams (
    consultation_id BIGINT NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    exam_name VARCHAR(255) NOT NULL,
    exam_price DECIMAL(10,2),
    PRIMARY KEY (consultation_id, exam_name)
);

-- Table des examens prescrits
CREATE TABLE IF NOT EXISTS prescribed_exams (
    id BIGSERIAL PRIMARY KEY,
    consultation_id BIGINT NOT NULL REFERENCES consultations(id),
    service_id BIGINT NOT NULL REFERENCES medical_services(id),
    service_name VARCHAR(255) NOT NULL,
    unit_price DECIMAL(19,2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    total_price DECIMAL(19,2) DEFAULT 0.00,
    currency VARCHAR(3) REFERENCES currency(code),
    doctor_note TEXT,
    cashier_note TEXT,
    lab_note TEXT,
    result_value VARCHAR(100),
    unit VARCHAR(20),
    reference_min VARCHAR(50),
    reference_max VARCHAR(50),
    reference_range_text VARCHAR(100),
    is_critical BOOLEAN DEFAULT FALSE,
    lab_comment TEXT,
    result_entered_at TIMESTAMP,
    result_entered_by VARCHAR(100),
    analysis_method VARCHAR(100),
    active BOOLEAN DEFAULT TRUE,
    removal_reason TEXT,
    status VARCHAR(50) REFERENCES prescribed_exam_status(status),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Table des tests de laboratoire
CREATE TABLE IF NOT EXISTS lab_tests (
    id BIGSERIAL PRIMARY KEY,
    test_code VARCHAR(50) NOT NULL UNIQUE,
    consultation_id BIGINT NOT NULL REFERENCES consultations(id),
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    requested_by BIGINT REFERENCES users(id),
    processed_by BIGINT REFERENCES users(id),
    doctor_id BIGINT REFERENCES users(id),
    test_type VARCHAR(255) NOT NULL,
    test_name VARCHAR(255) NOT NULL,
    description TEXT,
    results TEXT,
    interpretation TEXT,
    normal_range VARCHAR(255),
    unit VARCHAR(20),
    status VARCHAR(50) REFERENCES lab_test_status(status),
    priority VARCHAR(20) REFERENCES priority(priority),
    requested_at TIMESTAMP,
    processed_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    from_finance BOOLEAN DEFAULT FALSE,
    unit_price DECIMAL(19,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD' REFERENCES currency(code)
);

-- ========================================================
-- 4. TABLES PHARMACIE ET FACTURATION
-- ========================================================

-- Table des prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
    id BIGSERIAL PRIMARY KEY,
    prescription_code VARCHAR(50) NOT NULL UNIQUE,
    consultation_id BIGINT NOT NULL REFERENCES consultations(id),
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    doctor_id BIGINT NOT NULL REFERENCES users(id),
    notes TEXT,
    status VARCHAR(50) REFERENCES prescription_status(status),
    total_amount DECIMAL(19,2),
    amount_paid DECIMAL(19,2),
    paid_by BIGINT REFERENCES users(id),
    paid_at TIMESTAMP,
    dispensed_by BIGINT REFERENCES users(id),
    dispensed_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Table des éléments de prescription
CREATE TABLE IF NOT EXISTS prescription_items (
    id BIGSERIAL PRIMARY KEY,
    prescription_id BIGINT NOT NULL REFERENCES prescriptions(id),
    medication_id BIGINT NOT NULL REFERENCES medications(id),
    quantity INTEGER,
    dosage VARCHAR(255),
    frequency VARCHAR(255),
    duration INTEGER,
    quantity_per_dose INTEGER,
    duration_unit VARCHAR(50),
    instructions TEXT,
    unit_price DOUBLE PRECISION,
    total_price DOUBLE PRECISION,
    is_dispensed BOOLEAN DEFAULT FALSE,
    dispensed_quantity INTEGER
);

-- Table des factures
CREATE TABLE IF NOT EXISTS invoices (
    id BIGSERIAL PRIMARY KEY,
    invoice_code VARCHAR(50) NOT NULL UNIQUE,
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    consultation_id BIGINT REFERENCES consultations(id),
    prescription_id BIGINT REFERENCES prescriptions(id),
    subtotal DECIMAL(10,2),
    tax_amount DECIMAL(10,2),
    discount_amount DECIMAL(10,2),
    total_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2),
    status VARCHAR(50) NOT NULL REFERENCES invoice_status(status),
    payment_method VARCHAR(50) REFERENCES payment_method(method),
    department_source VARCHAR(50) REFERENCES department_source(source),
    currency VARCHAR(3) REFERENCES currency(code),
    notes TEXT,
    created_by BIGINT REFERENCES users(id),
    paid_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Mise à jour de la clé étrangère invoice_id dans consultations
-- (Déjà créée ci-dessus, mais on ajoute la contrainte si pas existante)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_consultation_invoice'
        AND table_name = 'consultations'
    ) THEN
        ALTER TABLE consultations
        ADD CONSTRAINT fk_consultation_invoice
        FOREIGN KEY (invoice_id) REFERENCES invoices(id);
    END IF;
END $$;

-- Table des éléments de facture
CREATE TABLE IF NOT EXISTS invoice_items (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL REFERENCES invoices(id),
    description VARCHAR(500) NOT NULL,
    item_type VARCHAR(50) REFERENCES invoice_item_type(type),
    quantity INTEGER,
    unit_price DECIMAL(10,2),
    total_price DECIMAL(10,2)
);

-- ========================================================
-- 5. TABLES ANNEXES
-- ========================================================

-- Table des dossiers médicaux
CREATE TABLE IF NOT EXISTS medical_records (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    record_type VARCHAR(100),
    title VARCHAR(255),
    description TEXT,
    attachments TEXT,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Table des ordres de pharmacie
CREATE TABLE IF NOT EXISTS pharmacy_orders (
    id BIGSERIAL PRIMARY KEY,
    order_code VARCHAR(50) NOT NULL UNIQUE,
    prescription_id BIGINT REFERENCES prescriptions(id),
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    ordered_by BIGINT NOT NULL REFERENCES users(id),
    status VARCHAR(50),
    priority VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Table des notifications
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    type VARCHAR(50),
    title VARCHAR(255),
    message TEXT,
    entity_type VARCHAR(100),
    entity_id BIGINT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP
);

-- Table des documents patients
CREATE TABLE IF NOT EXISTS patient_documents (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    document_type VARCHAR(100),
    file_name VARCHAR(255),
    file_content BYTEA,
    mime_type VARCHAR(100),
    uploaded_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP
);

-- Table des transactions financières
CREATE TABLE IF NOT EXISTS finance_transactions (
    id BIGSERIAL PRIMARY KEY,
    transaction_code VARCHAR(50) NOT NULL UNIQUE,
    invoice_id BIGINT REFERENCES invoices(id),
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) REFERENCES payment_method(method),
    currency VARCHAR(3) REFERENCES currency(code),
    status VARCHAR(50),
    notes TEXT,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Table de la caisse
CREATE TABLE IF NOT EXISTS caisses (
    id BIGSERIAL PRIMARY KEY,
    caisse_code VARCHAR(50) NOT NULL UNIQUE,
    date_ouverture TIMESTAMP NOT NULL,
    date_fermeture TIMESTAMP,
    solde_ouverture DECIMAL(10,2) DEFAULT 0.00,
    solde_fermeture DECIMAL(10,2),
    total_entrees DECIMAL(10,2) DEFAULT 0.00,
    total_sorties DECIMAL(10,2) DEFAULT 0.00,
    statut VARCHAR(50),
    opened_by BIGINT REFERENCES users(id),
    closed_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Table des dépenses
CREATE TABLE IF NOT EXISTS expenses (
    id BIGSERIAL PRIMARY KEY,
    expense_code VARCHAR(50) NOT NULL UNIQUE,
    category VARCHAR(255),
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) REFERENCES currency(code),
    expense_date DATE,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Table des logs d'audit
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(100),
    entity_type VARCHAR(100),
    entity_id BIGINT,
    user_id BIGINT REFERENCES users(id),
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP
);

-- Table des messages de chat
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    sender_id BIGINT NOT NULL REFERENCES users(id),
    receiver_id BIGINT REFERENCES users(id),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP
);

-- Table des présences (pointage)
CREATE TABLE IF NOT EXISTS attendances (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Table des activités
CREATE TABLE IF NOT EXISTS activities (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    activity_type VARCHAR(100),
    description TEXT,
    entity_type VARCHAR(100),
    entity_id BIGINT,
    created_at TIMESTAMP
);

-- Table de configuration de l'hôpital
CREATE TABLE IF NOT EXISTS hospital_configs (
    id BIGSERIAL PRIMARY KEY,
    config_key VARCHAR(255) NOT NULL UNIQUE,
    config_value TEXT,
    description TEXT,
    updated_by BIGINT REFERENCES users(id),
    updated_at TIMESTAMP
);

-- ========================================================
-- 6. INDEX POUR LES PERFORMANCES
-- ========================================================

CREATE INDEX IF NOT EXISTS idx_patients_code ON patients(patient_code);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_consultations_patient ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor ON consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_date ON consultations(consultation_date);
CREATE INDEX IF NOT EXISTS idx_admissions_patient ON admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_admissions_doctor ON admissions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_code ON invoices(invoice_code);
CREATE INDEX IF NOT EXISTS idx_prescriptions_consultation ON prescriptions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_tests_consultation ON lab_tests(consultation_id);
CREATE INDEX IF NOT EXISTS idx_lab_tests_patient ON lab_tests(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_tests_status ON lab_tests(status);
CREATE INDEX IF NOT EXISTS idx_prescribed_exams_consultation ON prescribed_exams(consultation_id);
CREATE INDEX IF NOT EXISTS idx_medications_name ON medications(name);
CREATE INDEX IF NOT EXISTS idx_medications_code ON medications(medication_code);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_invoice ON finance_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_attendances_user ON attendances(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_receiver ON chat_messages(receiver_id);

-- ========================================================
-- 7. DONNÉES INITIALES (SEED)
-- ========================================================

-- Rôles par défaut
INSERT INTO roles (id, nom, description, couleur) VALUES
    (1, 'ROLE_ADMIN', 'Administrateur système', '#dc3545'),
    (2, 'ROLE_DOCTOR', 'Médecin', '#007bff'),
    (3, 'ROLE_NURSE', 'Infirmier(ère)', '#28a745'),
    (4, 'ROLE_RECEPTIONIST', 'Réceptionniste', '#ffc107'),
    (5, 'ROLE_PHARMACIST', 'Pharmacien(ne)', '#17a2b8'),
    (6, 'ROLE_LAB_TECH', 'Technicien de laboratoire', '#6f42c1'),
    (7, 'ROLE_FINANCE', 'Comptable/Finance', '#fd7e14'),
    (8, 'ROLE_PATIENT', 'Patient', '#6c757d')
ON CONFLICT (id) DO UPDATE SET
    description = EXCLUDED.description,
    couleur = EXCLUDED.couleur;

-- Permissions pour l'admin
INSERT INTO role_permissions (role_id, permission) VALUES
    (1, 'ALL_PRIVILEGES'),
    (1, 'MANAGE_USERS'),
    (1, 'MANAGE_ROLES'),
    (1, 'VIEW_DASHBOARD'),
    (1, 'MANAGE_SETTINGS')
ON CONFLICT DO NOTHING;

-- Permissions médecin
INSERT INTO role_permissions (role_id, permission) VALUES
    (2, 'VIEW_PATIENTS'),
    (2, 'MANAGE_CONSULTATIONS'),
    (2, 'CREATE_PRESCRIPTIONS'),
    (2, 'REQUEST_LAB_TESTS'),
    (2, 'VIEW_MEDICAL_RECORDS')
ON CONFLICT DO NOTHING;

-- Permissions réception
INSERT INTO role_permissions (role_id, permission) VALUES
    (4, 'VIEW_PATIENTS'),
    (4, 'CREATE_PATIENTS'),
    (4, 'MANAGE_ADMISSIONS'),
    (4, 'VIEW_CONSULTATIONS'),
    (4, 'COLLECT_PAYMENTS')
ON CONFLICT DO NOTHING;

-- Configuration par défaut
INSERT INTO hospital_configs (config_key, config_value, description) VALUES
    ('HOSPITAL_NAME', 'INUA AFYA Hospital', 'Nom de l\'hôpital'),
    ('HOSPITAL_CURRENCY', 'USD', 'Devise principale'),
    ('CONSULTATION_PRICE', '10.00', 'Prix de consultation standard'),
    ('FICHE_PRICE', '5.00', 'Prix de la fiche patient')
ON CONFLICT (config_key) DO NOTHING;

-- ========================================================
-- FIN DE LA MIGRATION
-- ========================================================
