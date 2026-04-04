-- ══════════════════════════════════════════════════════════════════
-- SCRIPT DE DONNÉES DE TEST POUR LE MODULE PHARMACIE
-- ══════════════════════════════════════════════════════════════════

-- Insertion des médicaments de test
INSERT INTO medications (medication_code, name, generic_name, description, manufacturer, category, form, strength, unit_price, stock_quantity, minimum_stock, expiry_date, is_active, requires_prescription, created_at, updated_at) VALUES
('MED001', 'Paracétamol 500mg', 'Paracétamol', 'Antalgique et antipyrétique', 'Sanofi', 'Antalgique', 'Comprimé', '500mg', 2.50, 150, 50, '2025-12-31', true, false, NOW(), NOW()),
('MED002', 'Ibuprofène 400mg', 'Ibuprofène', 'Anti-inflammatoire non stéroïdien', 'Pfizer', 'AINS', 'Comprimé', '400mg', 4.20, 80, 30, '2025-10-15', true, false, NOW(), NOW()),
('MED003', 'Amoxicilline 500mg', 'Amoxicilline', 'Antibiotique de la famille des pénicillines', 'GSK', 'Antibiotique', 'Gélule', '500mg', 8.50, 45, 20, '2025-08-20', true, true, NOW(), NOW()),
('MED004', 'Omeprazole 20mg', 'Omeprazole', 'Inhibiteur de la pompe à protons', 'AstraZeneca', 'Gastro-entérologie', 'Gélule', '20mg', 12.30, 25, 15, '2025-09-30', true, false, NOW(), NOW()),
('MED005', 'Metformine 850mg', 'Metformine', 'Antidiabétique oral', 'Merck', 'Diabète', 'Comprimé', '850mg', 6.80, 60, 25, '2025-11-15', true, true, NOW(), NOW()),
('MED006', 'Lisinopril 10mg', 'Lisinopril', 'Inhibiteur de l\'enzyme de conversion', 'Novartis', 'Cardiologie', 'Comprimé', '10mg', 9.50, 35, 20, '2025-07-25', true, true, NOW(), NOW()),
('MED007', 'Simvastatine 20mg', 'Simvastatine', 'Hypolipémiant', 'MSD', 'Cardiologie', 'Comprimé', '20mg', 15.20, 40, 18, '2025-06-30', true, true, NOW(), NOW()),
('MED008', 'Salbutamol 100µg', 'Salbutamol', 'Bronchodilatateur', 'Boehringer', 'Pneumologie', 'Aérosol', '100µg/dose', 18.90, 20, 10, '2025-05-20', true, true, NOW(), NOW()),
('MED009', 'Insuline Glargine', 'Insuline Glargine', 'Insuline à action prolongée', 'Sanofi', 'Diabète', 'Stylo', '100U/mL', 45.00, 15, 8, '2025-04-15', true, true, NOW(), NOW()),
('MED010', 'Vitamine D3 1000UI', 'Cholécalciférol', 'Supplément vitaminique', 'Lilly', 'Vitamines', 'Gélule', '1000UI', 3.20, 200, 100, '2026-01-31', true, false, NOW(), NOW());

-- Insertion des fournisseurs
INSERT INTO suppliers (supplier_code, name, description, contact_person, phone_number, email_address, physical_address, payment_terms, delivery_time, is_active, is_preferred, created_at, updated_at) VALUES
('SUP001', 'PharmaDistribution', 'Distributeur principal de médicaments', 'Jean Dupont', '+221 33 820 00 01', 'contact@pharmadist.sn', 'Dakar, Plateau, Rue 123', '30 jours fin de mois', '48h', true, true, NOW(), NOW()),
('SUP002', 'MediSupply', 'Fournisseur d\'équipements médicaux', 'Marie Diop', '+221 33 820 00 02', 'info@medisupply.sn', 'Dakar, Ouakam, Avenue 456', '60 jours fin de mois', '72h', true, false, NOW(), NOW()),
('SUP003', 'GlobalPharma', 'Importateur de médicaments génériques', 'Ahmadou Ba', '+221 33 820 00 03', 'sales@globalpharma.sn', 'Dakar, Grand Yoff, Lot 789', '45 jours fin de mois', '24h', true, true, NOW(), NOW()),
('SUP004', 'LaboTech', 'Laboratoire pharmaceutique local', 'Dr. Fatou Ndiaye', '+221 33 820 00 04', 'contact@labotech.sn', 'Dakar, Mermoz, Rue 321', '30 jours fin de mois', '12h', true, false, NOW(), NOW());

-- Insertion des commandes pharmaceutiques de test
-- Note: Ces IDs de patient et utilisateur doivent exister dans vos tables
-- Remplacer par des IDs réels selon votre base de données

INSERT INTO pharmacy_orders (order_code, supplier_id, patient_id, status, order_type, total_amount, amount_paid, payment_method, payment_reference, created_by, notes, is_external_prescription, created_at, updated_at, version) VALUES
('ORD001', 1, 1, 'EN_ATTENTE', 'VENTE_INTERNE', 25.50, 0.00, NULL, NULL, 1, 'Prescription pour hypertension', false, NOW(), NOW(), 1),
('ORD002', 2, 2, 'EN_PREPARATION', 'ORDONNANCE_EXTERNE', 42.30, 42.30, 'CARTE_BANCAIRE', 'CB_001', 1, 'Patient diabétique', true, NOW(), NOW(), 1),
('ORD003', 1, 3, 'PAYEE', 'VENTE_INTERNE', 18.90, 18.90, 'ESPECES', 'ESP_001', 1, 'Traitement asthme', false, NOW(), NOW(), 1),
('ORD004', 3, 4, 'LIVREE', 'VENTE_DIRECTE', 67.80, 67.80, 'MOBILE_MONEY', 'MM_001', 1, 'Vente directe', false, NOW(), NOW(), 1),
('ORD005', 4, 5, 'ANNULEE', 'VENTE_INTERNE', 35.00, 0.00, NULL, NULL, 1, 'Commande annulée - rupture de stock', false, NOW(), NOW(), 1);

