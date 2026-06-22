-- V2002: Backup history table
CREATE TABLE IF NOT EXISTS backup_history (
    id            BIGSERIAL PRIMARY KEY,
    filename      VARCHAR(255) NOT NULL,
    file_path     TEXT,
    file_size_kb  BIGINT DEFAULT 0,
    status        VARCHAR(20) DEFAULT 'PENDING',
    type          VARCHAR(20) DEFAULT 'MANUAL',
    triggered_by  VARCHAR(100),
    error_message TEXT,
    started_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at  TIMESTAMP,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_backup_history_status ON backup_history(status);
CREATE INDEX IF NOT EXISTS idx_backup_history_created ON backup_history(created_at DESC);
