-- ============================================
-- INITIALISATION COMPLÈTE DE LA BASE DE DONNÉES
-- Pour Render PostgreSQL - Inua Afia
-- ============================================

-- ============================================
-- 1. TABLE DES RÔLES
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL UNIQUE,
    description VARCHAR(500),
    couleur VARCHAR(7)
);

-- ============================================
-- 2. TABLE DES PERMISSIONS DE RÔLES
-- ============================================
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission VARCHAR(255) NOT NULL,
    PRIMARY KEY (role_id, permission)
);

-- ============================================
-- 3. TABLE DES DÉPARTEMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    description VARCHAR(500),
    code VARCHAR(50),
    is_active BOOLEAN DEFAULT true
);

-- ============================================
-- 4. TABLE DES UTILISATEURS
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    photo_url TEXT,
    blood_type VARCHAR(10),
    address TEXT,
    date_of_birth VARCHAR(50),
    department_id BIGINT REFERENCES departments(id),
    role_id BIGINT NOT NULL REFERENCES roles(id),
    is_active BOOLEAN DEFAULT true,
    notification_enabled BOOLEAN DEFAULT true,
    sound_enabled BOOLEAN DEFAULT true,
    preferred_language VARCHAR(10) DEFAULT 'fr',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. TABLE DES PATIENTS
-- ============================================
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    patient_code VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    birth_place VARCHAR(255),
    gender VARCHAR(20),
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
    weight DECIMAL(10,2),
    height INTEGER,
    blood_pressure VARCHAR(20),
    temperature DECIMAL(4,2),
    heart_rate INTEGER,
    symptoms TEXT,
    insurance_number VARCHAR(255),
    insurance_provider VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT REFERENCES users(id)
);

-- ============================================
-- 6. TABLE DES DOSSIERS MÉDICAUX
-- ============================================
CREATE TABLE IF NOT EXISTS medical_records (
    id SERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    diagnosis TEXT,
    treatment TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT REFERENCES users(id)
);

-- ============================================
-- 7. TABLE DES CONSULTATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS consultations (
    id SERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    doctor_id BIGINT REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'EN_ATTENTE',
    priority VARCHAR(20) DEFAULT 'NORMAL',
    symptoms TEXT,
    diagnosis TEXT,
    notes TEXT,
    appointment_date TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    exam_amount_paid DECIMAL(19,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT REFERENCES users(id)
);

-- ============================================
-- 8. TABLE DES MÉDICAMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS medications (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    form VARCHAR(50),
    dosage VARCHAR(255),
    price DECIMAL(19,2) DEFAULT 0,
    purchase_price DECIMAL(19,2) DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 10,
    code VARCHAR(100) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 9. TABLE DES ORDONNANCES
-- ============================================
CREATE TABLE IF NOT EXISTS prescriptions (
    id SERIAL PRIMARY KEY,
    consultation_id BIGINT REFERENCES consultations(id),
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    doctor_id BIGINT REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'PENDING',
    total_amount DECIMAL(19,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 10. TABLE DES ITEMS D'ORDONNANCE
-- ============================================
CREATE TABLE IF NOT EXISTS prescription_items (
    id SERIAL PRIMARY KEY,
    prescription_id BIGINT NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medication_id BIGINT REFERENCES medications(id),
    medication_name VARCHAR(255),
    quantity INTEGER NOT NULL DEFAULT 1,
    dosage VARCHAR(255),
    frequency VARCHAR(255),
    duration VARCHAR(255),
    instructions TEXT,
    unit_price DECIMAL(19,2) DEFAULT 0,
    total_price DECIMAL(19,2) DEFAULT 0
);

-- ============================================
-- 11. TABLE DES FACTURES
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(100) UNIQUE,
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    consultation_id BIGINT REFERENCES consultations(id),
    prescription_id BIGINT REFERENCES prescriptions(id),
    total_amount DECIMAL(19,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(19,2) DEFAULT 0,
    remaining_amount DECIMAL(19,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'UNPAID',
    payment_method VARCHAR(50),
    department_source VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT REFERENCES users(id)
);

-- ============================================
-- 12. TABLE DES EXAMENS DE LABORATOIRE
-- ============================================
CREATE TABLE IF NOT EXISTS lab_tests (
    id SERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    consultation_id BIGINT REFERENCES consultations(id),
    doctor_id BIGINT REFERENCES users(id),
    test_name VARCHAR(255) NOT NULL,
    test_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'PENDING',
    priority VARCHAR(20) DEFAULT 'NORMAL',
    result TEXT,
    normal_range VARCHAR(255),
    unit VARCHAR(50),
    notes TEXT,
    price DECIMAL(19,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    created_by BIGINT REFERENCES users(id)
);

-- ============================================
-- 13. TABLE DES NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50),
    title VARCHAR(255),
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    entity_type VARCHAR(50),
    entity_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 14. TABLE DES ADMISSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS admissions (
    id SERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    bed_number VARCHAR(50),
    room_number VARCHAR(50),
    admission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    discharge_date TIMESTAMP,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_by BIGINT REFERENCES users(id)
);

-- ============================================
-- 15. TABLE DES JOURNAUX D'AUDIT
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    username VARCHAR(255),
    entity_type VARCHAR(100),
    entity_name VARCHAR(255),
    details TEXT,
    status VARCHAR(50),
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 16. TABLE DES MESSAGES DE CHAT
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    sender_id BIGINT NOT NULL REFERENCES users(id),
    receiver_id BIGINT REFERENCES users(id),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INSERTION DES RÔLES ESSENTIELS
-- ============================================
INSERT INTO roles (nom, description) VALUES 
    ('ROLE_ADMIN', 'Administrateur système avec tous les droits'),
    ('ROLE_DOCTEUR', 'Médecin - peut consulter et prescrire'),
    ('ROLE_PATIENT', 'Patient - peut prendre rendez-vous'),
    ('ROLE_RECEPTION', 'Réceptionniste - gère les admissions'),
    ('ROLE_FINANCE', 'Agent financier - gestion des factures'),
    ('ROLE_CAISSIER', 'Caissier - encaissement'),
    ('ROLE_PHARMACIE', 'Pharmacien - gestion des médicaments'),
    ('ROLE_PHARMACIST', 'Pharmacien (anglais)'),
    ('ROLE_LABORATOIRE', 'Technicien de laboratoire'),
    ('ROLE_INFIRMIER', 'Infirmier')
ON CONFLICT (nom) DO NOTHING;

-- ============================================
-- CRÉATION D'UN UTILISATEUR ADMIN PAR DÉFAUT
-- Mot de passe: admin123 (encodé BCrypt)
-- ============================================
-- Admin user (à activer manuellement si besoin)
-- INSERT INTO users (username, email, password, first_name, last_name, role_id, is_active)
-- SELECT 'admin', 'admin@inuaafia.com', '$2a$10$N9qo8uLOogqYpfqL1Q7Qd.8fX7X7X7X7X7X7X7X7X7X7X7X7X7X7X', 'Admin', 'System', id, true
-- FROM roles WHERE nom = 'ROLE_ADMIN';

-- ============================================
-- VÉRIFICATION
-- ============================================
SELECT 'Tables créées avec succès!' AS status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
