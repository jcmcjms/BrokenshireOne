-- ============================================================================
-- Canteen Management System - Complete Schema Migration
-- Supabase (PostgreSQL)
-- Migration: 00001_schema.sql
-- ============================================================================

-- 0. Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Updated At Trigger Function
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Roles
-- ============================================================================
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Permissions
-- ============================================================================
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    module TEXT NOT NULL
);

-- 4. Role Permissions (Junction)
-- ============================================================================
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

-- 5. Users
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    employee_id TEXT,
    monthly_credit_limit NUMERIC(10,2) NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Menu Categories
-- ============================================================================
CREATE TABLE menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_menu_categories_updated_at
    BEFORE UPDATE ON menu_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Menu Items
-- ============================================================================
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    image_url TEXT,
    available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_menu_items_updated_at
    BEFORE UPDATE ON menu_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Orders
-- ============================================================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled')),
    total NUMERIC(10,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'credit')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Order Items
-- ============================================================================
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL
);

-- 10. Payments
-- ============================================================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
    amount NUMERIC(10,2) NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('cash', 'card')),
    reference TEXT,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Credit Allowances (monthly limits per user)
-- ============================================================================
CREATE TABLE credit_allowances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    limit_amount NUMERIC(10,2) NOT NULL,
    used_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, month, year)
);

CREATE TRIGGER set_credit_allowances_updated_at
    BEFORE UPDATE ON credit_allowances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 12. Credit Transactions
-- ============================================================================
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    amount NUMERIC(10,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('meal', 'deduction', 'adjustment')),
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Users
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(active);

-- Role Permissions
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Menu Items
CREATE INDEX idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX idx_menu_items_available ON menu_items(available);

-- Orders
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_staff_id ON orders(staff_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_payment_method ON orders(payment_method);

-- Order Items
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_item_id ON order_items(item_id);

-- Payments
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_paid_at ON payments(paid_at);
CREATE INDEX idx_payments_method ON payments(method);

-- Credit Allowances
CREATE INDEX idx_credit_allowances_user_id ON credit_allowances(user_id);
CREATE INDEX idx_credit_allowances_month_year ON credit_allowances(month, year);

-- Credit Transactions
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_order_id ON credit_transactions(order_id);
CREATE INDEX idx_credit_transactions_month_year ON credit_transactions(month, year);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);

-- ============================================================================
-- Row Level Security
-- NOTE: All server-side API calls use the service_role key which bypasses RLS.
-- These RLS policies only apply when using the anon key from browser clients.
--
-- For custom JWT auth to work with RLS, configure your Supabase project's
-- JWT secret to match JWT_SECRET in .env.local:
--   Supabase Dashboard > Project Settings > API > JWT Settings
-- This allows auth.uid() and auth.jwt() to read from your custom JWTs.
-- ============================================================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_allowances ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read roles (via custom JWT)
CREATE POLICY "All authenticated can read roles"
    ON roles FOR SELECT
    TO authenticated
    USING (true);

-- All authenticated users can read permissions
CREATE POLICY "All authenticated can read permissions"
    ON permissions FOR SELECT
    TO authenticated
    USING (true);

-- All authenticated users can read role_permissions
CREATE POLICY "All authenticated can read role permissions"
    ON role_permissions FOR SELECT
    TO authenticated
    USING (true);

-- Users can read their own profile; anon can't read any
CREATE POLICY "Users can read own profile"
    ON users FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- All authenticated users can read active menu categories
CREATE POLICY "All authenticated can read menu categories"
    ON menu_categories FOR SELECT
    TO authenticated
    USING (true);

-- All authenticated users can read menu items
CREATE POLICY "All authenticated can read menu items"
    ON menu_items FOR SELECT
    TO authenticated
    USING (true);

-- Users can read their own orders; staff/manager/admin via service_role
CREATE POLICY "Users can read own orders"
    ON orders FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can read their own order items
CREATE POLICY "Users can read own order items"
    ON order_items FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    ));

-- Users can read their own payments
CREATE POLICY "Users can read own payments"
    ON payments FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM orders WHERE orders.id = payments.order_id AND orders.user_id = auth.uid()
    ));

-- Users can read their own credit allowances
CREATE POLICY "Users can read own credit allowances"
    ON credit_allowances FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can read their own credit transactions
CREATE POLICY "Users can read own credit transactions"
    ON credit_transactions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================================
-- API Access Grants (for anon key client usage)
-- ============================================================================

-- Grant USAGE on schemas
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant SELECT on core tables to authenticated users
GRANT SELECT ON roles TO authenticated;
GRANT SELECT ON permissions TO authenticated;
GRANT SELECT ON role_permissions TO authenticated;
GRANT SELECT ON users TO authenticated;
GRANT SELECT ON menu_categories TO authenticated;
GRANT SELECT ON menu_items TO authenticated;
GRANT SELECT ON orders TO authenticated;
GRANT SELECT ON order_items TO authenticated;
GRANT SELECT ON payments TO authenticated;
GRANT SELECT ON credit_allowances TO authenticated;
GRANT SELECT ON credit_transactions TO authenticated;

-- Anon gets SELECT on public-facing tables only
GRANT SELECT ON menu_categories TO anon;
GRANT SELECT ON menu_items TO anon;

-- ============================================================================
-- Seed Data
-- ============================================================================

-- Roles
INSERT INTO roles (name, description) VALUES
    ('admin', 'Full system access and configuration'),
    ('manager', 'Canteen operations and report management'),
    ('staff', 'Canteen counter staff processing orders'),
    ('faculty', 'Faculty members with meal credit access'),
    ('student', 'Students with meal credit access');

