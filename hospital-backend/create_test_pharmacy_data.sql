-- ══════════════════════════════════════════════════════════════════
-- CRÉATION DE DONNÉES DE TEST POUR LA FILE D'ATTENTE PHARMACIE
-- ══════════════════════════════════════════════════════════════════

-- 1. Vérifier s'il existe déjà des médicaments
SELECT COUNT(*) as nombre_medicaments FROM medications;

-- 2. Créer des médicaments de test si nécessaire
INSERT INTO medications (name, description, unit_price, stock_quantity, created_at) 
VALUES 
    ('Paracétamol 500mg', 'Antalgique et antipyrétique', 5000, 100, NOW()),
    ('Amoxicilline 1g', 'Antibiotique large spectre', 8000, 50, NOW()),
    ('Ibuprofène 400mg', 'Anti-inflammatoire', 6000, 75, NOW())
ON CONFLICT (name) DO NOTHING;

-- 3. Créer une consultation de test si nécessaire
INSERT INTO consultations (id, patient_id, doctor_id, status, created_at)
VALUES (999, 1, 1, 'PAYEE', NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. Créer une prescription de test
INSERT INTO prescriptions (prescription_code, patient_id, consultation_id, doctor_id, status, created_at)
VALUES ('TEST-001', 1, 999, 1, 'VALIDEE', NOW())
ON CONFLICT (prescription_code) DO NOTHING;

-- 5. Ajouter des médicaments à la prescription
INSERT INTO prescription_items (prescription_id, medication_id, quantity, dosage_instructions)
SELECT 
    p.id,
    m.id,
    2,
    'Prendre 1 comprimé 3 fois par jour'
FROM prescriptions p
CROSS JOIN medications m
WHERE p.prescription_code = 'TEST-001'
  AND m.name IN ('Paracétamol 500mg', 'Amoxicilline 1g')
ON CONFLICT DO NOTHING;

-- 6. Créer la facture automatiquement
INSERT INTO invoices (
    invoice_code, 
    patient_id, 
    consultation_id, 
    prescription_id,
    status, 
    total_amount, 
    paid_amount, 
    department_source, 
    created_at,
    created_by_id
)
SELECT 
    'INV-PHARM-' || EXTRACT(EPOCH FROM NOW())::bigint,
    p.patient_id,
    p.consultation_id,
    p.id,
    'EN_ATTENTE',
    COALESCE(SUM(pi.quantity * m.unit_price), 0),
    0,
    'PHARMACY',
    NOW(),
    1
FROM prescriptions p
LEFT JOIN prescription_items pi ON p.id = pi.prescription_id
LEFT JOIN medications m ON pi.medication_id = m.id
WHERE p.prescription_code = 'TEST-001'
GROUP BY p.id, p.patient_id, p.consultation_id
ON CONFLICT (invoice_code) DO NOTHING;

-- 7. Vérifier les données créées
SELECT 
    'PRESCRIPTIONS' as table_name,
    COUNT(*) as count,
    'prescriptions avec status VALIDEE' as description
FROM prescriptions 
WHERE status = 'VALIDEE'

UNION ALL

SELECT 
    'FACTURES PHARMACY' as table_name,
    COUNT(*) as count,
    'factures PHARMACY en attente' as description
FROM invoices 
WHERE department_source = 'PHARMACY' 
  AND status = 'EN_ATTENTE';

-- 8. Afficher les détails de la file d'attente pharmacie
SELECT 
    i.invoice_code,
    i.total_amount,
    p.first_name || ' ' || p.last_name as patient_name,
    pr.prescription_code,
    i.created_at
FROM invoices i
LEFT JOIN patients p ON i.patient_id = p.id
LEFT JOIN prescriptions pr ON i.prescription_id = pr.id
WHERE i.department_source = 'PHARMACY' 
  AND i.status = 'EN_ATTENTE'
ORDER BY i.created_at DESC;

-- ══════════════════════════════════════════════════════════════════
-- UTILISATION :
-- 1. Exécuter ce script dans votre base de données PostgreSQL
-- 2. Rafraîchir l'interface finance - la file d'attente pharmacie devrait maintenant afficher les factures
-- ══════════════════════════════════════════════════════════════════
