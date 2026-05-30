-- Add barcode column to menu_items
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_menu_items_barcode ON menu_items(barcode);
