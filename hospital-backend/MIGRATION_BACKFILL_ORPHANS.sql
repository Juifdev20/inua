-- ═══════════════════════════════════════════════════════════════════════
-- BACKFILL des données orphelines (hospital_id NULL) créées avant/sans
-- contexte tenant → invisibles pour l'admin de leur hôpital.
-- ═══════════════════════════════════════════════════════════════════════
-- ⚠️ L'éditeur Supabase n'accepte PAS les paramètres ":xxx". Utilise un
--    NOMBRE littéral (l'ID de ton hôpital principal).

-- ── ÉTAPE 1 : trouve l'ID de ton hôpital principal ──
-- (exécute d'abord cette ligne seule, note l'id de HOPITAL GENERAL DE BENI)
SELECT id, nom, code, is_active FROM hospitals ORDER BY id;

-- ── ÉTAPE 2 : remplace le 1 ci-dessous par CET id, puis exécute ces 4 lignes ──
UPDATE patients         SET hospital_id = 1 WHERE hospital_id IS NULL;
UPDATE medical_services SET hospital_id = 1 WHERE hospital_id IS NULL;
UPDATE examens          SET hospital_id = 1 WHERE hospital_id IS NULL;
UPDATE medications      SET hospital_id = 1 WHERE hospital_id IS NULL;

-- ── ÉTAPE 3 : vérification (les NULL doivent avoir disparu) ──
SELECT 'patients' AS t, hospital_id, count(*) FROM patients GROUP BY hospital_id
UNION ALL SELECT 'medical_services', hospital_id, count(*) FROM medical_services GROUP BY hospital_id
UNION ALL SELECT 'examens', hospital_id, count(*) FROM examens GROUP BY hospital_id
ORDER BY t, hospital_id;
