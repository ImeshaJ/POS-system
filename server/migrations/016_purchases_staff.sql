-- Add user_id column to purchases to track which staff member created the purchase

ALTER TABLE purchases
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Add index for faster filtering by staff member
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);

-- Add a comment for documentation
COMMENT ON COLUMN purchases.user_id IS 'The staff member (user) who created this purchase';
