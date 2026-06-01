-- ============================================================================
-- Audit Log, Role Inheritance, Session Invalidation, New Permissions & Roles
-- Migration: 20260601_audit_log.sql
-- ============================================================================

-- 1. Audit Log Table
-- ============================================================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_actor_id ON audit_log(actor_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_log_action ON audit_log(action);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own audit entries
CREATE POLICY "Users can view own audit entries"
    ON audit_log FOR SELECT
    TO authenticated
    USING (auth.uid() = actor_id);

GRANT SELECT ON audit_log TO authenticated;

-- 2. Session Invalidation — Add session_version to users table
-- ============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;

-- 3. Role Inheritance — Add parent_role_id to roles table
-- ============================================================================
ALTER TABLE roles ADD COLUMN IF NOT EXISTS parent_role_id UUID REFERENCES roles(id) ON DELETE SET NULL;

-- Seed parent_role_id hierarchy: admin -> manager -> staff -> faculty -> student
UPDATE roles SET parent_role_id = (SELECT id FROM roles r2 WHERE r2.name = 'student') WHERE name = 'faculty';
UPDATE roles SET parent_role_id = (SELECT id FROM roles r2 WHERE r2.name = 'faculty') WHERE name = 'staff';
UPDATE roles SET parent_role_id = (SELECT id FROM roles r2 WHERE r2.name = 'staff') WHERE name = 'manager';
UPDATE roles SET parent_role_id = (SELECT id FROM roles r2 WHERE r2.name = 'manager') WHERE name = 'admin';

-- 4. New Permissions
-- ============================================================================
INSERT INTO permissions (code, description, module) VALUES
    ('users.view', 'View user profiles and listings', 'users'),
    ('orders.create', 'Place new orders', 'orders')
ON CONFLICT (code) DO NOTHING;

-- 5. New Role: viewer (read-only access)
-- ============================================================================
INSERT INTO roles (name, description, parent_role_id)
SELECT 'viewer', 'Read-only access to reports and system data', id
FROM roles WHERE name = 'student'
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to viewer role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'viewer'
AND p.code IN ('menu.view', 'reports.view', 'orders.view_all', 'users.view')
ON CONFLICT DO NOTHING;

-- 6. Update role_permissions — Add orders.create to student and faculty
-- ============================================================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'student' AND p.code = 'orders.create'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'faculty' AND p.code = 'orders.create'
ON CONFLICT DO NOTHING;
