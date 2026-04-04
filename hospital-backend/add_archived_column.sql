-- Add archived column to pharmacy_orders table
ALTER TABLE pharmacy_orders ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN pharmacy_orders.archived IS 'Indique si la vente est archivée (true) ou active (false)';

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_archived ON pharmacy_orders(archived);
