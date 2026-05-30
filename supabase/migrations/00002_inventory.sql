-- ============================================================================
-- Inventory Management System - Migration 00002
-- Supabase (PostgreSQL)
-- ============================================================================

-- 1. Inventory Items
-- ============================================================================
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('produce', 'meat', 'dairy', 'dry_goods', 'beverage', 'other')),
    quantity DECIMAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    min_stock_level DECIMAL NOT NULL DEFAULT 0,
    unit_cost DECIMAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_inventory_items_updated_at
    BEFORE UPDATE ON inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Inventory Movements (Audit Trail)
-- ============================================================================
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('addition', 'removal', 'adjustment')),
    quantity_change DECIMAL NOT NULL,
    previous_quantity DECIMAL NOT NULL,
    new_quantity DECIMAL NOT NULL,
    reason TEXT,
    performed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Add stock_quantity to menu_items
-- ============================================================================
ALTER TABLE menu_items ADD COLUMN stock_quantity INTEGER NOT NULL DEFAULT 0;

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_inventory_items_category ON inventory_items(category);
CREATE INDEX idx_inventory_items_updated_at ON inventory_items(updated_at);
CREATE INDEX idx_inventory_movements_item_id ON inventory_movements(item_id);
CREATE INDEX idx_inventory_movements_created_at ON inventory_movements(created_at);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read inventory items
CREATE POLICY "All authenticated can read inventory items"
    ON inventory_items FOR SELECT
    TO authenticated
    USING (true);

-- All authenticated users can read inventory movements
CREATE POLICY "All authenticated can read inventory movements"
    ON inventory_movements FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================================
-- API Access Grants
-- ============================================================================
GRANT SELECT ON inventory_items TO authenticated;
GRANT SELECT ON inventory_movements TO authenticated;
