-- ★ AJOUT DE LA COLONNE examen_id À LA TABLE prescribed_exams
-- Cette colonne lie un examen prescrit au catalogue d'examens de laboratoire

-- Ajouter la colonne examen_id (nullable car les anciennes données n'ont pas cette relation)
ALTER TABLE prescribed_exams
ADD COLUMN IF NOT EXISTS examen_id BIGINT;

-- Ajouter la clé étrangère vers la table examens
ALTER TABLE prescribed_exams
ADD CONSTRAINT fk_prescribed_exams_examen
FOREIGN KEY (examen_id) REFERENCES examens(id)
ON DELETE SET NULL; -- Si un examen est supprimé, on garde le prescribed_exams mais sans le lien

-- Créer un index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_prescribed_exams_examen_id ON prescribed_exams(examen_id);

-- Commentaire sur la colonne
COMMENT ON COLUMN prescribed_exams.examen_id IS 'Lien vers le catalogue d''examens de laboratoire (optionnel)';
