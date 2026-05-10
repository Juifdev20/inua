-- Add customer_name column to pharmacy_orders table for walk-in customers
ALTER TABLE pharmacy_orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);

-- Add comment to explain the column
COMMENT ON COLUMN pharmacy_orders.customer_name IS 'Nom du client pour les ventes comptoir sans patient enregistré';
