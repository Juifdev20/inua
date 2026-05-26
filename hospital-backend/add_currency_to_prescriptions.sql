-- Add currency column to prescriptions table
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';

-- Update existing prescriptions to have USD as default currency
UPDATE prescriptions SET currency = 'USD' WHERE currency IS NULL;
