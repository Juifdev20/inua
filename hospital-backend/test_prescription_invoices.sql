-- ══════════════════════════════════════════════════════════════════
-- SCRIPT DE TEST POUR CRÉER DES FACTURES DE PRESCRIPTIONS PHARMACIE
-- ══════════════════════════════════════════════════════════════════

-- Vérifier d'abord s'il existe des prescriptions
SELECT 'Prescriptions existantes:' as info, COUNT(*) as count FROM prescriptions;

-- Si aucune prescription n'existe, créons des données de test minimales
-- Note: Ces IDs doivent exister dans votre base de données

-- 1. Créer une prescription de test si elle n'existe pas
INSERT INTO prescriptions (prescription_code, patient_id, consultation_id, status, notes, created_at, updated_at) 
VALUES 
('PRES001', 1, 1, 'VALIDEE', 'Prescription pour hypertension et diabète', NOW(), NOW())
ON CONFLICT (prescription_code) DO NOTHING;

-- 2. Créer des items de prescription
INSERT INTO prescription_items (prescription_id, medication_id, quantity, dosage_instructions, is_dispensed, created_at, updated_at)
VALUES 
-- Utiliser l'ID de la prescription que nous venons de créer
((SELECT id FROM prescriptions WHERE prescription_code = 'PRES001'), 1, 10, '1 comprimé 3 fois par jour si douleur', false, NOW(), NOW()),
((SELECT id FROM prescriptions WHERE prescription_code = 'PRES001'), 2, 5, '1 comprimé 2 fois par jour pendant 7 jours', false, NOW(), NOW()),
((SELECT id FROM prescriptions WHERE prescription_code = 'PRES001'), 3, 7, '1 gélule 3 fois par jour pendant 5 jours', false, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 3. Créer une facture de prescription EN ATTENTE pour la pharmacie
INSERT INTO invoices (
    invoice_code, 
    patient_id, 
    consultation_id, 
    prescription_id,
    subtotal,
    tax_amount,
    discount_amount,
    total_amount,
    paid_amount,
    status,
    payment_method,
    notes,
    created_by,
    department_source,
    created_at,
    updated_at
) VALUES 
('INV-PHARM-001', 
 1, -- patient_id
 1, -- consultation_id  
 (SELECT id FROM prescriptions WHERE prescription农药代码 = 'PRES001'), -- prescription_id
 67.20, -- subtotal (10*2.50 + 5*4.20 + 7*8.50)
 0.00, -- tax_amount
 0.00, -- discount_amount
 67.20, -- total_amount
 0.00, -- paid_amount
 'EN_ATTENTE', -- status
 NULL, -- payment_method
 'Facture prescription pour traitement de longue durée', -- notes
 1, -- created_by (user_id)
 'PHARMACY', -- department_source
 NOW(), -- created_at
 NOW() -- updated_at
)
ON CONFLICT (invoice_code) DO NOTHING;

-- 4. Créer les items de la facture
INSERT INTO invoice_items (
    invoice_id,
    description,
    item_type,
    quantity,
    unit_price,
    total_price,
    created_at,
    updated_at
)
VALUES 
-- Utiliser l'ID de la facture que nous venons de créer
((SELECT id FROM invoices WHERE invoice_code = 'INV-PHARM-001'), 'Paracétamol 500mg', 'MEDICATION', 10, 2.50, 25.00, NOW(), NOW()),
((SELECT id FROM invoices WHERE invoice_code = 'INV-PHARM-001'), 'Ibuprofène 400mg', 'MEDICATION', 5, 4.20, 21.00, NOW(), NOW()),
((SELECT id FROM invoices WHERE invoice_code = 'INV-PHARM-001'), 'Amoxicilline 500mg', 'MEDICATION', 7, 8.50, 59.50, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 5. Créer une deuxième facture de test pour avoir plus de données
INSERT INTO prescriptions (prescription_code, patient_id, consultation_id, status, notes, created_at, updated_at) 
VALUES 
('PRES002', 2, 2, 'VALIDEE', 'Prescription pour infection respiratoire', NOW(), NOW())
ON CONFLICT (prescription_code) DO NOTHING;

INSERT INTO prescription_items (prescription_id, medication_id, quantity, dosage_instructions, is_dispensed, created_at, updated_at)
VALUES 
((SELECT id FROM prescriptions WHERE prescription_code = 'PRES002'), 4, 3, '1 gélule le matin pendant 14 jours', false, NOW(), NOW()),
((SELECT id FROM prescriptions WHERE prescription_code = 'PRES002'), 8, 1, '2 inhalations si crise d''asthme', false, NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO invoices (
    invoice_code, 
    patient_id, 
    consultation_id, 
    prescription_id,
    subtotal,
    tax_amount,
    discount_amount,
    total_amount,
    paid_amount,
    status,
    payment_method,
    notes,
    created_by,
    department_source,
    created_at,
    updated_at
) VALUES 
('INV-PHARM-002', 
 2, 
 2, 
 (SELECT id FROM prescriptions WHERE prescription_code = 'PRES002'),
 55.80, -- subtotal (3*12.30 + 1*18.90)
 0.00,
 0.00,
 55.80,
 0.00,
 'EN_ATTENTE',
 NULL,
 'Facture prescription pour infection respiratoire',
 1,
 'PHARMACY',
 NOW(),
()
)
ON CONFLICT (invoice_code) DO NOTHING;

INSERT INTO invoice_items (
    invoice_id,
    description,
    item_type,
    quantity,
    unit_price,
    total_price,
    created_at,
    updated_at
)
VALUES 
((SELECT id FROM invoices WHERE invoice_code = 'INV-PHARM-002'), 'Omeprazole 20mg', 'MEDICATION', 3, 12.30, 36.90, NOW(), NOW()),
((SELECT id FROM invoices WHERE invoice_code = 'INV-PHARM-002'), 'Salbutamol 100µg', 'MEDICATION', 1, 18.90, 18.90, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════════
-- VÉRIFICATION DES DONNÉS CRÉÉS
-- ══════════════════════════════════════════════════════════════════

-- Vérifier les factures créées pour la pharmacie
SELECT 
    'Factures PHARMACY créées:' as info,
    COUNT(*) as count,
    SUM(total_amount) as total_amount
FROM invoices 
WHERE department_source = 'PHARMACY' AND status = 'EN_ATTENTE';

-- Afficher les détails des factures en attente pour la pharmacie
SELECT 
    i.invoice_code,
    p.first_name || ' ' || p.last_name as patient_name,
    i.total_amount,
    i.status,
    i.department_source,
    i.created_at,
    pres.prescription_code
FROM invoices i
JOIN patients p ON i.patient_id = p.id
LEFT JOIN prescriptions pres ON i.prescription_id = pres.id
WHERE i.department_source = 'PHARMACY' 
  AND i.status = 'EN_ATTENTE'
ORDER BY i.created_at DESC;

-- Vérifier les items de factures
SELECT 
    i.invoice_code,
    ii.description,
    ii.quantity,
    ii.unit_price,
    ii.total_price
FROM invoices i
JOIN invoice_items ii ON i.id = ii.invoice_id
WHERE i.department_source = 'PHARMACY' 
  AND i.status = 'EN_ATTENTE'
ORDER BY i.invoice_code, ii.id;

-- ══════════════════════════════════════════════════════════════════
-- FIN DU SCRIPT
-- ══════════════════════════════════════════════════════════════════
