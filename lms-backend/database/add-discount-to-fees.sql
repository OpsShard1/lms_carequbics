-- Add discount columns to fees_payments table
ALTER TABLE fees_payments 
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS discount_reason VARCHAR(255);

-- Update existing records to have 0 discount
UPDATE fees_payments SET discount_percentage = 0.00, discount_amount = 0.00 WHERE discount_percentage IS NULL;