-- Permissions
INSERT INTO permissions (code, description, module) VALUES
    ('users.manage', 'Create, edit, and deactivate users', 'users'),
    ('menu.manage', 'Add, edit, and remove menu items and categories', 'menu'),
    ('menu.view', 'View the canteen menu', 'menu'),
    ('orders.process', 'Create and update orders', 'orders'),
    ('orders.view_all', 'View all orders in the system', 'orders'),
    ('orders.view_own', 'View own orders only', 'orders'),
    ('payments.process', 'Process payments for orders', 'payments'),
    ('reports.view', 'Access sales and usage reports', 'reports'),
    ('credits.manage', 'Manage credit limits and adjustments', 'credits'),
    ('credits.view_own', 'View own credit balance and transactions', 'credits');

-- Role-Permission Mappings (RBAC Matrix)
-- admin: ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin';

-- manager: menu.manage, menu.view, orders.process, orders.view_all, payments.process, reports.view, credits.manage, credits.view_own, orders.view_own
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'manager'
AND p.code IN ('menu.manage', 'menu.view', 'orders.process', 'orders.view_all', 'payments.process', 'reports.view', 'credits.manage', 'credits.view_own', 'orders.view_own');

-- staff: menu.view, orders.process, payments.process, orders.view_own
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'staff'
AND p.code IN ('menu.view', 'orders.process', 'payments.process', 'orders.view_own');

-- faculty: menu.view, orders.view_own, credits.view_own
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'faculty'
AND p.code IN ('menu.view', 'orders.view_own', 'credits.view_own');

-- student: menu.view, orders.view_own
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'student'
AND p.code IN ('menu.view', 'orders.view_own');

-- Users (placeholder bcrypt hashes for demo purposes)
INSERT INTO users (name, email, password_hash, role_id, monthly_credit_limit) VALUES
    ('Admin User', 'admin@canteen.com', '$2b$10$Dlrv6vUMjgV5.jHnnNg.GOAPHJsgf3SuKj7s4Xf/xgzA/QPxY0Hri', (SELECT id FROM roles WHERE name = 'admin'), 0),
    ('Manager User', 'manager@canteen.com', '$2b$10$/FEbxKDtJ/0OQIvkbtwl7OAUPqnuiSvJPZOOfLmaBXjb.FK9VvrzS', (SELECT id FROM roles WHERE name = 'manager'), 0),
    ('Staff User', 'staff@canteen.com', '$2b$10$ti2/ufJYtYFQV.d1vbr60.Dg5pfsjk59crO5BCl8.hP12YQDnQ2LS', (SELECT id FROM roles WHERE name = 'staff'), 0),
    ('Faculty User', 'faculty@canteen.com', '$2b$10$0d420nE7j8fecq7oA89R1uDhY8bs0t5y39a2suiwAt3yOL8ztY8/a', (SELECT id FROM roles WHERE name = 'faculty'), 150.00),
    ('Student User', 'student@canteen.com', '$2b$10$RPkaApYUDagErxEtE1HbQuEP2R5DzeJMmYUBQ1nwPM1QlpylKzAMm', (SELECT id FROM roles WHERE name = 'student'), 100.00);

-- Menu Categories
INSERT INTO menu_categories (name, sort_order) VALUES
    ('Meals', 1),
    ('Snacks', 2),
    ('Beverages', 3),
    ('Desserts', 4);

-- Menu Items
INSERT INTO menu_items (category_id, name, description, price, available) VALUES
    ((SELECT id FROM menu_categories WHERE name = 'Meals'), 'Chicken Rice', 'Steamed chicken with fragrant rice, chili sauce, and ginger', 5.50, TRUE),
    ((SELECT id FROM menu_categories WHERE name = 'Meals'), 'Nasi Lemak', 'Coconut rice with fried chicken, sambal, egg, and anchovies', 6.00, TRUE),
    ((SELECT id FROM menu_categories WHERE name = 'Meals'), 'Vegetarian Pasta', 'Penne pasta with mixed vegetables in tomato basil sauce', 5.00, TRUE),
    ((SELECT id FROM menu_categories WHERE name = 'Snacks'), 'Curry Puff', 'Flaky pastry filled with curried potato and chicken', 2.50, TRUE),
    ((SELECT id FROM menu_categories WHERE name = 'Snacks'), 'Spring Rolls', 'Crispy vegetable spring rolls with sweet chili dip', 3.00, TRUE),
    ((SELECT id FROM menu_categories WHERE name = 'Beverages'), 'Iced Lemon Tea', 'Freshly brewed tea with lemon and ice', 2.00, TRUE),
    ((SELECT id FROM menu_categories WHERE name = 'Beverages'), 'Coffee', 'Hot or iced coffee with milk', 2.50, TRUE),
    ((SELECT id FROM menu_categories WHERE name = 'Beverages'), 'Mineral Water', 'Bottled natural spring water 500ml', 1.50, TRUE),
    ((SELECT id FROM menu_categories WHERE name = 'Desserts'), 'Chocolate Brownie', 'Rich chocolate brownie with walnuts', 3.50, TRUE),
    ((SELECT id FROM menu_categories WHERE name = 'Desserts'), 'Fruit Salad', 'Assorted fresh seasonal fruits', 3.00, TRUE);

-- Credit Allowances for faculty and student (current month)
INSERT INTO credit_allowances (user_id, month, year, limit_amount, used_amount)
SELECT id, EXTRACT(MONTH FROM NOW())::INTEGER, EXTRACT(YEAR FROM NOW())::INTEGER, monthly_credit_limit, 0
FROM users WHERE monthly_credit_limit > 0;
