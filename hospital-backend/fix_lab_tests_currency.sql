-- Fix for lab_tests currency column
-- Step 1: Add column with default value (nullable first)
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS currency VARCHAR(255) DEFAULT 'USD';

-- Step 2: Update any remaining NULL values
UPDATE lab_tests SET currency = 'USD' WHERE currency IS NULL;

-- Step 3: Add check constraint for CDF/USD values (optional, matches entity enum)
-- Note: Hibernate might add this automatically

-- Verify
SELECT id, test_name, currency FROM lab_tests LIMIT 5;
