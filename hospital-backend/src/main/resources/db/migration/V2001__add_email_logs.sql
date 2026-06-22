-- V2001: Email logs table for tracking and retry
CREATE TABLE IF NOT EXISTS email_logs (
    id               BIGSERIAL PRIMARY KEY,
    recipient        VARCHAR(255) NOT NULL,
    subject          VARCHAR(500) NOT NULL,
    type             VARCHAR(50),
    status           VARCHAR(20) DEFAULT 'PENDING',
    error_message    TEXT,
    retry_count      INT DEFAULT 0,
    max_retries      INT DEFAULT 3,
    sent_at          TIMESTAMP,
    last_attempt_at  TIMESTAMP,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_logs_status    ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_created   ON email_logs(created_at DESC);
