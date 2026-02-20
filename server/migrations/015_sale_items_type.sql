-- Add item_type column to sale_items to distinguish products from services
-- item_type: 'product', 'service', 'package', 'addon'

ALTER TABLE sale_items
ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) DEFAULT 'product';

ALTER TABLE sale_items
ADD COLUMN IF NOT EXISTS item_code VARCHAR(50);

-- Update existing records to have 'product' type
UPDATE sale_items SET item_type = 'product' WHERE item_type IS NULL;

-- Add index for faster filtering by type
CREATE INDEX IF NOT EXISTS idx_sale_items_item_type ON sale_items(item_type);
