-- =====================================================
-- Table pour les horaires de prise de médicaments
-- =====================================================

CREATE TABLE IF NOT EXISTS prescription_item_timeslots (
    item_id BIGINT NOT NULL REFERENCES prescription_items(id) ON DELETE CASCADE,
    time_slot VARCHAR(255) NOT NULL
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_timeslots_item_id ON prescription_item_timeslots(item_id);