-- Insertion des items de commandes
INSERT INTO pharmacy_order_items (pharmacy_order_id, medication_id, quantity, unit_price, total_price, quantity_dispensed, dosage_instructions, is_external, created_at, updated_at) VALUES
-- Items pour ORD001
(1, 1, 10, 2.50, 25.00, 0, '1 comprimé 3 fois par jour si douleur', false, NOW(), NOW()),
(1, 2, 1, 4.20, 4.20, 0, '1 comprimé 2 fois par jour pendant 7 jours', false, NOW(), NOW()),

-- Items pour ORD002
(2, 3, 5, 8.50, 42.50, 5, '1 gélule 3 fois par jour pendant 5 jours', true, NOW(), NOW()),

-- Items pour ORD003
(3, 8, 1, 18.90, 18.90, 1, '2 inhalations si crise d\'asthme', false, NOW(), NOW()),

-- Items pour ORD004
(4, 5, 10, 6.80, 68.00, 10, '1 comprimé 2 fois par jour', false, NOW(), NOW()),
(4, 10, 5, 3.20, 16.00, 5, '1 gélule par jour', false, NOW(), NOW()),

-- Items pour ORD005
(5, 4, 3, 12.30, 36.90, 0, '1 gélule le matin', false, NOW(), NOW());

-- Création d'un utilisateur pharmacien de test
-- Note: Adapter selon votre système d'authentification
INSERT INTO users (username, email, password, first_name, last_name, phone_number, role, is_active, created_at, updated_at) VALUES
('pharmacie1', 'pharmacie@hospital.sn', '$2a$10$encrypted_password_hash', 'Fatou', 'Sarr', '+221 77 123 45 67', 'PHARMACY', true, NOW(), NOW())
ON CONFLICT (username) DO NOTHING;

-- Mise à jour des permissions pour le pharmacien
INSERT INTO user_permissions (user_id, permission, created_at) VALUES
((SELECT id FROM users WHERE username = 'pharmacie1'), 'PHARMACY_MANAGE_ORDERS', NOW()),
((SELECT id FROM users WHERE username = 'pharmacie1'), 'PHARMACY_MANAGE_STOCK', NOW()),
((SELECT id FROM users WHERE username = 'pharmacie1'), 'PHARMACY_VIEW_REPORTS', NOW())
ON CONFLICT DO NOTHING;

-- Création de configurations système pour la pharmacie
INSERT INTO system_config (config_key, config_value, description, category, created_at, updated_at) VALUES
('PHARMACY_MIN_STOCK_ALERT', '20', 'Seuil d\'alerte de stock minimum', 'PHARMACY', NOW(), NOW()),
('PHARMACY_AUTO_ORDER_ENABLED', 'true', 'Activer les commandes automatiques', 'PHARMACY', NOW(), NOW()),
('PHARMACY_DEFAULT_PAYMENT_METHOD', 'ESPECES', 'Méthode de paiement par défaut', 'PHARMACY', NOW(), NOW()),
('PHARMACY_PRESCRIPTION_VALIDITY_DAYS', '30', 'Validité des ordonnances en jours', 'PHARMACY', NOW(), NOW())
ON CONFLICT (config_key) DO NOTHING;

-- Insertion de notifications de test
INSERT INTO notifications (user_id, title, message, type, is_read, priority, created_at, updated_at) VALUES
(1, 'Nouvelle commande pharmaceutique', 'La commande ORD001 est en attente de validation', 'PHARMACY_ORDER', false, 'MEDIUM', NOW(), NOW()),
(1, 'Alerte de stock critique', 'Le médicament Amoxicilline 500mg est en stock critique', 'STOCK_ALERT', false, 'HIGH', NOW(), NOW()),
((SELECT id FROM users WHERE username = 'pharmacie1'), 'Commande prête', 'La commande ORD003 est prête pour dispensation', 'PHARMACY_ORDER', false, 'MEDIUM', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════════
-- STATISTIQUES DE TEST
-- ══════════════════════════════════════════════════════════════════

-- Vérification des données insérées
SELECT 'Médicaments insérés:' as info, COUNT(*) as count FROM medications;
SELECT 'Fournisseurs insérés:' as info, COUNT(*) as count FROM suppliers;
SELECT 'Commandes pharmaceutiques insérées:' as info, COUNT(*) as count FROM pharmacy_orders;
SELECT 'Items de commandes insérés:' as info, COUNT(*) as count FROM pharmacy_order_items;

-- Alertes de stock actuelles
SELECT 
    m.name as medication_name,
    m.stock_quantity as current_stock,
    m.minimum_stock,
    CASE 
        WHEN m.stock_quantity <= 0 THEN 'OUT_OF_STOCK'
        WHEN m.stock_quantity <= m.minimum_stock / 2 THEN 'CRITICAL'
        WHEN m.stock_quantity <= m.minimum_stock THEN 'LOW'
        ELSE 'OK'
    END as stock_status
FROM medications m
WHERE m.stock_quantity <= m.minimum_stock OR m.stock_quantity = 0
ORDER BY m.stock_quantity ASC;

-- Commandes par statut
SELECT 
    status,
    COUNT(*) as count,
    SUM(total_amount) as total_amount
FROM pharmacy_orders
GROUP BY status
ORDER BY status;

-- ══════════════════════════════════════════════════════════════════
-- FIN DU SCRIPT DE TEST
-- ══════════════════════════════════════════════════════════════════
